# src/pdf_extractor.py
import os
from typing import Dict, Any
import fitz


class PDFExtractor:
    """Handles PDF text and image extraction"""

    def __init__(self, context=None):
        self.context = context

    def _log(self, message: str):
        if self.context:
            self.context.log(message)

    def _error(self, message: str):
        if self.context:
            self.context.error(message)

    def extract_content(self, pdf_data: bytes) -> Dict[str, Any]:
        """
        Extract text and images from PDF with proper error handling
        """
        try:
            doc = fitz.open(stream=pdf_data, filetype="pdf")
            extracted_data = {"text": [], "images": []}

            for page_num in range(len(doc)):
                page = doc.load_page(page_num)

                # Extract text
                text = page.get_text()
                extracted_data["text"].append({"page": page_num + 1, "content": text})

                # Extract images
                image_list = page.get_images(full=True)
                for img_index, img in enumerate(image_list):
                    xref = img[0]
                    try:
                        base_image = doc.extract_image(xref)
                        if base_image and base_image.get("image"):
                            image_bytes = base_image["image"]
                            extracted_data["images"].append(
                                {
                                    "page": page_num + 1,
                                    "index": img_index,
                                    "data": image_bytes,
                                    "ext": base_image.get("ext", "png"),
                                    "width": base_image.get("width", 0),
                                    "height": base_image.get("height", 0),
                                }
                            )
                    except Exception as e:
                        self._error(f"Failed to extract image {xref}: {str(e)}")

                self._log(f"Page {page_num + 1}: Extracted {len(image_list)} images")

            doc.close()
            return extracted_data

        except Exception as e:
            self._error(f"PDF extraction failed: {str(e)}")
            # Return empty structure instead of raising exception
            return {"text": [], "images": []}
