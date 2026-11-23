@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
REM /*
REM  File: server/sync-deploy.bat
REM  Description: بیلد/پابلیش و همگام‌سازی افزایشی به server/{my,news,api}؛ فقط .env.example؛ persist/.env پرشده دست نخورده
REM  Parent Dependencies: publish.bat, sync.config.bat, frontend, backend, _templates/write-deploy-files.ps1
REM */

cd /d "%~dp0"
call "%~dp0sync.config.bat"
if errorlevel 1 (
  echo [ERROR] failed to load sync.config.bat
  exit /b 1
)

set "SERVER_ROOT=%~dp0"
if "%SERVER_ROOT:~-1%"=="\" set "SERVER_ROOT=%SERVER_ROOT:~0,-1%"
for %%I in ("%SERVER_ROOT%\..") do set "REPO_ROOT=%%~fI"

set "TARGET=%~1"
if "%TARGET%"=="" set "TARGET=all"
set "TARGET=%TARGET:"=%"

if /i not "%TARGET%"=="all" if /i not "%TARGET%"=="my" if /i not "%TARGET%"=="news" if /i not "%TARGET%"=="api" (
  echo Usage: sync-deploy.bat [all^|my^|news^|api]
  exit /b 1
)

set "DID_MY=0"
set "DID_NEWS=0"
set "DID_API=0"
set "NEWS_PLACEHOLDER=0"

echo === Nabz Clinic server sync ===
echo Repo:   %REPO_ROOT%
echo Server: %SERVER_ROOT%
echo Target: %TARGET%
echo.

if /i "%TARGET%"=="all" goto :need_node
if /i "%TARGET%"=="my" goto :need_node
if /i "%TARGET%"=="news" goto :need_node
goto :after_node_check

:need_node
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] node not found in PATH
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found in PATH
  exit /b 1
)
:after_node_check

if /i "%TARGET%"=="all" goto :need_dotnet
if /i "%TARGET%"=="api" goto :need_dotnet
goto :after_dotnet_check

:need_dotnet
where dotnet >nul 2>&1
if errorlevel 1 (
  echo [ERROR] dotnet not found in PATH
  exit /b 1
)
:after_dotnet_check

if /i "%TARGET%"=="all" goto :do_my
if /i "%TARGET%"=="my" goto :do_my
goto :after_my

:do_my
echo --- sync my ---
call :write_deploy my
if errorlevel 1 exit /b 1
REM اپ کلینیک VITE_API_BASE_URL می‌خواند؛ بدون /api چون مسیرهای کلاینت خودشان /api/... دارند
set "VITE_API_BASE_URL=%API_PUBLIC_URL%"
echo Building my ^(frontend^) with VITE_API_BASE_URL=%VITE_API_BASE_URL%
call :npm_build "%REPO_ROOT%\frontend"
if errorlevel 1 exit /b 1
call :mirror_dir "%REPO_ROOT%\frontend\dist" "%SERVER_ROOT%\my\dist"
if errorlevel 1 exit /b 1
set "DID_MY=1"
echo [OK] my -^> server\my\dist
echo.
:after_my

if /i "%TARGET%"=="all" goto :do_news
if /i "%TARGET%"=="news" goto :do_news
goto :after_news

:do_news
echo --- sync news ---
call :write_deploy news
if errorlevel 1 exit /b 1
REM ویترین عمومی هنوز در frontend/news نیست؛ اسکلت + placeholder تا compose بالا بیاید
if exist "%REPO_ROOT%\frontend\news\package.json" (
  set "VITE_API_URL=%API_PUBLIC_URL%"
  echo Building news with VITE_API_URL=%VITE_API_URL%
  call :npm_build "%REPO_ROOT%\frontend\news"
  if errorlevel 1 exit /b 1
  call :mirror_dir "%REPO_ROOT%\frontend\news\dist" "%SERVER_ROOT%\news\dist"
  if errorlevel 1 exit /b 1
) else (
  echo [INFO] frontend\news not present - writing placeholder dist for nginx
  if not exist "%SERVER_ROOT%\news\dist" mkdir "%SERVER_ROOT%\news\dist" >nul 2>&1
  > "%SERVER_ROOT%\news\dist\index.html" echo ^<!DOCTYPE html^>^<html lang="fa" dir="rtl"^>^<head^>^<meta charset="utf-8"/^>^<title^>نفس - ویترین^</title^>^</head^>^<body^>^<p^>ویترین news هنوز فعال نیست.^</p^>^</body^>^</html^>
  set "NEWS_PLACEHOLDER=1"
)
set "DID_NEWS=1"
echo [OK] news -^> server\news\dist
echo.
:after_news

if /i "%TARGET%"=="all" goto :do_api
if /i "%TARGET%"=="api" goto :do_api
goto :after_api

:do_api
echo --- sync api ---
call :write_deploy api
if errorlevel 1 exit /b 1

REM پاک‌سازی dist قدیمی SPA که قبلاً اشتباه در api بود
if exist "%SERVER_ROOT%\api\dist" (
  echo Removing legacy server\api\dist ...
  rmdir /s /q "%SERVER_ROOT%\api\dist"
)

REM پوشهٔ publish را wipe نکن؛ dotnet فایل‌های تازه‌تر را به‌روز می‌کند و قدیمی‌های اضافی می‌مانند
if not exist "%SERVER_ROOT%\api\publish" mkdir "%SERVER_ROOT%\api\publish" >nul 2>&1

echo Publishing Nabz.Api for linux-x64 Docker (Playwright linux drivers) ...
pushd "%REPO_ROOT%\backend"
REM RID لینوکس لازم است تا .playwright/node/linux-x64 داخل publish بیاید (نه فقط win32)
dotnet publish "src\Nabz.Api\Nabz.Api.csproj" -c Release -r linux-x64 --self-contained false -o "%SERVER_ROOT%\api\publish" --nologo
set "PUB_ERR=!errorlevel!"
popd
if not "!PUB_ERR!"=="0" (
  echo [ERROR] dotnet publish failed
  exit /b 1
)
if not exist "%SERVER_ROOT%\api\publish\.playwright\node\linux-x64\node" (
  echo [WARN] linux-x64 Playwright node missing after publish — Docker install script will fetch from NuGet
) else (
  echo [OK] Playwright linux-x64 driver present in publish
)

REM پکیج فقط .env.example دارد؛ .env پرشده روی ویندوز ساخته نمی‌شود تا سرورهای مختلف خراب نشوند
echo [INFO] api/.env is NOT created here - on each Linux host copy .env.example once and edit that host only

set "DID_API=1"
echo [OK] api -^> server\api\publish
echo.
:after_api

echo === Sync summary ===
if "%DID_MY%"=="1" echo  - my:   dist + docker-compose.yml + .env.example  ^(port %MY_HOST_PORT%, VITE_API_BASE_URL=%API_PUBLIC_URL%^)
if "%DID_NEWS%"=="1" (
  if "%NEWS_PLACEHOLDER%"=="1" (
    echo  - news: placeholder dist + docker-compose.yml + .env.example  ^(port %NEWS_HOST_PORT%^)
  ) else (
    echo  - news: dist + docker-compose.yml + .env.example  ^(port %NEWS_HOST_PORT%, VITE_API_URL=%API_PUBLIC_URL%^)
  )
)
if "%DID_API%"=="1" echo  - api:  publish + Dockerfile + docker-compose.yml + .env.example ^(port %API_HOST_PORT% -^> %API_CONTAINER_PORT%, MSSQL %MSSQL_HOST%:%MSSQL_PORT%^)
echo  - persist: uploads + news-data on host ^(bind mounts; never ship filled .env^)
echo.
if exist "%SERVER_ROOT%\api\uploads" echo [WARN] legacy server\api\uploads - migrate to persist\uploads
if exist "%SERVER_ROOT%\news\data" echo [WARN] legacy server\news\data - migrate to persist\news-data
echo On Linux ^(per folder^): sudo docker compose up -d --build
echo Copy with: rsync -avu --exclude-from=deploy-rsync-exclude.txt
echo API: package ships .env.example only; each host keeps its own .env ^(FrontendUrls / MSSQL^).
exit /b 0

:write_deploy
set "WTARGET=%~1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SERVER_ROOT%\_templates\write-deploy-files.ps1" -Target "%WTARGET%" -ServerRoot "%SERVER_ROOT%"
if errorlevel 1 (
  echo [ERROR] writing deploy files for %WTARGET% failed
  exit /b 1
)
exit /b 0

:npm_build
set "PROJ=%~1"
if not exist "%PROJ%\package.json" (
  echo [ERROR] package.json not found: %PROJ%
  exit /b 1
)
pushd "%PROJ%"
REM بستن vite همان پروژه تا npm ci روی *.node قفل EPERM نخورد
powershell -NoProfile -Command "$p='%~1'; Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -and $_.CommandLine -like ('*'+$p+'*') -and $_.CommandLine -match 'vite' } | ForEach-Object { Write-Host ('[INFO] stopping vite pid='+$_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
REM اگر deps سالم است، npm ci تکراری را رد کن (مگر FORCE_NPM_CI=1)
if /I not "%FORCE_NPM_CI%"=="1" if exist "node_modules\.bin\vite.cmd" (
  echo [INFO] node_modules ready - skip npm ci ^(set FORCE_NPM_CI=1 to force^)
  goto :npm_build_run
)
if exist "package-lock.json" (
  call npm ci
) else (
  call npm install
)
if errorlevel 1 (
  popd
  echo [ERROR] npm install/ci failed in %PROJ%
  echo [HINT] stop frontend "npm run dev" then retry
  exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
  popd
  echo [ERROR] vite missing after install: %PROJ%\node_modules\.bin\vite.cmd
  exit /b 1
)
:npm_build_run
call npm run build
if errorlevel 1 (
  popd
  echo [ERROR] npm run build failed in %PROJ%
  exit /b 1
)
popd
exit /b 0

:mirror_dir
REM فقط منبع تازه‌تر از مقصد overwrite می‌شود (/XO)؛ مقصد جدیدتر و فایل‌های اضافی dest دست نخورده
set "SRC=%~1"
set "DST=%~2"
if not exist "%SRC%\" (
  echo [ERROR] build output missing: %SRC%
  exit /b 1
)
if not exist "%DST%" mkdir "%DST%" >nul 2>&1
robocopy "%SRC%" "%DST%" /E /XO /NFL /NDL /NJH /NJS /nc /ns /np >nul
set "RC=!errorlevel!"
if !RC! GEQ 8 (
  echo [ERROR] robocopy failed %SRC% -^> %DST% ^(code !RC!^)
  exit /b 1
)
exit /b 0
