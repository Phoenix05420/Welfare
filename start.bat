@echo off
echo ===================================================
echo             Starting WelfareIntel Project           
echo ===================================================

echo [1/4] Starting Ollama Vision AI Server on port 11434...
start "Ollama AI Server" cmd /k "ollama serve"

echo [2/4] Starting FastAPI Backend on port 8000...
start "WelfareIntel Backend" cmd /k "cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

echo [3/4] Starting Vite Frontend on port 8081...
start "WelfareIntel Frontend" cmd /k "npm run dev"

echo Waiting 6 seconds for AI server and backend to warm up...
timeout /t 6 /nobreak >nul

echo [4/4] Checking Backend Scrape Status...
curl -s http://127.0.0.1:8000/api/scrape-status
echo.

echo Opening application in default browser...
start http://localhost:8081/

echo ===================================================
echo Project started successfully! Close the cmd windows
echo of Ollama, Backend, and Frontend to terminate.
echo ===================================================
