@echo off
title Reel Transcriber — Launcher
color 0A
echo.
echo  ============================================
echo   Reel Transcriber — Iniciando servidores...
echo  ============================================
echo.

cd /d "%~dp0"

:: Mata qualquer instancia anterior
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000.*LISTENING" 2^>nul') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173.*LISTENING" 2^>nul') do taskkill /PID %%a /F >nul 2>&1

:: Backend (FastAPI) em janela separada
start "Backend — FastAPI :8000" cmd /k "python -m uvicorn api:app --host 127.0.0.1 --port 8000"

:: Aguarda o backend subir
timeout /t 3 /nobreak >nul

:: Frontend (Vite) em janela separada
start "Frontend — Vite :5173" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Aguarda o frontend subir
timeout /t 5 /nobreak >nul

:: Abre o browser
start http://127.0.0.1:5173

echo.
echo  Backend:   http://127.0.0.1:8000
echo  Frontend:  http://127.0.0.1:5173
echo.
echo  Duas janelas foram abertas com os servidores.
echo  Nao feche essas janelas enquanto estiver usando o app.
echo.
pause
