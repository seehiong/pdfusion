// src/services/db.ts

import { Document, DBImage } from '../types/types';

const DB_NAME = 'PDFusionDB';
const DB_VERSION = 1;

export class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'id' });
          imageStore.createIndex('documentId', 'documentId', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async getStore(storeName: 'documents' | 'images', mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async saveDocument(doc: Document): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('documents', 'readwrite');
      const store = transaction.objectStore('documents');
      const docToStore = { ...doc };
      delete docToStore.extractedImages;

      const request = store.put(docToStore);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDocument(id: string): Promise<Document | null> {
    const db = await this.init();
    const doc = await new Promise<Document | null>((resolve, reject) => {
      const transaction = db.transaction('documents', 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!doc) return null;

    const images = await this.getImagesForDocument(id);
    doc.extractedImages = images.map(img => ({
      id: img.id,
      url: img.dataUrl,
      ocrText: img.ocrText,
      caption: img.caption
    }));

    return doc;
  }

  async getAllDocuments(): Promise<Document[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('documents', 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDocument(id: string): Promise<void> {
    const db = await this.init();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('documents', 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Delete corresponding images
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('images', 'readwrite');
      const store = transaction.objectStore('images');
      const index = store.index('documentId');
      const request = index.openCursor(IDBKeyRange.only(id));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveImage(image: DBImage): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('images', 'readwrite');
      const store = transaction.objectStore('images');
      const request = store.put(image);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getImagesForDocument(documentId: string): Promise<DBImage[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('images', 'readonly');
      const store = transaction.objectStore('images');
      const index = store.index('documentId');
      const request = index.getAll(IDBKeyRange.only(documentId));
      request.onsuccess = () => {
        const result = request.result || [];
        result.sort((a, b) => a.pageNumber - b.pageNumber);
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new IndexedDBService();
