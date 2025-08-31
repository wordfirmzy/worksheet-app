# main.py
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import os
import shutil
import tempfile
from typing import Optional
import uuid

import worksheet_generator  # your existing script (unchanged)

app = FastAPI(title="Worksheet Backend", version="1.0.0")

# ----------------------------------------------------
# CORS (adjust in production)
# ----------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # lock this down to your frontend origin in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# Helpers
# ----------------------------------------------------
def _save_upload_to_temp(upload: UploadFile) -> str:
    """Save uploaded file to a secure temp path and return the path."""
    _, ext = os.path.splitext(upload.filename or "")
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext or ".tmp")
    with tmp as f:
        shutil.copyfileobj(upload.file, f)
    return tmp.name

def _cleanup(path: Optional[str]) -> None:
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except Exception:
            pass

# ----------------------------------------------------
# Health check
# ----------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# ----------------------------------------------------
# Generate endpoint
# ----------------------------------------------------
@app.post("/generate")
async def generate(
    background_tasks: BackgroundTasks,
    subtitle_file: UploadFile = File(...),

    # core controls
    level: str = Form(...),            # "beginner" | "intermediate"
    familiarity: str = Form(...),      # "once" | "twice" | "more"
    output_format: str = Form(...),    # "pdf" | "docx" | "web"

    # options
    bilingual: bool = Form(False),
    debug: bool = Form(False),
):
    """
    Returns:
      - If output_format == 'pdf' or 'docx': a file download
      - If output_format == 'web': JSON { worksheet: [...], word_bank: [...], bilingual: bool }
    """
    # 1) Save upload to a temp file
    src_path = _save_upload_to_temp(subtitle_file)

    try:
        # 2) Parse + index
        sentences = worksheet_generator.parse_subtitles(src_path, bilingual_mode=bilingual)
        sentence_dict, word_index, freq_dict = worksheet_generator.build_dictionaries(sentences)

        if debug:
            worksheet_generator.debug_output(sentences, freq_dict)

        # 3) Filter + generate
        candidate_words = worksheet_generator.filter_words(
            freq_dict, familiarity.lower(), level.lower()
        )
        worksheet, word_bank = worksheet_generator.generate_worksheet(
            sentence_dict, word_index, candidate_words, bilingual_mode=bilingual
        )

        fmt = output_format.lower().strip()
        if fmt == "web":
            # Add unique blank IDs for frontend drag-and-drop
            structured_worksheet = []
            for sent in worksheet:
                structured_sentence = []
                for token in sent:
                    if token.get("is_blank"):
                        token["blankId"] = str(uuid.uuid4())
                    structured_sentence.append(token)
                structured_worksheet.append(structured_sentence)

            return JSONResponse(
                {
                    "message": "ok",
                    "worksheet": structured_worksheet,
                    "word_bank": word_bank,
                    "bilingual": bilingual,
                }
            )

        # 4b) Produce a file (PDF or DOCX) and stream it
        out_suffix = ".pdf" if fmt == "pdf" else ".docx" if fmt == "docx" else None
        if out_suffix is None:
            raise HTTPException(status_code=400, detail="Invalid output_format. Use pdf | docx | web.")

        out_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=out_suffix)
        out_tmp_path = out_tmp.name
        out_tmp.close()  # we'll write via worksheet_generator, not this handle

        if fmt == "pdf":
            worksheet_generator.save_as_pdf(out_tmp_path, worksheet, word_bank)
            download_name = "worksheet.pdf"
        else:
            worksheet_generator.save_as_docx(out_tmp_path, worksheet, word_bank)
            download_name = "worksheet.docx"

        # clean up the file after the response is sent
        background_tasks.add_task(_cleanup, out_tmp_path)

        return FileResponse(
            path=out_tmp_path,
            media_type="application/pdf" if fmt == "pdf" else
                       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=download_name,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate worksheet: {e}") from e
    finally:
        _cleanup(src_path)
