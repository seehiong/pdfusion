// src/components/FileUploader.tsx

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, AlertCircle } from './icons';
import Card from './common/Card';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload }) => {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    if (file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must not exceed 10MB.');
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress (in real implementation, you'd track actual upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Small delay to show 100% progress
      setTimeout(() => {
        onFileUpload(file);
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (err) {
      setError('Upload failed. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isUploading
  });

  return (
    <Card>
      <div
        {...getRootProps()}
        className={`relative overflow-hidden flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer group
          ${isDragActive
            ? 'border-blue-400 dark:border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 shadow-lg scale-105'
            : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gradient-to-br hover:from-slate-50 hover:to-blue-50 dark:hover:from-slate-800 dark:hover:to-slate-800 hover:shadow-lg hover:scale-102'
          }
          ${isUploading ? 'pointer-events-none opacity-75' : ''}`}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 dark:from-indigo-500/5 dark:to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <input {...getInputProps()} />

        {isUploading ? (
          <div className="text-center relative z-10">
            <div className="w-20 h-20 mx-auto mb-6">
              <div className="w-full h-full border-4 border-blue-200 dark:border-slate-800 border-t-blue-600 dark:border-t-indigo-500 rounded-full animate-spin shadow-lg"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">Uploading...</h2>
            <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-800 rounded-full h-3 mb-3 shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">{uploadProgress}%</p>
          </div>
        ) : (
          <>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                <UploadCloud className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3 text-center">
                {isDragActive ? 'Drop your PDF here' : 'Upload your PDF'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6 text-center max-w-md leading-relaxed text-sm">
                {isDragActive
                  ? 'Release to upload your file'
                  : 'Drag and drop your PDF file here, or click to browse. Maximum file size: 10MB.'
                }
              </p>

              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-sm text-slate-600 dark:text-slate-400 font-medium">
                <FileText className="w-4 h-4 text-blue-600 dark:text-indigo-400" />
                <span>PDF files only</span>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="relative z-10 flex items-center space-x-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mt-6 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default FileUploader;
