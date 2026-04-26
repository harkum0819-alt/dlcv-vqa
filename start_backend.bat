@echo off
title VQA-Insight Backend
echo.
echo  ============================================
echo   VQA-Insight ^| Backend Server
echo  ============================================
echo.
echo  [!] For best performance on 8 GB RAM:
echo      Close Chrome, VS Code previews, and
echo      other heavy apps before starting.
echo.
echo  Starting on http://localhost:8000
echo.
cd /d "%~dp0backend"
call venv\Scripts\activate
python main.py
pause
