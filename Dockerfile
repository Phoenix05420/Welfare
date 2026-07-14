# ==============================================================================
# WelfareIntel Root Production Dockerfile (For Hugging Face Spaces & Cloud SDK)
# ==============================================================================

FROM python:3.11-slim AS production

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    DEBIAN_FRONTEND=noninteractive \
    PORT=7860

# Install required system dependencies for OpenCV and Playwright browser execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgstreamer1.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirement list and install dependencies (supports both root and backend context)
COPY requirements.txt* backend/requirements.txt* ./
RUN cp requirements.txt /tmp/req.txt 2>/dev/null || true && \
    pip install --upgrade pip && \
    pip install -r requirements.txt && \
    playwright install --with-deps chromium

# Copy application source code and adjust layout if built from root
COPY . ./
RUN if [ -d "/app/backend" ]; then cp -r /app/backend/* /app/ && rm -rf /app/backend /app/frontend; fi

# Expose Hugging Face Space / API port
EXPOSE 7860

# Start Uvicorn server via python main.py where PORT (defaulting to 7860) environment variable is cleanly bound
CMD ["python", "main.py"]
