/*
 File: docs/shared/process-changelog.md
 Description: changelog فرایندی با تاریخ شمسی
 Parent Dependencies: .cursorrules §4, server-deploy.md
*/

> **مسیر:** [مستندات — ایندکس](../README.md) › [Shared](README.md) › process-changelog  
> **پدر:** [Shared](README.md)

# Changelog فرایندی

## ۱۴۰۵/۰۸/۲۹ — UX ساکت + heartbeat برای pre-publish-tests

- منطق به [`_pre-publish-tests.ps1`](../../server/_pre-publish-tests.ps1) منتقل شد؛ bat فقط wrapper است.
- کنسول: پیشرفت + `… still running (Ns)` هر ۵ثانیه؛ جزئیات در `test-reports/`؛ `PRE_PUBLISH_VERBOSE=1` برای خروجی کامل.

## ۱۴۰۵/۰۸/۲۹ — پکیج توسعه UC + یوزکیس ماتریس فرم

- `.cursorrules` §4.1: جریان نهایی‌شدهٔ کاربر = **پکیج توسعه** (UC + changelog/ماتریس + تست BE/FE/smoke + دروازهٔ `pre-publish-tests.bat`).
- یوزکیس: `UC-ADM-18` (بسته JSON/Excel)، `UC-ADM-19` (seed کاتالوگ CA + مخاطب)؛ گسترش `UC-ADM-09` و `UC-OWN-03` برای visibility.
- کاتالوگ Unit و ماتریس دستی هم‌تراز شناسهٔ UC.

## ۱۴۰۵/۰۸/۲۹ — seed ماتریس پرسشنامه CA + export/import بسته

- Seed API از کاتالوگ کامل `cancer_screening_male_v02` / `cancer_screening_female_v02` (نه `PREADMIT_V1` به‌عنوان فرم اصلی).
- `FormAudienceEvaluator` هم‌تراز فرانت: `{field,op,value}` و gender `"همه"`.
- فرانت: hydrate `forms` از `GET /api/forms/structures`؛ ادمین: export/import JSON و Excel (`/api/forms/package` و `package.xlsx`).
- سند: [`شرط-نمایش-و-مخاطب-پرسشنامه.md`](../شرط-نمایش-و-مخاطب-پرسشنامه.md)؛ ردیف‌های تست در [`pre-release-test-matrix.md`](pre-release-test-matrix.md).

## ۱۴۰۵/۰۸/۲۹ — دروازهٔ `pre-publish-tests.bat` قبل از انتشار

- [`server/pre-publish-tests.bat`](../../server/pre-publish-tests.bat): بستن قفل (`Nabz.Api` / `testhost`) → Unit بک → API smoke → Vitest؛ گزارش در `server/test-reports/`؛ شکست → `exit 1`.
- [`server/publish.bat`](../../server/publish.bat) گام ۰ را صدا می‌زند؛ `SKIP_PRE_PUBLISH_TESTS=1` فقط اضطراری با هشدار.
- `test-reports/` در [`deploy-rsync-exclude.txt`](../../server/deploy-rsync-exclude.txt)؛ استاندارد در [`.cursorrules`](../../.cursorrules) §5 و [`server-deploy.md`](server-deploy.md).

## ۱۴۰۵/۰۸/۲۹ — seed قرارداد DEMO-ORG + مودال ایجاد + گیت پذیرش بدون قرارداد

- `SeedAsync`: قرارداد `DEMO-ORG` idempotent با ناظر `09123409876`، عضو مالک `0012345678` (لینک بیمار)، عضو admit `0011223344`؛ NID بلاک‌تست `0099887766` فقط مستند است.
- فرانت: hydrate `contracts` از API؛ مودال «اولین قرارداد» در empty-state واقعاً باز می‌شود؛ `CREATE_CONTRACT` به `POST /api/contracts`.
- پذیرش: استعلام کد ملی با عضویت قرارداد؛ بدون قرارداد → «کد ملی شما در هیچ قراردادی یافت نشد…» و قفل مرحله ۲.
- جدول حساب‌ها در [`pre-release-test-matrix.md`](pre-release-test-matrix.md).

## ۱۴۰۵/۰۸/۲۹ — استاندارد چرخه UC→مستند→تست و کاتالوگ Unit Test

- استاندارد غیرقابل‌نقض **§4.1** در [`.cursorrules`](../../.cursorrules): Create UC → Document UC → Full Tests (BE + FE [+ API smoke]).
- کاتالوگ [`unit-test-scenarios.md`](unit-test-scenarios.md): نگاشت **۱:۱** به ۵۱ یوزکیس v1؛ ستون‌های `UT-BE-*` / `UT-FE-*` / `SMK-API-*`؛ مکمل [`pre-release-test-matrix.md`](pre-release-test-matrix.md) (دستی).
- قواعد نام‌گذاری و اسکلت: [`.cursor/rules/testing-unit.mdc`](../../.cursor/rules/testing-unit.mdc).
- اسکلت اجرا: `backend/tests/Nabz.Infrastructure.Tests` (xUnit + fake repos)، `backend/tests/Nabz.Api.Tests` (smoke OTP/snapshot با SQLite+FixedOtp)، فرانت Vitest در `frontend/src/lib/__tests__/`.

## ۱۴۰۵/۰۸/۲۹ — دروازهٔ تست قبل‌از‌انتشار + رفع لاگین OTP

- ماتریس تست دستی v1 اضافه شد: [`pre-release-test-matrix.md`](pre-release-test-matrix.md) — Auth، Owner، Specialist، Admin، Supervisor، Platform، Deploy smoke؛ لینک از ایندکس docs و `processes/README`.
- باگ فرانت: `LoginForm` تابع `normalizePhone` را بدون import صدا می‌زد → `ReferenceError` در مرحلهٔ OTP؛ import از `lib/auth` + چک طول کد OTP جدا از نرمال‌سازی موبایل.
- پس از اصلاح، rebuild فرانت (`publish.bat` / sync-deploy my) لازم است تا باندل `server/my` به‌روز شود.

## ۱۴۰۵/۰۸/۲۹ — نقطهٔ ورود واحد `publish.bat`

- مرجع انتشار ویندوز یک فایل شد: [`server/publish.bat`](../../server/publish.bat) با ترتیب ثابت config → init → sync-deploy all → rsync اختیاری (`DEPLOY_REMOTE`) → چاپ دستور compose.
- `init-server-structure.bat` و `sync-deploy.bat` helper داخلی ماندند؛ اسناد و `.cursorrules` §5 فقط `publish.bat` را مسیر اصلی می‌دانند.
- راهنما: [`server-deploy.md`](server-deploy.md).

## ۱۴۰۵/۰۸/۲۹ — بیلد my با VITE_API_BASE_URL عمومی

- باگ دیپلوی: `sync-deploy.bat` متغیر اشتباه `VITE_API_URL` ست می‌کرد؛ فرانت `VITE_API_BASE_URL` می‌خواند و با `frontend/.env` لوکال، `localhost:5233` در `server/my/dist` bake می‌شد.
- اصلاح: بیلد `my` با `VITE_API_BASE_URL=%API_PUBLIC_URL%` (بدون `/api`)؛ URLهای عمومی در `sync.config.bat` هم‌تراز دامنهٔ سرور (`my.liveteb.ir` / `liveteb.ir` / `api.liveteb.ir`).
- راهنما: [`server-deploy.md`](server-deploy.md).

## ۱۴۰۵/۰۸/۲۸ — شروع فاز فرانت بدون mock (سطح v1)

- فلگ `V1_PRODUCT_SURFACE`: نقش‌ها/صفحات غیر-v1 (صف، اتاق، همراه، پاراکلینیک عملیاتی) از ناوبری مخفی شد.
- ورود OTP و bootstrap از `Nabz.Api` (`/api/auth/*`, `/api/clinics/current`, `/api/users`)؛ حذف مسیر demo-session مبتنی بر mock-store.
- بک‌اند: `GET /api/auth/me`، `POST/GET /api/files`، `GET /api/patients/{id}/chart`، seed فرم منتشرشده و عضو قرارداد نمونه.
- اتصال کامل صفحات دامنه (فرم/قرارداد/شواهد) و حذف فیزیکی لایهٔ mock در موج‌های بعدی همان فاز است.

## ۱۴۰۵/۰۸/۲۸ — مدیریت کاربر ادمین کلینیک و نام «ادمین کل»

- برچسب نمایشی نقش `platform` در اسناد، UI و `.cursorrules` به **ادمین کل** یکدست شد (شناسه فنی `platform` / `AppRole.Platform` ثابت ماند).
- ادمین کلینیک می‌تواند کاربران را فهرست/ایجاد/ویرایش/غیرفعال کند (`UC-ADM-15`–`17`)؛ کاربران دارای نقش Platform و خود نقش Platform از دید و انتصاب او مخفی‌اند.
- ادمین کل همچنان همه کاربران و همه نقش‌ها را می‌بیند (`UC-PLT-04`–`05`).
- API مشترک: `GET/POST api/users`، `GET api/users/assignable-roles`، `POST api/users/{id}/active` با نقش‌های `Admin,Platform`.

## ۱۴۰۵/۰۸/۲۸ — ریشهٔ پایدار `server/persist` برای دیپلوی

- اسکلت انتشار `server/{api,my,news,persist}` طبق `.cursorrules` §5 اضافه شد.
- آرتیفکت اجرا در `server/{api,my,news}`؛ دادهٔ پایدار فقط زیر `server/persist/{uploads,news-data}` با bind mount.
- فقط `.env.example` در پکیج؛ `.env` سرور و محتویات `persist/` با `deploy-rsync-exclude.txt` از overwrite کپی ویندوز→لینوکس محافظت می‌شوند.
- اسکلت بدون بیلد: `init-server-structure.bat`؛ بیلد کامل: `sync-deploy.bat`؛ قالب‌ها فقط از `_templates/write-deploy-files.ps1`.
- نگاشت فعلی: `frontend/` → `server/my`؛ `backend` → `server/api`؛ `news` اسکلت (تا `frontend/news` اضافه شود).
- راهنما: [`server-deploy.md`](server-deploy.md).
