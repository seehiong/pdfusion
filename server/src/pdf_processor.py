# server/src/pdf_processor.py
import os
import uuid
from typing import Dict, List
from datetime import datetime
import pymupdf as fitz
from .table_extractor import TableExtractor
from .pdf_extractor import PDFExtractor
from .markdown_generator import MarkdownGenerator
from .vision_processor import VisionProcessor


class PDFProcessor:
    """
    Handles PDF processing operations locally with Postgres/SQLite
    """

    def __init__(self, db_session, storage_dir="outputs"):
        self.db = db_session
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)

        self.pdf_extractor = PDFExtractor()
        self.markdown_generator = MarkdownGenerator()
        self.vision_processor = VisionProcessor()
        self.table_extractor = TableExtractor()

    def process_document(self, doc_id: str):
        """
        Main processing pipeline for local execution
        """
        from models import Document

        doc = self.db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            print(f"Error: Document {doc_id} not found in DB")
            return

        try:
            # Update status to processing
            doc.status = "processing"
            doc.processed_at = datetime.utcnow()
            self.db.commit()

            # Read PDF file from local disk
            with open(doc.file_path, "rb") as f:
                pdf_data = f.read()

            # Extract content from PDF
            print(f"Extracting content from {doc.filename}...")
            extracted_data = self.pdf_extractor.extract_content(pdf_data)

            # Enhanced table extraction
            try:
                tables = self.table_extractor.extract_tables_from_pdf(pdf_data)
                extracted_data["tables"] = tables
            except Exception as e:
                print(f"Table extraction failed: {e}")

            # Process images with OCR (Ollama/LiteLLM)
            extracted_data = self.vision_processor.process_images_with_ocr(
                extracted_data
            )

            # Save extracted images to local disk and DB
            image_metadata = self._save_images_locally(
                extracted_data.get("images", []), doc_id
            )

            # Generate Markdown
            markdown_content = self.markdown_generator.generate(
                extracted_data, image_metadata
            )

            # Update document with results
            doc.status = "completed"
            doc.markdown_content = markdown_content
            doc.table_count = len(extracted_data.get("tables", []))
            doc.image_count = len(image_metadata)
            doc.error_message = None
            self.db.commit()

            return {
                "success": True,
                "documentId": doc_id,
                "markdownContent": markdown_content,
                "tableCount": doc.table_count,
                "imageCount": doc.image_count,
            }

        except Exception as e:
            print(f"Process failed: {str(e)}")
            import traceback

            traceback.print_exc()
            doc.status = "failed"
            doc.error_message = str(e)
            self.db.commit()
            raise e

    def _save_images_locally(self, images: List[Dict], doc_id: str) -> List[Dict]:
        """
        Save images to local filesystem and record in Postgres/SQLite
        """
        from models import Image

        image_metadata = []

        for img in images:
            img_id = str(uuid.uuid4())
            ext = img.get("ext", "png")
            img_filename = f"{img_id}.{ext}"
            img_path = os.path.join(self.storage_dir, img_filename)

            # Save to disk
            with open(img_path, "wb") as f:
                f.write(img["data"])

            # Save metadata to DB
            db_img = Image(
                id=img_id,
                document_id=doc_id,
                file_path=img_path,
                page_number=img.get("page", 1),
                ocr_text=img.get("ocr_text", ""),
            )
            self.db.add(db_img)

            # Prepare URL for frontend (serving via static files in FastAPI)
            # Assuming files indexed from /static/
            image_metadata.append(
                {
                    "id": img_id,
                    "url": f"/api/files/{img_id}.{ext}",
                    "caption": f"Image from page {img.get('page', 1)}",
                    "ocr_text": img.get("ocr_text", ""),
                }
            )

        self.db.commit()
        return image_metadata
