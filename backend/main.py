from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import shutil
import os
import worksheet_generator  # your existing script

app = FastAPI()

# Allow frontend access (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories for uploads and outputs
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Serve output files to frontend
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

@app.post("/generate")
async def generate(
    subtitle_file: UploadFile = File(...),
    level: str = Form(...),            # "beginner" or "intermediate"
    familiarity: str = Form(...),      # "once", "twice", or "more"
    output_format: str = Form(...),    # "pdf" or "docx"
    bilingual: bool = Form(False),     # True or False
    debug: bool = Form(False)          # True or False
):
    # Save uploaded file
    file_location = os.path.join(UPLOAD_DIR, subtitle_file.filename)
    with open(file_location, "wb") as f:
        shutil.copyfileobj(subtitle_file.file, f)

    # Parse subtitles
    sentences = worksheet_generator.parse_subtitles(file_location, bilingual_mode=bilingual)
    sentence_dict, word_index, freq_dict = worksheet_generator.build_dictionaries(sentences)

    # Optionally write debug files
    if debug:
        worksheet_generator.debug_output(sentences, freq_dict)

    # Filter words and generate worksheet
    candidate_words = worksheet_generator.filter_words(freq_dict, familiarity.lower(), level.lower())
    worksheet, word_bank = worksheet_generator.generate_worksheet(
        sentence_dict, word_index, candidate_words, bilingual_mode=bilingual
    )

    # Save output to outputs directory
    output_filename = f"worksheet.{output_format.lower()}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    if output_format.lower() == "pdf":
        worksheet_generator.save_as_pdf(output_path, worksheet, word_bank)
    else:
        worksheet_generator.save_as_docx(output_path, worksheet, word_bank)

    # Return URL for frontend to download
    return {
        "message": "Worksheet generated",
        "file_url": f"/outputs/{output_filename}"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


