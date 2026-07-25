// src/components/ResultsView.tsx

import React, { useState, useCallback } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Document } from '../types/types';
import Card from './common/Card';
import Button from './common/Button';
import Tabs from './common/Tabs';
import SectionHeader from './common/SectionHeader';
import { Clipboard, RefreshCw, Eye, CheckCircle, FileText, Download, Sun, Moon, ArrowLeft } from './icons';
import { useTheme } from '../hooks/useTheme';

// Pages are rendered to canvas and embedded as base64 data URLs, but
// react-markdown's default urlTransform only allows http/https/mailto/etc.
// and rewrites everything else to '', blanking every extracted image.
// Allow image data URLs through; defer to the default behaviour otherwise so
// data:text/html and javascript: URLs stay blocked.
const IMAGE_DATA_URL = /^data:image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml);base64,/i;

const imageUrlTransform = (url: string) =>
  IMAGE_DATA_URL.test(url) ? url : defaultUrlTransform(url);

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

interface ResultsViewProps {
  document: Document;
  onReset: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ document, onReset }) => {
  const [activeTab, setActiveTab] = useState('markdown');
  const [copied, setCopied] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const { theme, toggleTheme } = useTheme();

  const handleCopyToClipboard = useCallback(() => {
    if (document.markdownContent) {
      navigator.clipboard.writeText(document.markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [document.markdownContent]);

  const handleDownloadMarkdown = useCallback(() => {
    if (document.markdownContent) {
      const blob = new Blob([document.markdownContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.fileName.replace(/\.pdf$/i, '')}_analysis.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [document.markdownContent, document.fileName]);

  const tabs = [
    { id: 'markdown', label: 'Markdown', icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Navigation Bar - Always Visible */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-lg border-b border-white/20 dark:border-slate-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onReset}
                className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-all duration-200"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-semibold text-xs hidden sm:inline">Back</span>
              </button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              <div
                onClick={onReset}
                className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-all duration-200 select-none active:scale-98"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  PDFusion
                </h1>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Processing Complete</h1>
                  {document.ocrMode && (
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block ${document.ocrMode === 'vision'
                        ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50'
                      }`}>
                      {document.ocrMode === 'vision' ? 'AI VISION MODE' : 'FAST TEXT MODE'}
                    </span>
                  )}
                  {document.createdAt && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold ml-1">
                      {formatTimestamp(document.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-lg break-all">{document.fileName}</p>
              </div>
            </div>
            <Button onClick={onReset} variant="secondary" size="lg">
              <RefreshCw className="w-5 h-5 mr-3" />
              Analyze Another PDF
            </Button>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="overflow-hidden">
          <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="p-6">
            {activeTab === 'markdown' && (
              <div className="space-y-6">
                {/* Markdown Header with Actions */}
                <div className="space-y-4">
                  <SectionHeader
                    icon={Eye}
                    title="Markdown Content"
                    description="Extracted text from your PDF"
                  />
                  <div className="flex gap-3 justify-end">
                    <Button onClick={handleCopyToClipboard} variant="outline" size="sm">
                      <Clipboard className="w-4 h-4 mr-2" />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button onClick={handleDownloadMarkdown} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Content Display */}
                <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                  <div className="p-6 h-[65vh] overflow-y-auto prose prose-slate dark:prose-invert max-w-none prose-img:rounded-xl prose-img:shadow-md prose-tables:border-collapse prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-td:border-b dark:prose-td:border-slate-800">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      urlTransform={imageUrlTransform}
                      components={{
                        img: ({ node, ...props }) => {
                          const src = props.src || '';
                          if (!src) return null;
                          return <img {...props} src={src} alt={props.alt || ''} className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer" onClick={() => setModalImage(src)} />;
                        }
                      }}
                    >
                      {document.markdownContent || 'No markdown content available.'}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {modalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/90 backdrop-blur-sm" onClick={() => setModalImage(null)}>
          <div className="relative max-w-4xl w-full p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-6 right-6 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition w-10 h-10 flex items-center justify-center font-bold text-lg border border-white/10"
            >
              ✕
            </button>
            <img
              src={modalImage}
              alt="Full Size"
              className="max-h-[85vh] w-auto mx-auto rounded-xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default ResultsView;
