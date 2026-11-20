@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
REM /*
REM  File: server/publish.bat
REM  Description: نقطهٔ ورود واحد انتشار — تست قبل‌از‌انتشار سپس اسکلت، بیلد، rsync اختیاری
REM  Parent Dependencies: sync.config.bat, pre-publish-tests.bat, init-server-structure.bat, sync-deploy.bat, deploy-rsync-exclude.txt
REM */

cd /d "%~dp0"
call "%~dp0sync.config.bat"
if errorlevel 1 (
  echo [ERROR] failed to load sync.config.bat
  exit /b 1
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
    exit /b 1
  )
)
echo.

echo --- [1/4] init server structure ---
call "%~dp0init-server-structure.bat"
if errorlevel 1 (
  echo [ERROR] init-server-structure.bat failed
  exit /b 1
)
echo.

echo --- [2/4] sync-deploy all ---
call "%~dp0sync-deploy.bat" all
if errorlevel 1 (
  echo [ERROR] sync-deploy.bat all failed
  exit /b 1
)
echo.

echo --- [3/4] copy to Linux ---
if defined DEPLOY_REMOTE if not "%DEPLOY_REMOTE%"=="" (
  where rsync >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] rsync not found in PATH - install rsync or clear DEPLOY_REMOTE and copy manually
    exit /b 1
  )
  echo rsync -^> %DEPLOY_REMOTE%
  rsync -av --exclude-from="%SERVER_ROOT%\deploy-rsync-exclude.txt" "%SERVER_ROOT%/" "%DEPLOY_REMOTE%"
  if errorlevel 1 (
    echo [ERROR] rsync failed
    exit /b 1
  )
  echo [OK] rsync completed
) else (
  echo [INFO] DEPLOY_REMOTE empty - skip auto rsync.
  echo Example:
  echo   rsync -av --exclude-from=deploy-rsync-exclude.txt ./ user@host:/path/to/server/
  echo Or set DEPLOY_REMOTE in sync.config.bat.
)

echo.
echo === On Linux host ^(after copy^) ===
echo   cd api  ^&^& sudo docker compose up -d --build
echo   cd my   ^&^& sudo docker compose up -d --build
echo   cd news ^&^& sudo docker compose up -d --build
echo.
echo [OK] publish pipeline finished
echo URLs: my=%MY_PUBLIC_URL%  news=%NEWS_PUBLIC_URL%  api=%API_PUBLIC_URL%
exit /b 0
