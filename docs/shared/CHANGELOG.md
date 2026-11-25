/*
 File: docs/shared/CHANGELOG.md
 Description: تغییرات نگارش اسناد فرایند (تاریخ شمسی)
 Parent Dependencies: docs/shared/process-changelog.md, docs/README.md
*/

> **مسیر:** [مستندات — ایندکس](../README.md) › [Shared](README.md) › CHANGELOG نگارشی  
> **پدر:** [Shared](README.md)

# Changelog نگارش اسناد

## ۱۴۰۵/۰۹/۰۷ — هم‌ترازی ارجاع‌ها با ساختار `frontend/my` + `frontend/news`

پس از انتقال اپ کلینیک به `frontend/my`، ارجاع‌های کهنه به `frontend/` یک‌جا اصلاح شد:

- **دیپلوی:** `server/sync-deploy.bat` اکنون از `frontend\my` بیلد و به `server/my/dist` منتقل می‌کند؛ انتشار news هم مسیر ایستای `frontend/news` را mirror می‌کند (با `/XF` برای `serve.mjs`، `check.mjs`، `README.md`) و `mirror_dir` آرگومان سوم استثنا را می‌پذیرد. توضیح منبع env در [`write-deploy-files.ps1`](../../server/_templates/write-deploy-files.ps1) و [`_run-frontend-tests.ps1`](../../server/_run-frontend-tests.ps1) هم به‌روز شد.
- **راهنمای پوشه‌ها:** [`frontend/README.md`](../../frontend/README.md) بازنویسی شد (جدول اپ → آرتیفکت دیپلوی)؛ درخت [`README.md`](../../README.md) ریشه و ردیف منابع [`docs/README.md`](../README.md) اصلاح شد.
- **سند نقش/تست:** ۶۸ مسیر تست در [`unit-test-scenarios.md`](unit-test-scenarios.md) به `frontend/my/src/...` منتقل و یک نام فایل تست نادرست (`uc-sup-01.auth-otp.test.ts`) به فایل واقعی (`uc-sup.test.ts`) اصلاح شد.
- **هدر فایل‌ها:** خط `File:` در ۱۲۷ فایل `frontend/my` به مسیر جدید به‌روز شد (فقط هدر؛ کد تغییر نکرد).
- **تأیید:** `npm ci` + `npm run build` + `npm run test:run` روی `frontend/my` موفق (۲۰۹ تست، ۳۷ فایل) و بازبینی news سالم.

## ۱۴۰۵/۰۹/۰۶ — آماده‌سازی news برای تغییرات بعدی

- محتوای `frontend/news` از یک `content.json` به نه فایل موضوعی در `content/` تفکیک شد (site، home، hospitals، partners، news، voices، faq، about، contact) تا هر ویرایش دامنهٔ اثر کوچکی داشته باشد.
- `serve.mjs` بازنویسی شد: ری‌لود زنده با SSE، بازبینی خودکار JSON و کلیدهای حیاتی، و اندپوینت `/__dev/check`.
- ابزار تازهٔ `check.mjs` برای بازبینی پیش از کامیت (JSON، کلیدهای الزامی، شناسهٔ تکراری، وجود تصاویر، پوستهٔ صفحه‌ها، ارقام فارسی).
- `app.js`: بارگذاری موازی و ادغام محتوا، اعتبارسنجی با گزارش گویا، صفحهٔ خطای راهنما، و رندر مجدد بدون از دست رفتن اسکرول.
- راهنمای «تغییر بعدی: کجا را دست بزنم؟» در [`frontend/news/README.md`](../../frontend/news/README.md).

## ۱۴۰۵/۰۹/۰۵ — نمونهٔ طراحی ویترین عمومی (news)

- نمونهٔ سایت معرفی و اتاق خبر در [`frontend/news`](../../frontend/news): ۹ صفحه (خانه، بیمارستان/کلینیک، بیماران، مشارکت و دیوار شیشه‌ای، اتاق خبر، مقاله، روایت‌ها، درباره، تماس) با محتوای فارسی در `content.json` و راهنمای اجرا در [`frontend/news/README.md`](../../frontend/news/README.md).
- سند [`docs/news/README.md`](../news/README.md) از «اسکلت» به وضعیت نمونهٔ طراحی + تصمیم‌های محتوایی به‌روز شد.
- قواعد محتوایی ثبت شد: اعداد و روایت‌های نمونه برچسب‌دار، مرز «جایگزین HIS نیستیم»، و فرم‌های نمایشی تا اتصال API.

## ۱۴۰۵/۰۹/۰۱ — کاتالوگ بخش‌های عملیاتی آماده

- سند [`operational-ready-modules.md`](operational-ready-modules.md): فهرست یک‌جأ بخش‌های پیاده‌سازی‌شده و آماده‌به‌کار v1 به‌تفکیک نقش، صفحه UI، و UC؛ مرز خارج از دامنه و نقاط ورود.
- ردیف در [`docs/README.md`](../README.md) و [`shared/README.md`](README.md).

## ۱۴۰۵/۰۸/۳۰ — برنامه استراتژیک پلتفرم پیش‌پذیرش

- سند تجمیعی [`platform-strategic-plan.md`](platform-strategic-plan.md): فیچر/فرایند v1، نقشهٔ راه `processes/future`، پیشنهادهای محصولی (بالینی، B2B، ضدتقلب، روز خدمت، کانال، داده، انطباق)، فازبندی و تصمیم‌های باز.
- ردیف در [`docs/README.md`](../README.md) و [`shared/README.md`](README.md).

## ۱۴۰۵/۰۸/۲۸ — ایندکس docs و دیپلوی سرور

- [`docs/README.md`](../README.md) با عنوان **مستندات — ایندکس** و پوشه‌های موضوعی اضافه شد.
- سند عملیاتی [`server-deploy.md`](server-deploy.md) و ایندکس [`shared/README.md`](README.md) اضافه شدند.
