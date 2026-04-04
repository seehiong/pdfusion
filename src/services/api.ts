/**
 * Base API service for local PDFusion Backend (FastAPI)
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const api = {
  /**
   * Uploads a PDF file
   */
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return await response.json();
  },

  /**
   * Triggers background processing for a document
   */
  async processDocument(documentId: string) {
    const response = await fetch(`${API_BASE_URL}/api/process/${documentId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Processing failed');
    }

    return await response.json();
  },

  /**
   * Gets the current status and results of a document
   */
  async getDocument(documentId: string) {
    const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch document');
    }

    return await response.json();
  },

  /**
   * Helpers to format image URLs
   */
  getStaticUrl(path: string) {
    if (path.startsWith('http')) return path;
    // Assume images served from /outputs/ which is mounted in FastAPI
    // The doc.image_urls already include '/api/files/' prefix or similar
    // Our static mount in main.py is /outputs
    return `${API_BASE_URL}${path}`;
  }
};
