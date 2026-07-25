// src/components/SettingsModal.tsx

import React, { useState, useEffect } from 'react';
import { aiSettingsService, AISettings } from '../services/ai';
import { Settings, CheckCircle, XCircle } from './icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AISettings>(aiSettingsService.getSettings());
  const [savedStatus, setSavedStatus] = useState<boolean | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(aiSettingsService.getSettings());
      setSavedStatus(null);
      setShowKey(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as AISettings['provider'];
    setSettings({
      ...settings,
      provider,
    });
  };

  const handleSave = () => {
    try {
      aiSettingsService.saveSettings(settings);
      setSavedStatus(true);
      setTimeout(() => {
        setSavedStatus(null);
        onClose();
      }, 1200);
    } catch (err) {
      setSavedStatus(false);
    }
  };

  // Resolve config keys based on provider
  const getProviderConfig = () => {
    const p = settings.provider;
    if (p === 'ollama') {
      return {
        hasKey: false,
        key: '',
        url: settings.ollamaBaseUrl,
        model: settings.ollamaModelId,
        setKey: () => { },
        setUrl: (v: string) => setSettings(prev => ({ ...prev, ollamaBaseUrl: v })),
        setModel: (v: string) => setSettings(prev => ({ ...prev, ollamaModelId: v })),
        placeholderUrl: 'http://localhost:11434',
        placeholderModel: 'gemma4',
      };
    } else if (p === 'openrouter') {
      return {
        hasKey: true,
        key: settings.openRouterKey,
        url: settings.openRouterBaseUrl,
        model: settings.openRouterModelId,
        setKey: (v: string) => setSettings(prev => ({ ...prev, openRouterKey: v })),
        setUrl: (v: string) => setSettings(prev => ({ ...prev, openRouterBaseUrl: v })),
        setModel: (v: string) => setSettings(prev => ({ ...prev, openRouterModelId: v })),
        placeholderUrl: 'https://openrouter.ai/api/v1',
        placeholderModel: 'google/gemini-2.5-flash',
      };
    } else if (p === 'google') {
      return {
        hasKey: true,
        key: settings.googleKey,
        url: settings.googleBaseUrl,
        model: settings.googleModelId,
        setKey: (v: string) => setSettings(prev => ({ ...prev, googleKey: v })),
        setUrl: (v: string) => setSettings(prev => ({ ...prev, googleBaseUrl: v })),
        setModel: (v: string) => setSettings(prev => ({ ...prev, googleModelId: v })),
        placeholderUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        placeholderModel: 'gemini-2.5-flash',
      };
    } else {
      return {
        hasKey: true,
        key: settings.customKey,
        url: settings.customBaseUrl,
        model: settings.customModelId,
        setKey: (v: string) => setSettings(prev => ({ ...prev, customKey: v })),
        setUrl: (v: string) => setSettings(prev => ({ ...prev, customBaseUrl: v })),
        setModel: (v: string) => setSettings(prev => ({ ...prev, customModelId: v })),
        placeholderUrl: 'https://api.openai.com/v1',
        placeholderModel: 'gpt-4o-mini',
      };
    }
  };

  const config = getProviderConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-lg mx-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/40 dark:border-slate-800/80 shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 transform scale-100 hover:shadow-indigo-500/10">

        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />

        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-900/30">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">AI Settings</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configure your local or cloud Vision LLM keys and models</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Provider */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">API Provider</label>
              <select
                value={settings.provider}
                onChange={handleProviderChange}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl outline-none transition-all duration-200 text-slate-800 dark:text-slate-100 font-medium"
              >
                <option value="ollama">Ollama (Local Offline)</option>
                <option value="openrouter">OpenRouter (Cloud API)</option>
                <option value="google">Google Gemini (AI Studio Free Key)</option>
                <option value="custom">Custom Endpoint (OpenAI-compatible)</option>
              </select>
            </div>

            {/* Base URL */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">API Base URL</label>
              <input
                type="text"
                value={config.url}
                onChange={(e) => config.setUrl(e.target.value)}
                placeholder={config.placeholderUrl}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl outline-none transition-all duration-200 text-slate-800 dark:text-slate-100"
              />
              {settings.provider === 'ollama' && (
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium leading-relaxed mt-1">
                  ⚠️ Note: Run Ollama with <code className="bg-indigo-50 dark:bg-indigo-950/30 px-1 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">OLLAMA_ORIGINS="*"</code> enabled to bypass browser CORS blocks.
                </p>
              )}
            </div>

            {/* API Key (Show/Hide Toggle) */}
            {config.hasKey && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={config.key}
                    onChange={(e) => config.setKey(e.target.value)}
                    placeholder={
                      settings.provider === 'openrouter' ? 'sk-or-...' :
                        settings.provider === 'google' ? 'AIzaSy...' :
                          'sk-...'
                    }
                    className="w-full pl-4 pr-16 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl outline-none transition-all duration-200 text-slate-800 dark:text-slate-100 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors duration-150 focus:outline-none"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {/* Model ID */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Vision Model ID</label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => config.setModel(e.target.value)}
                placeholder={config.placeholderModel}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl outline-none transition-all duration-200 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-8 py-5 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/80 rounded-b-3xl">
          <div className="flex-1 mr-4">
            {savedStatus === true && (
              <span className="flex items-center text-sm font-semibold text-emerald-600 animate-pulse">
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Settings saved!
              </span>
            )}
            {savedStatus === false && (
              <span className="flex items-center text-sm font-semibold text-rose-600">
                <XCircle className="w-4 h-4 mr-1.5" />
                Failed to save
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all duration-200 active:scale-95"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 hover:scale-[1.03] transition-all duration-200 active:scale-95"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
