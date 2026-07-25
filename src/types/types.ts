// src/types/types.ts

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ExtractedImage {
  id: string;
  url: string;
  ocrText?: string;
  caption: string;
}

export interface ExtractedTable {
  caption: string;
  markdown: string;
  pageNumber: number;
  confidence?: number;
}

export interface Document {
  id: string;
  fileName: string;
  status: DocumentStatus;
  markdownContent?: string;
  extractedImages?: ExtractedImage[];
  extractedTables?: ExtractedTable[];
  errorMessage?: string;
  ocrMode?: 'fast' | 'vision';
  createdAt?: number;
}

export interface DBImage {
  id: string;
  documentId: string;
  dataUrl: string;
  pageNumber: number;
  ocrText: string;
  caption: string;
}

