# PDFusion: Browser-Based PDF Analyzer & Markdown Converter 🚀

PDFusion is a complete PDF analysis application that runs **entirely in your web browser**. It extracts text and page layouts from uploaded PDFs and outputs everything in clean, structured Markdown format. Because it is fully serverless, no server installation is required.

**🔗 Live Demo: [seehiong.github.io/pdfusion](https://seehiong.github.io/pdfusion/)**

---

## 🏔️ Technical Architecture

### Core Stack
- **Frontend**: React 19 with TypeScript (Vite 7) & Tailwind CSS
- **Routing**: React Router 8 (declarative SPA routing)
- **PDF Extraction**: Mozilla's PDF.js (`pdfjs-dist`) compiled to WebAssembly/JavaScript
- **Database**: Browser-native **IndexedDB** for fast, local, and private storage of documents and page assets
- **AI/LLM OCR**: Direct client-side integration with **Ollama (local)**, **OpenRouter (cloud)**, **Google Gemini (AI Studio)**, or any **OpenAI-compatible custom endpoint**
- **Theme Engine**: Localized dark/light mode toggle with local storage persistence

### System Architecture
```
┌────────────────────────────────────────────────────────┐
│                   Web Browser Sandbox                  │
│                                                        │
│   ┌─────────────────┐        ┌──────────────────────┐  │
│   │   React UI      │◀─────▶│  IndexedDB Database  │  │
│   │   (Dark/Light)  │        └──────────────────────┘  │
│   └────────┬────────┘                                  │
│            │ (PDF text & images)                       │
│            ▼                                           │
│   ┌─────────────────┐                                  │
│   │ PDF.js Parser   │                                  │
│   └────────┬────────┘                                  │
│            │                                           │
└────────────┼───────────────────────────────────────────┘
             │ (Page data URLs)
             ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │ Local Ollama │or │ OpenRouter   │or │ Google Gem.  │or │ Custom       │
  │ (localhost)  │   │ Cloud API    │   │ (AI Studio)  │   │ (OpenAI API) │
  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

---

## 🚀 Getting Started

PDFusion runs entirely in the browser. There is no backend to configure and no environment variables to set — AI credentials are entered in the app's settings panel and stored in your browser.

**Prerequisites:** Node.js 22.22+

### 1. Installation
Install the project dependencies:
```bash
npm install
```

### 2. Start the Application
Run the Vite development server locally:
```bash
npm run dev
```
Open the URL printed in the terminal (`http://localhost:5173` by default, or the next free port).

### 3. Build for Production
```bash
npm run build      # outputs static assets to dist/
npm run preview    # serve the production build locally
```

---

## 📦 Deployment

Pushing to `main` triggers the GitHub Actions workflow in `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages.

The site is served from a subpath (`/pdfusion/`), so two things are wired up for it:
- `vite.config.ts` sets `base` to `/pdfusion/` for production builds, and React Router picks the same value up via `import.meta.env.BASE_URL` as its `basename`.
- The workflow copies `index.html` to `404.html`, so refreshing or deep-linking a client-side route is handled by the router instead of returning a Pages 404.

> [!IMPORTANT]
> In the repository settings under **Pages**, the build source must be set to **GitHub Actions**. If you fork this project under a different repository name, update `REPO_BASE` in `vite.config.ts` to match.

---

## ⚙️ AI Configuration (BYOK)

To run page layout reconstruction and visual OCR, configure your credentials in the **Configure AI** settings panel (accessible from the navbar). 

> [!TIP]
> PDFusion uses **Isolated Profiles**, meaning your API Keys, Base URLs, and Model IDs are saved independently for Ollama, OpenRouter, Google, and Custom endpoints. Switching between them preserves your settings for each provider without overwriting them.

### Option A: Local Ollama (Offline)
1. Ensure Ollama is running on your machine.
2. Pull your favorite vision model (e.g., `gemma4`).
3. Set your provider to **Ollama** and Base URL to `http://localhost:11434`.
4. **Important CORS Step:** Because browser security restricts client-side requests, you must run Ollama with CORS enabled:
   * **Windows (PowerShell):**
     ```powershell
     $env:OLLAMA_ORIGINS="*"
     ollama serve
     ```
   * **macOS / Linux (Terminal):**
     ```bash
     OLLAMA_ORIGINS="*" ollama serve
     ```

### Option B: OpenRouter (Cloud API)
1. Select **OpenRouter** in the Settings panel.
2. Enter your OpenRouter API Key (use the **Show/Hide** toggle to confirm characters).
3. Choose a vision-capable model ID (e.g., `google/gemini-2.5-flash` or `meta-llama/llama-3.2-11b-vision-instruct:free`).

### Option C: Google Gemini (AI Studio Direct)
1. Select **Google Gemini** in the Settings panel.
2. Get a free API Key from Google AI Studio.
3. Paste the key in the API Key input and click **Save Settings** (uses `gemini-2.5-flash` model by default).

### Option D: Custom (OpenAI-Compatible)
1. Select **Custom** in the Settings panel.
2. Enter the Base URL of any OpenAI-compatible `/chat/completions` endpoint.
3. Supply the API Key and vision-capable Model ID for that endpoint.

> [!NOTE]
> Any self-hosted endpoint must send permissive CORS headers, since requests are made directly from the browser.

---

## 🎨 Key Features
- **GitHub Pages Ready:** Build (`npm run build`) and host the compiled static assets anywhere as a serverless SPA.
- **Zero Data Leakage:** All files are parsed inside your browser's sandbox and stored privately in your browser's IndexedDB. No files are uploaded to third-party servers except for OCR requests sent directly to your configured AI provider.
- **Premium Light/Dark Mode:** Dynamic aesthetic styles with glassmorphic cards, typography configurations (`prose` and `prose-invert` for high-contrast reading), and a fullscreen image zoom viewport.
- **Metadata Timestamps & Badges:** Marks files in the dashboard grid with status indicators, formatted timestamp labels, and processing method badges (`AI VISION` vs `FAST TEXT`).
- **History Tracking:** All previously analyzed documents are saved in your local database so you never lose your progress, and can be deleted individually at any time.
- **Modes of Analysis:**
  - **Fast Extraction:** Direct text layout parsing using PDF.js. Free and instant.
  - **Vision Layout:** Render pages to high-resolution canvases and perform visual OCR using local/cloud LLMs to reconstruct tables, math, headings, and formatting.

---

## ⚖️ License
This project is licensed under the MIT License.
