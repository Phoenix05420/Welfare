@echo off
echo ===================================================
echo             Starting WelfareIntel Project           
echo ===================================================

echo [1/3] Starting FastAPI Backend on port 8000...
start "WelfareIntel Backend" cmd /k "cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Starting Vite Frontend on port 8081...
start "WelfareIntel Frontend" cmd /k "npm run dev"

echo Waiting 5 seconds for servers to warm up...
timeout /t 5 /nobreak >nul

echo [3/3] Checking Backend Scrape Status...
curl -s http://127.0.0.1:8000/api/scrape-status
echo.

echo Opening application in default browser...
start http://localhost:8081/

echo ===================================================
echo Project started successfully! Close the cmd windows
echo of the backend/frontend servers to terminate.
echo ===================================================
