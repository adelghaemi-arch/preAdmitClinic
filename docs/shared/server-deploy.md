/*
 File: docs/shared/server-deploy.md
 Description: راهنمای دیپلوی پوشه server با persist روی هاست؛ CORS/FrontendUrls و triage ظاهر CORS
 Parent Dependencies: server/publish.bat, server/pre-publish-tests.bat, server/sync.config.bat, server/sync-deploy.bat, server/init-server-structure.bat
*/

> **مسیر:** [مستندات — ایندکس](../README.md) › [Shared](README.md) › دیپلوی سرور  
> **پدر:** [Shared](README.md)

# دیپلوی پوشه `server/`

آرتیفکت‌های قابل اجرا در [`server/`](../../server/) نگه داشته می‌شوند: `news`، `my`، `api`.  
دادهٔ پایدار (آپلود + ویترین) فقط زیر [`server/persist/`](../../server/persist/) روی **هاست لینوکس** می‌ماند و با rebuild کانتینر از بین نمی‌رود.  
مسیر تولید: `sudo docker compose up -d --build` در هر پوشهٔ فعال — نه `dotnet ef database update` دستی.

## نقطهٔ ورود واحد (ویندوز)

فقط [`server/publish.bat`](../../server/publish.bat) را اجرا کنید. ترتیب ثابت:

1. بارگذاری [`sync.config.bat`](../../server/sync.config.bat) (پورت، URL عمومی، `DEPLOY_REMOTE`)
2. [`pre-publish-tests.bat`](../../server/pre-publish-tests.bat) — بستن قفل DLL + Unit بک + API smoke + Vitest؛ شکست → توقف انتشار
3. [`init-server-structure.bat`](../../server/init-server-structure.bat) — اسکلت + قالب compose / `.env.example` / `persist/`
4. [`sync-deploy.bat`](../../server/sync-deploy.bat) `all` — بیلد my/news + publish api
5. اگر `DEPLOY_REMOTE` پر باشد → `rsync` با [`deploy-rsync-exclude.txt`](../../server/deploy-rsync-exclude.txt)؛ وگرنه چاپ دستور کپی
6. چاپ خلاصهٔ موفقیت + دستورهای `docker compose` برای لینوکس؛ سپس ۲۰ ثانیه صبر با تشخیص کلید

**پایان کنسول:** خطا/تست ناموفق → `pause` (پنجره باز). موفقیت → بدون کلید پس از ۲۰ثانیه بسته؛ کلید دیگر = بستن زودتر؛ **Esc = باز بماند** تا با نتیجه کار کنید.

قبل از بیلد production، در `sync.config.bat` مقادیر `MY_PUBLIC_URL` / `NEWS_PUBLIC_URL` / `API_PUBLIC_URL` را به origin عمومی مرورگر تنظیم کنید (نه `localhost`).  
برای `my`: قبل از `npm run build` مقدار `VITE_API_BASE_URL=%API_PUBLIC_URL%` ست می‌شود (بدون `/api`).

`init-server-structure.bat` و `sync-deploy.bat` helper داخلی‌اند؛ مسیر اصلی اپراتور فقط `publish.bat` است. بیلد جزئی اختیاری: `sync-deploy.bat my|news|api`.  
تست جداگانه بدون بیلد: `pre-publish-tests.bat`. بای‌پس اضطراری: `set SKIP_PRE_PUBLISH_TESTS=1` قبل از `publish.bat` (هشدار در لاگ).

## دروازهٔ تست قبل‌از‌انتشار

| سوئیت | فرمان |
|-------|--------|
| Unit بک | `dotnet test backend/tests/Nabz.Infrastructure.Tests` |
| API smoke | `dotnet test backend/tests/Nabz.Api.Tests` |
| Unit فرانت | `frontend` → `npm run test:run` |

قبل از تست، پروسس‌های قفل‌کننده (`Nabz.Api`، `testhost`، …) بسته می‌شوند. ارکستراتور: [`_pre-publish-tests.ps1`](../../server/_pre-publish-tests.ps1) (از [`pre-publish-tests.bat`](../../server/pre-publish-tests.bat)).

**UX کنسول (پیش‌فرض ساکت):** فقط پیشرفت سوئیت + heartbeat هر ۵ثانیه (`… still running (Ns)`) + PASS/FAIL و گزارش نهایی. خروجی کامل restore/NU فقط در لاگ.  
دیباگ پرخروجی: `set PRE_PUBLISH_VERBOSE=1` قبل از اجرا.  
Vitest: [`_run-frontend-tests.ps1`](../../server/_run-frontend-tests.ps1) با `--reporter=dot` (بدون redirect فایل). گزارش: [`server/test-reports/`](../../server/test-reports/).  
کاتالوگ: [`unit-test-scenarios.md`](unit-test-scenarios.md)؛ ماتریس دستی: [`pre-release-test-matrix.md`](pre-release-test-matrix.md). استاندارد: [`.cursorrules`](../../.cursorrules) §4.1 و §5.

## درخت استاندارد

```
server/
  publish.bat                 # مرجع واحد انتشار
  pre-publish-tests.bat       # wrapper دروازهٔ تست
  _pre-publish-tests.ps1      # کنسول ساکت + heartbeat
  _run-frontend-tests.ps1     # Vitest helper
  sync.config.bat
  init-server-structure.bat   # helper
  sync-deploy.bat             # helper
  deploy-rsync-exclude.txt
  _templates/write-deploy-files.ps1
  test-reports/               # لاگ تست (محلی؛ rsync exclude)
  persist/
    uploads/                  # آپلودهای API
    news-data/                # دادهٔ ویترین (آینده)
  api/   # publish + Dockerfile + compose + .env.example
  my/    # dist + nginx.conf + compose + .env.example
  news/  # dist + nginx.conf + compose + .env.example
```

## جدول سرویس‌ها

| سرویس | منبع | خروجی sync | پورت هاست | کانتینر |
|--------|------|------------|-----------|---------|
| news | `frontend/news` (فعلاً اسکلت) | `server/news/dist` + nginx؛ volume `../persist/news-data` | **5436** | `adel-maryam-nabz-clinic-news` |
| my | `frontend/` | `server/my/dist` + `nginx.conf` (SPA `try_files` → `index.html`) | **5437** | `adel-maryam-nabz-clinic-my` |
| api | `backend` | `server/api/publish` + Dockerfile؛ volumes `../persist/uploads` و `../persist/news-data` | **5438→8080** | `adel-maryam-nabz-clinic-api` |

### Volumeهای پایدار (هاست → کانتینر)

| هاست | کانتینر | سرویس |
|------|---------|--------|
| `server/persist/uploads` | `/app/wwwroot/uploads` | api |
| `server/persist/news-data` | `/app/news-vitrine` | api (آینده / نوشتن) |
| `server/persist/news-data` | `/usr/share/nginx/html/data:ro` | news (خواندن) |

path داخل کانتینر ثابت است؛ فقط مسیر هاست به `persist/` است.  
named volume Docker یا کپی داخل image برای آپلود/ویترین **ممنوع**.

**خزانه فایل (UC-PLT-14):** `Storage__Root=/app/wwwroot/uploads` در `docker-compose` (`environment`) و `.env.example` قفل است تا با bind mount هم‌تراز باشد. ساختار نسبی زیر ریشه: `yyyy/NNN/file` (سال UTC آپلود / سه رقم اول کدملی بیمار).

**Triage — vault لیست دارد ولی `persist/uploads` خالی است:** ریشهٔ نوشتن اشتباه بوده (معمولاً `/app/uploads` داخل لایهٔ کانتینر). روی سرور:

```bash
sudo docker exec adel-maryam-nabz-clinic-api printenv Storage__Root
# باید /app/wwwroot/uploads باشد
sudo docker exec adel-maryam-nabz-clinic-api ls -la /app/uploads 2>/dev/null || true
# در صورت وجود فایل یتیم: یک‌بار کپی به هاست
# sudo docker cp adel-maryam-nabz-clinic-api:/app/uploads/. ./persist/uploads/
```

سپس compose را با قالب جدید up کنید و یک آپلود آزمایشی بزنید؛ فایل باید زیر `server/persist/uploads/yyyy/...` دیده شود.

MSSQL روی هاست سرور پورت **2433**؛ کانتینر API با `host.docker.internal` وصل می‌شود.

```mermaid
flowchart LR
  publish[publish.bat] --> newsArt[server/news]
  publish --> myArt[server/my]
  publish --> apiArt[server/api]
  persist[server/persist]
  newsArt --> p5436[":5436 nginx"]
  myArt --> p5437[":5437 nginx"]
  apiArt --> p5438[":5438 aspnet"]
  persist --> apiArt
  persist --> newsArt
  p5438 --> mssql["Host MSSQL :2433"]
```

## قواعد بیلد و قالب

- قالب‌ها از [`_templates/write-deploy-files.ps1`](../../server/_templates/write-deploy-files.ps1) refresh می‌شوند؛ ویرایش دستی compose/Dockerfile/`nginx.conf` خارج از قالب ممنوع.
- **SPA fallback:** `my` و `news` هر دو `nginx.conf` با `try_files $uri $uri/ /index.html` دارند تا مسیرهای کلاینت (مثل `/login`) با رفرش مستقیم 404 ندهند.
- **`.env` موجود API بازنویسی نمی‌شود.** کلید جدید در `.env.example` را دستی به `.env` سرور اضافه کنید.
- اگر `frontend/news` نباشد، sync برای news فقط **placeholder** می‌نویسد تا nginx بالا بیاید.
- **کپی فقط‌تازه‌تر:** `sync-deploy.bat` برای `my/dist` و `news/dist` از `robocopy /E /XO` بدون wipe مقصد استفاده می‌کند؛ `api/publish` هم قبل از `dotnet publish` پاک نمی‌شود. فقط منبع تازه‌تر از مقصد overwrite می‌شود؛ فایل‌های اضافی/قدیمی dest می‌مانند.

## کپی پکیج به لینوکس

فقط `.env.example` ارسال می‌شود؛ `.env` پرشده و محتویات `persist/` روی سرور نباید overwrite شوند.

اگر `DEPLOY_REMOTE` در `sync.config.bat` پر باشد، `publish.bat` خودش rsync را با `-avu` اجرا می‌کند (`-u` = اگر مقصد جدیدتر است overwrite نشود)؛ وگرنه:

```bash
rsync -avu --exclude-from=deploy-rsync-exclude.txt ./ user@host:/path/to/server/
```

فایل exclude: [`server/deploy-rsync-exclude.txt`](../../server/deploy-rsync-exclude.txt).  
هرگز `--delete` را طوری نزنید که `persist/` یا `.env` مقصد پاک شود.

## روی سرور لینوکس

1. یک‌بار داخل `server/api`: `cp .env.example .env` و پر کردن `User Id` / `Password` و در صورت نیاز `Auth__FixedOtp` / کلید کاوه‌نگار.
2. در هر پوشهٔ فعال (`api` / `my` / `news`): `sudo docker compose up -d --build`
3. API در استارت: `MigrateAsync` + seed از `IAppDataSeeder` / `AppDataSeeder` (مالک دمو `09123458910`؛ ادمین کل `09133752696`).
4. **مایگریشن:** فقط یک `Initial` (شامل `Persons`)؛ روی DB خام استارت API همان را یک‌بار اعمال + `AppDataSeeder` می‌کند. DB سرور اگر حذف شده، فقط publish و استارت کافی است. ریست بعدی: UC-PLT-13 با OTP.

### مهاجرت از layout قدیمی (یک‌بار)

اگر هنوز `api/uploads` یا `news/data` دارید:

```bash
mkdir -p persist/uploads persist/news-data
# mv api/uploads/* persist/uploads/ 2>/dev/null || true
# mv news/data/* persist/news-data/ 2>/dev/null || true
```

سپس compose جدید را up کنید. اسکریپت‌های ویندوز داده را خودکار پاک/منتقل نمی‌کنند.

### کلیدهای مهم `.env` API

| کلید | نقش |
|------|-----|
| `ConnectionStrings__NabzClinic` | MSSQL روی هاست |
| `Auth__FixedOtp` | اگر پر باشد → همان کد برای لاگین؛ **بدون درگاه پیامک** |
| `Kavenegar__ApiKey` / `OtpTemplate` / `InviteTemplate` | fallback وقتی `Clinic.SmsProvider=Kavenegar` یا None ولی env پر باشد |
| `FrontendUrls__My` / `FrontendUrls__News` | originهای فرانت برای سیاست CORS (`WithOrigins` در `Program.cs`) — هم‌تراز `MY_PUBLIC_URL` / `NEWS_PUBLIC_URL` |

### triage: «CORS» در مرورگر vs API down

پیام DevTools «blocked by CORS / No Access-Control-Allow-Origin» لزوماً باگ سیاست نیست.

| پروب `OPTIONS` به همان URL با `Origin` فرانت | معنی | اقدام |
|-----------------------------------------------|------|--------|
| 502 / 503 / 504 / HTML از CDN (مثلاً ArvanCloud) | upstream/API در دسترس نیست | سلامت کانتینر/پورت API و edge — نه پچ `AddCors` |
| پاسخ از API بدون / با ACAO اشتباه | سیاست CORS | هم‌ترازی `FrontendUrls__*` و `UseCors` قبل از Auth |
| 204/200 + `Access-Control-Allow-Origin` درست | CORS سالم | ریشه را جای دیگر بجویید |

Smoke اجباری: `CorsPreflightSmokeTests` در `Nabz.Api.Tests` (مسیر `pre-publish-tests`).

## ماتریس OTP / SMS روی سرور

1. `Auth__FixedOtp` پر → کد ثابت؛ SMS ارسال نمی‌شود.
2. وگرنه `Clinic.SmsProvider` از تنظیمات بیمارستان (UC-ADM-21):
   - `Kavenegar` → ApiKey کلینیک یا fallback `Kavenegar__*` از env؛ قالب OTP/Invite.
   - `Touba` → URL API `sms.tsms.ir/url/tsms.php` با Username/Password/خط ارسال؛ OTP از `ToubaOtpMessageTemplate`؛ کمپین از `BodyPreview`.
   - `None` بدون env کاوه‌نگار → پیکربندی ناقص.
3. برای **prod:** FixedOtp خالی + درگاه کلینیک کامل.

## Seed و migrate

- migrate خودکار در استارت API (`MigrateAsync`) — پس از اسکواش معمولاً یک مایگریشن `Initial`.
- seed اولیه کلینیک نمونه و کاربران نقش‌دار در `AppDataSeeder` (`IAppDataSeeder`).
- ریست فکتوری ادمین کل (UC-PLT-13): wipe DB + پاک کردن `Storage:Root` / uploads + seed مجدد؛ نیاز به OTP.
- برای بدهی میدان ردیف «verify DebtC applied» در ماتریس تست کافی است (اعمال دستی DB خارج از scope).
- ماتریس کامل قبل‌از‌انتشار: [`pre-release-test-matrix.md`](pre-release-test-matrix.md) (شامل TC-DEP-05).

---
**ناوبری:** [پدر](README.md) · [مستندات — ایندکس](../README.md)  
**مرتبط:** [`server/publish.bat`](../../server/publish.bat) · [`pre-publish-tests.bat`](../../server/pre-publish-tests.bat) · [ماتریس تست](pre-release-test-matrix.md) · [Unit Test](unit-test-scenarios.md) · [process-changelog](process-changelog.md)
