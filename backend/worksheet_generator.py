import re
import random
import sys
import chardet
import os
from collections import defaultdict, Counter

# PDF / DOCX output
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import inch
from docx import Document
from docx.shared import Pt

# -------------------------------
# Regex constants
# -------------------------------
# English tokens incl. hyphens/apostrophes (don’t split contractions or hyphenated words)
TOKEN_RE = re.compile(r"\b[a-zA-Z]+(?:[-'][a-zA-Z]+)*\b")

# CJK unified ideographs (Chinese)
CHINESE_RE = re.compile(r'[\u4e00-\u9fff]')

# Common CJK punctuation as a plain string (NOT a class) so we can escape safely later
CJK_PUNCT_CHARS = "，、。？！：；（）【】「」『』《》—…·"

# Abbreviations to protect during sentence splitting
ABBREVIATIONS = {
    # titles
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr",
    # places/things
    "st", "no", "fig", "dept",
    # latinisms
    "etc", "i.e", "e.g", "al",
    # times
    "a.m", "p.m",
    # countries
    "u.s", "u.s.a", "u.k"
}
ABBR_RE = re.compile(r'\b(' + '|'.join(map(re.escape, ABBREVIATIONS)) + r')\.', re.IGNORECASE)

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
    # remove {\tags} and <tags>
    text = re.sub(r"\{.*?\}", "", text)
    text = re.sub(r"<.*?>", "", text)
    # ASS/SRT line breaks and non-breaking spaces
    text = text.replace("\\N", " ").replace("\\n", " ").replace("\\h", " ")
    text = text.replace("\u00A0", " ")
    # directional/invisible control chars
    text = re.sub(r"[\u200B-\u200F\u202A-\u202E\u2060-\u206F]", "", text)
    # ASCII control chars
    text = re.sub(r"[\u0000-\u001F\u007F-\u009F]", " ", text)
    # collapse spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text

# -------------------------------
# Remove Chinese and orphaned punctuation
# -------------------------------
def remove_chinese(text: str) -> str:
    # Remove CJK characters
    text = CHINESE_RE.sub("", text)

    # Remove empty paired punctuation like (), [], {}, and their CJK equivalents if only whitespace remains inside
    text = re.sub(r'(\(|\{|\[|（|「|『|【|《)\s*(\)|\}|\]|）|」|』|】|》)', '', text)

    # Build a safe character class for trimming leading/trailing punctuation + quotes/braces
    strip_chars = CJK_PUNCT_CHARS + '()[]{}"\''
    cls = re.escape(strip_chars)
    text = re.sub(rf'^[{cls}\s]+|[{cls}\s]+$', '', text)

    # collapse spaces again
    text = re.sub(r"\s+", " ", text).strip()
    return text

# -------------------------------
# Protect abbreviations in a blob of text
# -------------------------------
def _protect_abbreviations(s: str) -> str:
    # Replace trailing period after known abbreviations with a sentinel to avoid sentence split
    return ABBR_RE.sub(lambda m: m.group(1) + "∯", s)

def _restore_abbreviations(s: str) -> str:
    return s.replace("∯", ".")

# -------------------------------
# Sentence splitting (join small fragments across lines)
# -------------------------------
def split_into_sentences(lines, min_words=5, max_words=30):
    sentences = []
    buffer = ""
    for line in lines:
        if buffer:
            buffer += " " + line
        else:
            buffer = line

        protected = _protect_abbreviations(buffer)
        parts = re.split(r'(?<=[.!?])\s+(?=[A-Z0-9])', protected)

        for s in parts[:-1]:
            s = _restore_abbreviations(s).strip()
            wc = len(TOKEN_RE.findall(s))
            if min_words <= wc <= max_words:
                sentences.append(s)

        buffer = _restore_abbreviations(parts[-1])

    buffer = buffer.strip()
    if buffer and min_words <= len(TOKEN_RE.findall(buffer)) <= max_words:
        sentences.append(buffer)
    return sentences

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

        # Extract text field from .ass Dialogue rows
        if line.startswith("Dialogue:"):
            parts = line.split(",", 9)
            if len(parts) > 9:
                line = parts[9]
            else:
                continue

        # Skip style and format lines
        if line.lower().startswith(("format:", "style:", "script info", "playres")):
            continue

        line = clean_dialogue_text(line)

        if not bilingual_mode:
            line = remove_chinese(line)

        if line:
            lines.append(line)

    return split_into_sentences(lines)

# -------------------------------
# Build dictionaries
# -------------------------------
def build_dictionaries(sentences):
    sentence_dict = {i + 1: s for i, s in enumerate(sentences)}
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
# Load common words per level
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
# Filter words (frequency + common word lists + gentle contraction handling)
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
        # If contraction, also check the base before apostrophe
        if "'" in w:
            base = w.split("'")[0]
            if base in common_words:
                continue
        filtered.append(w)

    return filtered

# -------------------------------
# Generate printable worksheet (PDF/DOCX workflow)
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
            # Keep Chinese parts; only blank the target English word
            parts = re.split(f"({CHINESE_RE.pattern})", blanked)
            new_parts = []
            for token in parts:
                if CHINESE_RE.search(token):
                    new_parts.append(token)
                else:
                    pattern = re.compile(rf"(?<!\w){re.escape(word)}(?!\w)", re.IGNORECASE)
                    token = pattern.sub("________________________", token)
                    new_parts.append(token)
            blanked = ''.join(new_parts)
        else:
            pattern = re.compile(rf"(?<!\w){re.escape(word)}(?!\w)", re.IGNORECASE)
            blanked = pattern.sub("________________________", blanked)

        worksheet.append(blanked)
        word_bank.append(word)
        used_sentences.add(sid)

    random.shuffle(word_bank)
    return worksheet, word_bank

# -------------------------------
# Generate web (drag-and-drop) worksheet JSON
# -------------------------------
def generate_worksheet_web(sentence_dict, word_index, word_list, num_words=12, bilingual_mode=False):
    """
    Returns (worksheet, word_bank):
      - worksheet: list[list[ token ]], where token = { "text": str, "is_blank": bool, "id"?: int }
      - word_bank: list[str] (shuffled)
    Multiple blanks per sentence are supported if the chosen word appears multiple times.
    """
    chosen_words = random.sample(word_list, min(num_words, len(word_list)))
    worksheet = []
    word_bank = []
    used_sentences = set()
    blank_id = 0

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
        token_list = []

        if bilingual_mode:
            parts = re.split(f"({CHINESE_RE.pattern})", sentence)
            for token in parts:
                if CHINESE_RE.search(token):
                    token_list.append({"text": token, "is_blank": False})
                else:
                    pattern = re.compile(rf"(?<!\w){re.escape(word)}(?!\w)", re.IGNORECASE)
                    segments = pattern.split(token)
                    for i, seg in enumerate(segments):
                        if seg:
                            token_list.append({"text": seg, "is_blank": False})
                        if i < len(segments) - 1:
                            token_list.append({"text": word, "is_blank": True, "id": blank_id})
                            blank_id += 1
        else:
            pattern = re.compile(rf"(?<!\w){re.escape(word)}(?!\w)", re.IGNORECASE)
            segments = pattern.split(sentence)
            for i, seg in enumerate(segments):
                if seg:
                    token_list.append({"text": seg, "is_blank": False})
                if i < len(segments) - 1:
                    token_list.append({"text": word, "is_blank": True, "id": blank_id})
                    blank_id += 1

        worksheet.append(token_list)
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

    # Use local CJK font if available
    font_path = os.path.join(os.path.dirname(__file__), "fonts", "NotoSerifCJKsc-VF.ttf")
    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont("NotoSerifCJK", font_path))
        styles.add(ParagraphStyle(
            name="CJKNormal",
            parent=styles["Normal"],
            fontName="NotoSerifCJK",
            fontSize=12,
            leading=18,
            leftIndent=15,
            firstLineIndent=-15
        ))
        # separate style for word bank (no hanging indent)
        styles.add(ParagraphStyle(
            name="CJKNormalNoIndent",
            parent=styles["Normal"],
            fontName="NotoSerifCJK",
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
        p.add_run(f"{i}.\t{s}")
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
# CLI entry (optional)
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

    # For CLI, stick to PDF/DOCX like before
    candidate_words = filter_words(freq_dict, familiarity, level)
    worksheet, word_bank = generate_worksheet(
        sentence_dict, word_index, candidate_words, bilingual_mode=bilingual_mode
    )

    if output_format == "pdf":
        save_as_pdf("worksheet.pdf", worksheet, word_bank)
        print("Saved as worksheet.pdf")
    else:
        save_as_docx("worksheet.docx", worksheet, word_bank)
        print("Saved as worksheet.docx")

if __name__ == "__main__":
    main()
