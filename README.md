# WelfareIntel 🏛️✨

An intelligent, AI-powered welfare and government scheme discovery platform designed to connect citizens with scholarships, benefits, and government programs effortlessly. Built with a modern full-stack architecture utilizing **TanStack Start (React 19)** and **Python FastAPI**.

---

## 🌟 Key Features

- **🤖 AI Scheme Aligner**: Uses machine learning & intelligent heuristics to analyze user profiles and calculate exact eligibility and match scores for welfare programs and scholarships.
- **📄 Document Scanner**: OCR & intelligent document processing to verify eligibility criteria and auto-fill complex application requirements.
- **🕸️ Live Government Scheme Scraper**: Real-time web scraping pipeline fetching up-to-date scholarship and scheme listings from official portals.
- **💬 AI Welfare Assistant**: Interactive conversational chatbot guiding users step-by-step through benefits discovery and application procedures.
- **⚡ One-Click Auto-Apply**: Automated application pipeline simplifying the submission process for eligible benefits.
- **🔐 Secure Google SSO**: Seamless and secure OAuth authentication integrated with PostgreSQL (Neon DB).

---

## 🛠️ Technology Stack

### **Frontend**
- **Framework**: [TanStack Start](https://tanstack.com/start) / React 19
- **Build Tool**: Vite 8 & TypeScript
- **Styling**: Tailwind CSS v4 & Framer Motion for rich animations
- **UI Components**: Radix UI / Lucide Icons
- **State Management**: Zustand & TanStack Query

### **Backend**
- **Framework**: Python FastAPI (Uvicorn Async Server)
- **Database**: PostgreSQL (Neon Cloud DB)
- **Scraping & Automation**: Playwright / BeautifulSoup / Asyncio
- **Security**: Google OAuth 2.0 / Encryption utilities

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your system:
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Phoenix05420/Welfare.git
cd Welfare
```

### 2. Install Dependencies

#### Frontend Dependencies:
```bash
npm install
```

#### Backend Dependencies:
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 3. Environment Variables Setup
Create a `.env` file inside the `backend/` directory with the following configuration:

```env
DATABASE_URL='your_postgresql_connection_string'
GOOGLE_CLIENT_ID='your_google_oauth_client_id'
GOOGLE_CLIENT_SECRET='your_google_oauth_client_secret'
FRONTEND_URL=http://localhost:8081
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

---

## 🏃 Running the Application

### Option A: Quick Start (Windows)
Simply run the included batch script from the root directory to launch both servers simultaneously:
```cmd
start.bat
```
This will automatically:
1. Launch the FastAPI backend server on `http://localhost:8000`.
2. Start the Vite frontend development server on `http://localhost:8081`.
3. Open your default web browser to the dashboard.

### Option B: Manual Start

**Terminal 1 (Backend):**
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

---

## 📁 Repository Structure

```text
Welfare/
├── backend/                  # Python FastAPI Backend Services
│   ├── ai_aligner.py         # AI eligibility matching engine
│   ├── auto_apply.py         # Automated application pipeline
│   ├── chat.py               # AI Chatbot service
│   ├── database.py           # Database connection & models
│   ├── document_scanner.py   # OCR & doc analysis engine
│   ├── scraper.py            # Live web scraper for schemes
│   └── main.py               # API router & middleware entrypoint
├── src/                      # TanStack Start Frontend
│   ├── components/           # Reusable UI cards, modals, navigation
│   ├── routes/               # Full-stack application pages & layouts
│   ├── lib/                  # State stores, utilities & error handling
│   └── styles.css            # Tailwind v4 configuration
├── start.bat                 # Windows one-click startup script
└── package.json              # Frontend project configuration
```

---

## 📄 License
This project is licensed under the MIT License.
