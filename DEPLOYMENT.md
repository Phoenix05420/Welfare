<div align="center">

# 🚀 WelfareIntel Deployment Guide (`GitHub Actions & CI/CD`)
### Comprehensive Guide to Deploying Full-Stack TanStack Start & FastAPI via GitHub Actions

[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![Railway](https://img.shields.io/badge/Railway-131415?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/)

<br />

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Phoenix05420/Welfare)

</div>

---

## ⚡ One-Click Cloud Deployment (Instant Live URL!)

Because WelfareIntel includes a pre-configured **Render Blueprint (`render.yaml`)**, you can launch the entire full-stack application onto the cloud with **a single click**:

1. Click the button above: **[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Phoenix05420/Welfare)**
2. Log in with your GitHub account on Render.
3. Render will automatically detect `render.yaml` and spin up both **`welfare-backend`** (`Dockerfile.backend`) and **`welfare-frontend`** (`Dockerfile.frontend`).
4. Once deployed (~3 minutes), your app will be live at a public HTTPS domain like:
   👉 **`https://welfare-frontend.onrender.com`**

---

## 🏛️ Deployment Architecture

WelfareIntel uses a **Container-First CI/CD Pipeline** powered by **GitHub Actions** (`.github/workflows/`). Every time you push to the `main` branch or create a release tag (`v1.0.0`), our workflows automatically:

1. **Test & Verify (`ci.yml`)**: Run syntax checking, linting, TypeScript compilation, and Python diagnostic health checks.
2. **Build & Package (`docker-publish.yml`)**: Build production multi-stage Docker images for both the **Frontend (`TanStack Start / Nitro Node Server`)** and **Backend (`FastAPI + Playwright + OCR`)**.
3. **Publish (`GHCR`)**: Push the built containers directly to your **GitHub Container Registry (`ghcr.io/phoenix05420/welfare/frontend` and `backend`)**.
4. **Trigger Deployment (`deploy.yml`)**: Notify your hosting provider (`Render`, `Railway`, `VPS over SSH`, or `Fly.io`) to instantly pull the new containers and update live traffic with zero downtime.

```mermaid
sequenceDiagram
    autonumber
    actor Developer
    participant GitHub as GitHub (`main` / PR)
    participant Actions as GitHub Actions CI/CD
    participant GHCR as GitHub Container Registry
    participant Cloud as Cloud Provider (Render/VPS/Railway)

    Developer->>GitHub: git push origin main
    GitHub->>Actions: Trigger `.github/workflows/ci.yml`
    Actions->>Actions: Run TypeScript Check & Python Self-Tests
    Actions-->>GitHub: ✅ CI Checks Passed
    GitHub->>Actions: Trigger `.github/workflows/docker-publish.yml`
    Actions->>Actions: Build `Dockerfile.frontend` & `Dockerfile.backend`
    Actions->>GHCR: Push `ghcr.io/phoenix05420/welfare/frontend:latest` & `backend:latest`
    GitHub->>Actions: Trigger `.github/workflows/deploy.yml`
    Actions->>Cloud: Trigger Webhook / SSH `docker compose up -d`
    Cloud->>GHCR: Pull latest production images
    Cloud-->>Developer: 🌐 Live Production Application Updated!
```

---

## 🛠️ GitHub Actions Workflows Overview

### 1. `ci.yml` (Continuous Integration)
* **Trigger**: On any `push` or `pull_request` targeting `main`.
* **Frontend Job (`frontend-ci`)**: Sets up Node.js 20, runs `npm ci`, verifies `@tanstack/react-router` types, and builds `.output/` bundle.
* **Backend Job (`backend-ci`)**: Sets up Python 3.11, installs `requirements.txt` + `playwright chromium`, verifies imports, and runs data diagnostics.

### 2. `docker-publish.yml` (Docker Build & Push to GHCR)
* **Trigger**: On `push` to `main` or Git Tags (`v*.*.*`).
* **Caching**: Employs GitHub Actions cache (`type=gha,mode=max`) for instant sub-minute builds.
* **Output**:
  * `ghcr.io/<username>/welfare/frontend:latest`
  * `ghcr.io/<username>/welfare/backend:latest`

### 3. `deploy.yml` (Automated Cloud & VPS Deployment)
* **Trigger**: Automatically executes once `docker-publish.yml` completes successfully.
* **Webhook Mode**: Sends an HTTP `POST` trigger to your cloud hosting provider if `DEPLOY_WEBHOOK_URL` secret is set.
* **VPS Mode**: Uses `appleboy/ssh-action` to connect to a Linux server, pull the latest images from `ghcr.io`, and restart the `docker-compose.prod.yml` stack.

---

## 🔐 Configuring GitHub Repository Secrets

To enable automated zero-downtime deployment, add the following secrets under **Your Repository** ➡️ **Settings** ➡️ **Secrets and variables** ➡️ **Actions**:

| Secret Name | Required For | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `DEPLOY_WEBHOOK_URL` | Cloud Providers | Deploy hook URL generated by Render, Railway, or webhook relay | `https://api.render.com/deploy/srv-12345?key=xyz` |
| `VPS_SSH_HOST` | Self-Hosted VPS | IP address or domain name of your Linux server | `203.0.113.42` |
| `VPS_SSH_USER` | Self-Hosted VPS | SSH username on your Linux server | `ubuntu` or `root` |
| `VPS_SSH_KEY` | Self-Hosted VPS | Private SSH key (`~/.ssh/id_ed25519` or `id_rsa`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_SSH_PORT` | Self-Hosted VPS | SSH port number (Defaults to `22` if omitted) | `22` |

> [!NOTE]
> **No Docker Hub credentials are required!** GitHub Actions automatically utilizes `${{ secrets.GITHUB_TOKEN }}` to publish directly to your private or public GitHub Container Registry (`ghcr.io`).

---

## 🌐 Step-by-Step Deployment Options

### Option A: Deploying via Docker Compose on a Linux VPS / Cloud VM (Recommended)
If you have a Linux virtual machine (DigitalOcean Droplet, AWS EC2, Hetzner, Linode, or local server):

1. **Configure Repository Secrets**: Set `VPS_SSH_HOST`, `VPS_SSH_USER`, and `VPS_SSH_KEY` in GitHub.
2. **Setup Environment Variables on your Server**:
   Connect via SSH and create a `.env` file inside `~/welfare/`:
   ```bash
   mkdir -p ~/welfare && cd ~/welfare
   cat <<EOF > .env
   FRONTEND_URL=https://welfareintel.yourdomain.com
   VITE_API_BASE_URL=https://api.welfareintel.yourdomain.com
   DATABASE_URL=postgresql://user:pass@neon-db-hostname.neon.tech/welfare_db?sslmode=require
   GOOGLE_CLIENT_ID=your-oauth-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-oauth-secret
   GOOGLE_REDIRECT_URI=https://api.welfareintel.yourdomain.com/auth/google/callback
   EOF
   ```
3. **Push to Main**: Every time you `git push origin main`, GitHub Actions will build the images, copy `docker-compose.prod.yml` to your server, pull the updated containers, and restart your app automatically!

---

### Option B: Deploying to Render (`Render.com`)
1. Go to your [Render Dashboard](https://dashboard.render.com/) and select **New** ➡️ **Web Service**.
2. Choose **Deploy an existing image from a registry**.
3. For the **Backend Service**:
   * Image URL: `ghcr.io/phoenix05420/welfare/backend:latest`
   * Port: `8000`
   * Environment Variables: Add `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `FRONTEND_URL`.
4. For the **Frontend Service**:
   * Image URL: `ghcr.io/phoenix05420/welfare/frontend:latest`
   * Port: `8081`
   * Environment Variables: Add `VITE_API_BASE_URL` (pointing to your Render backend URL).
5. In Render, go to **Settings** ➡️ **Deploy Hook**, copy the URL, and save it in your GitHub Repository Secrets as `DEPLOY_WEBHOOK_URL`. GitHub Actions will automatically hit this URL right after building new container versions!

---

### Option C: Deploying to Railway (`Railway.app`)
1. In your [Railway Dashboard](https://railway.app/), click **New Project** ➡️ **Deploy from GitHub repo** OR **Deploy from Docker Image**.
2. Point Railway to your `ghcr.io` containers (`welfare/backend` and `welfare/frontend`).
3. Add your environment variables under the **Variables** tab.
4. Railway will automatically detect pushed container updates or you can link Railway's webhook directly into `.github/workflows/deploy.yml`.

---

## ❓ Troubleshooting CI/CD & Deployments

* **Image Permission Denied (`GHCR 403`)**: Ensure your repository **Package settings** under GitHub have **Read and write permissions** enabled for GitHub Actions (`Settings` -> `Actions` -> `General` -> `Workflow permissions` -> `Read and write permissions`).
* **FastAPI Playwright Browser Error**: Our `Dockerfile.backend` automatically includes all necessary X11 and GStreamer system dependencies (`libnss3`, `libatk1.0-0`, etc.) and executes `playwright install --with-deps chromium` during build.
* **TanStack Router Type Tree Error**: If `routeTree.gen.ts` is missing or out of sync during CI builds, our frontend workflow checks out the repository and compiles directly with `@lovable.dev/vite-tanstack-config`.
