// src/services/pdf.ts

import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';

// Configure the PDF.js worker from unpkg CDN matching the installed version
const PDFJS_VERSION = '4.0.379';
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version || PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export interface ExtractedPageContent {
  pageNumber: number;
  text: string;
  imageDataUrl: string;
}

export const pdfService = {
  /**
   * Reads a file and extracts text + page rendering base64 data URLs
   */
  async extractPdfContent(
    file: File,
    onProgress?: (progressMessage: string) => void
  ): Promise<ExtractedPageContent[]> {
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.('Loading PDF document...');

    const loadingTask = getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    const pages: ExtractedPageContent[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress?.(`Processing page ${pageNum} of ${numPages}...`);

      const page = await pdf.getPage(pageNum);

      // 1. Extract text content
      const textContent = await page.getTextContent();
      let pageText = '';
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if ('str' in item) {
          const str = item.str;
          const transform = item.transform; // [scaleX, skewX, skewY, scaleY, translateX, translateY]
          const y = transform[5];

          if (lastY !== null && Math.abs(y - lastY) > 5) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
            pageText += ' ';
          }

          pageText += str;
          lastY = y;
        }
      }

      // 2. Render page to canvas to extract page image for Vision OCR
      const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale is optimal for quality vs performance
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (!ctx) {
        throw new Error('Could not create 2D canvas context');
      }

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
        canvas: canvas,
      };

      await page.render(renderContext).promise;
      const imageDataUrl = canvas.toDataURL('image/png');

      pages.push({
        pageNumber: pageNum,
        text: pageText,
        imageDataUrl,
      });
    }

    return pages;
  }
};
