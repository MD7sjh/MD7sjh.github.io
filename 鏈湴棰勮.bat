@echo off
chcp 65001 >nul
start http://localhost:8000/
python -m http.server 8000
pause
