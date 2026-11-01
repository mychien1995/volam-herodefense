@echo off
cd /d "%~dp0"
python build_preview.py
if errorlevel 1 exit /b 1
start "" "%~dp0index.html"
