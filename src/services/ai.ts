// src/services/ai.ts

export interface AISettings {
  provider: 'ollama' | 'openrouter' | 'google' | 'custom';

  // Provider-specific config profiles
  ollamaBaseUrl: string;
  ollamaModelId: string;
  openRouterKey: string;
  openRouterBaseUrl: string;
  openRouterModelId: string;
  googleKey: string;
  googleBaseUrl: string;
  googleModelId: string;
  customKey: string;
  customBaseUrl: string;
  customModelId: string;
}

const STORAGE_KEY = 'pdfusion_ai_settings';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'ollama',

  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModelId: 'gemma4',
  openRouterKey: '',
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  openRouterModelId: 'google/gemini-2.5-flash',
  googleKey: '',
  googleBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  googleModelId: 'gemini-2.5-flash',
  customKey: '',
  customBaseUrl: '',
  customModelId: '',
};

export const aiSettingsService = {
  getSettings(): AISettings {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AISettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
};

export const aiService = {
  async processImage(dataUrl: string, prompt: string = 'Extract all text from this image precisely. Do not summarize.'): Promise<string> {
    const settings = aiSettingsService.getSettings();
    const { provider } = settings;

    let apiKey = '';
    let baseUrl = '';
    let modelId = '';

    if (provider === 'ollama') {
      baseUrl = settings.ollamaBaseUrl || 'http://localhost:11434';
      modelId = settings.ollamaModelId || 'gemma4';
    } else if (provider === 'openrouter') {
      apiKey = settings.openRouterKey || '';
      baseUrl = settings.openRouterBaseUrl || 'https://openrouter.ai/api/v1';
      modelId = settings.openRouterModelId || 'google/gemini-2.5-flash';
    } else if (provider === 'google') {
      apiKey = settings.googleKey || '';
      baseUrl = settings.googleBaseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai/';
      modelId = settings.googleModelId || 'gemini-2.5-flash';
    } else {
      apiKey = settings.customKey || '';
      baseUrl = settings.customBaseUrl || '';
      modelId = settings.customModelId || '';
    }

    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid image data URL format');
    }
    const base64Data = match[2];

    if (provider === 'ollama') {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: 'user',
              content: prompt,
              images: [base64Data]
            }
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.statusText} (${errorText})`);
      }

      const result = await response.json();
      return result.message?.content?.trim() || '';

    } else if (provider === 'openrouter' || provider === 'google' || provider === 'custom') {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'PDFusion';
      }

      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error: ${response.statusText} (${errorText})`);
      }

      const result = await response.json();
      return result.choices?.[0]?.message?.content?.trim() || '';
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
};
