# File: server/_templates/write-deploy-files.ps1
# Description: نوشتن docker-compose.yml و .env.example برای my/news/api؛ دادهٔ پایدار زیر persist/
# Parent Dependencies: sync-deploy.bat, sync.config.bat, init-server-structure.bat

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('my', 'news', 'api')]
    [string]$Target,

    [Parameter(Mandatory = $true)]
    [string]$ServerRoot
)

$ErrorActionPreference = 'Stop'

function Write-Utf8NoBom {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Parent $Path
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content.TrimStart() + "`n", $utf8)
}

function Ensure-PersistSkeleton {
    param([string]$Root)
    $uploads = Join-Path $Root 'persist\uploads'
    $newsData = Join-Path $Root 'persist\news-data'
    foreach ($dir in @($uploads, $newsData)) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        $keep = Join-Path $dir '.gitkeep'
        if (-not (Test-Path $keep)) {
            Write-Utf8NoBom $keep ''
        }
    }
    $persistIgnore = @"
# دادهٔ پایدار هاست — هرگز در گیت یا پکیج overwrite نشود
uploads/*
!uploads/.gitkeep
news-data/*
!news-data/.gitkeep
"@
    Write-Utf8NoBom (Join-Path $Root 'persist\.gitignore') $persistIgnore
}

$newsPort = $env:NEWS_HOST_PORT
$myPort = $env:MY_HOST_PORT
$apiHostPort = $env:API_HOST_PORT
$apiContainerPort = $env:API_CONTAINER_PORT
$newsUrl = $env:NEWS_PUBLIC_URL
$myUrl = $env:MY_PUBLIC_URL
$apiUrl = $env:API_PUBLIC_URL
$mssqlHost = $env:MSSQL_HOST
$mssqlPort = $env:MSSQL_PORT
$mssqlDb = $env:MSSQL_DATABASE
$newsName = $env:NEWS_CONTAINER_NAME
$myName = $env:MY_CONTAINER_NAME
$apiName = $env:API_CONTAINER_NAME

# اسکلت persist برای هر تارگت تا composeهای نسبی ../persist همیشه معتبر باشند
Ensure-PersistSkeleton -Root $ServerRoot

switch ($Target) {
    'my' {
        $dest = Join-Path $ServerRoot 'my'
        $compose = @"
services:
  app:
    image: nginx:alpine
    container_name: $myName
    restart: unless-stopped
    ports:
      - "${myPort}:80"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
"@
        $envExample = @"
# فرانت کلینیک (my) — بیلد از frontend/؛ runtime nginx فقط dist را سرو می‌کند
# publish.bat / sync-deploy.bat قبل از npm build این مقدار را به‌عنوان VITE_API_BASE_URL تزریق می‌کنند (بدون /api)
VITE_API_BASE_URL=$apiUrl

# پس از sync روی سرور:
#   sudo docker compose up -d --build
# پورت هاست: $myPort
# URL عمومی فرانت: $myUrl
"@
        Write-Utf8NoBom (Join-Path $dest 'docker-compose.yml') $compose
        Write-Utf8NoBom (Join-Path $dest '.env.example') $envExample

        # بدون try_files، مسیرهای کلاینت مثل /login با رفرش مستقیم 404 می‌دهند
        $nginxConf = @'
# File: server/my/nginx.conf
# Description: سرو استاتیک SPA کلینیک با fallback به index.html؛ MIME درست برای .mjs (pdf.js worker)
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;
events { worker_connections 1024; }
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    server_tokens off;
    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;
        # mime.types قدیمی .mjs ندارد؛ بدون این مرورگر ماژول ES را با octet-stream رد می‌کند
        location ~* \.mjs$ {
            default_type application/javascript;
            try_files $uri =404;
        }
        location / { try_files $uri $uri/ /index.html; }
    }
}
'@
        Write-Utf8NoBom (Join-Path $dest 'nginx.conf') $nginxConf

        $gitignore = @"
# File: server/my/.gitignore
# Description: نادیده گرفتن dist و سکرت‌ها برای دیپلوی my
# Parent Dependencies: sync-deploy.bat

node_modules/
build/
dist/
coverage/
.DS_Store
*.log
.env*
!.env.example
"@
        Write-Utf8NoBom (Join-Path $dest '.gitignore') $gitignore

        $dockerIgnore = @"
.env
.env.*
!.env.example
*.md
"@
        Write-Utf8NoBom (Join-Path $dest '.dockerignore') $dockerIgnore
    }
    'news' {
        $dest = Join-Path $ServerRoot 'news'
        $compose = @"
services:
  app:
    image: nginx:alpine
    container_name: $newsName
    restart: unless-stopped
    ports:
      - "${newsPort}:80"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ../persist/news-data:/usr/share/nginx/html/data:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
"@
        $envExample = @"
# ویترین عمومی (news) — فعلاً اسکلت؛ منبع آینده: frontend/news
# مقدار بیلد از server/sync.config.bat (API_PUBLIC_URL) تزریق می‌شود.
VITE_API_URL=$apiUrl

# پس از sync روی سرور:
#   sudo docker compose up -d --build
# پورت هاست: $newsPort
# URL پیشنهادی: $newsUrl
# دادهٔ پایدار روی هاست: server/persist/news-data (URL عمومی: /data/)
"@
        Write-Utf8NoBom (Join-Path $dest 'docker-compose.yml') $compose
        Write-Utf8NoBom (Join-Path $dest '.env.example') $envExample

        $nginxConf = @'
# File: server/news/nginx.conf
# Description: سرو استاتیک news با محدودیت متد روی /data؛ MIME درست برای .mjs
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;
events { worker_connections 1024; }
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    server_tokens off;
    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;
        # mime.types قدیمی .mjs ندارد؛ بدون این مرورگر ماژول ES را با octet-stream رد می‌کند
        location ~* \.mjs$ {
            default_type application/javascript;
            try_files $uri =404;
        }
        location /data/ {
            autoindex off;
            limit_except GET HEAD { deny all; }
            add_header Cache-Control "no-store, no-cache, must-revalidate" always;
            try_files $uri =404;
        }
        location / { try_files $uri $uri/ /index.html; }
    }
}
'@
        Write-Utf8NoBom (Join-Path $dest 'nginx.conf') $nginxConf

        $gitignore = @"
# File: server/news/.gitignore
# Description: نادیده گرفتن dist و سکرت‌ها؛ دادهٔ پایدار در server/persist/news-data
# Parent Dependencies: sync-deploy.bat

node_modules/
build/
dist/
coverage/
.DS_Store
*.log
.env*
!.env.example

# بقایای layout قدیمی
data/
uploads/
"@
        Write-Utf8NoBom (Join-Path $dest '.gitignore') $gitignore

        $dockerIgnore = @"
.env
.env.*
!.env.example
*.md
"@
        Write-Utf8NoBom (Join-Path $dest '.dockerignore') $dockerIgnore
    }
    'api' {
        $dest = Join-Path $ServerRoot 'api'
        # اسکریپت نصب Chromium جدا از here-string تا backtickهای bash در PowerShell خراب نشوند
        $installScriptSrc = Join-Path $PSScriptRoot 'install-playwright-chromium.sh'
        $installScriptDest = Join-Path $dest 'install-playwright-chromium.sh'
        if (-not (Test-Path $installScriptSrc)) {
            throw "Missing template: $installScriptSrc"
        }
        Copy-Item -Force $installScriptSrc $installScriptDest
        # جلوگیری از CRLF ویندوز که shebang را به bash\r تبدیل می‌کند
        $shText = [System.IO.File]::ReadAllText($installScriptDest) -replace "`r`n", "`n" -replace "`r", "`n"
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($installScriptDest, $shText, $utf8NoBom)

        $dockerfile = @"
# runtime-only: خروجی publish از sync-deploy.bat + Chromium برای PDF پرسشنامه (UC-ADM-26)
# apt/Chromium قبل از COPY کامل؛ بدون # syntax=docker/dockerfile (Docker Hub روی سرور 403)
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl unzip fonts-liberation \
    libasound2t64 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libdrm2 \
    libgbm1 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libcairo2 \
    libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxfixes3 libxkbcommon0 libxrandr2 \
    && rm -rf /var/lib/apt/lists/*
ENV ASPNETCORE_URLS=http://+:$apiContainerPort
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY publish/.playwright/package /app/.playwright/package
COPY publish/.playwright/node/linux-x64/node /app/.playwright/node/linux-x64/node
COPY install-playwright-chromium.sh /tmp/install-playwright-chromium.sh
RUN sed -i 's/\r`$//' /tmp/install-playwright-chromium.sh \
    && chmod +x /tmp/install-playwright-chromium.sh \
    && chmod +x /app/.playwright/node/linux-x64/node \
    && /bin/bash /tmp/install-playwright-chromium.sh \
    && rm -f /tmp/install-playwright-chromium.sh
COPY publish/ .
EXPOSE $apiContainerPort
ENTRYPOINT ["dotnet", "Nabz.Api.dll"]
"@
        $compose = @"
services:
  app:
    build: .
    container_name: $apiName
    restart: unless-stopped
    ports:
      - "${apiHostPort}:${apiContainerPort}"
    env_file:
      - .env
    environment:
      ASPNETCORE_URLS: "http://+:${apiContainerPort}"
      # قفل روی bind mount حتی اگر .env قدیمی بدون Storage__Root باشد
      Storage__Root: "/app/wwwroot/uploads"
      # مسیر browserهای Playwright داخل image (نصب در Dockerfile)
      PLAYWRIGHT_BROWSERS_PATH: "/ms-playwright"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ../persist/uploads:/app/wwwroot/uploads
      - ../persist/news-data:/app/news-vitrine
"@
        $conn = "Server=${mssqlHost},${mssqlPort};Database=${mssqlDb};User Id=CHANGE_ME;Password=CHANGE_ME;TrustServerCertificate=True;Encrypt=False"
        $envExample = @"
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:$apiContainerPort

# MSSQL روی هاست سرور (پورت $mssqlPort) — مقادیر واقعی را در .env پر کنید
# نام connection string با appsettings یکسان است: NabzClinic
ConnectionStrings__NabzClinic=$conn

# اگر پر باشد، همان کد برای لاگین استفاده می‌شود و SMS به کاوه‌نگار نمی‌رود.
# برای استیجینگ بدون SMS یک کد بگذارید؛ برای prod عمومی واقعی خالی بماند.
Auth__FixedOtp=

# وقتی Fixed خالی است: ارسال از قالب کاوه‌نگار (نیاز به ApiKey + OtpTemplate)
Kavenegar__ApiKey=
Kavenegar__Sender=
Kavenegar__OtpTemplate=
Kavenegar__InviteTemplate=
Kavenegar__AbuseAlertTemplate=

# گارد ضدسوءاستفاده API (UC-PLT-17)
ApiAbuse__SoftSamePathCount=80
ApiAbuse__SoftTotalCount=120
ApiAbuse__SoftWindowSeconds=10
ApiAbuse__HardSamePathCount=250
ApiAbuse__HardTotalCount=600
ApiAbuse__HardWindowSeconds=60
ApiAbuse__LastSeenMinIntervalSeconds=60

# آپلود پایدار روی هاست: server/persist/uploads → /app/wwwroot/uploads
# الزامی: هم‌تراز bind mount تا فایل‌ها داخل image نروند
Storage__Root=/app/wwwroot/uploads
# ویترین آینده روی هاست: server/persist/news-data → /app/news-vitrine
# URLهای فرانت — وارد سیاست CORS در Program.cs می‌شوند (WithOrigins)
# فقط نمونهٔ پکیج — روی هر هاست Linux در api/.env همان سرور ست کنید (publish هرگز .env نمی‌فرستد)
FrontendUrls__My=$myUrl
FrontendUrls__News=$newsUrl

# مسیر اختیاری Chromium برای PDF پرسشنامه (خالی = browser مدیریت‌شدهٔ Playwright)
Playwright__ExecutablePath=
"@
        Write-Utf8NoBom (Join-Path $dest 'Dockerfile') $dockerfile
        Write-Utf8NoBom (Join-Path $dest 'docker-compose.yml') $compose
        Write-Utf8NoBom (Join-Path $dest '.env.example') $envExample

        $dockerIgnore = @"
.env
**/*.md
"@
        Write-Utf8NoBom (Join-Path $dest '.dockerignore') $dockerIgnore

        $gitignore = @"
# File: server/api/.gitignore
# Description: نادیده گرفتن آرتیفکت publish و سکرت‌های env برای دیپلوی API
# Parent Dependencies: sync-deploy.bat
# توجه: هدر /* */ در gitignore قابل استفاده نیست چون /* همه فایل‌ها را نادیده می‌گیرد.
# آپلودهای پایدار در server/persist/uploads هستند (نه این پوشه).

node_modules/
build/
dist/
publish/
coverage/
.DS_Store
*.log
.env*
!.env.example

# بقایای layout قدیمی — اگر هنوز محلی باشند در گیت نروند
uploads/
"@
        Write-Utf8NoBom (Join-Path $dest '.gitignore') $gitignore
    }
}

Write-Host "Wrote deploy files for $Target under $ServerRoot\$Target"
