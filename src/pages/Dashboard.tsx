import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import { Document, DocumentStatus } from '../types/types';
import ProcessingView from '../components/ProcessingView';
import ResultsView from '../components/ResultsView';
import { FileText, CheckCircle } from '../components/icons';
import { api } from '../services/api';

const Dashboard: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [processingStep, setProcessingStep] = useState<'upload' | 'process' | null>(null);

  const handleFileUpload = async (file: File) => {
    setProcessing(true);
    setProcessingStep('upload');
    setProgressMessage('Uploading file to local server...');

    try {
      const uploadResult = await api.uploadFile(file);
      
      if (uploadResult.success) {
        setUploadedFile(file);
        setDocumentId(uploadResult.documentId);
        setProgressMessage('File uploaded successfully!');
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      const errorDocument: Document = {
        id: Date.now().toString(),
        fileName: file.name,
        status: DocumentStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Upload failed',
      };
      setDocument(errorDocument);
    }

    setProcessing(false);
  };

  const handleProcessPdf = async () => {
    if (!documentId) return;

    setProcessing(true);
    setProcessingStep('process');
    setProgressMessage('Starting PDF processing...');

    try {
      // Trigger background processing
      await api.processDocument(documentId);
      
      // Start polling for results
      pollForResults(documentId);
      
    } catch (error) {
      console.error('Processing trigger failed:', error);
      const errorDocument: Document = {
        id: documentId,
        fileName: uploadedFile?.name || 'Unknown',
        status: DocumentStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Processing failed',
      };
      setDocument(errorDocument);
      setProcessing(false);
    }
  };

  const pollForResults = async (id: string) => {
    setProgressMessage('Processing PDF logic (this may take a minute with local OCR)...');
    
    const maxAttempts = 120; // 2 minutes with 1s interval
    let attempt = 0;
    
    const checkStatus = async () => {
      try {
        const result = await api.getDocument(id);
        
        if (result.status === 'completed') {
          // Wrap images in full URL
          if (result.extractedImages) {
            result.extractedImages = result.extractedImages.map((img: any) => ({
              ...img,
              url: api.getStaticUrl(img.url)
            }));
          }
          
          setDocument(result as Document);
          setProcessing(false);
          return;
        } else if (result.status === 'failed') {
          setDocument(result as Document);
          setProcessing(false);
          return;
        }
        
        // Continue polling
        attempt++;
        if (attempt < maxAttempts) {
          setTimeout(checkStatus, 1000);
        } else {
          throw new Error('Processing timed out');
        }
      } catch (err) {
        console.error('Status check failed:', err);
        setDocument({
          id,
          fileName: uploadedFile?.name || 'Unknown',
          status: DocumentStatus.FAILED,
          errorMessage: err instanceof Error ? err.message : 'Status check failed'
        });
        setProcessing(false);
      }
    };
    
    checkStatus();
  };

  const handleReset = () => {
    setUploadedFile(null);
    setDocumentId(null);
    setDocument(null);
    setProcessing(false);
    setProgressMessage('');
  };

  if (processing) {
    return <ProcessingView message={progressMessage} step={processingStep} />;
  }

  if (document) {
    return <ResultsView document={document} onReset={handleReset} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  PDFusion
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* User info and Logout removed for local setup */}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        {!uploadedFile ? (
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-6 shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-4xl font-bold text-slate-900 mb-4">PDF Processing Dashboard</h2>
                <p className="text-xl text-slate-600 mb-8">Upload PDFs to extract text, images, and tables with local OCR.</p>
                <div className="max-w-2xl mx-auto">
                    <FileUploader onFileUpload={handleFileUpload} />
                </div>
            </div>
        ) : (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 mb-8">
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">File Uploaded Successfully</h3>
                            <p className="text-slate-600">Ready to process {uploadedFile.name}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={handleReset} className="flex-1 px-6 py-3 bg-slate-100 rounded-xl font-semibold hover:bg-slate-200 transition-all">Cancel</button>
                        <button onClick={handleProcessPdf} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:scale-105 transition-all">Process PDF</button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
