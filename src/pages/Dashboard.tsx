// src/pages/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import FileUploader from '../components/FileUploader';
import { Document, DocumentStatus, DBImage } from '../types/types';
import ProcessingView from '../components/ProcessingView';
import ResultsView from '../components/ResultsView';
import SettingsModal from '../components/SettingsModal';
import { FileText, CheckCircle, Settings, Image as ImageIcon, RefreshCw, XCircle, Sun, Moon } from '../components/icons';
import { dbService } from '../services/db';
import { pdfService } from '../services/pdf';
import { aiService } from '../services/ai';
import { useTheme } from '../hooks/useTheme';

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const Dashboard: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [processingStep, setProcessingStep] = useState<'upload' | 'process' | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ocrMode, setOcrMode] = useState<'fast' | 'vision'>('fast');
  const [history, setHistory] = useState<Document[]>([]);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const docs = await dbService.getAllDocuments();
      docs.sort((a, b) => b.id.localeCompare(a.id));
      setHistory(docs);
    } catch (err) {
      console.error('Failed to load document history:', err);
    }
  };

  const handleFileUpload = async (file: File) => {
    setProcessing(true);
    setProcessingStep('upload');
    setProgressMessage('Loading file locally...');

    try {
      const docId = `doc_${Date.now()}`;

      const initialDoc: Document = {
        id: docId,
        fileName: file.name,
        status: DocumentStatus.PENDING,
        createdAt: Date.now(),
      };

      await dbService.saveDocument(initialDoc);

      setUploadedFile(file);
      setDocumentId(docId);
      setProgressMessage('File loaded successfully!');
    } catch (error) {
      console.error('Initial load failed:', error);
      const errorDocument: Document = {
        id: Date.now().toString(),
        fileName: file.name,
        status: DocumentStatus.FAILED,
        createdAt: Date.now(),
        errorMessage: error instanceof Error ? error.message : 'File load failed',
      };
      setDocument(errorDocument);
    }

    setProcessing(false);
  };

  const handleProcessPdf = async () => {
    if (!documentId || !uploadedFile) return;

    setProcessing(true);
    setProcessingStep('process');
    setProgressMessage('Extracting PDF structure...');

    let createdAt = Date.now();
    try {
      const doc = await dbService.getDocument(documentId);
      if (doc) {
        if (doc.createdAt) createdAt = doc.createdAt;
        doc.status = DocumentStatus.PROCESSING;
        await dbService.saveDocument(doc);
      }

      const pages = await pdfService.extractPdfContent(uploadedFile, (msg) => {
        setProgressMessage(msg);
      });

      let finalMarkdown = `# Extracted Content: ${uploadedFile.name}\n\n`;
      let imageCount = 0;

      if (ocrMode === 'vision') {
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const pageNum = page.pageNumber;
          setProgressMessage(`AI OCR processing page ${pageNum} of ${pages.length}...`);

          let pageMarkdown = '';
          try {
            pageMarkdown = await aiService.processImage(
              page.imageDataUrl,
              'Convert this document page image to clean Markdown format. Reconstruct any headings, lists, paragraphs, and tables as markdown. Output only the markdown.'
            );
          } catch (aiErr) {
            console.error(`AI OCR failed for page ${pageNum}:`, aiErr);
            pageMarkdown = `## Page ${pageNum}\n\n${page.text || '*No text extracted*'}`;
          }

          finalMarkdown += `## Page ${pageNum}\n\n${pageMarkdown}\n\n---\n\n`;

          const imageId = `img_${documentId}_p${pageNum}`;
          const dbImage: DBImage = {
            id: imageId,
            documentId: documentId,
            dataUrl: page.imageDataUrl,
            pageNumber: pageNum,
            ocrText: pageMarkdown,
            caption: `Page ${pageNum} Render`,
          };
          await dbService.saveImage(dbImage);
          imageCount++;
        }
      } else {
        // Fast mode
        for (const page of pages) {
          finalMarkdown += `## Page ${page.pageNumber}\n\n`;
          const content = page.text.trim();
          if (content) {
            finalMarkdown += `${content}\n\n`;
          } else {
            finalMarkdown += `*No text found on this page (scanned image or empty page)*\n\n`;
          }
          finalMarkdown += `---\n\n`;
        }
      }

      const completedDoc: Document = {
        id: documentId,
        fileName: uploadedFile.name,
        status: DocumentStatus.COMPLETED,
        markdownContent: finalMarkdown,
        ocrMode: ocrMode,
        createdAt,
        errorMessage: undefined,
      };

      const dbDoc = {
        ...completedDoc,
        tableCount: 0,
        imageCount: imageCount,
      };

      await dbService.saveDocument(dbDoc);

      const fullDoc = await dbService.getDocument(documentId);
      setDocument(fullDoc || dbDoc);
      loadHistory();
    } catch (error) {
      console.error('Processing failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Processing failed';
      const failedDoc: Document = {
        id: documentId,
        fileName: uploadedFile.name,
        status: DocumentStatus.FAILED,
        ocrMode: ocrMode,
        createdAt,
        errorMessage: errorMsg,
      };
      await dbService.saveDocument(failedDoc);
      setDocument(failedDoc);
      loadHistory();
    }

    setProcessing(false);
  };

  const handleSelectHistoryDoc = async (id: string) => {
    setProcessing(true);
    setProgressMessage('Loading document from database...');
    try {
      const doc = await dbService.getDocument(id);
      if (doc) {
        setDocument(doc);
      } else {
        alert('Document not found');
      }
    } catch (err) {
      console.error(err);
    }
    setProcessing(false);
  };

  const handleDeleteHistoryDoc = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await dbService.deleteDocument(id);
      loadHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setDocumentId(null);
    setDocument(null);
    setProcessing(false);
    setProgressMessage('');
  };

  if (processing) {
    return <ProcessingView message={progressMessage} step={processingStep || 'process'} />;
  }

  if (document) {
    return <ResultsView document={document} onReset={handleReset} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-lg border-b border-white/20 dark:border-slate-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  PDFusion
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              >
                <Settings className="w-4 h-4" />
                <span>Configure AI</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {!uploadedFile ? (
          <div className="space-y-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-6 shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-4">
                Local PDF Analyzer & Markdown Converter
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
                Upload PDFs to extract text, tables, and math equations locally in your browser. Configurable with OpenRouter or local Ollama.
              </p>

              <div className="max-w-2xl mx-auto">
                <FileUploader onFileUpload={handleFileUpload} />
              </div>
            </div>

            {/* Recent Documents History */}
            {history.length > 0 && (
              <div className="max-w-4xl mx-auto space-y-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Recent Analyzed Documents</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {history.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectHistoryDoc(doc.id)}
                      className="group flex items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 rounded-2xl hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate leading-snug">{doc.fileName}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doc.status === DocumentStatus.COMPLETED ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' :
                                doc.status === DocumentStatus.FAILED ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400' :
                                  'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 animate-pulse'
                              }`}>
                              {doc.status.toUpperCase()}
                            </span>
                            {doc.ocrMode && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doc.ocrMode === 'vision'
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 border border-slate-200/60 dark:border-slate-700/50'
                                }`}>
                                {doc.ocrMode === 'vision' ? 'AI VISION' : 'FAST TEXT'}
                              </span>
                            )}
                            {doc.createdAt && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-1">
                                {formatTimestamp(doc.createdAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteHistoryDoc(e, doc.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-slate-800/80 mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500" />

              <div className="flex items-start mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mr-4 shadow-md flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">File Ready for Processing</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm break-all mt-1">{uploadedFile.name}</p>
                </div>
              </div>

              {/* Extraction Mode Selector */}
              <div className="space-y-3 mb-8">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-350">Analysis Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOcrMode('fast')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${ocrMode === 'fast'
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-350 shadow-md scale-102'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/20'
                      }`}
                  >
                    <FileText className="w-6 h-6 mb-2" />
                    <span className="font-bold text-sm">Fast Extraction</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 text-center leading-relaxed">Direct PDF text parsing. Instant & free.</span>
                  </button>

                  <button
                    onClick={() => setOcrMode('vision')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${ocrMode === 'vision'
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-350 shadow-md scale-102'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/20'
                      }`}
                  >
                    <ImageIcon className="w-6 h-6 mb-2" />
                    <span className="font-bold text-sm">Vision Layout (AI)</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 text-center leading-relaxed">High-fidelity OCR with tables, math, & layout.</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-98 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessPdf}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-md shadow-indigo-100 hover:scale-103 active:scale-98 transition-all"
                >
                  Process PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default Dashboard;
