/*
 File: docs/shared/unit-test-scenarios.md
 Description: کاتالوگ سناریوهای Unit Test (BE/FE) و API smoke هم‌تراز ۵۳ یوزکیس v1
 Parent Dependencies: docs/processes/use-cases, .cursorrules §4.1, pre-release-test-matrix.md
*/

> **مسیر:** [مستندات — ایندکس](../README.md) › [Shared](README.md) › unit-test-scenarios  
> **پدر:** [Shared](README.md)

# کاتالوگ سناریوهای Unit Test — نسخهٔ ۱

این سند **۱:۱** با یوزکیس‌های v1 در [`../processes/use-cases/`](../processes/use-cases/) نگاشت شده است. برای هر `UC-*` مسیر تست بک‌اند (`*Service` + mock repository)، تست فرانت (Vitest / گیت UI) و در صورت نیاز smoke HTTP ثبت می‌شود.

| سند | نقش | مخاطب |
|-----|------|--------|
| [`pre-release-test-matrix.md`](pre-release-test-matrix.md) | QA قبل‌از‌انتشار | اجرای **دستی** Pass/Fail روی env واقعی |
| **این سند** | CI / توسعه | تست **خودکار** Unit (+ smoke محدود Auth) |

**چرخه اجباری:** [`.cursorrules` §4.1](../../.cursorrules) — Create UC → Document UC → Full Tests. جزئیات نام‌گذاری: [`.cursor/rules/testing-unit.mdc`](../../.cursor/rules/testing-unit.mdc).

**وضعیت:** اسکلت و تست‌های خودکار v1 پیاده‌سازی شده‌اند (`dotnet test` روی `Nabz.Infrastructure.Tests` / `Nabz.Api.Tests`؛ `npm run test:run` فرانت). مسیرهای جدول ممکن است چند UC را در یک فایل گروهی پوشش دهند (مثلاً `uc-own.test.ts`).

**ستون‌ها**

| ستون | معنی |
|------|------|
| `UT-BE-*` | شناسه سناریوی Unit سرویس |
| `UT-FE-*` | شناسه سناریوی Unit فرانت |
| `SMK-API-*` | smoke HTTP (`Nabz.Api.Tests`)； `—` اگر غیرضروری |
| سناریوها | مسیر اصلی + جایگزین/استثنا (`Na` / `Nx`) از سند نقش |

**مرجع یوزکیس:** [`00-actors-and-system.md`](../processes/use-cases/00-actors-and-system.md)

---

## ۱ — Owner (سلامتجو) — ۱۱ UC

مرجع: [`01-owner.md`](../processes/use-cases/01-owner.md)

| UC-ID | UT-BE | UT-FE | SMK-API | سناریوها | فایل تست بک (expected) | فایل تست فرانت (expected) |
|-------|-------|-------|---------|----------|------------------------|---------------------------|
| UC-OWN-01 | UT-BE-OWN-01 | UT-FE-OWN-01 | SMK-API-OWN-01 | اصلی؛ **2x** شماره ثبت‌نشده؛ **4x** کد غلط/منقضی؛ UI دمو فقط با FixedOtp (`otp/mode`) | `…/Owner/UcOwn01_AuthOtpTests.cs` | `frontend/src/lib/__tests__/uc-own.test.ts` |
| UC-OWN-02 | UT-BE-OWN-02 | UT-FE-OWN-02 | SMK-API-OWN-02 | اصلی (snapshot وضعیت ثبت/پیش‌پذیرش) | `…/Owner/UcOwn02_IntakeSnapshotTests.cs` | `frontend/src/lib/__tests__/uc-own.test.ts` |
| UC-OWN-03 | UT-BE-OWN-03 | UT-FE-OWN-03 | — | اصلی؛ **2x** زیر ageMin؛ **2a** بدون draft→prefill؛ hydrate سرور بر prefill؛ **3x** غیر-self؛ فیلتر تاهل/سن≥۵۰ | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn03_04_FormResponseTests.cs` (+ ADM-19 evaluator) | `frontend/src/lib/__tests__/uc-form-engine.test.ts`؛ `frontend/src/lib/__tests__/uc-own-03-hydrate.test.ts` |
| UC-OWN-04 | UT-BE-OWN-04 | UT-FE-OWN-04 | — | اصلی؛ **3x** شکست اعتبارسنجی submit | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn04_FormSubmitTests.cs` | `frontend/src/lib/__tests__/uc-own.test.ts` |
| UC-OWN-05 | UT-BE-OWN-05 | UT-FE-OWN-05 | — | اصلی؛ گالری بدون capture + زوم/layout؛ **2a** هم‌زمان ضدتقلب (UC-OWN-09)؛ hydrate قبل از photo gate؛ حفظ adjust با تغییر fraudWatch | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn05_PatientPhotoTests.cs` | `frontend/src/lib/__tests__/uc-own-05-portrait-gallery.test.tsx`؛ `frontend/src/lib/__tests__/uc-own-05-photo-gate-hydrate.test.tsx` |
| UC-OWN-06 | UT-BE-OWN-06 | UT-FE-OWN-06 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn06_IntakeDocGroupTests.cs` | `frontend/src/lib/__tests__/uc-own.test.ts` |
| UC-OWN-07 | UT-BE-OWN-07 | UT-FE-OWN-07 | — | اصلی؛ **1x** سقف فایل | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn07_IntakeDocFilesTests.cs` | `frontend/src/lib/__tests__/uc-own.test.ts` |
| UC-OWN-08 | UT-BE-OWN-08 | UT-FE-OWN-08 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn08_RemoveIntakeDocTests.cs` | `frontend/src/lib/__tests__/uc-own.test.ts` |
| UC-OWN-09 | UT-BE-OWN-09 | UT-FE-OWN-09 | SMK-API-OWN-09 | اصلی + پوشش NBZ1 / blob الزامی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn05_11_EvidenceAndSessionTests.cs` · `Security/FraudFrameWireCodecTests.cs` | `frontend/src/lib/__tests__/uc-own-09-fraud-wire.test.ts` |
| UC-OWN-10 | UT-BE-OWN-10 | UT-FE-OWN-10 | — | اصلی RecordGps؛ آستانه/دو تریگر/idempotent در FE | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn05_11_EvidenceAndSessionTests.cs` (`UC_OWN_10_*`) | `frontend/src/lib/__tests__/owner-gps-watch.test.ts` |
| UC-OWN-11 | UT-BE-OWN-11 | UT-FE-OWN-11 | — | اصلی (revoke خود / سایر نشست‌ها) | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn11_RevokeSessionTests.cs` | `frontend/src/lib/__tests__/uc-own.test.ts` |

**Smoke مشترک Owner/SUP:** `backend/tests/Nabz.Api.Tests/Smoke/AuthOtpSmokeTests.cs` (MSSQL لوکال + Migrate + FixedOtp؛ بدون SMS)

---

## ۲ — Specialist (پزشک) — ۶ UC

مرجع: [`02-specialist.md`](../processes/use-cases/02-specialist.md)

| UC-ID | UT-BE | UT-FE | SMK-API | سناریوها | فایل تست بک (expected) | فایل تست فرانت (expected) |
|-------|-------|-------|---------|----------|------------------------|---------------------------|
| UC-SPC-01 | UT-BE-SPC-01 | UT-FE-SPC-01 | — | اصلی؛ **2a** فهرست خالی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Specialist/UcSpc01_PatientListTests.cs` | `frontend/src/lib/__tests__/uc-spc.test.ts` |
| UC-SPC-02 | UT-BE-SPC-02 | UT-FE-SPC-02 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Specialist/UcSpc02_SearchPatientTests.cs` | `frontend/src/lib/__tests__/uc-spc.test.ts` |
| UC-SPC-03 | UT-BE-SPC-03 | UT-FE-SPC-03 | — | اصلی؛ **2a** عدم یافت با کد ملی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Specialist/UcSpc03_NationalIdLookupTests.cs` | `frontend/src/lib/__tests__/uc-spc.test.ts` |
| UC-SPC-04 | UT-BE-SPC-04 | UT-FE-SPC-04 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Specialist/UcSpc04_OpenChartTests.cs` | `frontend/src/lib/__tests__/uc-spc.test.ts` |
| UC-SPC-05 | UT-BE-SPC-05 | UT-FE-SPC-05 | — | اصلی؛ **2a** پیش‌پذیرش هنوز submitted نیست | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Specialist/UcSpc05_IntakeResponsesTests.cs` | `frontend/src/lib/__tests__/uc-spc.test.ts` |
| UC-SPC-06 | UT-BE-SPC-06 | UT-FE-SPC-06 | — | اصلی؛ **2a** بدون مدرک/عکس | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Specialist/UcSpc06_IntakeMediaTests.cs` | `frontend/src/lib/__tests__/uc-spc.test.ts` |

---

## ۳ — Admin (ادمین کلینیک)

مرجع: [`03-admin.md`](../processes/use-cases/03-admin.md)

| UC-ID | UT-BE | UT-FE | SMK-API | سناریوها | فایل تست بک (expected) | فایل تست فرانت (expected) |
|-------|-------|-------|---------|----------|------------------------|---------------------------|
| UC-ADM-01 | UT-BE-ADM-01 | UT-FE-ADM-01 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm01_CreateContractTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-22 | UT-BE-ADM-22 | UT-FE-ADM-22 | — | اصلی؛ **1x** عنوان کوتاه؛ **2x** قرارداد ناموجود | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm01_08_ContractTests.cs` | `frontend/src/lib/__tests__/uc-adm-22.update-contract.test.ts` |
| UC-ADM-02 | UT-BE-ADM-02 | UT-FE-ADM-02 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm02_ContractSupervisorTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-03 | UT-BE-ADM-03 | UT-FE-ADM-03 | — | اصلی؛ **2x** خطای منبع sync | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm03_ContractApiSyncTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-04 | UT-BE-ADM-04 | UT-FE-ADM-04 | — | اصلی؛ **2a** تکراری؛ نام پدر/بازدید؛ گروه=کد مسیر؛ مپ هدر FE | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm01_08_ContractTests.cs` | `frontend/src/lib/__tests__/uc-adm-04.excel-header-map.test.ts` |
| UC-ADM-04b | UT-BE-ADM-04b | UT-FE-ADM-04b | — | حذف قبل از پیش‌پذیرش؛ **2y** رد پس از لینک/پذیرش | `…/Admin/UcAdm01_08_ContractTests.cs` | `frontend/src/lib/__tests__/uc-adm-04b.member-delete-guard.test.ts` |
| UC-ADM-05 | UT-BE-ADM-05 | UT-FE-ADM-05 | — | اصلی؛ اولویت؛ پیش‌فرض؛ override matched؛ recheck preview/apply؛ reorder FE | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm01_08_ContractTests.cs` (مسیر سلامتی) | `frontend/src/lib/__tests__/uc-adm-05.pathway-buckets.test.ts` |
| UC-ADM-05b | UT-BE-ADM-05b | UT-FE-ADM-05b | — | کتابخانه مسیر؛ attach/stats/delete گارد | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm05b_PathwayLibraryRuleTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-06 | UT-BE-ADM-06 | UT-FE-ADM-06 | — | اصلی (دعوت گروهی؛ FixedOtp بدون SMS) | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm06_BulkInviteSmsTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-07 | UT-BE-ADM-07 | UT-FE-ADM-07 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm07_OnboardingFunnelTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-08 | UT-BE-ADM-08 | UT-FE-ADM-08 | — | اصلی؛ **2x** داده عضو ناقص | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm08_AdmitMemberTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-09 | UT-BE-ADM-09 | UT-FE-ADM-09 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm09_UpsertFormTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-10 | UT-BE-ADM-10 | UT-FE-ADM-10 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm10_PublishFormTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-11 | UT-BE-ADM-11 | UT-FE-ADM-11 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm11_ReorderFormItemsTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-12 | UT-BE-ADM-12 | UT-FE-ADM-12 | — | اصلی؛ draft→FormDraft؛ submit→FormSubmitted | `…/Admin/UcAdm12_14_MonitorAndResetTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts`؛ `uc-adm-12-form-progress.test.ts` |
| UC-ADM-13 | UT-BE-ADM-13 | UT-FE-ADM-13 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm13_ChartStatusTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-14 | UT-BE-ADM-14 | UT-FE-ADM-14 | — | اصلی (ریست فکتوری سرور؛ قفل prod؛ نه ریست مرورگر) | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm14_ResetMockDataTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-15 | UT-BE-ADM-15 | UT-FE-ADM-15 | — | اصلی؛ **2x** پنهان‌سازی کاربر platform | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm15_ListClinicUsersTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-16 | UT-BE-ADM-16 | UT-FE-ADM-16 | — | اصلی؛ **1x** انتصاب platform رد؛ **1y** ویرایش platform یافت‌نشد؛ Admin بدون سوئیچ به هیچ نقش دیگر (فقط Platform سوئیچ دارد) | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm16_UpsertClinicUserTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` · `uc-role-switch.test.ts` |
| UC-ADM-17 | UT-BE-ADM-17 | UT-FE-ADM-17 | — | اصلی؛ **1x** هدف platform | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm17_SetUserActiveTests.cs` | `frontend/src/lib/__tests__/uc-adm.test.ts` |
| UC-ADM-18 | UT-BE-ADM-18 | UT-FE-ADM-18 | SMK-API-ADM-18 | اصلی round-trip؛ **1x** بسته خالی؛ **3x** gender نامعتبر | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm18_FormPackageIoTests.cs` | `frontend/src/lib/__tests__/uc-adm-18.form-package.test.ts` |
| UC-ADM-19 | UT-BE-ADM-19 | UT-FE-ADM-19 | — | اصلی import کاتالوگ CA؛ evaluator gender همه / marital / age | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm19_FormMatrixCatalogTests.cs` | `frontend/src/lib/__tests__/uc-form-engine.test.ts` |
| UC-ADM-21 | UT-BE-ADM-21 | — | — | ماسک secret؛ اعتبارسنجی طوبی | `…/Admin/UcAdm21_ClinicSmsSettingsTests.cs` | — |
| UC-ADM-23 | UT-BE-ADM-23 | UT-FE-ADM-23 | — | AppTemplate/Direct/ProviderTemplate؛ تست با None+`provider`؛ **1x** بدون Provider؛ **3x** mismatch حالت؛ **7x** مغایرت provider | `…/Admin/UcAdm23_ClinicSmsTestTests.cs` | `frontend/src/lib/__tests__/uc-adm-23.sms-test-gates.test.ts` |

---

## ۴ — Supervisor (ناظر سازمان) — ۵ UC

مرجع: [`04-supervisor.md`](../processes/use-cases/04-supervisor.md)

| UC-ID | UT-BE | UT-FE | SMK-API | سناریوها | فایل تست بک (expected) | فایل تست فرانت (expected) |
|-------|-------|-------|---------|----------|------------------------|---------------------------|
| UC-SUP-01 | UT-BE-SUP-01 | UT-FE-SUP-01 | SMK-API-SUP-01 | اصلی؛ **1x** شماره غیرناظر | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Supervisor/UcSup01_AuthOtpTests.cs` | `frontend/src/lib/__tests__/uc-sup-01.auth-otp.test.ts` |
| UC-SUP-02 | UT-BE-SUP-02 | UT-FE-SUP-02 | — | اصلی؛ **2x** اکشن کلینیکی ممنوع | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Supervisor/UcSup02_MonitorDashboardTests.cs` | `frontend/src/lib/__tests__/uc-sup.test.ts` |
| UC-SUP-03 | UT-BE-SUP-03 | UT-FE-SUP-03 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Supervisor/UcSup03_MemberRosterTests.cs` | `frontend/src/lib/__tests__/uc-sup.test.ts` |
| UC-SUP-04 | UT-BE-SUP-04 | UT-FE-SUP-04 | — | اصلی؛ **2x** قرارداد دیگر → 403 | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Supervisor/UcSup04_BulkReminderSmsTests.cs` | `frontend/src/lib/__tests__/uc-sup.test.ts` |
| UC-SUP-05 | UT-BE-SUP-05 | UT-FE-SUP-05 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Supervisor/UcSup05_SignOutTests.cs` | `frontend/src/lib/__tests__/uc-sup.test.ts` |

---

## ۵ — Platform (ادمین کل) — ۱۵ UC

مرجع: [`05-platform.md`](../processes/use-cases/05-platform.md)

ورود OTP ادمین کل (`09133752696`) در UC-PLT-15 و smoke مشترک پوشش داده می‌شود؛ ردیف‌های زیر با auth/نشست مرتبط `SMK-API` دارند.

| UC-ID | UT-BE | UT-FE | SMK-API | سناریوها | فایل تست بک (expected) | فایل تست فرانت (expected) |
|-------|-------|-------|---------|----------|------------------------|---------------------------|
| UC-PLT-01 | UT-BE-PLT-01 | UT-FE-PLT-01 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt01_ClinicStatusTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-02 | UT-BE-PLT-02 | UT-FE-PLT-02 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt02_PlatformSettingsTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-03 | UT-BE-PLT-03 | UT-FE-PLT-03 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt03_OsmLocalTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-04 | UT-BE-PLT-04 | UT-FE-PLT-04 | SMK-API-PLT-04 | اصلی؛ **1x** نقش نامعتبر؛ سوئیچ workspace به admin برای Platform مجاز | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt04_UpsertUserTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` · `uc-role-switch.test.ts` |
| UC-PLT-05 | UT-BE-PLT-05 | UT-FE-PLT-05 | SMK-API-PLT-05 | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt05_SetUserActiveTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-06 | UT-BE-PLT-06 | UT-FE-PLT-06 | SMK-API-PLT-06 | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt06_ResetUserAccessTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-07 | UT-BE-PLT-07 | UT-FE-PLT-07 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt07_ReviewFraudSessionTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-08 | UT-BE-PLT-08 | UT-FE-PLT-08 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt08_ReviewMultiSessionTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-09 | UT-BE-PLT-09 | UT-FE-PLT-09 | — | اصلی؛ **2a** GPS ثبت‌نشده | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt09_GpsEvidenceTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-10 | UT-BE-PLT-10 | UT-FE-PLT-10 | SMK-API-PLT-10 | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt10_RevokeSessionsTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-11 | UT-BE-PLT-11 | UT-FE-PLT-11 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt11_AuditTrailTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-12 | UT-BE-PLT-12 | UT-FE-PLT-12 | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt12_TechHealthTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-13 | UT-BE-PLT-13 | — | — | اصلی | `backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt13_FactoryResetTests.cs` | — |
| UC-PLT-14 | UT-BE-PLT-14 | UT-FE-PLT-14 | — | خزانه فایل | `…/Platform/UcPlt14_FileVaultTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-15 | UT-BE-PLT-15 | UT-FE-PLT-15 | SMK-API-PLT-15 | FixedOtp+1؛ **3a** پایه خام رد؛ اولویت روی Patient هم‌شماره | `…/Platform/UcPlt15_PlatformAuthOtpTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-16 | UT-BE-PLT-16 | UT-FE-PLT-16 | — | قالب پیامک گروهی | `…/Platform/` (در صورت وجود) | `frontend/src/lib/__tests__/uc-plt.test.ts` |
| UC-PLT-17 | UT-BE-PLT-17 | UT-FE-PLT-17 | SMK-API-PLT-17 | soft ۴۲۹؛ hard تعلیق+SMS؛ Platform معاف؛ FixedOtp بدون SMS؛ burst مشروع بدون hard | `…/Platform/UcPlt17_ApiAbuseGuardTests.cs` | `frontend/src/lib/__tests__/uc-plt.test.ts` |

**Smoke مشترک Platform:** `backend/tests/Nabz.Api.Tests/Smoke/AuthOtpSmokeTests.cs` — `PlatformAdmin_Login_HasPlatformRole` (ورود `09133752696` با FixedOtp+1 + `GET /api/auth/me`؛ هم‌تراز TC-AUTH-06 / UC-PLT-15)

---

## خلاصه پوشش

| نقش | تعداد UC | SMK-API |
|-----|----------|---------|
| Owner | 11 | UC-OWN-01، UC-OWN-02 |
| Specialist | 6 | — |
| Admin | 19 | — |
| Supervisor | 5 | UC-SUP-01 |
| Platform | 15 | UC-PLT-04، 05، 06، 10، 15 (`AuthOtpSmokeTests`) |
| **جمع** | **56** | |

---

**مرتبط:** [ماتریس تست دستی](pre-release-test-matrix.md) · [process-changelog](process-changelog.md) · [فرایندها](../processes/README.md) · **[مستندات — ایندکس](../README.md)**