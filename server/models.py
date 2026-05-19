# server/models.py
from sqlalchemy import (

    String, 
    DateTime, 
    Text, 
    Integer,
    ForeignKey
)

from datetime import datetime

from sqlalchemy.orm import (
    relationship,
    mapped_column,
    Mapped
)

from datetime import datetime

from database import Base

class Document(Base):
    __tablename__ = "documents"
    
    id: Mapped[str] = mapped_column(
        String, 
        primary_key=True, 
        index=True
    )

    filename: Mapped[str] = mapped_column(String)

    file_path: Mapped[str] = mapped_column(String)

    status: Mapped[str] = mapped_column(
        String, 
        default="uploaded"  # uploaded, processing, completed, failed
    )

    markdown_content: Mapped[str] = mapped_column(
        Text, 
        nullable=True
    )

    table_count: Mapped[int] = mapped_column(
        Integer, 
        default=0
    )

    image_count: Mapped[int] = mapped_column(
        Integer, 
        default=0
    )

    error_message: Mapped[str] = mapped_column(
        Text, 
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow,
        nullable=False
    )

    processed_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=True
    )
    
    images: Mapped[list["Image"]] = relationship(
        back_populates="document"
    )

class Image(Base):
    __tablename__ = "images"
    
    id: Mapped[str] = mapped_column(
        String, 
        primary_key=True, 
        index=True
    )

    document_id: Mapped[str] = mapped_column(
        ForeignKey("documents.id")
    )

    file_path: Mapped[str] = mapped_column(String)

    page_number: Mapped[int] = mapped_column(Integer)

    ocr_text: Mapped[str] = mapped_column(
        Text, 
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow
    )
    
    document: Mapped["Document"] = relationship(
        back_populates="images"
    )
