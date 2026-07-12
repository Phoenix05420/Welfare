<div align="center">

# ⚙️ WelfareIntel Backend Architecture
### High-Performance Python FastAPI Server & Local AI Reasoning Engine

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Llama.cpp](https://img.shields.io/badge/Llama.cpp-Qwen%202.5%20VL-8A2BE2?style=for-the-badge&logo=openai&logoColor=white)](https://github.com/QwenLM/Qwen2.5-VL)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## 🏛️ Overview

The **WelfareIntel Backend** is a modular, high-performance **Python FastAPI** service designed to handle complex civic data extraction, intelligent scheme alignment, document OCR verification, and real-time government portal web scraping. 

Unlike traditional applications reliant on cloud AI APIs that expose sensitive citizen data or incur API latency/costs, WelfareIntel implements a **Local-First AI Architecture** utilizing `llama-cpp-python` and quantized vision-language models (`Qwen2.5-VL-3B-Instruct GGUF`) alongside deterministic scoring algorithms and multi-stage fallback pipelines.

---

## 🏗️ Core Modules & Architecture

```text
backend/
├── main.py                 # FastAPI application root, middleware & OAuth 2.0 routes
├── local_llm.py            # Singleton Llama-cpp model manager & inference wrapper
├── ai_aligner.py           # Hybrid AI + Heuristic eligibility calculation engine
├── document_scanner.py     # OCR, PyMuPDF, OpenCV document verification engine
├── scraper.py              # Async Playwright & BeautifulSoup web scraper
├── chat.py                 # Conversational AI assistant controller
├── auto_apply.py           # Automated application submission & tracking service
├── database.py             # Neon PostgreSQL connection pooling, ORM & cache sync
├── encryption.py           # Cryptographic utilities for PII data protection
├── logger.py               # Standardized logging setup with console formatting
├── self_test_api.py        # Automated verification & diagnostics test suite
└── scraped_cache.json      # Fast local JSON mirror for offline/instant scheme access
```

---

## 🧩 Deep Dive into Subsystems

### 1. 🧠 Local AI & Inference Manager (`local_llm.py`)
* **Singleton Design Pattern**: Loads the quantized GGUF model (`Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf`) into system memory exactly once on server startup using an async lock. This prevents out-of-memory crashes and ensures instant inference across endpoints.
* **Hardware Acceleration**: Configurable via environment variables (`N_GPU_LAYERS`, `N_CTX`) to seamlessly scale between CPU-only environments and CUDA-enabled NVIDIA GPUs.
* **Zero External API Cost**: All document extraction, chatbot reasoning, and scheme alignment can execute offline right inside your infrastructure.

### 2. 🎯 Hybrid AI Scheme Aligner (`ai_aligner.py`)
* **Multi-Stage Evaluation Pipeline**:
  1. **Deterministic Heuristics**: Instantly checks strict eligibility hurdles (e.g., community `SC/ST/BC`, age limits, state residency, family income ceiling of `₹2.5 Lakhs`).
  2. **AI Semantic Matching**: Passes detailed profile JSON and scheme criteria to the local LLM to evaluate nuanced or conditional requirements.
* **Confidence & Match Scoring**: Outputs a standardized `matchPercentage` (`0% - 100%`) along with structured bullet points explaining fulfilled criteria and missing prerequisites.
* **Resilient Fallbacks**: If the local LLM is busy or unconfigured, the system automatically falls back to deterministic heuristic scoring without failing the API request.

### 3. 📄 Document Scanner & OCR Verification (`document_scanner.py`)
* **Multi-Format Extraction**: Ingests PDFs (`PyMuPDF / fitz`) and image uploads (`PNG`, `JPG`, `JPEG`, `WEBP`) processed with `OpenCV` and `Pillow`.
* **Automated OCR Verification**: Identifies document types (Aadhaar, Community Certificate, Income Certificate, Marksheets, Bonafide Certificates) and extracts verifiable attributes such as Certificate Numbers, Applicant Name, Community Category, and Annual Income.
* **Direct Scheme Audit**: Automatically cross-checks extracted document data against target scholarship mandates (e.g., verifying `Pudhumai Penn` government school attendance or `Post-Matric` community requirements).

### 4. 🕸️ Live Government Portal Scraper (`scraper.py`)
* **Async Playwright Automation**: Spawns headless browser sessions to interact with dynamic government web portals (`Tamil Nadu ePASS`, etc.), navigating through JavaScript-rendered tables and pagination.
* **HTML Structuring via BeautifulSoup**: Cleans raw DOM elements into standardized JSON schemas containing scheme titles (in both English and Tamil), application deadlines, benefits matrices, required document checklists, and official URLs.
* **Hybrid Cloud/Local Cache (`scraped_cache.json` & Postgres)**: Scraped schemes are saved immediately to local disk cache and synchronized with PostgreSQL (`Neon Cloud DB`). If official portals experience downtime, users continue discovering schemes from the cache with zero latency.

### 5. 🔐 Security & Single Sign-On (`main.py` & `encryption.py`)
* **Google OAuth 2.0 Integration**: Uses `fastapi-sso` and Starlette `SessionMiddleware` to handle secure authentication and token exchange at `/auth/google/login` and `/auth/google/callback`.
* **Data Encryption**: Cryptographic helpers in `encryption.py` safeguard citizen PII before persisting to database storage.

---

## 🛠️ Setup & Installation

### Prerequisites
* **Python 3.10+** (Recommended: Python 3.11)
* **OpenSSL / Build Tools** (Standard on Windows/macOS/Linux)

### 1. Create & Activate Virtual Environment
```bash
cd backend
python -m venv venv

# Windows Command Prompt:
venv\Scripts\activate.bat

# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# macOS / Linux:
source venv/bin/activate
```

### 2. Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
playwright install
```

### 3. Configure Environment Variables (`.env`)
Create a `.env` file directly inside the `backend/` directory:

```env
# Server & Frontend URL
FRONTEND_URL="http://localhost:8081"

# Database Connection String (Neon Cloud DB or Local Postgres)
DATABASE_URL="postgresql://username:password@ep-your-database-id.neon.tech/welfare_db?sslmode=require"

# Google Single Sign-On (OAuth 2.0)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:8000/auth/google/callback"

# Local Llama / GGUF Model Settings
GGUF_MODEL_PATH="C:\Users\blue0\.lmstudio\models\lmstudio-community\Qwen2.5-VL-3B-Instruct-GGUF\Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf"
N_GPU_LAYERS="0"  # Set >0 to offload model layers to GPU VRAM
N_CTX="4096"      # Context window tokens
```

---

## 🚀 Running the API Server

### Development Mode (with Live Reloading)
```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Production Mode
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 📡 API Endpoints Reference

Once running, access interactive OpenAPI documentation at **[http://localhost:8000/docs](http://localhost:8000/docs)**.

### **Schemes & AI Alignment**
* `POST /api/schemes/align` — Evaluates user profile JSON against active schemes and returns match scores with detailed eligibility justifications.
* `GET /api/schemes/align/fallback` — Generates deterministic fallback alignments when AI inference is skipped.

### **Document Scanner & OCR**
* `POST /api/scanner/scan` — Multipart form-data upload for PDF/Images. Returns extracted metadata, document classification, and eligibility validation.
* `DELETE /api/scanner/cache` — Clears temporary document scanning cache.

### **Live Scraper Engine**
* `GET /api/scraper/schemes` — Retrieves all cached or live-scraped scheme listings (`category`, `query`, or `portal` filtering).
* `POST /api/scraper/trigger` — Initiates an async background Playwright scraping run on targeted portals (`tndce_colleges`, `tndce_scholarships`, `govtschemes`).
* `POST /api/scraper/sync` — Manually forces a synchronization between `scraped_cache.json` and PostgreSQL.

### **Chat & Auto-Apply**
* `POST /api/chat` — Handles natural language welfare queries with context-aware responses.
* `POST /api/schemes/apply` — Pre-fills and submits application payloads for verified profiles.
* `GET /api/schemes/applications/{user_id}` — Retrieves application status timeline for a citizen.

### **Authentication (`Google SSO`)**
* `GET /auth/google/login` — Redirects browser to Google OAuth 2.0 consent screen.
* `GET /auth/google/callback` — Handles OAuth verification and redirects to `FRONTEND_URL/auth` with user session payload.

---

## 🧪 Running Self-Tests & Diagnostics

We include an automated verification script to test endpoints, model loading, and database connectivity:
```bash
python self_test_api.py
```
This script validates health routes, verifies scraper cache integrity, and ensures OAuth handlers are correctly mounted.
