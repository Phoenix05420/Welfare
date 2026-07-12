<div align="center">

# 🏛️✨ WelfareIntel
### Intelligent AI-Powered Government Scheme & Scholarship Discovery Platform

[![React 19](https://img.shields.io/badge/React%2019-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack%20Start-%23FF4154.svg?style=for-the-badge&logo=react&logoColor=white)](https://tanstack.com/start)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Local LLM / Qwen 2.5](https://img.shields.io/badge/Local%20AI-Qwen%202.5--VL-8A2BE2?style=for-the-badge&logo=openai&logoColor=white)](https://github.com/QwenLM/Qwen2.5-VL)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

An advanced, end-to-end civic tech platform built to democratize access to welfare programs, scholarships, and citizen benefits. **WelfareIntel** leverages cutting-edge **Local Large Language Models (`Qwen2.5-VL` via `llama-cpp-python`)**, **real-time Playwright web scraping**, **intelligent document OCR processing**, and a **modern TanStack Start (React 19)** frontend to eliminate bureaucratic friction and seamlessly match citizens with the programs they deserve.

[Key Features](#-key-features) • [System Architecture](#-system-architecture) • [Technology Stack](#-technology-stack) • [Getting Started](#-getting-started) • [API Documentation](#-api-documentation) • [CI/CD & Deployment](#-cicd--cloud-deployment-github-actions) • [Repository Structure](#-repository-structure) • [Contributing](#-contributing)

---

</div>

## 🌟 Key Features

### 🤖 **Intelligent AI Scheme Aligner**
* **Local & Hybrid AI Eligibility Engine**: Utilizes local GGUF models (`Qwen2.5-VL-3B-Instruct`) running directly via `llama-cpp-python` combined with heuristic scoring algorithms to evaluate complex eligibility rules in milliseconds.
* **Exact Match & Confidence Scoring**: Calculates precise match percentages based on demographic data, community, annual income, educational status, and document availability.
* **Smart Recommendations**: Provides tailored action items showing users exactly what criteria they fulfill and how to bridge gap requirements.

### 📄 **AI Document Scanner & Verification**
* **Multi-Format Processing**: Supports PDFs and image uploads (`PNG`, `JPG`, `WEBP`) using `PyMuPDF` and `OpenCV`.
* **Automated OCR & Data Extraction**: Extracts key identification attributes (Aadhaar number, community status, income certificates, marksheets, bonafide certificates) completely on-device/locally without exposing sensitive PII to external APIs.
* **Real-Time Eligibility Auditing**: Automatically cross-references extracted document attributes against target scholarship and scheme mandates.

### 🕸️ **Live Government Scheme Scraper**
* **Automated Web Harvesting**: Async Playwright and BeautifulSoup scraper pipelines actively crawl official state and national portals (`TN ePASS`, `National Scholarship Portal`, etc.).
* **Intelligent Parsing & Structuring**: Converts messy HTML/DOM tables into structured JSON schemas with benefits, deadlines, eligibility matrices, and application steps.
* **Fallback Caching System**: Backed by a high-speed local `scraped_cache.json` and PostgreSQL cloud sync (`Neon DB`) to ensure zero downtime even when official portals are under maintenance.

### 💬 **Interactive AI Welfare Assistant**
* **Conversational Navigation**: A responsive, context-aware chatbot powered by local LLM logic that assists users step-by-step through discovery and troubleshooting.
* **Multilingual Support Ready**: Designed with localized terminology (English & Tamil scheme nomenclature) to serve diverse citizen demographics.

### ⚡ **One-Click Auto-Apply & Application Tracking**
* **Automated Form Pre-Filling**: Maps verified profile details and uploaded documents directly into standardized application forms.
* **Application Status Pipeline**: Tracks application submission lifecycles (`Draft`, `Submitted`, `Under Verification`, `Approved`, `Disbursed`).

### 🔐 **Enterprise-Grade Security & Authentication**
* **Seamless Google SSO Integration**: Secure OAuth 2.0 session-based login workflow integrated with encrypted user storage.
* **Local-First Privacy**: Document scanning and AI reasoning run locally where possible to ensure citizen data sovereignty.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Frontend ["Frontend UI — TanStack Start (React 19 + Tailwind v4)"]
        UI_Dashboard["Dashboard / Scheme Catalog"]
        UI_Scanner["Document Scanner UI"]
        UI_Chat["AI Welfare Chatbot"]
        UI_Profile["User Profile & SSO"]
    end

    subgraph Backend ["FastAPI Async Server (Python 3.10+)"]
        API_Gateway["API Router & CORS Middleware"]
        Aligner_Module["AI Aligner Engine (/api/schemes/align)"]
        Scanner_Module["Document Scanner (/api/scanner/scan)"]
        Scraper_Module["Live Scraper Engine (/api/scraper/*)"]
        Chat_Module["Chatbot Engine (/api/chat)"]
        AutoApply_Module["Auto-Apply Pipeline (/api/schemes/apply)"]
        SSO_Module["OAuth / Google SSO (/auth/google/*)"]
    end

    subgraph AI_Layer ["Local AI & ML Infrastructure"]
        LocalLLM["Local GGUF Model Manager (local_llm.py)"]
        LlamaCpp["llama-cpp-python (Qwen2.5-VL-3B-Instruct)"]
        OCR_Engine["PyMuPDF & OpenCV Image Processing"]
    end

    subgraph Data_Layer ["Data & Storage Layer"]
        Postgres["PostgreSQL DB (Neon Cloud / SQLAlchemy)"]
        JSON_Cache["Scraped Cache (scraped_cache.json)"]
        Official_Portals["Official Gov Portals (TN ePASS, etc.)"]
    end

    UI_Dashboard <-->|REST / JSON| API_Gateway
    UI_Scanner <-->|Multipart / Upload| API_Gateway
    UI_Chat <-->|REST API| API_Gateway
    UI_Profile <-->|OAuth Session| SSO_Module

    API_Gateway --> Aligner_Module
    API_Gateway --> Scanner_Module
    API_Gateway --> Scraper_Module
    API_Gateway --> Chat_Module
    API_Gateway --> AutoApply_Module

    Aligner_Module <--> LocalLLM
    Scanner_Module <--> OCR_Engine
    Scanner_Module <--> LocalLLM
    Chat_Module <--> LocalLLM
    LocalLLM <--> LlamaCpp

    Scraper_Module -->|Playwright / BeautifulSoup| Official_Portals
    Scraper_Module <--> JSON_Cache
    Aligner_Module <--> Postgres
    SSO_Module <--> Postgres
```

---

## 🛠️ Technology Stack

| Domain | Technologies & Frameworks |
| :--- | :--- |
| **Frontend Core** | [TanStack Start](https://tanstack.com/start) (React 19), Vite 8, TypeScript 5.8 |
| **Styling & UI** | Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Framer Motion |
| **State & Data Fetching** | Zustand v5, TanStack Query (React Query v5), TanStack Router |
| **Backend Core** | Python 3.10+, FastAPI, Uvicorn Async Server, Pydantic v2 |
| **Local AI / ML Engine** | `llama-cpp-python`, Llama.cpp, Qwen2.5-VL-3B-Instruct GGUF |
| **OCR & Processing** | PyMuPDF (`fitz`), OpenCV (`opencv-python-headless`), Pillow (`PIL`) |
| **Scraping & Automation** | Playwright (Async), BeautifulSoup4, HTTPX, Requests |
| **Database & ORM** | PostgreSQL (Neon Cloud Database), SQLAlchemy, Psycopg2 |
| **Auth & Security** | Google OAuth 2.0 (`fastapi-sso`), Authlib, Python-JOSE, Itsdangerous |

---

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed on your machine:
* **Node.js** (`v18.x` or higher) — [Download here](https://nodejs.org/)
* **Python** (`v3.10` to `v3.12`) — [Download here](https://www.python.org/downloads/)
* **Git** — [Download here](https://git-scm.com/)
* *(Optional)* **Local GGUF Model** — For local AI capabilities without internet dependencies, place `Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf` in your model path or configure via `.env`.

---

### 1. Clone the Repository
```bash
git clone https://github.com/Phoenix05420/Welfare.git
cd Welfare
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
We recommend using a Python virtual environment to isolate dependencies:
```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
playwright install
cd ..
```

### 4. Environment Variables Setup
Create a `.env` file inside the `backend/` directory with your configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://user:password@your-neon-hostname.neon.tech/welfare_db?sslmode=require"

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:8000/auth/google/callback"

# Frontend & CORS
FRONTEND_URL="http://localhost:8081"

# Local AI Engine Configuration (Optional - Defaults to local Qwen GGUF if present)
GGUF_MODEL_PATH="C:\Users\blue0\.lmstudio\models\lmstudio-community\Qwen2.5-VL-3B-Instruct-GGUF\Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf"
N_GPU_LAYERS="0"  # Set higher if you have an NVIDIA GPU with CUDA support
N_CTX="4096"
```

---

## 🏃 Running the Application

### Option A: One-Click Quick Start (Windows)
We provide an automated startup script (`start.bat`) that boots up both the backend API and frontend development servers concurrently:
```cmd
start.bat
```
This script will automatically:
1. Launch the FastAPI Uvicorn backend server on `http://localhost:8000`.
2. Launch the Vite/TanStack Start development server on `http://localhost:8081`.
3. Open your default web browser directly to the WelfareIntel dashboard.

---

### Option B: Manual Start (All Platforms)

#### **Terminal 1: Start FastAPI Backend Server**
```bash
cd backend
# Make sure virtual environment is activated if created
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*API Swagger Documentation will be live at:* `http://localhost:8000/docs`

#### **Terminal 2: Start TanStack Start Frontend Server**
```bash
npm run dev
```
*Frontend application will be live at:* `http://localhost:8081`

---

## 📡 API Documentation

Once the backend is running, FastAPI automatically generates interactive Swagger & Redoc interfaces:
* **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Key Endpoint Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/schemes/align` | Evaluates user profile attributes against schemes via AI/heuristics to return exact eligibility match scores |
| `POST` | `/api/scanner/scan` | Accepts uploaded documents (`PDF`, `PNG`, `JPG`), performs OCR, extracts verification data, and validates eligibility |
| `POST` | `/api/chat` | Conversational AI welfare assistant endpoint handling queries and troubleshooting steps |
| `POST` | `/api/schemes/apply` | Automated application submission and form pre-filling pipeline |
| `GET` | `/api/scraper/schemes` | Returns cached and live-scraped government scheme catalogs |
| `POST` | `/api/scraper/trigger` | Triggers a live Playwright scrape task on targeted government portals |
| `GET` | `/auth/google/login` | Initiates Google OAuth 2.0 Single Sign-On flow |
| `GET` | `/auth/google/callback` | OAuth callback handler that verifies tokens and redirects with user session |

---

## 🚀 CI/CD & Cloud Deployment (GitHub Actions)

WelfareIntel comes fully equipped with a production-grade **GitHub Actions CI/CD Pipeline** (`.github/workflows/`) and **multi-stage Docker containerization** (`Dockerfile.backend`, `Dockerfile.frontend`).

Every push to the `main` branch automatically:
1. **Runs Continuous Integration (`ci.yml`)**: Verifies TypeScript syntax, runs linter checks, and executes Python API diagnostic tests.
2. **Builds & Publishes Containers (`docker-publish.yml`)**: Compiles optimized production multi-stage images (`frontend` and `backend`) and pushes them directly to your **GitHub Container Registry (`ghcr.io`)**.
3. **Triggers Zero-Downtime Deployments (`deploy.yml`)**: Sends deployment hooks or SSH triggers to immediately restart production containers on cloud providers (**Render**, **Railway**, **Fly.io**) or a **self-hosted Linux VPS**.

> [!TIP]
> For complete step-by-step instructions on setting up repository secrets (`DATABASE_URL`, `DEPLOY_WEBHOOK_URL`, `VPS_SSH_HOST`), configuring Docker Compose, and deploying to cloud platforms, read our comprehensive **[DEPLOYMENT.md guide](DEPLOYMENT.md)**!

---

## 📁 Repository Structure

```text
Welfare/
├── backend/                       # Python FastAPI Backend Architecture
│   ├── ai_aligner.py              # AI/ML & heuristic scheme eligibility engine
│   ├── auto_apply.py              # Automated form pre-filling & application service
│   ├── chat.py                    # Conversational AI chatbot controller
│   ├── database.py                # Neon PostgreSQL models, session management & cache loader
│   ├── document_scanner.py        # OCR, PyMuPDF, OpenCV document processing engine
│   ├── encryption.py              # Cryptographic utilities for secure user data handling
│   ├── local_llm.py               # Singleton Llama-cpp model loader (`Qwen2.5-VL-3B-Instruct`)
│   ├── logger.py                  # Standardized system logging utility
│   ├── main.py                    # FastAPI application root, CORS & OAuth routes
│   ├── scraper.py                 # Async Playwright & BeautifulSoup web scraper
│   ├── self_test_api.py           # Automated health & verification test suite
│   ├── requirements.txt           # Python package dependencies
│   └── scraped_cache.json         # High-speed local JSON mirror of scraped schemes
├── src/                           # TanStack Start Frontend Architecture
│   ├── components/                # Reusable Radix UI & custom React components
│   │   ├── AIChatbot.tsx          # Floating AI Assistant interactive widget
│   │   ├── AutoApplyModal.tsx     # One-click application submission modal
│   │   ├── SchemeCard.tsx         # Detailed benefit card with eligibility progress bars
│   │   ├── ScrapedSchemeCard.tsx  # Dynamic UI component for live-scraped scheme listings
│   │   └── ui/                    # Atomic Radix UI design primitives
│   ├── routes/                    # File-based TanStack Start application routes
│   │   ├── __root.tsx             # Root layout wrapping application shell & navbar
│   │   ├── index.tsx              # Landing page & feature introduction
│   │   ├── dashboard.tsx          # Main user dashboard with recommendations
│   │   ├── benefits.tsx           # Category-based benefits explorer
│   │   ├── document-scanner.tsx   # Interactive document upload & OCR audit workspace
│   │   ├── featured-schemes.tsx   # Highlighted state and central government programs
│   │   ├── scraped-schemes.tsx    # Live government portal scraping monitor
│   │   ├── profile.tsx            # Citizen profile management & SSO preferences
│   │   └── auth.tsx               # Authentication handler & OAuth redirection state
│   ├── lib/                       # Utility helpers, API clients, and Zustand stores
│   ├── routeTree.gen.ts           # Auto-generated TanStack Router type tree
│   └── styles.css                 # Tailwind CSS v4 design tokens & custom utilities
├── start.bat                      # Windows automated double-click startup script
├── vite.config.ts                 # Vite & TanStack Start build configuration
├── tsconfig.json                  # TypeScript compiler settings
└── package.json                   # NPM script definitions & dependencies
```

---

## 🤝 Contributing

We welcome contributions from developers, civic tech researchers, and designers passionate about improving citizen welfare discovery!

1. **Fork the Repository** and create your feature branch: `git checkout -b feature/amazing-feature`
2. **Commit your changes**: `git commit -m 'Add some amazing feature'`
3. **Push to the branch**: `git push origin feature/amazing-feature`
4. **Open a Pull Request** describing your additions or enhancements.

> [!IMPORTANT]
> When pushing commits to connected branches on Lovable or production environments, avoid force pushing or rewriting published git history (`git rebase -i`, `git commit --amend`), as it ensures synchronized project history across collaborative interfaces.

---

## 📄 License

This project is open-sourced and licensed under the **MIT License**. See the `LICENSE` file for more details.

---

<div align="center">
  <p>Made with ❤️ by the <strong>WelfareIntel Team</strong> to empower citizens through intelligent technology.</p>
</div>
