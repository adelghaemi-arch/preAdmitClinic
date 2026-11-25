# frontend

ساختار فرانت پس از تفکیک اپ‌ها: هر اپ یک پوشهٔ جدا دارد و آرتیفکت دیپلوی هرکدام در `server/` هم‌نام خودش است.

| پوشه | اپ | آرتیفکت دیپلوی | راهنما |
|------|-----|----------------|--------|
| [`my/`](my) | اپ کلینیک (**نفس**) — React + Vite + Tailwind | `server/my/dist` | [`my/README.md`](my/README.md) |
| [`news/`](news) | ویترین عمومی و اتاق خبر — ایستا، بدون بیلد | `server/news/dist` | [`news/README.md`](news/README.md) |

مستندات اصلی پروژه: [`../README.md`](../README.md) · ایندکس مستندات: [`../docs/README.md`](../docs/README.md).

## اپ کلینیک (`my`)

```bash
cd my
npm install
npm run dev        # سرور توسعهٔ Vite
npm run build      # بیلد تولید → dist (آرتیفکت server/my/dist)
```

مسیر `/` بدون نشست معتبر به `/login` هدایت می‌شود؛ جزئیات نقش‌ها و مسیرها در [`../README.md`](../README.md).

## ویترین عمومی (`news`)

سایت معرفی و اتاق خبر «نفس» — ایستا، بدون بیلد و بدون وابستگی:

```bash
cd news
node serve.mjs     # پیش‌نمایش + ری‌لود زنده → http://localhost:4321
node check.mjs     # بازبینی محتوا پیش از کامیت
```

محتوا در [`news/content/`](news/content) به نه فایل موضوعی تقسیم شده است — راهنمای کامل ویرایش در [`news/README.md`](news/README.md).

> نام پوشه‌ها با نام سرویس‌های `server/` هم‌تراز است (`my`، `news`، `api`) تا نگاشت «اپ → آرتیفکت دیپلوی» یک‌به‌یک بماند.
