@echo off
chcp 65001 >nul
REM /*
REM  File: server/sync.config.bat
REM  Description: تنظیمات مشترک انتشار سرور نفس (بدون سکرت)؛ توسط publish.bat بارگذاری می‌شود
REM  Parent Dependencies: publish.bat, sync-deploy.bat, init-server-structure.bat
REM */

REM --- پورت‌های هاست ---
set "NEWS_HOST_PORT=5436"
set "MY_HOST_PORT=5437"
set "API_HOST_PORT=5438"
set "API_CONTAINER_PORT=8080"

REM --- URL عمومی برای بیلد فرانت و FrontendUrls (سیاست CORS روی API) ---
set "NEWS_PUBLIC_URL=https://liveteb.ir"
set "MY_PUBLIC_URL=https://my.liveteb.ir"
REM origin عمومی API برای bake در بیلد my؛ اگر reverse-proxy فرق دارد همین را عوض کنید
set "API_PUBLIC_URL=https://api.liveteb.ir"

REM --- دسترسی کانتینر API به MSSQL روی هاست سرور ---
set "MSSQL_HOST=host.docker.internal"
set "MSSQL_PORT=2433"
set "MSSQL_DATABASE=NabzClinic"

REM --- نام کانتینرها ---
set "NEWS_CONTAINER_NAME=adel-maryam-nabz-clinic-news"
set "MY_CONTAINER_NAME=adel-maryam-nabz-clinic-my"
set "API_CONTAINER_NAME=adel-maryam-nabz-clinic-api"

REM --- کپی ویندوز→لینوکس (اختیاری؛ اگر خالی باشد publish.bat فقط دستور را چاپ می‌کند) ---
set "DEPLOY_REMOTE="
REM مثال: set "DEPLOY_REMOTE=user@host:/opt/nabz/server/"
