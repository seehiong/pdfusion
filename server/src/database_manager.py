# src/database_manager.py
import os
from typing import Dict, Optional
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.query import Query


class DatabaseManager:
    """Manages database operations for PDF processing"""

    def __init__(self, databases: Databases, context=None):
        self.databases = databases
        self.context = context
        self.database_id = os.environ.get("APPWRITE_DATABASE_ID")
        self.documents_collection_id = os.environ.get(
            "APPWRITE_DOCUMENTS_COLLECTION_ID", "documents"
        )
        self.tables_collection_id = os.environ.get(
            "APPWRITE_TABLES_COLLECTION_ID", "tables"
        )
        self.images_collection_id = os.environ.get(
            "APPWRITE_IMAGES_COLLECTION_ID", "images"
        )

    def list_buckets(self, storage):
        """List available storage buckets"""
        try:
            result = storage.list_buckets()
            buckets = result.get("buckets", [])
            bucket_ids = [bucket["$id"] for bucket in buckets]
            if self.context:
                self.context.log(f"Available buckets: {bucket_ids}")
            return bucket_ids
        except Exception as e:
            if self.context:
                self._error(f"Failed to list buckets: {str(e)}")
            return []

    def create_bucket_if_not_exists(self, storage, bucket_id: str, name: str = None):
        """Create a storage bucket if it doesn't exist"""
        try:
            # Try to get the bucket first
            storage.get_bucket(bucket_id)
            if self.context:
                self.context.log(f"Bucket '{bucket_id}' already exists")
            return True
        except Exception:
            # Bucket doesn't exist, try to create it
            try:
                if name is None:
                    name = bucket_id
                storage.create_bucket(
                    bucket_id=bucket_id,
                    name=name,
                    permissions=['read("any")', 'write("any")'],
                    file_security=False,
                    enabled=True,
                    maximum_file_size=10485760,  # 10MB
                    allowed_file_extensions=["pdf", "jpg", "jpeg", "png", "gif"],
                    compression="gzip",
                    encryption=True,
                    antivirus=True,
                )
                if self.context:
                    self.context.log(f"Created bucket '{bucket_id}'")
                return True
            except Exception as e:
                if self.context:
                    self._error(f"Failed to create bucket '{bucket_id}': {str(e)}")
                return False

    def _log(self, message: str):
        if self.context:
            self.context.log(message)

    def _error(self, message: str):
        if self.context:
            self.context.log(f"ERROR: {message}")

    def create_document(
        self, user_id: str, original_file_name: str, file_id: str, **kwargs
    ) -> str:
        """Create a new document in database"""
        try:
            data = {
                "userId": user_id,
                "originalFileName": original_file_name,
                "fileId": file_id,
                "status": "uploaded",
                **kwargs,
            }

            document = self.databases.create_document(
                database_id=self.database_id,
                collection_id=self.documents_collection_id,
                document_id=ID.unique(),
                data=data,
            )

            self._log(f"Created new document with ID: {document['$id']}")
            return document["$id"]

        except Exception as e:
            self._error(f"Failed to create document: {str(e)}")
            raise

    def update_document_status(self, document_id: str, **kwargs):
        """Update document status in database"""
        try:
            self.databases.update_document(
                database_id=self.database_id,
                collection_id=self.documents_collection_id,
                document_id=document_id,
                data=kwargs,
            )
        except Exception as e:
            self._error(f"Failed to update document status: {str(e)}")
            raise

    def get_document(self, document_id: str) -> Optional[Dict]:
        """Get document by ID"""
        try:
            document = self.databases.get_document(
                database_id=self.database_id,
                collection_id=self.documents_collection_id,
                document_id=document_id,
            )
            return document
        except Exception as e:
            self._error(f"Failed to get document {document_id}: {str(e)}")
            return None

    def find_existing_image(self, content_hash: str, user_id: str) -> Optional[Dict]:
        """Find existing image by content hash for the user"""
        try:
            result = self.databases.list_documents(
                database_id=self.database_id,
                collection_id=self.images_collection_id,
                queries=[
                    Query.equal("contentHash", content_hash),
                    Query.equal("userId", user_id),
                ],
            )
            if result["documents"]:
                return result["documents"][0]
            else:
                return None
        except Exception as e:
            self._error(f"Failed to check for existing image: {str(e)}")
            return None

    def save_image_metadata(
        self,
        file_id: str,
        content_hash: str,
        user_id: str,
        file_name: str,
        image_url: str,
        page: int,
        ocr_text: str = "",
        width: int = 0,
        height: int = 0,
    ) -> bool:
        """Save image metadata to database"""
        try:
            data = {
                "userId": user_id,
                "fileId": file_id,
                "contentHash": content_hash,
                "fileName": file_name,
                "imageUrl": image_url,
                "page": page,
                "ocrText": ocr_text,
                "width": width,
                "height": height,
                "createdAt": None,  # auto-populated
            }

            self.databases.create_document(
                database_id=self.database_id,
                collection_id=self.images_collection_id,
                document_id=ID.unique(),
                data=data,
            )

            return True
        except Exception as e:
            self._error(f"Failed to save image metadata: {str(e)}")
            self._error(f"Error type: {type(e)}")
            return False

    def ensure_images_collection_exists(self):
        """Check if the images collection exists and create it if it doesn't"""
        try:
            # Try to get the collection
            self.databases.get_collection(
                database_id=self.database_id, collection_id=self.images_collection_id
            )
            return True
        except Exception as e:
            self._error(
                f"Images collection {self.images_collection_id} does not exist or is not accessible: {str(e)}"
            )

            # Try to create the collection
            try:
                self.databases.create_collection(
                    database_id=self.database_id,
                    collection_id=self.images_collection_id,
                    name=self.images_collection_id,
                    permissions=['read("any")', 'write("any")'],
                    document_security=False,
                )

                # Add attributes
                attributes = [
                    {"key": "userId", "type": "string", "size": 255, "required": True},
                    {"key": "fileId", "type": "string", "size": 255, "required": True},
                    {
                        "key": "contentHash",
                        "type": "string",
                        "size": 64,
                        "required": True,
                    },
                    {
                        "key": "fileName",
                        "type": "string",
                        "size": 255,
                        "required": True,
                    },
                    {
                        "key": "imageUrl",
                        "type": "string",
                        "size": 1000,
                        "required": True,
                    },
                    {"key": "page", "type": "integer", "required": True},
                    {
                        "key": "ocrText",
                        "type": "string",
                        "size": 100000,
                        "required": False,
                    },
                    {"key": "width", "type": "integer", "required": False},
                    {"key": "height", "type": "integer", "required": False},
                    {"key": "createdAt", "type": "datetime", "required": False},
                ]

                for attr in attributes:
                    try:
                        if attr["type"] == "string":
                            self.databases.create_string_attribute(
                                database_id=self.database_id,
                                collection_id=self.images_collection_id,
                                key=attr["key"],
                                size=attr["size"],
                                required=attr["required"],
                            )
                        elif attr["type"] == "integer":
                            self.databases.create_integer_attribute(
                                database_id=self.database_id,
                                collection_id=self.images_collection_id,
                                key=attr["key"],
                                required=attr["required"],
                            )
                        elif attr["type"] == "datetime":
                            self.databases.create_datetime_attribute(
                                database_id=self.database_id,
                                collection_id=self.images_collection_id,
                                key=attr["key"],
                                required=attr["required"],
                            )
                    except Exception as e:
                        self._error(
                            f"Failed to create attribute {attr['key']}: {str(e)}"
                        )

                # Add indexes
                indexes = [
                    {
                        "key": "userId_fileId",
                        "type": "key",
                        "attributes": ["userId", "fileId"],
                    },
                    {
                        "key": "contentHash",
                        "type": "key",
                        "attributes": ["contentHash"],
                    },
                    {
                        "key": "userId_contentHash",
                        "type": "key",
                        "attributes": ["userId", "contentHash"],
                    },
                ]

                for index in indexes:
                    try:
                        self.databases.create_index(
                            database_id=self.database_id,
                            collection_id=self.images_collection_id,
                            key=index["key"],
                            type=index["type"],
                            attributes=index["attributes"],
                        )
                    except Exception as e:
                        self._error(f"Failed to create index {index['key']}: {str(e)}")

                return True
            except Exception as e:
                self._error(f"Failed to create images collection: {str(e)}")
                return False
