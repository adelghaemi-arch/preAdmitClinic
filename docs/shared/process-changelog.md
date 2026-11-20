/*
 File: docs/shared/process-changelog.md
 Description: changelog فرایندی با تاریخ شمسی
 Parent Dependencies: .cursorrules §4, server-deploy.md
*/

> **مسیر:** [مستندات — ایندکس](../README.md) › [Shared](README.md) › process-changelog  
> **پدر:** [Shared](README.md)

# Changelog فرایندی

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

## ۱۴۰۵/۰۸/۳۰ — سوئیچ نقش فقط سایدبار + سلسله‌مراتب Admin/Platform

- آیتم «تغییر نقش فعال» از منوی حساب کاربری حذف شد؛ سوئیچ نقش فقط از دراپ‌داون سایدبار است و فقط وقتی بیش از یک نقش مجاز باشد دیده می‌شود.
- **ادمین کلینیک** نمی‌تواند workspace را به **ادمین کل** (`platform`) ببرد؛ نقش ذخیره‌شدهٔ غیرمجاز sanitize می‌شود.
- **ادمین کل** می‌تواند به نقش **ادمین کلینیک** (و سایر نقش‌های قابل‌انتخاب) سوئیچ کند.
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
