@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
REM /*
REM  File: server/init-server-structure.bat
REM  Description: اسکلت انتشار server/{api,my,news,persist} بدون بیلد؛ بدون overwrite روی .env و دادهٔ پایدار
REM  Parent Dependencies: publish.bat, sync.config.bat, _templates/write-deploy-files.ps1
REM */

cd /d "%~dp0"
call "%~dp0sync.config.bat"
if errorlevel 1 (
  echo [ERROR] failed to load sync.config.bat
  exit /b 1
)

set "SERVER_ROOT=%~dp0"
if "%SERVER_ROOT:~-1%"=="\" set "SERVER_ROOT=%SERVER_ROOT:~0,-1%"

echo === Nabz Clinic init server structure ===
echo Server: %SERVER_ROOT%
echo.

for %%D in (api my news persist\uploads persist\news-data) do (
  if not exist "%SERVER_ROOT%\%%D" mkdir "%SERVER_ROOT%\%%D" >nul 2>&1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SERVER_ROOT%\_templates\write-deploy-files.ps1" -Target my -ServerRoot "%SERVER_ROOT%"
if errorlevel 1 exit /b 1
powershell -NoProfile -ExecutionPolicy Bypass -File "%SERVER_ROOT%\_templates\write-deploy-files.ps1" -Target news -ServerRoot "%SERVER_ROOT%"
if errorlevel 1 exit /b 1
powershell -NoProfile -ExecutionPolicy Bypass -File "%SERVER_ROOT%\_templates\write-deploy-files.ps1" -Target api -ServerRoot "%SERVER_ROOT%"
if errorlevel 1 exit /b 1

REM فقط اگر .env نبود از example بساز؛ هرگز سکرت موجود را بازنویسی نکن
if not exist "%SERVER_ROOT%\api\.env" (
  if exist "%SERVER_ROOT%\api\.env.example" (
    copy /y "%SERVER_ROOT%\api\.env.example" "%SERVER_ROOT%\api\.env" >nul
    echo [INFO] created server\api\.env from .env.example - fill secrets before docker compose up
  )
) else (
  echo [INFO] kept existing server\api\.env
)

REM هشدار مهاجرت از layout قدیمی — بدون حذف خودکار
if exist "%SERVER_ROOT%\api\uploads" (
  echo [WARN] legacy server\api\uploads found - move contents to server\persist\uploads then remove the old folder
)
if exist "%SERVER_ROOT%\news\data" (
  echo [WARN] legacy server\news\data found - move contents to server\persist\news-data then remove the old folder
)

echo.
echo [OK] structure ready: api / my / news / persist
echo Persist mounts: persist\uploads , persist\news-data
echo Next ^(مرجع کامل^): publish.bat
exit /b 0
