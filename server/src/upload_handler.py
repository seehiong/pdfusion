import os
import re
from typing import Dict, Any, Optional, Tuple
from datetime import datetime

# Appwrite imports with safe handling
try:
    from appwrite.client import Client
    from appwrite.services.databases import Databases
    from appwrite.services.storage import Storage
    from appwrite.input_file import InputFile
    from appwrite.id import ID

    APPWRITE_AVAILABLE = True
except ImportError:
    APPWRITE_AVAILABLE = False
    print("Appwrite SDK not available")

from .database_manager import DatabaseManager


class UploadHandler:
    """
    Handles PDF file upload operations with automatic bucket management
    """

    def __init__(self, context=None):
        self.context = context

    def _log(self, message: str):
        """Log message if context is available"""
        if self.context:
            self.context.log(message)

    def _error(self, message: str):
        """Log error message if context is available"""
        if self.context:
            self.context.log(f"ERROR: {message}")

    def parse_multipart_data(
        self, body_binary: bytes, content_type: str
    ) -> Tuple[Optional[bytes], str]:
        """
        Parse multipart/form-data to extract file data and filename
        """
        try:
            # Extract boundary from content-type header
            boundary_match = re.search(r"boundary=([^;]+)", content_type)
            if not boundary_match:
                self._error("No boundary found in content-type header")
                return None, "uploaded.pdf"

            boundary = boundary_match.group(1).strip("-")
            self._log(f"Boundary extracted: {boundary}")

            # Split the body by boundary
            boundary_bytes = f"--{boundary}".encode()
            parts = body_binary.split(boundary_bytes)

            for part in parts:
                if not part.strip():
                    continue

                # Look for the file part
                if b"Content-Disposition: form-data" in part and b"filename=" in part:
                    # Split headers and content
                    if b"\r\n\r\n" in part:
                        headers_section, file_content = part.split(b"\r\n\r\n", 1)
                    elif b"\n\n" in part:
                        headers_section, file_content = part.split(b"\n\n", 1)
                    else:
                        continue

                    # Clean up file content (remove trailing boundary markers)
                    file_content = file_content.rstrip(b"\r\n-")

                    # Extract filename from headers
                    headers_str = headers_section.decode("utf-8", errors="ignore")
                    filename_match = re.search(r'filename="([^"]+)"', headers_str)

                    if filename_match:
                        filename = filename_match.group(1)
                        self._log(f"Extracted filename from multipart: {filename}")
                        return file_content, filename
                    else:
                        # Try without quotes
                        filename_match = re.search(r"filename=([^\s;]+)", headers_str)
                        if filename_match:
                            filename = filename_match.group(1)
                            self._log(
                                f"Extracted filename (no quotes) from multipart: {filename}"
                            )
                            return file_content, filename
                        else:
                            self._log("Filename not found in Content-Disposition")
                            return file_content, "uploaded.pdf"

            self._error("No file part found in multipart data")
            return None, "uploaded.pdf"

        except Exception as e:
            self._error(f"Error parsing multipart data: {str(e)}")
            return None, "uploaded.pdf"

    def extract_file_data(self, request) -> Tuple[Optional[bytes], str]:
        """
        Extract file data from various request formats
        Returns: (file_data, filename)
        """
        pdf_data = None
        original_filename = "uploaded.pdf"

        # Debug: Log available request attributes (with error handling)
        try:
            self._log(f"Request attributes: {dir(request)}")
            headers = getattr(request, "headers", {})
            content_type = headers.get("content-type", "unknown")
            self._log(f"Request content type: {content_type}")
        except UnicodeDecodeError:
            self._log("Warning: Could not log request attributes due to binary data")
            headers = {}
            content_type = "unknown"

        # First, try to get from JSON payload (base64 encoded file)
        try:
            body = getattr(request, "body", None)
            if body:
                if isinstance(body, str):
                    import json

                    json_data = json.loads(body)
                elif isinstance(body, dict):
                    json_data = body
                else:
                    json_data = None

                if (
                    json_data
                    and "file" in json_data
                    and isinstance(json_data["file"], str)
                ):
                    # Base64 encoded file
                    import base64

                    pdf_data = base64.b64decode(json_data["file"])
                    original_filename = json_data.get("filename", "uploaded.pdf")
                    self._log(
                        f"File received via base64 JSON payload, size: {len(pdf_data)} bytes, filename: {original_filename}"
                    )
                    return pdf_data, original_filename
        except Exception as e:
            self._log(f"Error parsing JSON payload: {str(e)}")

        # First, try to get from files (multipart/form-data)
        try:
            files = getattr(request, "files", {})
            self._log(
                f"Available files keys: {list(files.keys()) if files else 'None'}"
            )
        except UnicodeDecodeError:
            files = {}
            self._log("Warning: Could not access files due to binary data")

        if files and "file" in files:
            uploaded_file = files["file"]
            # Get the binary data directly
            pdf_data = uploaded_file["data"]  # This should already be bytes
            original_filename = uploaded_file.get("filename", "uploaded.pdf")
            self._log(
                f"File received via files object, size: {len(pdf_data)} bytes, filename: {original_filename}"
            )
            return pdf_data, original_filename

        else:
            # Try different body attributes for Appwrite functions
            self._log("Files not found, trying body attributes...")

            # Check if this is multipart/form-data
            if "multipart/form-data" in content_type:
                # Try body_binary first for multipart data
                body_binary = getattr(request, "body_binary", None)
                if body_binary:
                    self._log(
                        f"Parsing multipart data from body_binary, size: {len(body_binary)} bytes"
                    )
                    pdf_data, original_filename = self.parse_multipart_data(
                        body_binary, content_type
                    )
                    if pdf_data:
                        self._log(
                            f"Multipart parsing successful, filename: {original_filename}"
                        )
                        return pdf_data, original_filename

                # Try body_raw if body_binary failed
                body_raw = getattr(request, "body_raw", None)
                if body_raw:
                    self._log(
                        f"Parsing multipart data from body_raw, size: {len(body_raw)} bytes"
                    )
                    pdf_data, original_filename = self.parse_multipart_data(
                        body_raw, content_type
                    )
                    if pdf_data:
                        self._log(
                            f"Multipart parsing successful, filename: {original_filename}"
                        )
                        return pdf_data, original_filename

            # Fallback to original method for non-multipart data
            body_binary = getattr(request, "body_binary", None)
            if body_binary:
                pdf_data = body_binary
                self._log(f"File received via body_binary, size: {len(pdf_data)} bytes")
            else:
                # Try body_raw
                body_raw = getattr(request, "body_raw", None)
                if body_raw:
                    pdf_data = body_raw
                    self._log(
                        f"File received via body_raw, size: {len(pdf_data)} bytes"
                    )
                else:
                    # Try regular body as last resort
                    body = getattr(request, "body", None)
                    if body and isinstance(body, bytes):
                        pdf_data = body
                        self._log(
                            f"File received via body, size: {len(pdf_data)} bytes"
                        )

        # Try to extract filename from headers if we still have the default
        if original_filename == "uploaded.pdf":
            try:
                # Log all headers for debugging
                self._log(f"Available headers: {list(headers.keys())}")

                # Try Content-Disposition header first
                content_disposition = headers.get("content-disposition", "")
                if content_disposition and "filename=" in content_disposition:
                    # Extract filename from Content-Disposition header
                    # Format: attachment; filename="filename.pdf"
                    filename_part = content_disposition.split("filename=")[-1]
                    # Remove quotes and any trailing parameters
                    filename_part = filename_part.split(";")[0].strip("\"' ")
                    self._log(
                        f"Raw filename from Content-Disposition: '{filename_part}'"
                    )

                    # Clean up and validate the filename
                    if filename_part:
                        # Remove any path components and clean up
                        filename_part = filename_part.split("/")[-1].split("\\")[-1]
                        filename_part = re.sub(r"[^\w\-_\.]", "", filename_part)

                        if filename_part and len(filename_part) > 0:
                            # Ensure it has a .pdf extension if it doesn't have one
                            if not filename_part.lower().endswith(".pdf"):
                                filename_part += ".pdf"
                            original_filename = filename_part
                            self._log(f"Final extracted filename: {original_filename}")
                        else:
                            self._log("Filename was empty after cleanup")

                # Try other common filename headers if Content-Disposition didn't work
                elif headers.get("x-filename"):
                    filename_part = headers.get("x-filename")
                    self._log(f"Filename from x-filename header: '{filename_part}'")
                    if filename_part:
                        original_filename = filename_part
                elif headers.get("filename"):
                    filename_part = headers.get("filename")
                    self._log(f"Filename from filename header: '{filename_part}'")
                    if filename_part:
                        original_filename = filename_part
                else:
                    self._log("No filename found in headers")

            except UnicodeDecodeError:
                self._log(
                    "Warning: Could not extract filename from headers due to encoding issues"
                )
            except Exception as e:
                self._log(f"Warning: Error extracting filename from headers: {str(e)}")

        return pdf_data, original_filename

    def validate_file_data(self, pdf_data: bytes) -> bool:
        """
        Validate the uploaded file data
        """
        if not pdf_data:
            return False

        # Validate PDF signature (optional but good practice)
        if len(pdf_data) > 4 and not pdf_data.startswith(b"%PDF"):
            self._log(
                "Warning: File doesn't start with PDF signature, but proceeding anyway"
            )

        self._log(f"Final file size: {len(pdf_data)} bytes")
        return True

    def get_request_metadata(self, request) -> Tuple[str, str]:
        """
        Extract user ID and bucket ID from request headers
        """
        # Get user ID from headers or use default (with error handling)
        try:
            headers = getattr(request, "headers", {})
            user_id = headers.get("x-user-id", "default-user")
            bucket_id = headers.get("x-bucket-id", "pdf-files")
        except UnicodeDecodeError:
            # If headers can't be decoded, use defaults
            self._log("Warning: Could not decode headers, using defaults")
            user_id = "default-user"
            bucket_id = "pdf-files"

        self._log(f"User ID: {user_id}")
        self._log(f"Bucket ID: {bucket_id}")

        return user_id, bucket_id

    def ensure_bucket_exists(self, storage, db_manager, bucket_id: str) -> bool:
        """
        Ensure the storage bucket exists, create if necessary
        """
        bucket_created = db_manager.create_bucket_if_not_exists(
            storage, bucket_id, f"PDF Files - {bucket_id}"
        )
        if not bucket_created:
            # List available buckets for debugging
            available_buckets = db_manager.list_buckets(storage)
            self._error(f"Failed to create or access bucket '{bucket_id}'")
            self._log(f"Available buckets: {available_buckets}")
            return False
        return True

    def upload_file_to_storage(
        self,
        storage,
        pdf_data: bytes,
        user_id: str,
        original_filename: str,
        bucket_id: str,
    ) -> Optional[Dict]:
        """
        Upload file to Appwrite storage
        """
        file_name = (
            f"{user_id}_{int(datetime.utcnow().timestamp())}_{original_filename}"
        )

        try:
            input_file = InputFile.from_bytes(pdf_data, filename=file_name)
            file_response = storage.create_file(
                bucket_id=bucket_id,
                file_id=ID.unique(),
                file=input_file,
                permissions=['read("any")'],
            )
            self._log(f"File uploaded to storage with ID: {file_response['$id']}")
            return file_response
        except Exception as e:
            self._error(f"Failed to upload file to storage: {str(e)}")
            return None

    def create_document_record(
        self, db_manager, user_id: str, original_filename: str, file_id: str
    ) -> Optional[str]:
        """
        Create document record in database
        """
        try:
            document_id = db_manager.create_document(
                user_id=user_id, original_file_name=original_filename, file_id=file_id
            )
            self._log(f"Document record created with ID: {document_id}")
            return document_id
        except Exception as e:
            self._error(f"Failed to create document record: {str(e)}")
            return None

    def cleanup_failed_upload(self, storage, bucket_id: str, file_id: str):
        """
        Clean up uploaded file if document creation fails
        """
        try:
            storage.delete_file(bucket_id, file_id)
            self._log("Cleaned up uploaded file due to database error")
        except Exception as e:
            self._error(f"Failed to cleanup file {file_id}: {str(e)}")

    def handle_upload(self, request) -> Dict[str, Any]:
        """
        Main upload handling method
        """
        try:
            # Check required dependencies
            if not APPWRITE_AVAILABLE:
                return {
                    "error": "Appwrite SDK is required but not available",
                    "solution": "Install with: pip install appwrite",
                }

            # Initialize Appwrite client
            client = Client()
            client.set_endpoint(os.environ.get("APPWRITE_ENDPOINT"))
            client.set_project(os.environ.get("APPWRITE_PROJECT_ID"))
            client.set_key(os.environ.get("APPWRITE_API_KEY"))
            databases = Databases(client)
            storage = Storage(client)

            # Initialize DatabaseManager
            db_manager = DatabaseManager(databases, self.context)

            # Extract file data
            pdf_data, original_filename = self.extract_file_data(request)

            if not pdf_data:
                return {
                    "error": "No file data found in request",
                    "usage": "Send PDF file as multipart/form-data with key 'file'",
                    "debug": {
                        "has_files": bool(getattr(request, "files", {})),
                        "has_body_binary": bool(getattr(request, "body_binary", None)),
                        "has_body_raw": bool(getattr(request, "body_raw", None)),
                        "has_body": bool(getattr(request, "body", None)),
                    },
                }

            # Validate file data
            if not self.validate_file_data(pdf_data):
                return {
                    "error": "Invalid file data",
                    "usage": "Ensure the uploaded file is not empty",
                }

            # Get request metadata
            user_id, bucket_id = self.get_request_metadata(request)

            # Ensure bucket exists
            if not self.ensure_bucket_exists(storage, db_manager, bucket_id):
                available_buckets = db_manager.list_buckets(storage)
                return {
                    "error": f"Failed to create or access bucket '{bucket_id}'",
                    "available_buckets": available_buckets,
                    "suggestion": "Either create the bucket manually in Appwrite console or use one of the available buckets listed above",
                }

            # Upload file to storage
            file_response = self.upload_file_to_storage(
                storage, pdf_data, user_id, original_filename, bucket_id
            )
            if not file_response:
                return {"error": "Failed to upload file to storage"}

            # Create document record
            document_id = self.create_document_record(
                db_manager, user_id, original_filename, file_response["$id"]
            )
            if not document_id:
                # Clean up the uploaded file
                self.cleanup_failed_upload(storage, bucket_id, file_response["$id"])
                return {"error": "Failed to create document record"}

            return {
                "success": True,
                "message": "PDF uploaded successfully",
                "documentId": document_id,
                "fileId": file_response["$id"],
                "fileName": f"{user_id}_{int(datetime.utcnow().timestamp())}_{original_filename}",
                "bucketId": bucket_id,
                "originalFileName": original_filename,  # Added this for clarity
            }

        except Exception as e:
            self._error(f"Error in upload handler: {str(e)}")
            return {
                "error": "File upload failed",
                "message": str(e),
                "type": type(e).__name__,
            }
