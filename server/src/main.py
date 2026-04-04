import os

# Handle PyMuPDF import with fallback
try:
    import pymupdf as fitz

    PYPDF_AVAILABLE = True
except ImportError:
    try:
        import fitz

        PYPDF_AVAILABLE = True
    except ImportError:
        PYPDF_AVAILABLE = False
        print("PyMuPDF not available")

# Try to import pandas for table processing
try:
    import pandas as pd

    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    print("Pandas not available")

# Try to import tabula for table extraction
try:
    import tabula

    TABULA_AVAILABLE = True
except ImportError:
    TABULA_AVAILABLE = False
    print("Tabula not available")

# PIL import with safe handling
try:
    from PIL import Image

    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("PIL/Pillow not available")

# Try to import other components with relative imports
try:
    from .pdf_processor import PDFProcessor
    from .upload_handler import UploadHandler

    COMPONENTS_AVAILABLE = True
except ImportError as e:
    COMPONENTS_AVAILABLE = False
    print(f"Some components not available: {e}")


def main(context):
    """
    Main function entry point for PDF processing and upload
    """
    try:
        # Debug logging
        context.log(f"Request method: {getattr(context.req, 'method', 'unknown')}")
        context.log(f"Request path: {context.req.path}")
        context.log(f"Request query: {getattr(context.req, 'query', {})}")
    except UnicodeDecodeError as e:
        # Handle UTF-8 decoding error that occurs when binary data is sent
        context.log(f"UTF-8 decoding error detected: {str(e)}")
        return context.res.json(
            {
                "error": "Binary data detected in request. Please send PDF file as base64 encoded string in JSON payload.",
                "usage": {
                    "method": "POST",
                    "contentType": "application/json",
                    "body": {
                        "file": "base64-encoded-pdf-data",
                        "filename": "document.pdf",
                        "userId": "optional-user-id",
                    },
                },
            },
            400,
        )
    except Exception as e:
        context.error(f"Unexpected error in main function: {str(e)}")
        return context.res.json({"error": f"Unexpected error: {str(e)}"}, 500)

    if context.req.path == "/ping":
        return context.res.text("Pong")
    elif context.req.path == "/upload":
        # Handle PDF upload
        if hasattr(context.req, "method") and context.req.method != "POST":
            return context.res.json(
                {
                    "error": "Only POST requests are supported for upload",
                    "usage": {
                        "multipart": "Send POST request with multipart/form-data containing 'file' field",
                        "json": "Send POST request with JSON payload containing base64 encoded file",
                    },
                },
                405,
            )

        try:
            # Log upload attempt
            context.log("PDF upload endpoint called")

            # Check if this is a JSON payload with base64 data
            body = getattr(context.req, "body", None)
            if body and isinstance(body, str):
                try:
                    import json

                    json_data = json.loads(body)
                    if "file" in json_data and isinstance(json_data["file"], str):
                        context.log("Detected JSON payload with base64 encoded file")
                except json.JSONDecodeError:
                    pass

            # Use UploadHandler for clean file upload processing
            upload_handler = UploadHandler(context)
            result = upload_handler.handle_upload(context.req)

            # Return the result from UploadHandler
            if result.get("success"):
                return context.res.json(result)
            else:
                return context.res.json(result, 400)

        except Exception as e:
            context.error(f"Error in upload endpoint: {str(e)}")
            return context.res.json(
                {
                    "error": "File upload failed",
                    "message": str(e),
                    "type": type(e).__name__,
                },
                500,
            )
    elif context.req.path.startswith("/process/"):
        # Extract document ID from path: /process/{documentId}
        if hasattr(context.req, "method") and context.req.method != "POST":
            return context.res.json(
                {
                    "error": "Only POST requests are supported",
                    "usage": "Use POST to /process/{documentId}",
                },
                405,
            )

        try:
            if not PYPDF_AVAILABLE:
                return context.res.json(
                    {
                        "error": "PyMuPDF is required but not available",
                        "solution": "Install with: pip install PyMuPDF",
                    },
                    500,
                )

            # Extract documentId from path
            # Path format: /process/abc123
            path_parts = context.req.path.strip("/").split("/")
            if len(path_parts) < 2:
                return context.res.json(
                    {
                        "error": "Missing documentId in path",
                        "usage": "POST to /process/{documentId}",
                        "example": "POST to /process/abc123",
                    },
                    400,
                )

            document_id = path_parts[1]

            if not document_id:
                return context.res.json(
                    {
                        "error": "Invalid documentId",
                        "usage": "POST to /process/{documentId}",
                    },
                    400,
                )

            context.log(f"Processing document: {document_id}")

            # Initialize processor and process document
            processor = PDFProcessor(context)
            result = processor.process_document(document_id)
            return context.res.json(result)

        except Exception as e:
            context.error(f"Error in process endpoint: {str(e)}")
            return context.res.json(
                {
                    "error": "Processing failed",
                    "message": str(e),
                    "type": type(e).__name__,
                },
                500,
            )
    else:
        return context.res.json({"error": "Endpoint not found"}, 404)
