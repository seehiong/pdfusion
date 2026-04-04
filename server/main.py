# server/main.py
import os
import uuid
import aiofiles
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime
from database import engine, get_db
import models
from src.pdf_processor import PDFProcessor

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PDFusion Local API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Mount static files for serving extracted images
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")


@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")

    # Save file to disk
    async with aiofiles.open(file_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    # Record in database
    db_doc = models.Document(
        id=doc_id, filename=file.filename, file_path=file_path, status="uploaded"
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    return {
        "success": True,
        "documentId": db_doc.id,
        "fileId": db_doc.id,
        "fileName": db_doc.filename,
        "originalFileName": db_doc.filename,
    }


@app.get("/api/documents/{doc_id}")
def get_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": doc.id,
        "fileName": doc.filename,
        "status": doc.status,
        "markdownContent": doc.markdown_content,
        "tableCount": doc.table_count,
        "imageCount": doc.image_count,
        "errorMessage": doc.error_message,
    }


@app.post("/api/process/{doc_id}")
async def process_document(
    doc_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Trigger background processing
    background_tasks.add_task(run_pdf_processor, doc_id)

    # Update status to processing
    doc.status = "processing"
    db.commit()

    return {"success": True, "message": "Processing started in background"}


@app.get("/api/files/{filename}")
async def get_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


def run_pdf_processor(doc_id: str):
    """
    Background task to process PDF
    """
    db = next(get_db())
    try:
        processor = PDFProcessor(db, storage_dir=OUTPUT_DIR)
        processor.process_document(doc_id)
    except Exception as e:
        print(f"Background processing failed for {doc_id}: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
