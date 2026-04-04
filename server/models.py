# server/models.py
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, index=True)
    filename = Column(String)
    file_path = Column(String)
    status = Column(String, default="uploaded") # uploaded, processing, completed, failed
    markdown_content = Column(Text, nullable=True)
    table_count = Column(Integer, default=0)
    image_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    
    images = relationship("Image", back_populates="document")

class Image(Base):
    __tablename__ = "images"
    
    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id"))
    file_path = Column(String)
    page_number = Column(Integer)
    ocr_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("Document", back_populates="images")
