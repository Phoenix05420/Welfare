<div align="center">

# 🎨 WelfareIntel Frontend Architecture
### Full-Stack Civic Web Application built with TanStack Start, React 19 & Tailwind CSS v4

[![React 19](https://img.shields.io/badge/React%2019-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack%20Start-%23FF4154.svg?style=for-the-badge&logo=react&logoColor=white)](https://tanstack.com/start)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## 🌟 Overview

The **WelfareIntel Frontend** is a modern, ultra-responsive web application engineered to make discovering government schemes and scholarships intuitive, fast, and accessible for all citizens. 

Built using **TanStack Start (React 19)** on top of **Vite 8**, our architecture leverages **file-based full-stack routing**, **atomic Radix UI primitives**, state-of-the-art **Tailwind CSS v4 styling**, and smooth **Framer Motion animations** to deliver an enterprise-grade user experience with full bilingual (English & Tamil) support.

---

## 🏗️ Directory Structure & Key Modules

```text
src/
├── components/                # Modular, reusable UI components
│   ├── AIChatbot.tsx          # Floating interactive AI Assistant drawer/chat widget
│   ├── AutoApplyModal.tsx     # One-click form pre-filling & submission dialog
│   ├── SchemeCard.tsx         # Scheme card featuring eligibility progress indicator
│   ├── ScrapedSchemeCard.tsx  # Dynamic card component for live-scraped scheme listings
│   ├── Pagination.tsx         # Accessible pagination controller for scheme catalogs
│   └── ui/                    # Radix UI + Tailwind design system primitives
├── routes/                    # TanStack Start File-Based Application Routes
│   ├── __root.tsx             # Root app shell, navbar, footer & global state provider
│   ├── index.tsx              # High-impact landing page & feature highlights
│   ├── dashboard.tsx          # Citizen dashboard with tailored recommendations
│   ├── benefits.tsx           # Categorical directory of benefits & programs
│   ├── benefits.$category.tsx # Dynamic route for category-filtered scheme lists
│   ├── scheme.$id.tsx         # Detailed scheme view with requirements and eligibility checker
│   ├── document-scanner.tsx   # Document OCR verification & eligibility auditing workspace
│   ├── featured-schemes.tsx   # Highlighted central/state government initiatives
│   ├── scraped-schemes.tsx    # Live portal scraper monitoring & instant discovery
│   ├── profile.tsx            # User profile management, demographic data & SSO sync
│   ├── upgrade.tsx            # Premium/extended civic tier management
│   └── auth.tsx               # OAuth callback processing & session persistence
├── lib/                       # Global utilities, Zustand stores & API query clients
├── hooks/                     # Custom React hooks (window resize, auth state, debouncing)
├── styles.css                 # Tailwind CSS v4 design tokens, theme variables & utilities
├── routeTree.gen.ts           # Auto-generated TanStack Router type safety tree
├── router.tsx                 # Router instance initialization
└── server.ts / start.ts       # TanStack Start server entrypoints
```

---

## ⚡ Core Features & User Experience

### 1. 🌐 Full-Stack File-Based Routing (`src/routes/`)
* **Type-Safe Navigation**: Powered by `@tanstack/react-router` and `@tanstack/react-start`. Every route URL (`/dashboard`, `/scheme/$id`, `/benefits/$category`) is strictly typed via `routeTree.gen.ts`, preventing broken links and runtime routing errors.
* **Layout Hierarchy**: The `__root.tsx` shell persists global navigation (`AppShell`), notification banners, and floating widgets (`AIChatbot`) seamlessly across page transitions.

### 2. 🤖 Interactive Document Scanner Workspace (`document-scanner.tsx`)
* **Drag-and-Drop Ingestion**: Citizens can drop Aadhaar cards, community certificates, and marksheets (`PDF`, `PNG`, `JPG`) directly into the workspace.
* **Live AI Audit Results**: Displays real-time extracted attributes and visual checkmarks verifying fulfillment of specific scheme requirements (`Pudhumai Penn`, `Post-Matric Scholarship`, etc.).

### 3. 💬 Floating AI Welfare Assistant (`AIChatbot.tsx`)
* **Always-Available Civic Guide**: Mounted at the root level, allowing citizens to ask questions or debug application issues without leaving their current page context.
* **Rich Markdown Responses**: Renders structured answers, eligibility criteria bullet points, and direct links to relevant scheme pages.

### 4. ⚡ One-Click Application Pre-Filling (`AutoApplyModal.tsx`)
* **Zero Data Re-entry**: Automatically maps citizen profile details and verified document attributes into standardized application workflows.
* **Multi-Step Verification Wizard**: Guides users through profile review, document attachment confirmation, and final submission tracking.

### 5. 🎨 Design System & Styling (`styles.css` & Tailwind v4)
* **Tailwind CSS v4 Architecture**: Employs CSS-first configuration (`@import "tailwindcss";`) with custom semantic color palettes tailored for high accessibility and contrast.
* **Glassmorphism & Micro-Animations**: Subtle hover effects, smooth collapsible sections (`Radix UI Accordion`), and dynamic progress bars (`Framer Motion`) create an engaging, modern interface.

---

## 🛠️ Technology Stack Breakdown

| Layer | Library / Tool | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | TanStack Start (`@tanstack/react-start`) | v1.167+ | Full-stack React framework with SSR/Client routing |
| **Router** | TanStack Router (`@tanstack/react-router`) | v1.168+ | 100% type-safe file-based routing |
| **UI Library** | React & React DOM | v19.2.0 | Latest React 19 architecture |
| **Styling** | Tailwind CSS & `@tailwindcss/vite` | v4.2.1 | Utility-first CSS engine with v4 performance |
| **Component Primitives** | Radix UI (`@radix-ui/react-*`) | v1.x - v2.x | Accessible, unstyled UI primitives |
| **State Management** | Zustand | v5.0.14 | Lightweight, hook-based global client state |
| **Data Fetching** | TanStack Query (`@tanstack/react-query`) | v5.83.0 | Async server state management & caching |
| **Animations** | Framer Motion & `tw-animate-css` | v12.40.0 | Fluid component transitions and micro-interactions |
| **Icons & Media** | Lucide React | v0.575.0 | Clean, modern vector icon set |

---

## 🚀 Development Setup & Commands

### 1. Install Node Dependencies
Ensure you are in the root directory of the repository (`Welfare/`):
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
*The frontend development server will launch on:* `http://localhost:8081`

> [!NOTE]
> Make sure the FastAPI backend server (`backend/main.py`) is running concurrently on `http://localhost:8000` so that API calls (`/api/schemes/align`, `/api/scanner/scan`, etc.) execute properly. Or run `start.bat` from the project root to start both servers automatically.

### 3. Build for Production
To generate an optimized production bundle:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
```

### 4. Code Formatting & Linting
```bash
# Run ESLint to check for code quality issues
npm run lint

# Automatically format code using Prettier
npm run format
```

---

## 🌐 Routing & URL Map

| Route Path | File Location | Description |
| :--- | :--- | :--- |
| `/` | `src/routes/index.tsx` | Platform landing page with hero banner & key metrics |
| `/dashboard` | `src/routes/dashboard.tsx` | Personalized citizen dashboard with AI recommendations |
| `/benefits` | `src/routes/benefits.tsx` | Directory of scheme categories (`SC/ST`, `Women`, `Students`) |
| `/benefits/:category` | `src/routes/benefits.$category.tsx` | Filtered list of schemes belonging to a chosen category |
| `/scheme/:id` | `src/routes/scheme.$id.tsx` | Comprehensive breakdown of a scheme with eligibility checker |
| `/document-scanner` | `src/routes/document-scanner.tsx` | AI document upload, OCR verification & audit workspace |
| `/featured-schemes` | `src/routes/featured-schemes.tsx` | Curated showcase of flagship central & state initiatives |
| `/scraped-schemes` | `src/routes/scraped-schemes.tsx` | Live portal scraper monitor (`TN ePASS`, `NSP`) |
| `/profile` | `src/routes/profile.tsx` | User demographic settings and Google SSO profile sync |
| `/auth` | `src/routes/auth.tsx` | OAuth 2.0 callback destination & token verification |
