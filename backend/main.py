from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import worksheet_generator  # your existing script

app = FastAPI()

# Allow frontend access (update allow_origins in production for security!)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # replace with your frontend URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/generate")
async def generate(
    subtitle_file: UploadFile = File(...),
    level: str = Form(...),             # "beginner" or "intermediate"
    familiarity: str = Form(...),       # "once", "twice", or "more"
    output_format: str = Form(...),     # "pdf" or "docx"
    bilingual: bool = Form(False),      # true if checkbox ticked
    debug: bool = Form(False)           # true if checkbox ticked
):
    # Save uploaded subtitle file
    file_location = os.path.join(UPLOAD_DIR, subtitle_file.filename)
    with open(file_location, "wb") as f:
        shutil.copyfileobj(subtitle_file.file, f)

    # Parse subtitles
    sentences = worksheet_generator.parse_subtitles(file_location, bilingual_mode=bilingual)
    sentence_dict, word_index, freq_dict = worksheet_generator.build_dictionaries(sentences)

    # Optional debug output
    if debug:
        worksheet_generator.debug_output(sentences, freq_dict)

    # Filter words
    candidate_words = worksheet_generator.filter_words(
        freq_dict,
        familiarity.lower(),
        level.lower()
    )

    # Generate worksheet
    worksheet, word_bank = worksheet_generator.generate_worksheet(
        sentence_dict, word_index, candidate_words, bilingual_mode=bilingual
    )

    # Save to requested format
    output_filename = f"worksheet.{output_format.lower()}"
    if output_format.lower() == "pdf":
        worksheet_generator.save_as_pdf(output_filename, worksheet, word_bank)
    else:
        worksheet_generator.save_as_docx(output_filename, worksheet, word_bank)

    # Return a JSON response to frontend
    return {"message": "Worksheet generated", "filename": output_filename}


