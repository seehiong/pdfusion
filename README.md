# PDFusion: Local PDF Analyzer & Markdown Converter 🚀

PDFusion is a comprehensive PDF analysis application that extracts text, images, and tables from uploaded PDFs and outputs everything in clean, structured Markdown format. It uses a local Python backend with FastAPI and utilizes local AI models via LiteLLM for advanced OCR.

## 🏔️ Technical Architecture

### Core Stack
- **Frontend**: React 18+ with TypeScript (Vite)
- **Backend**: FastAPI (Python 3.10+)
- **Database**: Postgres (local or homelab) with SQLite auto-fallback
- **AI/LLM**: LiteLLM Proxy + Ollama (Local Vision Models)
- **PDF Extraction**: PyMuPDF (fitz) + Pandas (Tables)

### System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │───▶│   FastAPI        │───▶│   LiteLLM Proxy │
│   (Frontend)    │    │   (Backend)      │    │   (Ollama)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                          │
                                ▼                          ▼
                         ┌──────────────┐         ┌──────────────┐
                         │  PostgreSQL/ │         │  Local       │
                         │  SQLite      │         │  AI Models   │
                         └──────────────┘         └──────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or later)
- **Python** (v3.10 or later)
- **Ollama** (Running locally with `gemma4` models)
- **Postgres** (Optional, will fallback to local SQLite)

### 1. Backend Setup
Navigate to the root directory and set up the Python environment:

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r server/requirements.txt
```

### 2. Frontend Setup
Install the Node.js dependencies:

```bash
npm install
```

### 3. AI Model Setup (Ollama / LiteLLM)
Ensure Ollama is installed and your vision model is pulled. If using a LiteLLM Proxy (recommended for homelab setups), ensure the endpoint is accessible.

```bash
ollama run gemma4
```

### 4. Configuration
Create a `.env` file in the root directory (based on `.env.example`). 

> [!TIP]
> PDFusion is configured to bypass self-signed SSL certificates for `litellm.local` homelab proxies automatically.

```bash
# API URL for the local backend
VITE_API_BASE_URL=http://localhost:8000

# PostgreSQL Database URL
DATABASE_URL=postgresql://user:password@localhost:5432/pdfusion

# LiteLLM Proxy / Ollama Configuration
VISION_MODEL_ID=ollama/gemma4
LITELLM_API_BASE=https://litellm.local
LITELLM_API_KEY=sk-local-proxy
```

---

## 🏃 Running the Application

### Start the Backend Server
```bash
npm run server
```
This starts the FastAPI server at `http://localhost:8000`. It will auto-mount `uploads/` and `outputs/` for image serving.

### Start the Frontend
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 🎨 'Pro' Viewer Features
The results dashboard now includes a professional-grade Markdown viewer inspired by advanced editors:
- **GFM Support**: Full rendering of complex data tables and strikethroughs.
- **Math/KaTeX**: Support for mathematical formulas extracted from documents.
- **Image Intelligence**: Automatic URL rewriting ensures embedded images are served correctly from the local backend.
- **Local OCR**: Full text extraction displayed clearly beneath every identified image.

---

## 📁 Project Structure

```
├── server/                # Python FastAPI Backend
│   ├── src/               # Processing logic (PDF, Vision, Table)
│   ├── uploads/           # Local storage for raw PDFs
│   ├── outputs/           # Local storage for extracted images/assets
│   ├── main.py            # FastAPI entry point
│   ├── models.py          # Database models (SQLAlchemy)
│   └── requirements.txt   # Python dependencies (Pandas, Pillow, etc.)
├── src/                   # React Frontend (Vite)
│   ├── components/        # UI Components & Icons
│   ├── services/          # API Client Layer
│   └── pages/             # Dashboard & Results Views
└── package.json           # Frontend dependencies (ReactMarkdown, RemarkGfm)
```

---

## 🎯 Key Features
- **Zero Cloud Leakage**: No data leaves your machine or your local network.
- **Intelligent Table Reconstruction**: Uses Pandas for high-fidelity table parsing.
- **Private Vision OCR**: High-performance image-to-text via local LiteLLM proxy.
- **Export Ready**: Clean, standardized Markdown output.

---

## ⚖️ License
This project is licensed under the MIT License.
