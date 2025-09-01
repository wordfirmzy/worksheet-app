import random
import re

# ----------------------------------------------------
# Regex for detecting Chinese characters
# ----------------------------------------------------
CHINESE_RE = re.compile(r'[\u4e00-\u9fff]')

# ----------------------------------------------------
# Parse subtitles
# ----------------------------------------------------
def parse_subtitles(file_path, bilingual_mode=False):
    """
    Reads a subtitle file (.srt, .ass, .txt) and returns a list of sentences.
    """
    sentences = []
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Simplest split by newlines
    for line in content.splitlines():
        line = line.strip()
        if not line:
            continue
        # Optionally remove Chinese characters for monolingual mode
        if not bilingual_mode:
            line = CHINESE_RE.sub("", line)
        sentences.append(line)
    return sentences

# ----------------------------------------------------
# Build word index + frequency dictionaries
# ----------------------------------------------------
def build_dictionaries(sentences):
    """
    Returns:
      - sentence_dict: {id: sentence}
      - word_index: {word: [sentence_ids]}
      - freq_dict: {word: count}
    """
    sentence_dict = {}
    word_index = {}
    freq_dict = {}
    for idx, sentence in enumerate(sentences):
        sentence_dict[idx] = sentence
        words = re.findall(r"\b\w+\b", sentence)
        for word in words:
            lw = word.lower()
            freq_dict[lw] = freq_dict.get(lw, 0) + 1
            word_index.setdefault(lw, []).append(idx)
    return sentence_dict, word_index, freq_dict

# ----------------------------------------------------
# Filter words based on familiarity and level
# ----------------------------------------------------
def filter_words(freq_dict, familiarity="once", level="beginner"):
    """
    Returns a list of candidate words.
    """
    # Simple example rules; adjust as needed
    min_count = {"once": 1, "twice": 2, "more": 3}.get(familiarity, 1)
    candidates = [w for w, c in freq_dict.items() if c >= min_count]

    if level == "beginner":
        candidates = [w for w in candidates if len(w) <= 6]
    elif level == "intermediate":
        candidates = [w for w in candidates if len(w) > 3]

    return candidates

# ----------------------------------------------------
# Debug output
# ----------------------------------------------------
def debug_output(sentences, freq_dict):
    with open("debug_sentences.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(sentences))
    with open("debug_frequencies.txt", "w", encoding="utf-8") as f:
        for word, count in sorted(freq_dict.items(), key=lambda x: -x[1]):
            f.write(f"{word}: {count}\n")

# ----------------------------------------------------
# Generate worksheet (PDF/DOCX)
# ----------------------------------------------------
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
            blanked_once = False
            for token in parts:
                if CHINESE_RE.search(token):
                    new_parts.append(token)
                else:
                    if not blanked_once:
                        pattern = re.compile(rf"(?<!\w){re.escape(word)}(?!\w)", re.IGNORECASE)
                        token, count = pattern.subn("________________________", token, count=1)
                        if count > 0:
                            blanked_once = True
                    new_parts.append(token)
            blanked = ''.join(new_parts)
        else:
            pattern = re.compile(rf"(?<!\w){re.escape(word)}(?!\w)", re.IGNORECASE)
            blanked = pattern.sub("________________________", blanked, count=1)

        worksheet.append(blanked)
        word_bank.append(word)
        used_sentences.add(sid)

    random.shuffle(word_bank)
    return worksheet, word_bank

# ----------------------------------------------------
# Generate worksheet for web (drag-and-drop)
# ----------------------------------------------------
def generate_worksheet_web(sentence_dict, word_index, word_list, num_words=12, bilingual_mode=False):
    """
    Returns a data structure for interactive web output:
      - worksheet: list of sentences with blanks
      - word_bank: list of words to drag
    """
    return generate_worksheet(sentence_dict, word_index, word_list, num_words, bilingual_mode)

# ----------------------------------------------------
# Save as PDF
# ----------------------------------------------------
def save_as_pdf(file_path, worksheet, word_bank):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    c = canvas.Canvas(file_path, pagesize=letter)
    width, height = letter
    y = height - 50

    c.setFont("Helvetica", 12)
    for line in worksheet:
        c.drawString(50, y, line)
        y -= 20
        if y < 50:
            c.showPage()
            y = height - 50
    c.showPage()
    c.save()

# ----------------------------------------------------
# Save as DOCX
# ----------------------------------------------------
def save_as_docx(file_path, worksheet, word_bank):
    from docx import Document

    doc = Document()
    for line in worksheet:
        doc.add_paragraph(line)
    doc.save(file_path)
