@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
REM /*
REM  File: server/publish.bat
REM  Description: نقطهٔ ورود واحد انتشار — تست، اسکلت، بیلد، rsync بدون .env پرشده؛ در خطا pause؛ در موفقیت خلاصه + ۲۰ثانیه (Esc=باز بماند)
REM  Parent Dependencies: sync.config.bat, pre-publish-tests.bat, init-server-structure.bat, sync-deploy.bat, deploy-rsync-exclude.txt
REM */

cd /d "%~dp0"
call "%~dp0sync.config.bat"
if errorlevel 1 (
  echo [ERROR] failed to load sync.config.bat
  goto :fail
)

set "SERVER_ROOT=%~dp0"
if "%SERVER_ROOT:~-1%"=="\" set "SERVER_ROOT=%SERVER_ROOT:~0,-1%"

echo === Nabz Clinic publish ===
echo Server: %SERVER_ROOT%
echo Order:  sync.config -^> pre-publish-tests -^> init-server-structure -^> sync-deploy all -^> rsync^(optional^)
echo.

echo --- [0/4] pre-publish tests ---
if /I "%SKIP_PRE_PUBLISH_TESTS%"=="1" (
  echo [WARN] SKIP_PRE_PUBLISH_TESTS=1 - تست قبل از انتشار رد شد ^(فقط اضطراری^)
) else (
  call "%~dp0pre-publish-tests.bat"
  if errorlevel 1 (
    echo [ERROR] pre-publish-tests.bat failed - publish aborted
    goto :fail
  )
)
echo.

echo --- [1/4] init server structure ---
call "%~dp0init-server-structure.bat"
if errorlevel 1 (
  echo [ERROR] init-server-structure.bat failed
  goto :fail
)
echo.

echo --- [2/4] sync-deploy all ---
call "%~dp0sync-deploy.bat" all
if errorlevel 1 (
  echo [ERROR] sync-deploy.bat all failed
  goto :fail
)
echo.

echo --- [3/4] copy to Linux ---
REM .env پرشده هرگز در پکیج نیست؛ اگر لوکال مانده، rsync exclude می‌کند تا سرور دیگر خراب نشود
if exist "%SERVER_ROOT%\api\.env" echo [WARN] local api\.env exists - excluded from rsync ^(per-host only^)
if exist "%SERVER_ROOT%\my\.env" echo [WARN] local my\.env exists - excluded from rsync
if exist "%SERVER_ROOT%\news\.env" echo [WARN] local news\.env exists - excluded from rsync
if defined DEPLOY_REMOTE if not "%DEPLOY_REMOTE%"=="" (
  where rsync >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] rsync not found in PATH - install rsync or clear DEPLOY_REMOTE and copy manually
    goto :fail
  )
  echo rsync -^> %DEPLOY_REMOTE%
  REM -u: اگر مقصد جدیدتر است overwrite نشود (هم‌راستا با robocopy /XO روی ویندوز)
  rsync -avu --exclude-from="%SERVER_ROOT%\deploy-rsync-exclude.txt" "%SERVER_ROOT%/" "%DEPLOY_REMOTE%"
  if errorlevel 1 (
    echo [ERROR] rsync failed
    goto :fail
  )
  echo [OK] rsync completed
) else (
  echo [INFO] DEPLOY_REMOTE empty - skip auto rsync.
  echo Example:
  echo   rsync -avu --exclude-from=deploy-rsync-exclude.txt ./ user@host:/path/to/server/
  echo Or set DEPLOY_REMOTE in sync.config.bat.
)

echo.
echo ========================================
echo   خلاصهٔ انتشار — موفق
echo ========================================
echo [OK] publish pipeline finished
echo URLs: my=%MY_PUBLIC_URL%  news=%NEWS_PUBLIC_URL%  api=%API_PUBLIC_URL%
echo.
echo Package ships .env.example only — never a filled .env.
echo On each Linux host: keep that host's api\.env ^(FrontendUrls / MSSQL^); publish will not overwrite it.
echo If CORS origin changed: edit FrontendUrls__My on THAT host then restart api container.
echo.
echo === On Linux host ^(after copy^) ===
echo   cd api  ^&^& sudo docker compose up -d --build
echo   cd my   ^&^& sudo docker compose up -d --build
echo   cd news ^&^& sudo docker compose up -d --build
echo.
echo Within 20s: any other key = close early ^| Esc = stay open ^(work with result^) ^| no key = auto-close
REM Esc → کد ۲ = باز بماند؛ کلید دیگر یا اتمام زمان → بستن
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(20); while((Get-Date) -lt $deadline){ if([Console]::KeyAvailable){ $k=[Console]::ReadKey($true); if($k.Key -eq [System.ConsoleKey]::Escape){ exit 2 }; exit 0 }; Start-Sleep -Milliseconds 200 }; exit 0"
if errorlevel 2 goto :keep_open
exit /b 0

:keep_open
echo.
echo Esc — window stays open so you can work with the result. Press any key when done.
pause
exit /b 0

:fail
echo.
echo ========================================
echo   انتشار متوقف شد — خطا یا تست ناموفق
echo ========================================
echo پنجره باز می‌ماند تا پیام خطا را بخوانید. برای بستن کلیدی بزنید.
pause
exit /b 1
