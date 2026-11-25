@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Installer Aplikasi Multi-Agent Blog

:: Pindah ke direktori lokasi script ini berada
cd /d "%~dp0"

:: Cek argumen CLI (misal: -y, --yes, --no-start, --no-seed)
set ARG_SEED=
set ARG_START=
for %%a in (%*) do (
    if /i "%%a"=="-y" (
        set ARG_SEED=Y
        set ARG_START=N
    )
    if /i "%%a"=="--yes" (
        set ARG_SEED=Y
        set ARG_START=N
    )
    if /i "%%a"=="--no-seed" set ARG_SEED=N
    if /i "%%a"=="--seed" set ARG_SEED=Y
    if /i "%%a"=="--no-start" set ARG_START=N
    if /i "%%a"=="--start" set ARG_START=Y
)

echo ================================================================
echo        INSTALLER APLIKASI MULTI-AGENT BLOG (WINDOWS)
echo ================================================================
echo.

:: 1. Pemeriksaan Node.js
echo [1/6] Memeriksa instalasi Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js tidak ditemukan di komputer ini.
    echo.
    echo Silakan unduh dan instal Node.js versi 20 atau yang lebih baru dari:
    echo https://nodejs.org/
    echo Setelah instalasi selesai, buka kembali file ini.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo - Terdeteksi Node.js: %NODE_VER%

:: 2. Pemeriksaan NPM
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm tidak ditemukan di sistem.
    echo Pastikan instalasi Node.js Anda menyertakan npm dan terdaftar di PATH.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo - Terdeteksi npm: v%NPM_VER%
echo.

:: 3. Konfigurasi Lingkungan (.env)
echo [2/6] Memeriksa file konfigurasi (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy /y ".env.example" ".env" >nul
        echo - File .env berhasil dibuat dari .env.example.
    ) else (
        (
            echo DATABASE_URL="file:./dev.db"
            echo ADMIN_USERNAME="admin"
            echo ADMIN_PASSWORD="admin123"
            echo ADMIN_SESSION_SECRET="antigravity-admin-session-secret-key"
            echo NEXT_PUBLIC_SITE_URL="http://localhost:3000"
        ) > ".env"
        echo - File .env baru berhasil di-generate.
    )
) else (
    echo - File .env sudah ada, melewati tahap ini.
)

:: Pastikan direktori uploads tersedia untuk media library
if not exist "public\uploads" (
    mkdir "public\uploads"
    echo - Direktori public\uploads berhasil dibuat.
)
echo.

:: 4. Instalasi Dependensi NPM
echo [3/6] Menginstal dependensi aplikasi via npm install...
echo Proses ini mungkin memerlukan waktu beberapa menit tergantung koneksi internet...
echo.
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Terjadi kegagalan saat menjalankan 'npm install'.
    echo Periksa pesan error di atas dan pastikan koneksi internet aktif.
    echo.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo - Dependensi berhasil diinstal.
echo.

:: 5. Generate Prisma Client
echo [4/6] Melakukan generate Prisma Client...
call npm run db:generate
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Gagal melakukan generate Prisma Client.
    pause
    exit /b %ERRORLEVEL%
)
echo.

:: 6. Setup Database SQLite (db push)
echo [5/6] Menyiapkan skema database SQLite (db push)...
call npm run db:push
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Gagal melakukan migrasi skema database Prisma.
    pause
    exit /b %ERRORLEVEL%
)
echo.

:: 7. Seeding Data Awal (Opsional / Rekomendasi)
echo [6/6] Menyiapkan data awal (seeding)...
set SEED_CONFIRM=Y
if defined ARG_SEED (
    set SEED_CONFIRM=%ARG_SEED%
) else (
    set /p SEED_CONFIRM="Apakah Anda ingin mengisi database dengan artikel dan komentar contoh? [Y/n]: "
)
set SEED_CONFIRM=%SEED_CONFIRM: =%
if /i "%SEED_CONFIRM:~0,1%"=="N" (
    echo - Melewati proses seeding database.
) else (
    echo - Mengisi data contoh ke database...
    call npm run db:seed
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Proses seeding mengalami kendala, namun instalasi inti tetap berhasil.
    ) else (
        echo - Seeding database selesai.
    )
)

echo.
echo ================================================================
echo           INSTALASI SELESAI DAN BERHASIL DISIAPKAN
echo ================================================================
echo.
echo Informasi Akses Aplikasi:
echo  * Alamat Blog Publik : http://localhost:3000
echo  * Halaman Admin CMS  : http://localhost:3000/admin
echo  * Kredensial Admin   :
echo      - Username       : admin
echo      - Password       : admin123
echo.
echo Catatan:
echo  - Database lokal tersimpan di: prisma\dev.db (SQLite)
echo  - Gambar yang diunggah tersimpan di: public\uploads
echo.
echo ================================================================
echo.

set START_NOW=Y
if defined ARG_START (
    set START_NOW=%ARG_START%
) else (
    set /p START_NOW="Apakah Anda ingin langsung menjalankan server aplikasi sekarang? [Y/n]: "
)
set START_NOW=%START_NOW: =%
if /i "%START_NOW:~0,1%"=="N" (
    echo.
    echo Anda dapat menjalankan aplikasi kapan saja dengan mengetik:
    echo   npm run dev
    echo atau menjalankan file 'jalankan_blog.bat'.
    echo.
    if not defined ARG_START (
        pause
    )
    exit /b 0
)

echo.
echo Memulai server pengembangan (Next.js)...
echo Tekan Ctrl + C di jendela ini jika ingin menghentikan server.
echo.
call npm run dev
