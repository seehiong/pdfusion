
import React from 'react';
import Card from './common/Card';
import { FileText } from './icons';

interface ProcessingViewProps {
  message: string;
  step?: 'upload' | 'process';
}

const ProcessingView: React.FC<ProcessingViewProps> = ({ message, step }) => {
  // Different content based on processing step
  const getStepContent = () => {
    if (step === 'upload') {
      return {
        title: 'Uploading Your PDF',
        progressText: 'Sending file to server...',
        steps: [
          { status: 'current', text: 'Uploading file' },
          { status: 'pending', text: 'Validating file format' },
          { status: 'pending', text: 'Preparing for processing' }
        ]
      };
    } else if (step === 'process') {
      return {
        title: 'Processing Your PDF',
        progressText: 'Extracting content...',
        steps: [
          { status: 'completed', text: 'PDF uploaded successfully' },
          { status: 'current', text: 'Extracting content' },
          { status: 'pending', text: 'Processing images and text' },
          { status: 'pending', text: 'Generating markdown output' }
        ]
      };
    } else {
      return {
        title: 'Processing Your PDF',
        progressText: 'Initializing...',
        steps: [
          { status: 'current', text: 'Initializing processing' }
        ]
      };
    }
  };

  const content = getStepContent();

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

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="max-w-md w-full">
          <Card className="shadow-2xl">
            <div className="p-8 text-center">
              {/* Header */}
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileText className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">{content.title}</h2>
                  <p className="text-slate-600 text-lg">{message || 'Initializing processing...'}</p>
                </div>

                {/* Spinner */}
                <div className="flex justify-center">
                  <div className="w-16 h-16">
                    <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin shadow-lg"></div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="w-full bg-slate-200 rounded-full h-3 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full animate-pulse shadow-sm"
                      style={{ width: step === 'upload' ? '30%' : '60%' }}
                    ></div>
                  </div>
                  <p className="text-slate-500 font-medium">{content.progressText}</p>
                </div>

                {/* Processing Steps */}
                <div className="space-y-2 text-left">
                  {content.steps.map((step, index) => (
                    <div key={index} className="flex items-center space-x-3 text-sm">
                      <div className={`w-2 h-2 rounded-full ${step.status === 'completed' ? 'bg-green-500' :
                          step.status === 'current' ? 'bg-blue-500 animate-pulse' :
                            'bg-slate-300'
                        }`}></div>
                      <span className={`${step.status === 'completed' ? 'text-slate-600' :
                          step.status === 'current' ? 'text-slate-900 font-medium' :
                            'text-slate-400'
                        }`}>{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProcessingView;
