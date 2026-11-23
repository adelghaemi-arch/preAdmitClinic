/*
 File: docs/shared/process-changelog.md
 Description: changelog فرایندی با تاریخ شمسی
 Parent Dependencies: .cursorrules §4, server-deploy.md
*/

> **مسیر:** [مستندات — ایندکس](../README.md) › [Shared](README.md) › process-changelog  
> **پدر:** [Shared](README.md)

# Changelog فرایندی


## ۱۴۰۵/۰۹/۰۲ — دامنهٔ رسمی my → nafasmed + .env فقط per-host

- origin فرانت کلینیک: `https://my.nafasmed.ir` (`MY_PUBLIC_URL` / `FrontendUrls__My` / smoke CORS).
- publish دیگر `api/.env` از example نمی‌سازد و rsync همان exclude را نگه می‌دارد؛ هر هاست Linux فقط `.env` خودش را برای CORS/MSSQL نگه می‌دارد تا سرورهای متفاوت خراب نشوند.
- رفع CORS در مرورگر: روی هاست API همان `FrontendUrls__My=https://my.nafasmed.ir` را ست و کانتینر را ری‌استارت کنید (نه کپی env از ویندوز).

## ۱۴۰۵/۰۹/۰۲ — طوبی OTP: الزام {code} + گارد FixedOtp در Production (UC-OWN-01 / UC-ADM-21)

- متن OTP طوبی بدون `{code}` (مثلاً عدد ثابت ۱۱۱۱۱) دیگر ذخیره/ارسال نمی‌شود؛ در غیر این صورت گوشی ۱۱۱۱۱ می‌دید ولی CodeHash رندم بود.
- استارت API در Production با `Auth:FixedOtp` غیرخالی fail می‌شود؛ لاگ صدور OTP بدون افشای کد (purpose / پسوند موبایل / Fixed در برابر Sms).

## ۱۴۰۵/۰۹/۰۲ — ورود ادمین کل: FixedOtp خالی برای SMS واقعی + hint پایه+۱ (UC-PLT-15)

- `Auth__FixedOtp` در env سرور و Development برای OTP واقعی کاوه‌نگار/طوبی خالی شد؛ با FixedOtp پر، SMS لاگین نمی‌رود و کد نمایشی `۱۱۱۱۱` گمراه‌کننده بود.
- در لاگین با FixedOtp فعال و موبایل `۰۹۱۳۳۷۵۲۶۹۶`، hint «کد ورود = نمایشی + ۱» نشان داده می‌شود (قانون UC-PLT-15).

## ۱۴۰۵/۰۹/۰۱ — تست درگاه مستقل از FixedOtp (UC-ADM-23)

- `IClinicSmsDispatch` / دکمهٔ «ارسال تست» دیگر با `Auth:FixedOtp` قفل نمی‌شوند؛ ادمین می‌تواند طوبی/کاوه‌نگار را با پین ثابت لوکال هم تست کند.
- FixedOtp فقط OTP و کمپین تولید (`ClinicRoutingSmsSender`) را قطع می‌کند؛ بنر UI و UC-ADM-23 Nb هم‌تراز شد.

## ۱۴۰۵/۰۹/۰۱ — کش لایهٔ Docker برای Chromium PDF (UC-ADM-26)

- Dockerfile: نصب apt/Chromium قبل از `COPY` کامل `publish`؛ فقط `linux-x64` در لایهٔ browser. `# syntax=docker/dockerfile` ممنوع روی این سرور (Docker Hub 403).

## ۱۴۰۵/۰۹/۰۱ — درایور لینوکس Playwright برای Docker PDF (UC-ADM-26)

- `sync-deploy` با `-r linux-x64` publish می‌کند تا `.playwright/node/linux-x64` داخل image بیاید (publish ویندوزی فقط `win32_x64/node.exe` می‌گذاشت و `install chromium` می‌ترکید).
- اسکریپت نصب: اگر درایور لینوکس نبود از NuGet همان نسخه می‌گیرد؛ بعد Chromium را در `/ms-playwright` می‌گذارد.

## ۱۴۰۵/۰۹/۰۱ — نصب اجباری Chromium در image API (UC-ADM-26)

- Dockerfile از اسکریپت `install-playwright-chromium.sh` Chromium را در `/ms-playwright` نصب می‌کند؛ build بدون browser شکست می‌خورد.
- علت ظاهر CORS روی prod: درایور `.playwright` بود ولی browser نصب نشده بود → NRE در `Playwright.CreateAsync`.

## ۱۴۰۵/۰۹/۰۱ — PDF پرسشنامه با Chromium سرور (UC-ADM-26)

- دانلود PDF از `GET /api/contracts/{id}/members/{memberId}/intake-pdf` با Playwright/Chromium (متن قابل‌جستجو، RTL فارسی پایدار، `@page` A4).
- حذف مسیر ناپایدار html2canvas+jspdf از فرانت؛ مودال فقط پیش‌نمایش HTML است.
- فونت Vazirmatn به‌صورت Embedded Resource در API؛ لوگوها data-URI از storage.
- image داکر API وابستگی Chromium می‌گیرد.

## ۱۴۰۵/۰۹/۰۱ — طوبی SOAP مطابق نمونه TSMS (UC-ADM-21/23)

- ارسال طوبی از URL `tsms.php` به SOAP نمونه (`http://www.tsms.ir/soapWSDL/`، متدهای `UserInfo` + `sendSms`) منتقل شد.
- `GET /api/clinics/current/sms/touba-account` اعتبار و خطوط را برمی‌گرداند؛ UI تنظیمات بیمارستان select خط + نمایش اعتبار دارد.
- مقدار ذخیره‌شدهٔ قدیمی `url/tsms.php` در runtime به SOAP پیش‌فرض remap می‌شود.

## ۱۴۰۵/۰۹/۰۱ — لوگوی کلینیک/قرارداد + قالب PDF برند دینامیک (UC-ADM-21/22/26)

- آپلود لوگوی بیمارستان در تنظیمات کلینیک (`POST /api/clinics/current/logo` → `Clinic.LogoStorageKey`) و لوگوی سازمان در ویرایش قرارداد (`POST /api/contracts/{id}/partner-logo`).
- PDF پرسشنامه: عنوان از `clinic.name`؛ لوگوها از storage (بدون ثابت `public/brand`)؛ حذف «همکار سازمانی»؛ اعداد فارسی؛ حاشیه A4 ۱۲mm (تولید نهایی با Chromium — بند جدا).
- Admin/Platform می‌توانند کلیدهای `clinic-brand/` و `contract-brand/` را دانلود کنند.

## ۱۴۰۵/۰۹/۰۱ — خروجی PDF پرسشنامه از قیف قرارداد (UC-ADM-26)

- در رستر قیف قرارداد، برای اعضای با پرسشنامه تکمیل‌شده دکمهٔ «PDF پرسشنامه» اضافه شد.
- اندپوینت `GET /api/contracts/{id}/members/{memberId}/submitted-form` فقط پاسخ `Submitted` را برای Admin/Platform برمی‌گرداند.
- دانلود فایل PDF واقعی (jspdf + html2canvas) با قالب رسمی: هدر دو برند، کارت هویت، بخش‌بندی پاسخ، نشان هشدار، پاورقی محرمانگی.

## ۱۴۰۵/۰۹/۰۱ — سن visibility از تولد فرم (UC-OWN-03)

- `buildContext` سن را از پاسخ `_BASE_birthDate` / `patient.birthDate` می‌گیرد تا `patient.age` کهنه سوالات ≥۵۰ (مثل PSA) را در پرونده غربالگری مخفی نکند.
- پس از draft/پروفایل، state محلی `age` هم از تولد هم‌تراز می‌شود؛ ارزیاب بک‌اند هم سن را از پاسخ تولد می‌خواند.

## ۱۴۰۵/۰۸/۳۰ — کاتالوگ ایستگاه کلینیک (UC-ADM-25)

- موجودیت `ClinicStation` + API ` /api/clinics/current/stations` برای Admin/Platform (CRUD و فعال/غیرفعال)؛ پزشک فقط فعال‌ها را می‌خواند.
- تغییر `TitleFa` عنوان `PathwayStationDef` با همان `RoomCode` را همگام می‌کند.
- سایدبار ادمین/پلتفرم صفحهٔ «ایستگاه‌ها و اتاق‌ها»؛ پنل بدون صف؛ افزودن فوری پزشک و نقشه موبایل فقط ایستگاه فعال.

## ۱۴۰۵/۰۸/۳۰ — دانلود مدارک برای پزشک (UC-SPC-06)

- `CanDownloadStorageKeyAsync` برای نقش Specialist مدارک پیش‌پذیرش و پرتره را مجاز کرد (فریم ضدتقلب همچنان فقط Platform).
- پنل مدارک پرونده پزشک: تامنیل دسته‌بندی‌شده + کلیک برای باز شدن (PDF در تب جدید).

## ۱۴۰۵/۰۸/۳۰ — فهرست و پرونده پزشک (UC-SPC-01…06)

- تب پزشک از «لیست انتظار اتاق» به **فهرست همهٔ بیماران کلینیک** با جستجوی نام/کدملی/موبایل (`SEARCH_SPECIALIST_PATIENTS`) تغییر کرد.
- باز کردن پرونده با `OPEN_SPECIALIST_CHART` پاسخ submitted + مدارک را hydrate می‌کند؛ خلاصه با اولویت بالینی (مثبت/توضیح/هشدار) و سپس پرسشنامه کامل و مدارک طبقه‌بندی‌شده.
- فراخوان صف / اتمام ویزیت همچنان خارج از دامنهٔ v1 باقی می‌ماند.

## ۱۴۰۵/۰۸/۳۰ — نام/کدملی/موبایل از UI پرسشنامه حذف (UC-OWN-03)

- فیلدهای هویت قفل‌شدهٔ Person در پیش‌پذیرش نمایش داده نمی‌شوند؛ مقدار از پروفایل prefill و در draft/submit می‌ماند.

## ۱۴۰۵/۰۸/۳۰ — prefill تولد و تاهل از پروفایل (UC-OWN-03)

- تاریخ تولد و وضعیت تاهل از ستون‌های Person/Patient روی پرسشنامه hydrate می‌شوند حتی اگر `prefillFromPatient` در کاتالوگ خالی باشد.
- answer خالی در draft سرور، مقدار پروفایل را نمی‌پوشاند.

## ۱۴۰۵/۰۸/۳۰ — تاریخ تکمیل پرسشنامه فقط سرور (UC-OWN-04)

- فیلد `formDate` از UI پیش‌پذیرش حذف شد (دیگر prefill «امروز» و قابل‌ویرایش دیده نمی‌شود).
- هنگام `SAVE_FORM_RESPONSE` با وضعیت submit، سرور روز مدنی ایران را مهر می‌زند و مقدار کلاینت را دور می‌ریزد؛ در draft هم `formDate` از payload حذف می‌شود.

## ۱۴۰۵/۰۸/۳۰ — آدرس دستی / آواتار پرتره / پچ تقویم تولد

- آدرس سکونت: اگر متن آدرس موجود باشد، reverse OSM با جابه‌جایی پین آن را بازنویسی نمی‌کند؛ تأیید نقشه آدرس پاپاپ را می‌گیرد (نه تحمیل draft والد).
- تاپ‌بار Owner: در صورت وجود پرتره، تامنیل بیضی به‌جای حروف اول.
- Vite: `@jalali-js/react` از `optimizeDeps` خارج شد تا پچ فیلتر سال آیندهٔ تولد در کش deps گم نشود.

## ۱۴۰۵/۰۸/۳۰ — خروجی گزارش اعضا .xlsx واقعی (UC-ADM-04b)

- دکمه «خروجی اکسل» فایل `.xlsx` می‌دهد (نه CSV).
- ستون‌های کدملی و موبایل به‌صورت متن (`t=s` / `z=@`) تا صفر اول نپرد.
- تاریخ نوبت معاینه شمسی ثابت `YYYY/MM/DD` (نه برچسب نسبی مثل «امروز»).

## ۱۴۰۵/۰۸/۳۰ — فعال/غیرفعال قرارداد + فیلتر لیست (UC-ADM-24)

- وضعیت جدید `ContractStatus.Inactive`؛ `PUT /api/contracts/{id}/status` با `{ isActive }` (Admin/Platform).
- هاب قرارداد: دکمهٔ فعال/غیرفعال با مودال تأیید خطر؛ تیک «نمایش غیرفعال‌ها» روی کمبو (پیش‌فرض فقط Active).

## ۱۴۰۵/۰۸/۳۰ — ایستگاه‌های seed سازمانی مطابق پروتکل کلینیک (UC-ADM-05b)

- چهار مسیر `CORP_*`: ECG برای همه؛ `HOSP_MEAL` (پذیرایی/صبحانه، اختیاری) پس از سونو؛ آقایان زیر ۴۰ بدون قلب/اکو/تست ورزش؛ بانوان زیر ۴۰ با سونو برست و بدون بلوک قلب.
- seed با reconcile روی `RoomCode` هم‌تراز می‌شود (بدون wipe Guid کتابخانه).

## ۱۴۰۵/۰۸/۳۰ — ترتیب تب هاب قرارداد: مسیر سپس افراد (UC-ADM-05b / UC-ADM-04b)

- ریل مراحل: ۱ مسیر سلامتی هر فرد → ۲ افراد قرارداد → ۳ نوبت‌دهی → ۴ قیف؛ تب پیش‌فرض باز شدن = مسیر.

## ۱۴۰۵/۰۸/۳۰ — seed مسیر سازمانی idempotent (UC-ADM-05b)

- `SeedCorporatePathwaysAsync` دیگر کتابخانه/کاتالوگ را wipe نمی‌کند؛ upsert بر اساس `Code` تا Guid پایدار بماند و «افزودن» از کتابخانه ۴۰۰ ندهد.
- hydrate فرانت: آرایهٔ خالی کتابخانه از API با Guid ساختگی `lib-rule-*` جایگزین نمی‌شود.

## ۱۴۰۵/۰۹/۰۱ — ثبت ناظر: ۴۰۰ به‌جای ۵۰۰ برای اعتبارسنجی (UC-ADM-02)

- `PUT /api/contracts/{id}/supervisor`: `InvalidOperationException` (کدملی/موبایل نامعتبر و …) → `400 { error }`؛ دیگر DeveloperException ۵۰۰ نیست.
- فرانت قبل از PUT چک‌سام کدملی و موبایل را می‌سنجد و خطای API را در بنر نشان می‌دهد.

## ۱۴۰۵/۰۸/۳۰ — ناظر: نام/نام‌خانوادگی جدا + کدملی اجباری (UC-ADM-02)

- فرم ایجاد/ویرایش ناظر: ردیف اول نام + نام‌خانوادگی؛ ردیف دوم کدملی + موبایل؛ فیلد سمت حذف شد.
- `UpdateSupervisorAsync` بدون کدملی معتبر رد می‌کند.

## ۱۴۰۵/۰۸/۳۰ — رفع ۵۰۰ هنگام ثبت ناظر قرارداد (UC-ADM-02)

- `UpdateSupervisorAsync`: ناظر جدید با `PersonId` کامل ساخته می‌شود؛ دیگر `PersonId=Empty` + ست کردن navigation باعث `DbUpdateConcurrencyException` نمی‌شود.
- `EnsurePerson` بدون کدملی همان Person موبایل را بازاستفاده می‌کند؛ ایجاد قرارداد با ناظر نام+نام‌خانوادگی دوقسمتی می‌خواهد.

## ۱۴۰۵/۰۸/۳۰ — نمایش تاریخ مراجعه در پیش‌نمایش اکسل (UC-ADM-04)

- جدول پیش‌نمایش import ستون‌های «تاریخ مراجعه» و «گروه/مسیر» را نشان می‌دهد.
- «روز مراجعه» (= نام هفته مثل شنبه) همچنان نادیده است؛ تاریخ از ستون «تاریخ مراجعه» خوانده می‌شود (نمونه: `docs/sample/بانک توسعه.xlsx`).

## ۱۴۰۵/۰۸/۳۰ — تمپلیت اکسل اعضا (UC-ADM-04)

- تمپلیت کامل: برچسب اجباری/اختیاری روی هدر، دقیقاً یک ردیف نمونه مرد و یک زن، شیت «راهنما» و «مقادیر_مجاز» برای جنسیت/تاهل/رده/کد مسیر.
- پنل اکسل تب افراد: جدول پیش‌نمایش ستون‌ها + دانلود `.xlsx` (و `.xls`/CSV).

## ۱۴۰۵/۰۸/۳۰ — logout پس از ریست فکتوری (UC-PLT-13)

- بعد از `factory-reset/confirm` نشست‌ها wipe شده‌اند؛ `apiRevokeSession` دیگر ۴۰۱ را پرتاب نمی‌کند و همیشه توکن محلی را پاک می‌کند تا redirect به لاگین انجام شود.

## ۱۴۰۵/۰۸/۳۰ — برچسب نقش دمو لاگین فقط فارسی

- hint ورود سریع OTP: «نقش ادمین کلینیک / پزشک متخصص / ناظر سازمان» به‌جای Admin / Specialist / Supervisor.
- نام نقش JWT/API به کاربر نشان داده نمی‌شود.

## ۱۴۰۵/۰۸/۳۰ — نمایش ارقام فارسی در UI (placeholder + نشت‌های نمایش)

- `AppInput` / `AppTextarea` با `digits=fa` علاوه بر value، **placeholder** را هم با `toFaDigits` نشان می‌دهند (state همچنان لاتین).
- بستن نشت نمایش لاتین: لیست ورود سریع OTP، کدملی دایرکتوری، پیش‌نمایش اکسل/نتیجهٔ import، موبایل ناظر، کد پرسنلی ناظر، گزینهٔ اعلان پذیرش.
- فونت جدید لازم نیست؛ قرارداد قبلی (JS Unicode فارسی برای نمایش، لاتین برای API) حفظ شد.

## ۱۴۰۵/۰۸/۳۰ — مسیرهای چکاپ سازمانی + itinerary مالک + اسکواش مایگریشن

- کاتالوگ مسیر بک‌اند (`PathwayDefinition` / `PathwayStationDef`) با چهار قالب جنسیت×سن؛ گام اختیاری STRESS/PAP.
- کتابخانه قوانین LR-001..004؛ حذف کامل مسیر/قوانین قدیمی (`FULL_CHECKUP` و …) از seed/mock.
- UC-OWN-14: `pathwayItinerary` در Owner snapshot + confirm با نگه‌داشتن ۳ثانیه بدون الزام ترتیب (جدا از صف کلینیک).
- زنجیرهٔ مایگریشن به یک `Initial` اسکواش شد؛ بازسازی عملیاتی با ریست فکتوری ادمین کل (UC-PLT-13).

## ۱۴۰۵/۰۸/۳۰ — گارد ضدسوءاستفاده API (UC-PLT-17)

- شمارش در حافظه؛ soft `429` و hard → تعلیق `IsActive` + revoke نشست + deny-set + فهرست ادمین کل.
- SMS هشدار به موبایل ادمین کل فقط وقتی پیامک زنده است (`!FixedOtp` + قالب/کاوه‌نگار).
- Throttle `LastSeenAt` و ایندکس `TokenHash` برای جلوگیری از کندی DB.
- معافیت نقش Platform؛ آستانه‌ها بالاتر از burst مشروع GPS/ضدتقلب.

## ۱۴۰۵/۰۸/۳۰ — اولویت Auth:FixedOtp روی درگاه ادمین

- با FixedOtp پر، ارسال واقعی در `ClinicRoutingSmsSender` و `ClinicSmsDispatch` هم مسدود است (علاوه بر OTP/کمپین).
- بنر هشدار در تنظیمات بیمارستان؛ تست UC-ADM-23 تا خالی شدن FixedOtp غیرفعال.

## ۱۴۰۵/۰۸/۳۰ — تست پیامک قبل از فعال‌سازی درگاه (UC-ADM-23)

- اعتبارنامه با `SmsProvider=None` قابل ذخیره است؛ تست با فیلد `provider` روی `POST .../sms/test` و `IClinicSmsDispatch` (بدون مسیریاب تولید).
- UI: جدا کردن درگاه فعال از پیکربندی/هدف تست؛ راهنمای «اول تست، بعد فعال‌سازی».

## ۱۴۰۵/۰۸/۳۰ — تست ارسال پیامک در تنظیمات کلینیک (UC-ADM-23)

- بلوک «تست ارسال» در تنظیمات بیمارستان: قالب آماده پلتفرم، پیامک مستقیم (طوبی)، قالب سامانهٔ درگاه (کاوه‌نگار).
- `POST /api/clinics/current/sms/test` مستقل از FixedOtp؛ از تنظیمات ذخیره‌شدهٔ سرور استفاده می‌کند.
- Unit بک/فرانت و ردیف کاتالوگ UT-BE/FE-ADM-23.

## ۱۴۰۵/۰۸/۳۰ — اصلاح اشتباه هیرو → طوبی (TSMS)

- حذف کامل پیاده‌سازی هیرو؛ provider/فیلدها به `Touba*`؛ ارسال از `https://sms.tsms.ir/url/tsms.php`.
- UI و اسناد فقط کاوه‌نگار / طوبی.

## ۱۴۰۵/۰۸/۳۰ — سامانه پیامک چندگانه کلینیک (کاوه‌نگار + طوبی)

- `Clinic.SmsProvider` و تنظیمات پایه (ApiKey / Username·Password / خط ارسال / قالب OTP / URL طوبی).
- مسیریابی `ClinicRoutingSmsSender`؛ طوبی از URL API روی sms.tsms.ir؛ کاوه‌نگار با fallback env.
- UI تنظیمات بیمارستان؛ ماسک secret در GET؛ UC-ADM-21 / UC-ADM-06 / server-deploy به‌روز.

## ۱۴۰۵/۰۸/۳۰ — نام پدر، تاریخ مراجعه، import هدرمحور، گروه→کد مسیر

- `Person.FatherName` و `ContractMember.ScheduledVisitDate` (+ migration).
- import اکسل: تشخیص ستون از هدر (ترتیب آزاد)، UI مپ دستی اگر اجباری‌ها ناقص، skip هدر تکراری/وقفه، خواندن `.xlsx`.
- ستون گروه فقط اگر کد مسیر معتبر باشد → `ManualPathwayOverride`؛ برچسب آزاد نادیده.
- بنر Owner در خانه و ابتدای پیش‌پذیرش وقتی تاریخ مراجعه هست.
- UC-ADM-04 / UC-OWN-02 + Unit پارسر/مسیر از گروه.

## ۱۴۰۵/۰۸/۳۰ — ورود ادمین کل: seed Person بدون NID + FixedOtp+1

- seed ادمین کل دیگر اولین Person با موبایل را نمی‌گیرد؛ فقط `Mobile` قفل + `NationalId == null` و heal نقش Platform از Person/Patient اشتباه.
- `BuildCandidates` روی موبایل قفل فقط حساب Platform را برمی‌گرداند.
- با `Auth__FixedOtp`: نمایش UI همان پایه است؛ verify ادمین کل باید پایه + ۱ باشد (ورود با کد معمولی ممکن نیست).
- UC-PLT-15 + Unit/Smoke هم‌تراز.

## ۱۴۰۵/۰۸/۳۰ — بررسی مجدد مسیر + اولویت قابل‌جابه‌جایی + پنل ناظر قرارداد

- override دستی: `MatchedPathwayTitle` = عنوان کمبو؛ عضو همان لحظه در سطل درست دیده می‌شود.
- اولویت مسیر سفارشی با Chevron؛ `SAVE_CONTRACT_PATHWAY_RULES?reapplyMembers=false` بدون جابه‌جایی اعضا.
- `PREVIEW_PATHWAY_RECHECK` / `APPLY_PATHWAY_RECHECK` + مودال جدول جابه‌جایی در هاب قرارداد.
- کمبو مسیر در نوبت‌دهی = همان گزینه‌های مسیر قرارداد (نه کاتالوگ ایستگاه).
- «مشاهده پنل ناظر» → نقش ناظر + رستر قرارداد جاری با hydrate اعضا.
- UC-ADM-05 و Unit BE/FE هم‌تراز شدند.

## ۱۴۰۵/۰۸/۳۰ — توزیع = مسیر سلامتی (یک لیست + پیش‌فرض)

- تب مسیر: بلوک جداگانه «توزیع به تفکیک» حذف شد؛ اعضا فقط زیر کارت همان مسیر (یا مسیر پیش‌فرض استاندارد) دیده می‌شوند.
- اولویت: اولین مسیر منطبق از بالای لیست قرارداد؛ بدون تطبیق → `DefaultPathwayCode`.
- دیتابیس لوکال `NabzClinic` drop و از نو Migrate+Seed شد؛ helper `contract-pathway-buckets` + Vitest UC-ADM-05.

## ۱۴۰۵/۰۸/۳۰ — برند محصول «نفس» و آیکن‌های وب/PWA

- نام کاربرمحور محصول از «نبض کلینیک» به **نفس** تغییر کرد (`BrandName` پیش‌فرض، seed نمایشی، UI لاگین/سایدبار، README).
- آیکن‌های [`icons/web`](../../icons/web) به [`frontend/public`](../../frontend/public) منتقل و در `index.html` / `site.webmanifest` (theme `#09786A`) وصل شدند؛ آیکن‌های ios/android در `icons/` به‌عنوان پکیج لانچر باقی ماندند.
- نقش دامنه «ادمین کلینیک» و namespaceهای `Nabz.*` تغییر نکردند.

## ۱۴۰۵/۰۸/۳۰ — یکپارچه‌سازی «مسیر سلامتی» (به‌جای قانون/بسته جدا)

- محصول و UI هاب قرارداد: یک مفهوم واحد «مسیر سلامتی»؛ حذف دوگانه قانون/بسته در تب تخصیص.
- rename دامنه بک‌اند/اسکیما: `PathwayLibraryRules`، `ContractPathwayRules`، `DefaultPathwayCode`، `AssignedPathway*`، `MatchedPathwayTitle`، route `api/pathway-library-rules`.
- اکشن‌های فرانت: `SAVE_CONTRACT_PATHWAY_RULES`، `ATTACH_PATHWAY_LIBRARY`، `DETACH_CONTRACT_PATHWAY`، `OVERRIDE_MEMBER_PATHWAY`، `UPSERT_PATHWAY_LIBRARY_ITEM`.
- UC-ADM-05 / 05b و ماتریس/کاتالوگ Unit هم‌تراز شدند؛ EvidencePackage و بسته پرسشنامه دست نخورده ماند.

## ۱۴۰۵/۰۸/۳۰ — seed سه قانون کتابخانه بسته (LR-001…003)

- در `AppDataSeeder` سه قانون مرتبط کتابخانه (سالمندان جامع، بانوان قلب/ریه، مردان عملیات/فنی) به‌صورت idempotent روی `Code` seed می‌شود.
- هم‌تراز mock فرانت؛ در picker «از کتابخانه» پس از استارت API قابل انتخاب‌اند.

## ۱۴۰۵/۰۸/۳۰ — تب افراد قرارداد جدول‌محور + گارد حذف (UC-ADM-04b)

- تب افراد: رستر جدولی با وضعیت، ویرایش، حذف شرطی، export؛ افزودن تکی/اکسل/API از نوار ابزار.
- حذف عضو فقط قبل از پیش‌پذیرش (`not_sent`/`sms_sent`، بدون فرم، بدون پذیرش) — گارد بک و UI.
- دکمه «خروجی اکسل» از هدر کارت قرارداد حذف شد.

## ۱۴۰۵/۰۸/۳۰ — ویرایش مشخصات پایه قرارداد (UC-ADM-22)

- از هدر هاب قرارداد: دکمهٔ «ویرایش» برای عنوان، نام سازمان و بسته پایه پیش‌فرض.
- `PUT /api/contracts/{id}` + اکشن `UPDATE_CONTRACT`؛ Code قفل؛ API/ناظر مسیرهای قبلی.
- Unit بک/فرانت و ردیف ماتریس پیش‌انتشار.

## ۱۴۰۵/۰۸/۳۰ — جلوگیری از دوباره‌شدن گالری/تأیید عکس پیش‌پذیرش

- تا settle شدن `responses/mine`، photo gate mount نمی‌شود (رفع flash/unmount که کلیک اول گالری را باطل می‌کرد).
- `PatientPhotoCapture`: ensure استریم بدون ریست `adjust`/`preview`؛ تغییر هویت `fraudWatch` جریان گالری را صفر نمی‌کند.

## ۱۴۰۵/۰۸/۳۰ — پیشرفت پرسشنامه روی رستر قرارداد

- draft/submit فرم مالک: همگام `ContractMember` لینک‌شده — درصد پیشرفت، `Abandoned` هنگام شروع، `Completed` با intake کامل.
- `ContractMemberDto` + قیف: `formStatus` (None/Draft/Submitted)، `profileProgressPct`، شمارش `FormDraft` / `FormSubmitted`.
- UI ادمین/ناظر: فیلتر و badge «شروع پرسشنامه» / «تکمیل»؛ UC-ADM-07/12 و UC-SUP-02/03.

## ۱۴۰۵/۰۸/۳۰ — جابجایی پیکسلی گالری قبل/بعد زوم

- pan پیکسلی (`panX`/`panY`) به‌جای offset نرمال؛ درگ ماوس/لمس و دکمه‌های جابجایی؛ هنگام زوم نقطهٔ کانونی مرکز قاب حفظ می‌شود سپس clamp.
- UC-OWN-05: تنظیم بخش دلخواه داخل قاب قبل یا بعد از زوم.

## ۱۴۰۵/۰۸/۳۰ — گالری پرتره با زوم داخل قاب + بدون capture

- انتخاب از گالری روی موبایل و دسکتاپ: `accept="image/*"` بدون `capture` تا picker فایل/گالری باز شود (دوربین زنده جدا با `getUserMedia`).
- فاز تنظیم گالری: زوم/جابجایی داخل همان بیضی؛ اعتبارسنجی چهره و خروجی استاندارد ۳×۴ مثل مسیر دوربین؛ استریم ضدتقلب هنگام adjust قطع نمی‌شود.
- UC-OWN-05 سناریو ۲/۲c به‌روز شد.

## ۱۴۰۵/۰۸/۳۰ — hydrate draft پیش‌پذیرش از responses/mine

- باز کردن پرسشنامه Owner: `GET /api/forms/responses/mine`؛ answers سرور روی فرم (اولویت بر prefill Patient).
- بدون draft → همان prefill نام/کدملی/موبایل/سکونت؛ ادامه روی دستگاه دیگر بدون وابستگی به snapshot محلی خالی.
- UC-OWN-03 گام hydrate + استثنای 2a؛ patch محلی `HYDRATE_FORM_RESPONSE`.

## ۱۴۰۵/۰۸/۲۹ — upsert پاسخ پیش‌پذیرش (رفع 409 پوسته خالی)

- ذخیرهٔ draft/submit برای همهٔ آیتم‌ها: بر اساس `ItemCode` موجود → update، نبود → insert (مخلوط در یک درخواست).
- حذف wipe+reinsert در submit؛ فقط prune کدهای غایب از payload کامل.
- `FormResponse`/`FormAnswer` با `ValueGeneratedNever`؛ ایندکس یکتا `(ResponseId, ItemCode)`.
- دموگرافیک BASE بعد از `SaveChanges` اول answers تا شکست Person/User Answers را خالی نگذارد.
- Controller: یک retry با scope تازه روی concurrency + لاگ `Entries`.

## ۱۴۰۵/۰۸/۲۹ — فریم ضدتقلب مبهم + زمان ایران در API

- آپلود فریم ``fraud_auto``: نام تصادفی ``.bin``، ``application/octet-stream``، پوشش ``NBZ1`` با ``wrapKey`` نشست؛ سرور unwrap + تأیید JPEG و ذخیرهٔ ``{guid}.jpg``.
- ``StartFraud`` پاسخ ``wrapKey`` می‌دهد؛ ``Capture`` وجود blob را enforce می‌کند؛ ``PatientPhoto.MimeType`` و ``FraudCaptureSession.WireWrapKey``.
- همهٔ ``DateTime`` در JSON API به وقت ایران با آفست ``+03:30``؛ ``EvidencePackage.DayKey`` روز مدنی ایران؛ فرانت instant را بدون تبدیل TZ مرورگر نمایش می‌دهد.

## ۱۴۰۵/۰۸/۲۹ — دموگرافیک BASE و عکس بدون آپلود فرت‌فرت

- ترک بخش BASE: همگام‌سازی یک‌بارهٔ تولد/تاهل/سکونت روی Patient (`form_draft`) همراه draft بخش.
- گیت عکس پیش‌پذیرش: فریم‌های `fraud_auto` تا تأیید پرتره فقط در صف کلاینت؛ آپلود دسته‌ای با تأیید.
- تنظیمات پروفایل Owner: عکس جدید محلی تا «ذخیره پروفایل» همراه دموگرافیک.

## ۱۴۰۵/۰۸/۲۹ — draft پرسشنامه فقط در سطح بخش

- حذف autosave هر فیلد؛ ویرایش فقط در state کلاینت می‌ماند.
- ذخیره draft هنگام ترک بخش (بعدی/قبلی/استپر) یا «ذخیره موقت»؛ بدنه فقط `itemCode`های همان بخش.
- بک‌اند: draft با upsert بر اساس `ItemCode` (بدون RemoveRange کامل)؛ submit همچنان جایگزینی کامل.
- کاهش تداخل `409` ناشی از delete+reinsert هم‌زمان answers.

## ۱۴۰۵/۰۸/۲۹ — خانه مینیمال Owner → پیش‌پذیرش نشست‌محور

- ورود Owner همیشه به داشبورد با فاصله بالای مسیر (موبایل فشرده)؛ صفحهٔ اجباری `journey-intro` حذف شد.
- «ورود به پیش‌پذیرش» مسیر/هیرو را در همان نشست مخفی می‌کند؛ رفرش یا بستن اپ خانه را برمی‌گرداند (`preAdmitOpen` فقط حافظه + ریست URL Owner).
- عکس پرونده بدون پرتره قبلی در پیش‌پذیرش اجباری است (مستقل از `journeyIntroSeen`).

## ۱۴۰۵/۰۸/۲۹ — SaveResponse: ۴۰۳/۴۰۰ خوانا + رفع DbUpdateConcurrency روی answers

- ریشهٔ ۵۰۰ autosave: `RemoveAnswers` بدون `Clear` روی navigation → `DbUpdateConcurrencyException` (ظاهر CORS ثانویه).
- ایجاد draft در یک SaveChanges؛ جایگزینی answers با RemoveRange + Clear.
- Controller: مالکیت → ۴۰۳، دامنه/`answers` null → ۴۰۰ با `{ ok, error }`.
- گارد هم‌خوانی `patientId` با پروندهٔ Owner نشست؛ autosave فرانت سریال + hint خطای API.
- پچ `AddCors` لازم نیست.

## ۱۴۰۵/۰۸/۲۹ — GPS شواهد: نقطهٔ اول روی هر دستگاه پس از چک فاصله

- دکمه «فاصله من تا بیمارستان» همان مختصات را به‌عنوان `distance_btn` به `POST /api/evidence/gps` می‌فرستد (بدون `getCurrentPosition` دوم).
- نقطهٔ اول از تریگر صریح روی دسکتاپ هم ثبت می‌شود؛ watch ده‌دقیقه‌ای (≥۱۰۰ متر) فقط موبایل (`pointer: coarse`).
- نبود `serverPatientId` / مختصات نامعتبر دیگر silent-fail نیست؛ toast خطا برای نقطهٔ اول.

## ۱۴۰۵/۰۸/۲۹ — OTP عضو قرارداد + soft-admit + بنر معرفی بیمارستان

- پس از import/ثبت تکی در قرارداد، موبایل عضو برای `RequestOtp` واجد است (بدون Admit اجباری ادمین).
- در Verify/SelectIdentity، `EnsureAdmittedFromMemberAsync` پرونده Owner را idempotent می‌سازد؛ دکمه Admit ادمین اختیاری می‌ماند.
- گیت Owner: هویت/دموگرافیک + عکس اجباری؛ پرسشنامه پیش‌پذیرش اختیاری (CTA).
- بنر پنل از `hospitalIntroStatus` + `Clinic.Name` (معرفی‌نشده / موبایل متفاوت با `IntroducedMobile`).
- قیف: ورود موفق Owner → `OnboardingStage.LoggedIn`.

## ۱۴۰۵/۰۸/۲۹ — پاکسازی copy «داده در مرورگر» + حذف ریست mock ادمین

- پیام‌های UI/README که ادعا می‌کردند دادهٔ کلینیک فقط در مرورگر/`localStorage` است با واقعیت سرور (MSSQL + `persist/uploads`) هم‌تراز شدند.
- بنر و دکمهٔ «بازگردانی داده نمایشی» (`RESET_MOCK_DATA`) از پنل staff ادمین کلینیک حذف شد؛ ریست دمو فقط از ریست فکتوری پلتفرم (غیر-prod) یا re-seed سرور.
- UC-ADM-14 و ماتریس تست به ریست سرور به‌روز شدند؛ مسیر legacy QR/کیوسک همچنان mock است ولی copy گمراه‌کننده ندارد.

## ۱۴۰۴/۰۸/۳۰ — توقف دانلود تامنیل تقلب در bootstrap + پیجینگ استاندارد لیست‌ها

- `hydrateFraudForPlatform` فقط متادیتای نشست را می‌گیرد؛ دانلود `/api/files` فقط وقتی UI تقلب/vault فریم را نشان می‌دهد (لود تنبل).
- bootstrap دوم Orchestrator حذف شد تا hydrate دوبل نشود.
- `GET /api/files/{storageKey}` با گیت نقش/مالکیت: فریم تقلب فقط Platform؛ مدارک/پرتره Owner یا Platform.
- قرارداد مشترک `PagedResultDto` + `page`/`pageSize` ∈ {۱۰،۲۰،۵۰،۱۰۰}؛ `GET …/members` صفحه‌ای (یا `all=true` برای SMS یک قرارداد).
- `fetchClinicContracts` دیگر N+1 اعضا نمی‌زند؛ اعضا فقط برای قرارداد انتخاب‌شده لود می‌شوند.
- کامپوننت `ListPager` روی قیف/نوبت قرارداد، `PatientTable`، و فهرست کاربران پلتفرم.

## ۱۴۰۵/۰۸/۲۹ — پیامک دعوت فردی و گروهی از قیف (UC-ADM-06)

- در تب «پیگیری پیش‌ثبت‌نام»: دکمهٔ «پیامک» روی هر ردیف + ارسال گروهی برای انتخاب‌شده‌ها/فیلتر.
- فقط قالب کاوه‌نگار (`InviteTemplate` با نام + لینک دعوت)؛ textarea متن آزاد از UI حذف شد.
- `SEND_CONTRACT_BULK_SMS` به `POST /api/contracts/{id}/sms` وصل شد؛ `SmsInviteCount` / `LastSmsAt` در DTO عضو برای badge قیف.

## ۱۴۰۵/۰۸/۲۹ — مشاهده جزئیات قانون فعال قرارداد (UC-ADM-05)

- در تب بسته‌های سلامت، کارت‌های «قوانین فعال در این قرارداد» کلیک‌پذیر شدند.
- مودال فقط‌خواندنی: معیارها، بسته/ایستگاه‌ها، توضیح کتابخانه (در صورت `libraryRuleId`)، و فهرست افراد متصل با فیلتر نام/کدملی.
- جدا کردن قانون (detach) همچنان از آیکون سطل روی کارت؛ مودال mutate ندارد.

## ۱۴۰۵/۰۸/۲۹ — تامنیل خزانه + قفل Storage روی persist هاست

- UI خزانه (UC-PLT-14): گرید تامنیل + lightbox بزرگ‌نمایی از `GET /api/files/{storageKey}` با Bearer.
- `Storage__Root=/app/wwwroot/uploads` در `docker-compose` (`environment`) قفل شد تا حتی `.env` قدیمی فایل را داخل لایهٔ image ننویسد؛ triage در `server-deploy.md`.

## ۱۴۰۵/۰۸/۲۹ — خزانه فایل سلسله‌مراتبی + حذف ادمین کل (UC-PLT-14)

- مسیر دیسک آپلود: `yyyy/NNN/...` با سه رقم اول کدملی؛ ریشهٔ پایدار `Storage__Root=/app/wwwroot/uploads` ↔ `server/persist/uploads`.
- `DeletedAt` روی مدرک/عکس؛ soft مخفی از لیست عادی؛ hard با `IFileStorage.DeleteAsync`.
- endpointهای vault فقط `Platform`؛ ادمین کلینیک Forbidden؛ UI «خزانه فایل» با select-all/none.

## ۱۴۰۵/۰۸/۲۹ — ماتریس نقش Platform⊇Admin کلینیک

- قانون `.cursorrules` §0.3: سوئیچ UI ≠ JWT؛ هر Admin دامنهٔ کلینیک باید Platform هم بپذیرد.
- Contracts / Patients search+phone / Forms Admin+resolve هم‌تراز با Platform؛ گارد `hasApiRole` در execute فرانت.
- smoke: Platform روی import بدون 403؛ Owner همچنان Forbidden.

## ۱۴۰۵/۰۸/۲۹ — هویت نام‌دار در بازبینی fraud و GPS پلتفرم

- `FraudSessionDto` نام Person + UserId/PackageId را برمی‌گرداند؛ UI دیگر «بیمار {hash Guid}» نشان نمی‌دهد.
- `PlatformUserDto.LinkedPatientId` از `OwnerUserId`؛ hydrate فرانت `gpsHistory`/`lastGps` را برای Owner پر می‌کند.
- `GpsPointDto` شامل UserId و نام Person برای UC-PLT-09.

## ۱۴۰۵/۰۸/۲۹ — ضدتقلب: بازه ۷ث از تنظیمات ادمین + رفع ارسال فریم

- پیش‌فرض `fraudAutoCaptureSeconds` = ۷؛ ادمین کل ۲–۱۵ را در UC-PLT-02 ذخیره می‌کند (`PUT /api/platform/settings`).
- Owner بازه/فلگ را از `GET /api/evidence/fraud/config` می‌گیرد؛ تایمر از باز شدن دوربین و بدون block شدن پشت GPS.
- `fraudWatch` سمت سرور در `StartFraudSession` enforce می‌شود؛ hydrate و دانلود فریم‌های پلتفرم برای کلیدهای با `/` اصلاح شد.

## ۱۴۰۵/۰۸/۲۹ — GPS شواهد: دو تریگر + آستانه ۱۰۰ متر

- تریگر شروع شواهد روی موبایل: دکمه «فاصله من تا بیمارستان» (`distance_btn`) **و** باز شدن نقشه آدرس منزل (`map_open`).
- آستانه جابه‌جایی watch از ۲۰۰ متر به **۱۰۰ متر**؛ هر ۱۰ دقیقه؛ نشست دوم روی همان پرونده نقطهٔ اول تکراری نمی‌فرستد.
- فاصله خودرو همچنان OSRM؛ پیاده تقریبی؛ مسیریاب بعد از موفقیت فاصله فعال می‌شود.
- فلگ `gpsTracking` برای شواهد الزامی است؛ UI فاصله بدون شواهد وقتی فلگ خاموش است مجاز است.

## ۱۴۰۵/۰۸/۲۹ — Platform می‌تواند members قرارداد را بخواند

- `GET /api/contracts/{id}/members` نقش `Platform` را مثل List می‌پذیرد؛ گارد Forbid ناظر با Get هم‌تراز شد.
- hydrate workspace ادمین کل دیگر در کنسول 403 members نمی‌دهد.

## ۱۴۰۵/۰۸/۲۹ — seed idempotent (ناظر DEMO-ORG)

- `EnsurePersonAsync` برای هویت بدون NID با `Mobile + NationalId==null` پیدا می‌کند؛ دیگر هر استارت Person جدید نمی‌سازد.
- ناظر قرارداد دمو روی `ContractId` upsert می‌شود (ایندکس یکتای ۱:۱)؛ crash استارت API و ظاهر CORS برطرف شد.
- smoke دوباره‌اجرای `SeedAsync` در `Nabz.Api.Tests`.

## ۱۴۰۵/۰۸/۲۹ — قفل CORS و triage ظاهرِ CORS

- `FrontendUrls__My` / `FrontendUrls__News` واقعاً به سیاست CORS در API وصل شدند (دیگر «آینده» نیستند).
- قانون triage در `.cursorrules` §0.2: پیام مرورگر CORS قبل از پچ باید با `OPTIONS` بررسی شود؛ ۵۰۲ edge ≠ باگ origin.
- smoke `OPTIONS` با Origin فرانت در `Nabz.Api.Tests` تا حذف `UseCors` قبل از publish بشکند.

## ۱۴۰۵/۰۸/۳۰ — فاصله بیمارستان فقط با دکمه و GPS

- در کارت intro/داشبورد، فاصله و مسیریابی دیگر خودکار نیست؛ کاربر باید «فاصله من تا بیمارستان» را بزند، GPS بدهد، سپس مسیریابی فعال شود.

## ۱۴۰۵/۰۸/۳۰ — ضدتقلب API + GPS موبایل + کارت بیمارستان در intro

- وایربندی START/CAPTURE/END_FRAUD_CAMERA_SESSION و RECORD_USER_GPS به Evidence API از مسیر زنده؛ فریم از باز شدن دوربین؛ `fraud_confirm` هنگام تأیید پرتره؛ `package.EndedAt` فقط در پایان نشست.
- GPS شواهد روی موبایل: شروع با باز شدن نقشه آدرس؛ سپس هر ۱۰ دقیقه اگر ≥۲۰۰ متر جابه‌جا شده بود (map_open / watch).
- کلینیک: فیلدهای `Address` / `Latitude` / `Longitude` + `PUT /api/clinics/current` (Admin/Platform)؛ صفحه `clinic-settings`.
- `JourneyIntro` و داشبورد Owner: نام بیمارستان، فاصله OSM و دکمه مسیریابی (بدون گیت قرارداد).
- hydrate نشست‌های fraud برای Platform؛ گیت `package-library-rules` فقط Admin/Platform.

## ۱۴۰۵/۰۸/۲۹ — Person منبع واحد هویت + یک مایگریشن Initial

- موجودیت `Person` کلید هویت است (نام، کدملی، موبایل، تولد، جنسیت)؛ `User` / `Patient` / `ContractMember` / `ContractSupervisor` فقط `PersonId` دارند.
- OTP کاندیداها و ویرایش ادمین روی همان `Person` می‌نویسند/می‌خوانند — دیگر نام جدا روی User و Patient تکرار نمی‌شود.
- موبایل روی `Person` همچنان غیریکتاست (چند هویت روی یک شماره)؛ کدملی غیرخالی یکتاست.
- یکتایی عضو در قرارداد: `(ContractId, PersonId)` + گارد سرویس روی کدملی؛ ویرایش عضو لینک‌شده به پرونده `PersonId` را عوض نمی‌کند.
- زنجیرهٔ مایگریشن فقط **یک** `Initial` است (شامل `Persons`)؛ DB حذف‌شده سرور با استارت API → `MigrateAsync` + `AppDataSeeder` (ساختار + دادهٔ دمو + کاتالوگ فرم).
- بندهای قدیمی‌تر این changelog که هنوز `User.Mobile` / `Patient.Phone` / `(ContractId, NationalId)` می‌گویند، وضعیت قبل از Person هستند.

## ۱۴۰۵/۰۸/۲۹ — ریست فکتوری ادمین کل + تجمیع مایگریشن

- UC-PLT-13: `POST api/platform/factory-reset/request-otp` و `…/confirm` — تأیید OTP (Purpose=`FactoryReset`) حتی در Production؛ سپس `EnsureDeleted`+`Migrate`، `IFileStorage.ClearAll`، و `IAppDataSeeder`.
- زنجیرهٔ قدیمی حذف و **یک** `Initial` از مدل فعلی بازتولید شد (شامل `OtpChallenge.Purpose`)؛ DB خام فقط همین را می‌گیرد.
- seed از `Program.cs` به `AppDataSeeder` منتقل شد؛ startup و ریست فکتوری همان مسیر را صدا می‌زنند.
- UI: منطقه خطر در `platform-settings` پنل ادمین کل.

## ۱۴۰۵/۰۸/۲۹ — پاکسازی NID یتیم دمو روی موبایل مشترک OTP

- `AppDataSeeder` / seed دامنه: بیمار/عضو/کاربر با NID قدیمی `0012345678` روی `09123458910` (قبل از هم‌ترازی checksum به `0012345679`) unlink و حذف می‌شود تا کاندیدای شبح در `otp/select` نماند.
- اسناد حساب‌های seed: مالک `0012345679`؛ عضو admit `0011223340` (هم‌تراز `AppDataSeeder`).
- Auth/`BuildCandidatesAsync` تغییر نکرد؛ دو هویت عمدی روی موبایل مشترک (مریم + علی `0012345687`) حفظ است.

## ۱۴۰۵/۰۸/۲۹ — ویرایش/حذف عضو قرارداد + گیت پذیرش در قوانین بسته

- ادمین می‌تواند عضو قرارداد را ویرایش یا حذف کند (`PUT/DELETE /api/contracts/members/{id}`)؛ حذف لینک Patient را قطع می‌کند بدون پاک کردن پرونده.
- ذخیره/اتصال/جداسازی قوانین بسته فقط اعضای قبل از پذیرش را بازمحاسبه می‌کند؛ پذیرش‌شده‌ها تا override دستی در نوبت‌دهی بسته را نگه می‌دارند (`recalculated` / `needsManual`).
- عنوان پیش‌فرض `FULL_CHECKUP` فارسی «چکاپ جامع»؛ مایگریشن backfill روی عناوین برابر کد.
- خروجی اکسل لیست اعضا از قیف/نوبت با موبایل، کدملی و وضعیت.
- UC-ADM-04b در `docs/processes/use-cases/03-admin.md`.

## ۱۴۰۵/۰۸/۲۹ — کتابخانه مرکزی قوانین (CRUD + آمار + صفحه ادمین)

- API واقعی `PackageLibraryRules` (CRUD/جستجو) + attach/detach روی قرارداد با حفظ `LibraryRuleId`.
- آمار هر قانون: متصل و فعال / قبلاً استفاده‌کرده / تعداد قرارداد متصل.
- صفحهٔ سایدبار ادمین `rule-library`؛ ویرایش و جستجو (شامل کد) در hub قرارداد و صفحهٔ اختصاصی.
- UC-ADM-05b در `docs/processes/use-cases/03-admin.md`.

## ۱۴۰۵/۰۸/۲۹ — `publish.bat`: بستن پنجره فقط بعد از موفقیت

- خطا یا تست ناموفق → پنجره باز می‌ماند (`pause`) تا پیام خوانده شود.
- مسیر موفق → خلاصه + URLها + دستور compose؛ ۲۰ثانیه صبر؛ کلید دیگر = بستن زودتر؛ **Esc = باز بماند** برای کار با نتیجه.

## ۱۴۰۵/۰۸/۲۹ — مقدمهٔ مسیر روی سرور (`JourneyIntroSeen`)

- ستون `Patients.JourneyIntroSeen` + `POST /api/patients/mine/journey-intro-seen`؛ dismiss intro دیگر در مرورگر persist نمی‌شود.
- hydrate Owner از `mine/intake-snapshot` فیلد را می‌خواند؛ تکمیل intake هم intro را دیده‌شده می‌کند (Map و backfill مایگریشن).
- اصل ماندگاری: وضعیت دامنه فقط سرور؛ مرورگر فقط optimistic کوتاه تا مایلستون API.

## ۱۴۰۵/۰۸/۲۹ — هم‌ترازی گزینه‌های تأهل با کاتالوگ فرم

- گزینه‌های ثبت تکی/گروهی قرارداد و پروفایل با کاتالوگ یکی شد: `مجرد` / `متأهل` / `ازدواج‌کرده` / `سایر`.
- import اکسل: نرمال‌سازی املا (`متاهل`، `ازدواج کرده`)؛ `مطلقه`/`بیوه` (legacy) → `ازدواج‌کرده` تا سوالات مشروط متأهل باز بمانند؛ ناشناخته → null بدون رد ردیف.
- شرط نمایش متأهل همچنان فقط `{متأهل، ازدواج‌کرده}` است؛ `سایر` آن شاخه را باز نمی‌کند.
- نرمال‌سازی در خواندن: visibility (`ResolveMarital`)، hydrate پروفایل، `buildContext`، Map DTO؛ PATCH پروفایل فقط ۴ مقدار کانونیکال (+ نگاشت legacy).
- مایگریشن `NormalizeLegacyMaritalStatus`: backfill `Patients` / `ContractMembers` / `FormAnswers` برای `مطلقه`/`بیوه` → `ازدواج‌کرده`.

## ۱۴۰۵/۰۸/۲۹ — پروفایل Owner (دموگرافیک/آدرس/عکس) + سوابق از→به

- `PUT /api/patients/mine/profile` و `PUT /api/patients/{id}/profile` برای نام، تولد، تاهل، آدرس/لوکیشن/کدپستی؛ موبایل Owner از پروفایل قابل‌تغییر نیست.
- موجودیت `PatientProfileRevision`؛ مشاهدهٔ Admin/Platform از `GET …/profile-revisions`.
- `PUT …/home` و submit فرم و عکس Portrait هم revision می‌نویسند؛ draft BASE پس از ذخیره پروفایل همگام می‌شود.
- FE: `IranDigitField` برای sanitize پیست؛ دیالوگ حساب Owner؛ hydrate از `mine/intake-snapshot`؛ wire عکس به Files+Evidence.
- UC-OWN-13 در `docs/processes/use-cases/01-owner.md`.

## ۱۴۰۵/۰۸/۲۹ — محدودیت طول هویت + ذخیره موبایل استاندارد ۰۹

- نرمال موبایل در `IranMobile.Normalize` / `normalizeMobile`: `+98` / `0098` / `98…` / `9xxxxxxxxx` → `09xxxxxxxxx` (دیگر ۱۱ رقم آخر اشتباه مثل `8912…` تولید نمی‌شود).
- UI: کدملی حداکثر ۱۰ رقم، موبایل با clamp (بافر پیست `+98`)، کدپستی از قبل ۱۰؛ ذخیره/ارسال با نرمال `09…`.
- `normalizePhone` (OTP) با `normalizeMobile` یکی شد.

## ۱۴۰۵/۰۸/۲۹ — یکتایی کدملی در ادمین + قراردادها در فهرست کاربران

- گارد ادمین: `UserAdminService` روی create/update کدملی را `IsValid` می‌کند؛ ویرایش به NID متعلق به دیگری رد می‌شود؛ create با NID موجود merge می‌کند؛ روی merge موبایل کورکورانه overwrite نمی‌شود.
- staff قدیمی بدون NID روی همان موبایل با create+NID → merge و ست کردن NID (فقط اگر یک ردیف باشد).
- `UnitOfWork`: نقض ایندکس یکتای `NationalId` → `InvalidOperationException` فارسی (Conflict در کنترلر، نه 500).
- ناظر OTP: `EnsureSupervisorUserAsync` اولویت کدملی دارد؛ بدون NID فقط کاربر بدون کدملی یا Supervisor موجود — نه Owner هم‌شماره.
- `GET /api/users` / upsert: فیلد `contracts` (`member` / `supervisor` + `status`)؛ پیش‌فرض فقط Active؛ `?includeInactiveContracts=true` برای Draft/Completed؛ پاسخ upsert همیشه شامل غیرفعال‌ها؛ ادمین کلینیک فقط کلینیک جاری.
- UI: سوییچ «نمایش قراردادهای غیرفعال»؛ برچسب «غیرفعال»؛ سایدبار کدملی + قراردادها.
- نقش ناظر بدون `contractId` رد می‌شود؛ `GET /api/contracts` برای Platform هم باز است.
- Admit: موبایل Owner موجود را overwrite نمی‌کند اگر قبلاً پر باشد.

## ۱۴۰۵/۰۸/۲۹ — API smoke روی MSSQL لوکال (حذف SQLite)

- `Nabz.Api.Tests` دیگر SQLite / `EnsureCreated` ندارد؛ هر factory روی SQL Server لوکال دیتابیس ephemeral می‌سازد و با `MigrateAsync` schema واقعی (ایندکس/FK) را اعمال می‌کند، سپس drop می‌کند.
- پکیج `Microsoft.EntityFrameworkCore.Sqlite` و فلگ `useSqlite` از لایهٔ EF حذف شد.
- قاعده در [`.cursorrules`](../../.cursorrules) §4.1 و [`testing-unit.mdc`](../../.cursor/rules/testing-unit.mdc).

## ۱۴۰۵/۰۸/۲۹ — کپی فقط‌تازه‌تر به `server/`

- همگام‌سازی آرتیفکت به `server/{my,news}/dist`: `robocopy /E /XO` بدون wipe مقصد؛ فقط منبع تازه‌تر overwrite می‌شود.
- `server/api/publish` قبل از `dotnet publish` پاک نمی‌شود؛ فایل‌های اضافی قدیمی می‌مانند.
- rsync ویندوز→لینوکس: `-avu` (`--update`) تا مقصد جدیدتر دست نخورده بماند.
- قانون در [`.cursorrules`](../../.cursorrules) §5 و [`server-deploy.md`](server-deploy.md)؛ قالب‌های `_templates` همچنان refresh می‌شوند؛ `.env` و `persist/` همچنان هرگز overwrite نمی‌شوند.

## ۱۴۰۵/۰۸/۳۰ — قالب پیامک گروهی پلتفرم (UC-PLT-16 / UC-ADM-06)

- موجودیت `SmsCampaignTemplate` + seed (دعوت، رهاکرده، نوبت امروز؛ پرونده الکترونیک غیرفعال تا آماده‌شدن `emr_url`).
- ادمین کل در تنظیمات پایه قالب را ویرایش می‌کند؛ ادمین کلینیک/ناظر فقط انتخاب می‌کنند.
- `POST /api/contracts/{id}/sms` با `templateId`؛ توکن‌ها: `name` / `invite_token` / `invite_url` / `emr_url`.

## ۱۴۰۵/۰۸/۳۰ — سوئیچ نقش فقط برای ادمین کل

- آیتم «تغییر نقش فعال» از منوی حساب کاربری حذف شد؛ سوئیچ نقش فقط از دراپ‌داون سایدبار است و فقط وقتی بیش از یک نقش مجاز باشد دیده می‌شود.
- **هر نقش کاملاً مستقل است**؛ ادمین کلینیک / پزشک / سلامتجو / ناظر فقط همان نقش حساب خود را می‌بینند (بدون سوئیچر).
- فقط **ادمین کل** می‌تواند وارد workspace نقش‌های دیگر شود؛ نقش ذخیره‌شدهٔ غیرمجاز sanitize می‌شود.
- ماتریس دستی: `TC-AUTH-09`؛ تست فرانت: `uc-role-switch.test.ts`.

## ۱۴۰۵/۰۸/۳۰ — مجوز دوربین/GPS و آدرس سکونت دموگرافیک

- عکس پرونده: پنل «تلاش مجدد برای دسترسی» + راهنمای دسکتاپ/موبایل هنگام بلاک دوربین؛ گالری مسیر جایگزین می‌ماند؛ خطای fraud از پیام مجوز دوربین جدا شد.
- GPS در پاپاپ نقشه و داشبورد منزل: همان الگوی راهنما + retry؛ بلاک دائم نیاز به تنظیمات سایت دارد.
- دموگرافیک: فیلد `residence_address` (`*_BASE_residence`) — نقشه/مختصات + پلاک اجباری + واحد/کدپستی اختیاری؛ `province_city` جدا می‌ماند.
- منبع حقیقت منزل: `Patient.HomeLat/Lon/Address/Plaque/Unit/PostalCode`؛ API مالک `PUT /api/patients/{id}/home`؛ sync از جواب فرم روی submit.
- GpsPoint / `RECORD_USER_GPS` همچنان شواهد زمانی ضدتقلب است و آدرس ثابت منزل را عوض نمی‌کند.
- seed فرم: اگر `*_BASE_residence` روی tenant موجود نباشد، ImportPackage دوباره upsert می‌شود.
- follow-up: mock submit هم `Home*` را از residence می‌نویسد؛ `SAVE_FORM_RESPONSE` در orchestrator به API وصل شد؛ پنل GPS بعد از انتخاب نقشه/جستجو پاک می‌شود.

## ۱۴۰۵/۰۸/۳۰ — هویت کدملی، موبایل تکراری، دسترسی پزشکی پزشک‌محور

- کلید هویت بیمار/Owner: کدملی یکتا روی `User` (وقتی پر است) و `(ClinicId, NationalId)` یکتا روی `Patient`؛ موبایل `User` دیگر unique نیست.
- OTP: اگر چند نفر روی یک شماره باشند → نشست pending + انتخاب کدملی (`POST /api/auth/otp/select` با claim `nabz_pending_selection`).
- Admit مالک را با کدملی می‌سازد/لینک می‌کند (نه موبایل).
- ادمین: `PUT /api/patients/{id}/phone` همگام با `User.Mobile` و `ContractMember.Phone`؛ `GET .../intake-status` وضعیت + شرح بدون پاسخ فرم.
- جزئیات پزشکی (`chart`، `GET forms/responses`، مدارک): فقط `Specialist`؛ Owner مسیر خود را حفظ می‌کند.

## ۱۴۰۵/۰۸/۲۹ — کدملی یکتا در قرارداد

- در یک قرارداد کدملی عضو تکراری مجاز نیست: گارد `ImportMembers` (`duplicate`) + ایندکس یکتای `(ContractId, NationalId)` روی `ContractMembers`.
- تکرار همان کدملی در قرارداد دیگر یا فقط در Patient کلینیک همچنان مجاز است (لینک پرونده).

## ۱۴۰۵/۰۸/۲۹ — صفر اکسل، مسیر پیش‌فرض، سلامتجوی تکراری

- اکسل/CSV: ترمیم صفر پیشوند کدملی/موبایل (+ یادداشت)؛ نماد علمی رد. ثبت دستی: Exact بدون pad.
- بدون قانون بسته → همه اعضا `DefaultPackageCode` (مسیر اصلی)؛ قانون فقط pathway دقیق‌تر انتخاب می‌کند.
- Create قرارداد `defaultPackageCode` را ذخیره می‌کند؛ `ContractDto` قوانین و پیش‌فرض را برمی‌گرداند.
- سلامتجوی تکراری (NID در کلینیک): فقط `ContractMember` + `LinkedPatientId`؛ Patient جدید ساخته نمی‌شود؛ نتیجه import می‌تواند `linked` باشد.
- گیت پیش‌پذیرش مالک: `IntakeGate` = `needs_form` | `already_complete`؛ Intake کامل فقط وقتی همهٔ فرم‌های Published مخاطب Submitted باشند.

## ۱۴۰۵/۰۸/۲۹ — هویت شخص + ورود عضو قرارداد (دستی/اکسل)

- ذخیره: `FirstName`/`LastName`/`BirthDate` روی User، Patient، ContractMember؛ سن فقط محاسبه‌ای برای نمایش و قوانین بسته/مخاطب فرم.
- اعتبارسنجی اجباری: نام، نام‌خانوادگی، تولد، کدملی (checksum ایران)، موبایل `09`، جنسیت؛ اختیاری: تاهل، واحد، رده، کد پرسنلی.
- UC-ADM-04: `IMPORT_CONTRACT_MEMBERS` → `POST /api/contracts/{id}/members/import` با جدول پیش‌نمایش/نتیجه ردیف؛ SMS دعوت همچنان از قیف (UC-ADM-06).
- `UPDATE_CONTRACT_SUPERVISOR` → `PUT /api/contracts/{id}/supervisor` با `firstName`/`lastName` (نه fullName تکی).
- پنل پلتفرم: جمع‌آوری نام/نام‌خانوادگی جدا؛ نمایش همچنان `fullName` ترکیبی.
- seed/NIDهای دمو با کدملی معتبر checksum هم‌تراز شدند.
- پس از submit پرسشنامه: `*_BASE_birthDate` / `*_BASE_maritalStatus` روی `Patient` (+ `User.BirthDate` مالک) نوشته می‌شود تا دوگانگی Age/فرم بسته شود.
- بدهی باز (موج D / خارج از این پچ): پذیرش حضوری هنوز سن جمع می‌کند؛ `CHECKIN_NEW_PATIENT` و `SYNC_CONTRACT_FROM_API` و اکثر اکشن‌های نوبت/قانون به API وصل نشده‌اند؛ seed دیتابیس production NID قدیمی نامعتبر را بازنویسی نمی‌کند.

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

- `SeedAsync`: قرارداد `DEMO-ORG` idempotent با ناظر `09123409876`، عضو مالک `0012345678` (لینک بیمار)، عضو admit `0011223344`؛ NID بلاک‌تست `0099887766` فقط مستند است. *(NID فعلی seed: مالک `0012345679`، admit `0011223340` — پاکسازی یتیم در بند هم‌تاریخ «پاکسازی NID یتیم».)*
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
