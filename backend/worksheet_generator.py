# worksheet_generator.py
import re
import random
import os
from collections import defaultdict
from docx import Document
from fpdf import FPDF

# ---------------------------
# Configuration / regexes
# ---------------------------
CJK_RE = re.compile(r'[\u4e00-\u9fff]')
CHINESE_RE = CJK_RE
CJK_PUNCT_RE = r'！？。；，、：“”‘’（）《》【】'

# Common abbreviations that should not be treated as sentence ends
ABBREVIATIONS = [
    "Mr.", "Mrs.", "Dr.", "St.", "Prof.", "Inc.", "Ltd.", "Jr.", "Sr.", "vs."
]

# ---------------------------
# Subtitle Parsing
# ---------------------------
def parse_subtitles(file_path, bilingual_mode=False):
    """Reads subtitle file and returns cleaned sentences."""
    with open(file_path, "r", encoding="utf-8") as f:
        raw_text = f.read()

    lines = raw_text.splitlines()
    sentences = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        line = clean_sentence(line)
        if line:
            sentences.append(line)
    return sentences

# ---------------------------
# Cleaning
# ---------------------------
def clean_sentence(text):
    """Strip unwanted punctuation, handle abbreviations, etc."""
    # Remove orphaned Chinese punctuation
    text = re.sub(rf'^[{CJK_PUNCT_RE}]+|[{CJK_PUNCT_RE}]+$', '', text)

    # Protect abbreviations from being split as sentence ends
    for abbr in ABBREVIATIONS:
        text = text.replace(abbr, abbr.replace('.', '§'))

    # Optional additional cleaning logic here

    # Restore abbreviations
    text = text.replace('§', '.')

    return text

# ---------------------------
# Dictionary building
# ---------------------------
def build_dictionaries(sentences):
    """
    Returns:
        - sentence_dict: {id: sentence}
        - word_index: {word: [sentence_ids]}
        - freq_dict: {word: frequency}
    """
    sentence_dict = {}
    word_index = defaultdict(list)
    freq_dict = defaultdict(int)

    for idx, sent in enumerate(sentences):
        sentence_dict[idx] = sent
        words = re.findall(r'\b\w+\b', sent)
        for w in words:
            w_clean = w.lower()
            word_index[w_clean].append(idx)
            freq_dict[w_clean] += 1

    return sentence_dict, word_index, freq_dict

# ---------------------------
# Word filtering
# ---------------------------
def filter_words(freq_dict, familiarity='once', level='beginner'):
    """Return candidate words based on frequency and level."""
    filtered = []
    for w, freq in freq_dict.items():
        if familiarity == 'once' and freq == 1:
            filtered.append(w)
        elif familiarity == 'twice' and freq == 2:
            filtered.append(w)
        elif familiarity == 'more' and freq > 2:
            filtered.append(w)
    return filtered

# ---------------------------
# PDF / DOCX generation
# ---------------------------
def save_as_pdf(output_path, worksheet, word_bank):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.multi_cell(0, 10, "Worksheet\n\n")
    for line in worksheet:
        pdf.multi_cell(0, 10, line)
        pdf.ln(2)
    pdf.multi_cell(0, 10, "\nWord Bank:\n" + ", ".join(word_bank))
    pdf.output(output_path)

def save_as_docx(output_path, worksheet, word_bank):
    doc = Document()
    doc.add_heading("Worksheet", 0)
    for line in worksheet:
        doc.add_paragraph(line)
    doc.add_paragraph("\nWord Bank:\n" + ", ".join(word_bank))
    doc.save(output_path)

# ---------------------------
# Worksheet generation (PDF/DOCX)
# ---------------------------
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

# ---------------------------
# Interactive Web Output
# ---------------------------
def generate_worksheet_web(sentence_dict, word_index, word_list, num_words=12, bilingual_mode=False):
    """
    Returns:
        - worksheet: list of dicts {sentence: ..., answer: ...} for DnD
        - word_bank: list of words
    """
    chosen_words = random.sample(word_list, min(num_words, len(word_list)))
    worksheet = []
    word_bank = []
    used_sentences = set()

    for word in chosen_words:
        if word not in word_index:
            continue
        sentence_ids = word_index[word]
        available_sids = [sid for sid in sentence_ids if sid not in used_sentences]
        if not available_sids:
            word_bank.append(word)
            continue
        sid = random.choice(available_sids)
        sentence = sentence_dict[sid]

        # Replace **only first occurrence** with blank
        if bilingual_mode:
            parts = re.split(f"({CHINESE_RE.pattern})", sentence)
            new_parts = []
            replaced = False
            for token in parts:
                if CHINESE_RE.search(token):
                    new_parts.append(token)
                else:
                    if not replaced:
                        pattern = re.compile(rf"(?<!\w){re.escape(word)}(?!\w)", re.IGNORECASE)
                        token, count = pattern.subn(f"_____", token, count=1)
                        if count > 0:
                            replaced = True
                    new_parts.append(token)
            blanked = ''.join(new_parts)
        else:
            pattern = re.compile(rf"(?<!\w){re.escape(word)}(?!\w)", re.IGNORECASE)
            blanked, count = pattern.subn("_____", sentence, count=1)

        worksheet.append({"sentence": blanked, "answer": word})
        word_bank.append(word)
        used_sentences.add(sid)

    random.shuffle(word_bank)
    return worksheet, word_bank
