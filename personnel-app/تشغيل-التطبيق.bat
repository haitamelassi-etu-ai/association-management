@echo off
cd /d "%~dp0"
echo 🚀 جاري تشغيل تطبيق لوحة الموظفين...
echo.
start /B npm run dev
timeout /t 3 /nobreak >nul
npm run electron
