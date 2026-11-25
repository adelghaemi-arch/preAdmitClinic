/*
 File: docs/README.md
 Description: ایندکس ریشه مستندات نفس
 Parent Dependencies: .cursorrules, server/, docs/shared, docs/processes
*/

# مستندات — ایندکس

نقطهٔ ورود همهٔ مستندات محصول و عملیات.

---

## بالادست

| منبع | نقش |
|------|-----|
| [`.cursorrules`](../.cursorrules) | معماری لایه‌بندی، هدر فایل، docs، دیپلوی `server/` |
| [`frontend/`](../frontend) | اپ کلینیک (Vite) — آرتیفکت دیپلوی: `server/my` |
| [`backend/`](../backend) | API ماژولار Nabz.* — آرتیفکت دیپلوی: `server/api` |
| [`server/`](../server) | آرتیفکت دیپلوی api/my/news + `persist/` — راهنما: [`shared/server-deploy.md`](shared/server-deploy.md) |

---

## پوشه‌های موضوعی

| پوشه | نقش |
|------|-----|
| [`shared/`](shared/README.md) | فرایند مشترک، changelog، دیپلوی سرور |
| [`backend/`](backend/README.md) | وضعیت و قرارداد API |
| [`my/`](my/README.md) | اپ سرویس کلینیک (فرانت فعلی) |
| [`news/`](news/README.md) | ویترین عمومی — نمونهٔ طراحی سایت معرفی و اتاق خبر (`frontend/news`) |
| [`exports/`](exports/README.md) | خروجی Word/PDF در صورت نیاز |
| [`processes/`](processes/README.md) | یوزکیس و دیاگرام نسخهٔ ۱ (+ future) |

---

## اسناد عملیاتی مهم

| سند | موضوع |
|-----|--------|
| [`shared/server-deploy.md`](shared/server-deploy.md) | درخت `server/`، `publish.bat`، persist، rsync |
| [`shared/pre-release-test-matrix.md`](shared/pre-release-test-matrix.md) | ماتریس تست دستی قبل‌از‌انتشار (v1) |
| [`shared/unit-test-scenarios.md`](shared/unit-test-scenarios.md) | کاتالوگ سناریوهای Unit Test (BE/FE) — ۵۱ UC v1 |
| [`shared/process-changelog.md`](shared/process-changelog.md) | changelog فرایندی (تاریخ شمسی) |
| [`shared/CHANGELOG.md`](shared/CHANGELOG.md) | تغییرات نگارش اسناد |
| [`shared/operational-ready-modules.md`](shared/operational-ready-modules.md) | کاتالوگ بخش‌های عملیاتی پیاده‌سازی‌شده و آماده‌به‌کار v1 |
| [`shared/platform-strategic-plan.md`](shared/platform-strategic-plan.md) | برنامه استراتژیک پلتفرم پیش‌پذیرش (فعلی + آینده + پیشنهاد) |
| [`شرط-نمایش-و-مخاطب-پرسشنامه.md`](شرط-نمایش-و-مخاطب-پرسشنامه.md) | ماتریس شرط نمایش سوالات + seed/API و import/export بسته |
| [`processes/README.md`](processes/README.md) | فرایندهای کاری v1 |

---

**مرتبط:** [بخش‌های عملیاتی آماده](shared/operational-ready-modules.md) · [برنامه استراتژیک](shared/platform-strategic-plan.md) · [دیپلوی سرور](shared/server-deploy.md) · [ماتریس تست](shared/pre-release-test-matrix.md) · [Unit Test](shared/unit-test-scenarios.md) · [فرایندها](processes/README.md) · [`.cursorrules`](../.cursorrules)
