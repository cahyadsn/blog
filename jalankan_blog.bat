@echo off
chcp 65001 >nul

title Server Multi-Agent Blog (Next.js)

cd /d "%~dp0"

echo ================================================================
echo             MEMULAI MULTI-AGENT BLOG (WINDOWS)
echo ================================================================
echo.
echo Membuka server Next.js di mode development...
echo Akses Web:
echo  * Blog Utama : http://localhost:3000
echo  * Admin CMS  : http://localhost:3000/admin (User: admin / Pass: admin123)
echo.
echo Tekan Ctrl + C untuk menghentikan server.
echo ================================================================
echo.

call npm run dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Server berhenti dengan kode error %ERRORLEVEL%.
    pause
)
