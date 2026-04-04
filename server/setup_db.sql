-- ==========================================
-- PDFUSION POSTGRESQL SETUP SCRIPT
-- ==========================================

-- Step 1: Connect as the postgres superuser and run this script:
--   psql -U postgres -f server/setup_db.sql

-- Create the database
CREATE DATABASE pdfusion;

-- Step 2: Connect to the pdfusion database and run table creation:
--   psql -U postgres -d pdfusion -f server/setup_db.sql
-- (or run the CREATE TABLE sections below directly in pgAdmin/DBeaver)

-- ==========================================
-- TABLE: documents
-- ==========================================
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR PRIMARY KEY,
    filename VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'uploaded',
    markdown_content TEXT,
    table_count INTEGER DEFAULT 0,
    image_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- ==========================================
-- TABLE: images
-- ==========================================
CREATE TABLE IF NOT EXISTS images (
    id VARCHAR PRIMARY KEY,
    document_id VARCHAR REFERENCES documents(id) ON DELETE CASCADE,
    file_path VARCHAR NOT NULL,
    page_number INTEGER,
    ocr_text TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_images_document_id ON images(document_id);

-- Done!
-- Note: SQLAlchemy will also auto-create these tables on server startup.
-- This script is provided for manual inspection and setup if needed.
