# src/storage_manager.py
import os
import hashlib
from typing import Dict, List
from appwrite.services.storage import Storage
from appwrite.id import ID
from appwrite.input_file import InputFile


class StorageManager:
    """Manages file operations with Appwrite storage, with deduplication support"""

    def __init__(self, storage: Storage, db_manager, context=None):
        self.storage = storage
        self.db_manager = db_manager
        self.context = context
        self.project_id = os.environ.get("APPWRITE_PROJECT_ID")
        self.endpoint = os.environ.get("APPWRITE_ENDPOINT")

        if self.context:
            self.context.log(
                f"StorageManager initialized with db_manager: {self.db_manager is not None}"
            )

        if self.db_manager is None:
            if self.context:
                self.context.log("ERROR: db_manager is None in StorageManager.__init__")
            raise ValueError("db_manager cannot be None")

    def _log(self, message: str):
        if self.context:
            self.context.log(message)

    def _error(self, message: str):
        if self.context:
            self.context.log(f"ERROR: {message}")

    def _calculate_hash(self, data: bytes) -> str:
        """Calculate SHA-256 hash of image data"""
        return hashlib.sha256(data).hexdigest()

    def _get_file_url(self, bucket_id: str, file_id: str) -> str:
        """Generate file URL"""
        return f"{self.endpoint}/storage/buckets/{bucket_id}/files/{file_id}/view?project={self.project_id}"

    def save_images(
        self, images: List[Dict], document_id: str, bucket_id: str, user_id: str = None
    ) -> List[Dict]:
        """
        Save images to Appwrite storage with deduplication and return URLs
        Args:
            images: List of image dicts with 'data', 'page', 'ext', etc.
            document_id: ID of the document being processed
            bucket_id: Appwrite storage bucket ID
            user_id: User ID for deduplication
        """
        if self.db_manager is None:
            self._error("db_manager is None in save_images")
            return []

        # Ensure user_id is never None
        effective_user_id = user_id or document_id

        image_urls = []

        for i, image in enumerate(images):
            try:
                # Calculate content hash
                content_hash = self._calculate_hash(image["data"])

                # Check if image already exists using DatabaseManager
                existing_image = None
                if effective_user_id:
                    existing_image = self.db_manager.find_existing_image(
                        content_hash, effective_user_id
                    )

                if existing_image:
                    # Reuse existing image
                    image_urls.append(
                        {
                            "id": existing_image["fileId"],
                            "url": existing_image["imageUrl"],
                            "name": existing_image["fileName"],
                            "ocrText": existing_image.get("ocrText", ""),
                            "page": image["page"],
                            "width": existing_image.get("width", 0),
                            "height": existing_image.get("height", 0),
                            "reused": True,
                        }
                    )
                else:
                    # Upload new image
                    file_name = f"{document_id}_page{image['page']}_img{i}_{content_hash[:8]}.{image['ext']}"
                    input_file = InputFile.from_bytes(image["data"], filename=file_name)
                    file_response = self.storage.create_file(
                        bucket_id=bucket_id,
                        file_id=ID.unique(),
                        file=input_file,
                        permissions=['read("any")'],
                    )
                    file_url = self._get_file_url(bucket_id, file_response["$id"])

                    # Save metadata using DatabaseManager
                    success = self.db_manager.save_image_metadata(
                        file_id=file_response["$id"],
                        content_hash=content_hash,
                        user_id=effective_user_id,
                        file_name=file_name,
                        image_url=file_url,
                        page=image["page"],
                        ocr_text=image.get("ocr_text", ""),
                        width=image.get("width", 0),
                        height=image.get("height", 0),
                    )

                    if success:
                        self._log(
                            f"Successfully saved metadata for image {file_response['$id']}"
                        )
                    else:
                        self._error(
                            f"Failed to save metadata for image {file_response['$id']}"
                        )

                    image_urls.append(
                        {
                            "id": file_response["$id"],
                            "url": file_url,
                            "name": file_name,
                            "ocrText": image.get("ocr_text", ""),
                            "page": image["page"],
                            "width": image.get("width", 0),
                            "height": image.get("height", 0),
                            "reused": False,
                        }
                    )
            except Exception as e:
                self._error(f"Failed to process image {i}: {str(e)}")
                continue

        return image_urls

    def cleanup_orphaned_images(self, document_id: str) -> int:
        """
        Clean up images for a specific document
        Returns number of images deleted
        """
        if not self.db_manager:
            self._error("DatabaseManager not available for cleanup")
            return 0

        return self.db_manager.cleanup_orphaned_images(document_id)
