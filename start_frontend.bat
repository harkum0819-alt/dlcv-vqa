@echo off
title VQA-Insight Frontend
cd /d "%~dp0frontend"
echo [VQA-Insight] Starting frontend on http://localhost:5173
npm run dev
pause
