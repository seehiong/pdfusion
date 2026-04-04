import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Document } from '../types/types';
import Card from './common/Card';
import Button from './common/Button';
import Tabs from './common/Tabs';
import SectionHeader from './common/SectionHeader';
import { Clipboard, RefreshCw, Eye, CheckCircle, FileText } from './icons';
import { api } from '../services/api';

interface ResultsViewProps {
  document: Document;
  onReset: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ document, onReset }) => {
  const [activeTab, setActiveTab] = useState('markdown');
  const [copied, setCopied] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const handleCopyToClipboard = useCallback(() => {
    if (document.markdownContent) {
      navigator.clipboard.writeText(document.markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [document.markdownContent]);



  const tabs = [
    { id: 'markdown', label: 'Markdown', icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation Bar - Always Visible */}
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
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Processing Complete</h1>
                <p className="text-slate-600 text-lg break-all">{document.fileName}</p>
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
                  </div>
                </div>

                {/* Content Display */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm">
                  <div className="p-6 h-[65vh] overflow-y-auto prose prose-slate max-w-none prose-img:rounded-xl prose-img:shadow-md prose-tables:border-collapse prose-th:bg-slate-100 prose-td:border-b">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        img: ({ node, ...props }) => {
                          const src = props.src ? api.getStaticUrl(props.src) : '';
                          return <img {...props} src={src} alt={props.alt || ''} className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200" />;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative max-w-4xl w-full p-4">
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition"
            >
              ✕
            </button>
            <img
              src={modalImage}
              alt="Full Size"
              className="max-h-[80vh] w-auto mx-auto rounded-xl shadow-lg"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default ResultsView;
