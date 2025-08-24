import re
import random
import sys
import chardet
import os
from collections import defaultdict, Counter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import inch
from docx import Document
from docx.shared import Pt

# -------------------------------
# Token regex (supports hyphens/apostrophes)
# -------------------------------
TOKEN_RE = re.compile(r"\b[a-zA-Z]+(?:[-'][a-zA-Z]+)*\b")
CHINESE_RE = re.compile(r'[\u4e00-\u9fff]')
# full-width CJK punctuation
CJK_PUNCT_RE = r'[\u3000-\u303F（）【】「」『』《》]'

# -------------------------------
# Common abbreviations (lowercase, no period)
# -------------------------------
ABBREVIATIONS = {
    "mr.", "mrs.", "dr.", "st.", "prof.", "jr.", "sr.", "ms.",
    "etc.", "vs.", "e.g.", "i.e.", "u.s.", "u.k.", "a.m.", "p.m."
}

# -------------------------------
# Encoding-safe file reader
# -------------------------------
def read_file_safely(file_path):
    with open(file_path, "rb") as f:
        raw = f.read()
    if raw.startswith(b"\xff\xfe"):
        encoding = "utf-16-le"
    elif raw.startswith(b"\xfe\xff"):
        encoding = "utf-16-be"
    elif raw.startswith(b"\xef\xbb\xbf"):
        encoding = "utf-8-sig"
    else:
        result = chardet.detect(raw)
        encoding = result["encoding"] or "utf-8"
    return raw.decode(encoding, errors="ignore")

# -------------------------------
# Clean subtitle dialogue text
# -------------------------------
def clean_dialogue_text(text: str) -> str:
    text = re.sub(r"\{.*?\}", "", text)
    text = re.sub(r"<.*?>", "", text)
    text = text.replace("\\N", " ").replace("\\n", " ").replace("\\h", " ")
    text = text.replace("\u00A0", " ")
    text = re.sub(r"[\u200B-\u200F\u202A-\u202E\u2060-\u206F]", "", text)
    text = re.sub(r"[\u0000-\u001F\u007F-\u009F]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

# -------------------------------
# Remove Chinese text and orphaned punctuation
# -------------------------------
def remove_chinese(text: str) -> str:
    # Remove Chinese characters
    text = CHINESE_RE.sub("", text)
    # Remove empty bracket/parentheses pairs
    text = re.sub(r'[\(\[\{（『「【《]\s*[\)\]\}）』」】》]', '', text)
    # Remove dangling punctuation at start/end
    strip_chars = re.escape('（）【】「」『』《》()[]{}"\'‘’“”')
    text = re.sub(rf'^[{strip_chars}]+|[{strip_chars}]+$', '', text)
    return text.strip()

# -------------------------------
# Subtitle parsing
# -------------------------------
def parse_subtitles(file_path, bilingual_mode=False):
    content = read_file_safely(file_path)
    lines = []
    for raw in content.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("Dialogue:"):
            parts = line.split(",", 9)
            if len(parts) > 9:
                line = parts[9]
            else:
                continue
        if line.lower().startswith(("format:", "style:", "script info", "playres")):
            continue
        line = clean_dialogue_text(line)
        if not bilingual_mode:
            line = remove_chinese(line)
        if line:
            lines.append(line)
    return split_into_sentences(lines)
    
# -------------------------------
# Sentence splitting with robust abbreviation handling
# -------------------------------
def split_into_sentences(lines, min_words=5, max_words=30):
    sentences = []
    buffer = ""
    # regex for potential sentence breaks (period, ?, ! followed by space + capital)
    sentence_end_re = re.compile(r'([.!?])\s+')
    
    for line in lines:
        if buffer:
            buffer += " " + line
        else:
            buffer = line

        start = 0
        for match in sentence_end_re.finditer(buffer):
            end = match.end()
            candidate = buffer[start:end].strip()

            # get the last token before punctuation
            tokens = candidate.split()
            last_token = tokens[-1].lower() if tokens else ""
            
            # if the last token is an abbreviation, skip splitting
            if last_token in ABBREVIATIONS:
                continue

            word_count = len(TOKEN_RE.findall(candidate))
            if min_words <= word_count <= max_words:
                sentences.append(candidate)
            start = end

        # remaining text after last match
        buffer = buffer[start:].strip()

    # process any leftover buffer
    if buffer:
        word_count = len(TOKEN_RE.findall(buffer))
        if min_words <= word_count <= max_words:
            sentences.append(buffer)

    return sentences

# -------------------------------
# Build dictionaries
# -------------------------------
def build_dictionaries(sentences):
    sentence_dict = {i+1: s for i, s in enumerate(sentences)}
    word_index = defaultdict(list)
    all_words = []
    for sid, sentence in sentence_dict.items():
        words = TOKEN_RE.findall(sentence.lower())
        for w in words:
            word_index[w].append(sid)
        all_words.extend(words)
    freq_dict = Counter(all_words)
    return sentence_dict, word_index, freq_dict

# -------------------------------
# Load common words for levels
# -------------------------------
def load_common_words(level):
    level_files = {
        "beginner": "common_200.txt",
        "intermediate": "common_800.txt",
    }
    if level not in level_files:
        return set()
    try:
        with open(level_files[level], "r", encoding="utf-8") as f:
            return set(w.strip().lower() for w in f if w.strip())
    except FileNotFoundError:
        return set()

# -------------------------------
# Filter words (handle contractions carefully)
# -------------------------------
def filter_words(freq_dict, familiarity, level):
    once = [w for w, f in freq_dict.items() if f == 1]
    twice = [w for w, f in freq_dict.items() if f == 2]
    more = [w for w, f in freq_dict.items() if f > 2]
    if familiarity == "once":
        words = once
    elif familiarity == "twice":
        words = twice
    else:
        words = more
    common_words = load_common_words(level)
    filtered = []
    for w in words:
        if w in common_words:
            continue
        # if word contains an apostrophe, check base part against filter
        if "'" in w:
            base = w.split("'")[0]
            if base in common_words:
                continue
        filtered.append(w)
    return filtered

# -------------------------------
# Generate worksheet
# -------------------------------
def generate_worksheet(sentence_dict, word_index, word_list, num_words=12, bilingual_mode=False):
    chosen_words = random.sample(word_list, min(num_words, len(word_list)))
    worksheet = []
    word_bank = []
    used_sentences = set()

    for word in chosen_words:
        if word not in word_index:
            continue
        sentence_ids = word_index[word]
        if not sentence_ids:
            continue
        available_sids = [sid for sid in sentence_ids if sid not in used_sentences]
        if not available_sids:
            word_bank.append(word)
            continue
        sid = random.choice(available_sids)
        sentence = sentence_dict[sid]
        blanked = sentence

        if bilingual_mode:
            # Split by Chinese characters
            parts = re.split(f"({CHINESE_RE.pattern})", blanked)
            new_parts = []
            for token in parts:
                if CHINESE_RE.search(token):
                    # Keep Chinese text
                    new_parts.append(token)
                else:
                    # Only blank the target word, keep other English words
                    pattern = re.compile(rf"(?<!\w){re.escape(word)}(?!\w)", re.IGNORECASE)
                    token = pattern.sub("________________________", token)
                    new_parts.append(token)
            blanked = ''.join(new_parts)
        else:
            # Non-bilingual: blank the target word
            pattern = re.compile(rf"(?<!\w){re.escape(word)}(?!\w)", re.IGNORECASE)
            blanked = pattern.sub("________________________", blanked)

        worksheet.append(blanked)
        word_bank.append(word)
        used_sentences.add(sid)

    random.shuffle(word_bank)
    return worksheet, word_bank

# -------------------------------
# Save to PDF
# -------------------------------
def save_as_pdf(filename, worksheet, word_bank):
    doc = SimpleDocTemplate(filename)
    styles = getSampleStyleSheet()
    font_path = os.path.join(os.path.dirname(__file__), "fonts", "Taipei Sans TC Beta Regular.ttf")
    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont("TaipeiSans", font_path))
        styles.add(ParagraphStyle(
            name="CJKNormal",
            parent=styles["Normal"],
            fontName="TaipeiSans",
            fontSize=12,
            leading=18,
            leftIndent=15,
            firstLineIndent=-15
        ))
        styles.add(ParagraphStyle(
            name="CJKNormalNoIndent",
            parent=styles["Normal"],
            fontName="TaipeiSans",
            fontSize=12,
            leading=18
        ))
        cjk_style = "CJKNormal"
        cjk_wordbank_style = "CJKNormalNoIndent"
    else:
        print("[WARN] Bundled font not found, falling back to default.")
        cjk_style = "Normal"
        cjk_wordbank_style = "Normal"

    story = []
    story.append(Paragraph("Worksheet", styles["Heading1"]))
    for i, s in enumerate(worksheet, 1):
        numbered_text = f"{i}. {s}"
        story.append(Paragraph(numbered_text, styles[cjk_style]))
        story.append(Spacer(1, 12))
    story.append(Paragraph("Word Bank", styles["Heading2"]))
    story.append(Paragraph(", ".join(word_bank), styles[cjk_wordbank_style]))
    doc.build(story)

# -------------------------------
# Save to Word
# -------------------------------
def save_as_docx(filename, worksheet, word_bank):
    doc = Document()
    for i, s in enumerate(worksheet, 1):
        p = doc.add_paragraph()
        run = p.add_run(f"{i}.\t{s}")
        p.paragraph_format.line_spacing = Pt(18)
    doc.add_heading("Word Bank", level=2)
    p = doc.add_paragraph(", ".join(word_bank))
    p.paragraph_format.line_spacing = Pt(18)
    p.paragraph_format.left_indent = None
    p.paragraph_format.first_line_indent = None
    doc.save(filename)

# -------------------------------
# Debug output
# -------------------------------
def debug_output(sentences, freq_dict):
    with open("debug_sentences.txt", "w", encoding="utf-8") as f:
        for s in sentences:
            f.write(s + "\n")
    with open("debug_frequencies.txt", "w", encoding="utf-8") as f:
        for word, freq in freq_dict.most_common():
            f.write(f"{word}: {freq}\n")
    print("Debug files written: debug_sentences.txt, debug_frequencies.txt")

# -------------------------------
# Main
# -------------------------------
def main():
    if len(sys.argv) < 5:
        print("Usage: python worksheet_generator.py <subtitle_file> <level> <familiarity> <output_format> [--debug] [--bilingual]")
        sys.exit(1)

    subtitle_file = sys.argv[1]
    level = sys.argv[2].lower()
    familiarity = sys.argv[3].lower()
    output_format = sys.argv[4].lower()
    debug = "--debug" in sys.argv
    bilingual_mode = "--bilingual" in sys.argv

    sentences = parse_subtitles(subtitle_file, bilingual_mode=bilingual_mode)
    sentence_dict, word_index, freq_dict = build_dictionaries(sentences)

    if debug:
        debug_output(sentences, freq_dict)

    candidate_words = filter_words(freq_dict, familiarity, level)
    worksheet, word_bank = generate_worksheet(sentence_dict, word_index, candidate_words, bilingual_mode=bilingual_mode)

    if output_format == "pdf":
        save_as_pdf("worksheet.pdf", worksheet, word_bank)
        print("Saved as worksheet.pdf")
    else:
        save_as_docx("worksheet.docx", worksheet, word_bank)
        print("Saved as worksheet.docx")

if __name__ == "__main__":
    main()
