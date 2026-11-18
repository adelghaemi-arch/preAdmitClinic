/* Auto-generated mock dataset. No database or secrets involved. */
import type {
  MockAlertRow,
  MockLinkRow,
  MockNoteRow,
  MockPatientRow,
  MockPathwayRow,
  MockResultRow,
  MockRoomRow,
  MockStaffRow,
  MockStationRow,
  MockUserRow,
} from "@/types/clinic";

export interface MockDataset {
  appUsers: MockUserRow[];
  rooms: MockRoomRow[];
  pathways: MockPathwayRow[];
  staff: MockStaffRow[];
  patients: MockPatientRow[];
  stations: MockStationRow[];
  notes: MockNoteRow[];
  results: MockResultRow[];
  links: MockLinkRow[];
  alerts: MockAlertRow[];
}

export const MOCK_DATASET: MockDataset = {
  "appUsers": [
    {
      "id": 1,
      "username": "admin",
      "fullName": "دکتر فرهاد سعیدی",
      "jobTitle": "مدیر ارشد و راهبر کلینیک",
      "primaryRole": "admin",
      "medicalCouncilCode": "۶۵۱۰۲",
      "canAccessAllRoles": true,
      "isActive": true,
      "lastLoginAt": "2026-11-12T20:35:27.517"
    },
    {
      "id": 2,
      "username": "reception",
      "fullName": "نگار رستگار",
      "jobTitle": "مسئول پذیرش و هماهنگ‌کننده جریان بیمار",
      "primaryRole": "reception",
      "medicalCouncilCode": "RC-100",
      "canAccessAllRoles": true,
      "isActive": true,
      "lastLoginAt": "2026-11-12T20:06:32.78"
    },
    {
      "id": 3,
      "username": "doctor",
      "fullName": "دکتر سارا فرهمند",
      "jobTitle": "فوق‌تخصص ریه و مجاری تنفسی",
      "primaryRole": "specialist",
      "medicalCouncilCode": "۹۱۵۴۰",
      "canAccessAllRoles": true,
      "isActive": true,
      "lastLoginAt": null
    },
    {
      "id": 4,
      "username": "maryam",
      "fullName": "مریم‌السادات تابش",
      "jobTitle": "بیمار",
      "primaryRole": "owner",
      "medicalCouncilCode": "—",
      "canAccessAllRoles": true,
      "isActive": true,
      "lastLoginAt": "2026-11-13T07:38:05.386"
    },
    {
      "id": 5,
      "username": "elham",
      "fullName": "الهام شریفی‌نژاد",
      "jobTitle": "بیمار",
      "primaryRole": "owner",
      "medicalCouncilCode": "—",
      "canAccessAllRoles": true,
      "isActive": true,
      "lastLoginAt": "2026-11-13T08:27:28.093"
    },
    {
      "id": 6,
      "username": "ali-tabesh",
      "fullName": "علی تابش",
      "jobTitle": "همراه بیمار",
      "primaryRole": "companion",
      "medicalCouncilCode": "—",
      "canAccessAllRoles": true,
      "isActive": true,
      "lastLoginAt": "2026-11-13T07:38:07.147"
    }
  ],
  "rooms": [
    {
      "id": 1,
      "code": "LAB",
      "name": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "floor": 1,
      "roomNumber": "۱۰۲",
      "specialistName": "دکتر مینو حسینی (مسئول فنی)",
      "specialtyTitle": "پاتولوژی و آزمایشگاه بالینی",
      "prepInstructions": "لطفاً پیش از خون‌گیری ۱۰ تا ۱۲ ساعت ناشتا باشید (نوشیدن آب ساده بلامانع است). آستین لباس خود را آزاد بگذارید و در صورت سابقه سرگیجه هنگام خون‌گیری به نمونه‌گیر اطلاع دهید.",
      "wayfindingSteps": "طبقه ۱ (همکف) ← از میز پذیرش مرکزی ۲۰ متر به سمت راست حرکت کنید ← راهرو الف ← اتاق ۱۰۲.",
      "mapX": 300,
      "mapY": 110,
      "avgServiceMinutes": 14
    },
    {
      "id": 2,
      "code": "ECG",
      "name": "نوار قلب (ECG)",
      "category": "paraclinic",
      "floor": 2,
      "roomNumber": "۲۰۴",
      "specialistName": "پریسا نادری (اپراتور ارشد قلب)",
      "specialtyTitle": "تست‌های تشخیصی غیرتهاجمی قلب",
      "prepInstructions": "پیش از ورود به اتاق نوار قلب، کلیه اشیای فلزی، ساعت هوشمند، کلید، کمربند و تلفن همراه را خارج کنید و ۵ دقیقه روی صندلی سالن استراحت نمایید تا ضربان قلب پایه ثبت شود.",
      "wayfindingSteps": "با آسانسور مرکزی به طبقه ۲ بروید ← پس از خروج از آسانسور به سمت چپ بپیچید ← دومین درب سمت راست، اتاق ۲۰۴.",
      "mapX": 115,
      "mapY": 85,
      "avgServiceMinutes": 12
    },
    {
      "id": 3,
      "code": "CARDIO",
      "name": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "floor": 2,
      "roomNumber": "۲۰۱",
      "specialistName": "دکتر کیانوش راد",
      "specialtyTitle": "متخصص قلب و عروق و اکوکاردیوگرافی",
      "prepInstructions": "پیش از ورود ۵ دقیقه در آرامش بنشینید تا سنجش فشار خون دقیق باشد. نیازی به پرینت کاغذی نوار قلب نیست؛ تصویر نوار قلب و آزمایش خون در مانیتور پزشک بارگذاری شده است.",
      "wayfindingSteps": "طبقه ۲ ← روبه‌روی لابی آسانسور و ایستگاه پرستاری ← اتاق ۲۰۱.",
      "mapX": 215,
      "mapY": 75,
      "avgServiceMinutes": 22
    },
    {
      "id": 4,
      "code": "PULMO",
      "name": "مطب فوق‌تخصصی ریه",
      "category": "specialist",
      "floor": 2,
      "roomNumber": "۲۰۶",
      "specialistName": "دکتر سارا فرهمند",
      "specialtyTitle": "فوق‌تخصص بیماری‌های ریه و مجاری تنفسی",
      "prepInstructions": "لطفاً حداقل ۲ ساعت پیش از معاینه و تست حجم ریه (اسپیرومتری) از مصرف وعده غذایی سنگین یا اسپری تنفسی غیرضروری خودداری فرمایید.",
      "wayfindingSteps": "طبقه ۲ ← پس از خروج از آسانسور به سمت راست (راهرو شرقی) بروید ← انتهای راهرو، اتاق ۲۰۶.",
      "mapX": 325,
      "mapY": 165,
      "avgServiceMinutes": 18
    },
    {
      "id": 5,
      "code": "DENTAL",
      "name": "کلینیک دندانپزشکی",
      "category": "specialist",
      "floor": 3,
      "roomNumber": "۳۰۲",
      "specialistName": "دکتر امیرحسین کاظمی",
      "specialtyTitle": "جراح - دندانپزشک و سلامت دهان",
      "prepInstructions": "پیش از ورود دهان خود را با دهان‌شویه استریل موجود در سالن شست‌وشو دهید. در صورت مصرف داروهای ضدانعقاد خون، پزشک از طریق پرونده هوشمند شما مطلع است.",
      "wayfindingSteps": "با آسانسور مرکزی به طبقه ۳ بروید ← سمت راست لابی طبقه سوم ← اتاق ۳۰۲.",
      "mapX": 295,
      "mapY": 95,
      "avgServiceMinutes": 20
    },
    {
      "id": 6,
      "code": "RADIO",
      "name": "رادیولوژی و تصویربرداری دیجیتال",
      "category": "paraclinic",
      "floor": 3,
      "roomNumber": "۳۰۵",
      "specialistName": "دکتر نازنین بهرامی",
      "specialtyTitle": "متخصص رادیولوژی و تصویربرداری تشخیصی",
      "prepInstructions": "گردنبند، گوشواره، گیره سر و لباس‌های دارای دکمه یا زیپ فلزی را پیش از عکسبرداری قفسه سینه (CXR) یا OPG خارج نمایید. در صورت احتمال بارداری حتماً پیش از ورود اطلاع دهید.",
      "wayfindingSteps": "طبقه ۳ ← سمت چپ آسانسور (راهرو غربی) ← درب محافظ آبی‌رنگ، اتاق ۳۰۵.",
      "mapX": 110,
      "mapY": 165,
      "avgServiceMinutes": 15
    }
  ],
  "pathways": [
    {
      "id": 1,
      "code": "FULL_CHECKUP",
      "title": "چکاپ جامع سلامت یک‌روزه",
      "description": "بررسی کامل آزمایشگاهی، نوار قلب، ویزیت متخصص قلب، فوق‌تخصص ریه و معاینه جامع دندانپزشکی در یک نوبت هماهنگ",
      "stationCodes": [
        "LAB",
        "ECG",
        "CARDIO",
        "PULMO",
        "DENTAL"
      ],
      "estimatedTotalMinutes": 110,
      "isActive": true
    },
    {
      "id": 2,
      "code": "CARDIO_PULMO",
      "title": "پکیج تخصصی قلب و ریه",
      "description": "مناسب پایش تنگی نفس، فشار خون و چربی خون شامل آزمایش خون، نوار قلب و ویزیت مشترک قلب و ریه",
      "stationCodes": [
        "LAB",
        "ECG",
        "CARDIO",
        "PULMO"
      ],
      "estimatedTotalMinutes": 85,
      "isActive": true
    },
    {
      "id": 3,
      "code": "PRE_OP",
      "title": "مشاوره و تاییدیه پیش از جراحی",
      "description": "آزمایش‌های انعقادی و بیوشیمی، نوار قلب، عکس قفسه سینه و تاییدیه نهایی متخصص قلب",
      "stationCodes": [
        "LAB",
        "ECG",
        "RADIO",
        "CARDIO"
      ],
      "estimatedTotalMinutes": 75,
      "isActive": true
    },
    {
      "id": 4,
      "code": "DENTAL_CARDIO",
      "title": "پکیج دندانپزشکی ایمن بیماران قلبی",
      "description": "نوار قلب و ویزیت متخصص قلب پیش از اقدامات دندانپزشکی جهت تنظیم داروهای ضدانعقاد و آنتی‌بیوتیک پروفیلاکسی",
      "stationCodes": [
        "ECG",
        "CARDIO",
        "DENTAL"
      ],
      "estimatedTotalMinutes": 60,
      "isActive": true
    }
  ],
  "staff": [
    {
      "id": 1,
      "fullName": "دکتر کیانوش راد",
      "role": "specialist",
      "specialtyOrDept": "متخصص قلب و عروق",
      "roomCode": "CARDIO",
      "medicalCouncilCode": "۸۴۹۱۲",
      "permissions": [
        "مشاهده شرح حال و آلرژی",
        "مشاهده نتایج پاراکلینیک",
        "ثبت تشخیص و نسخه",
        "ارجاع به ایستگاه جدید"
      ],
      "isActive": true
    },
    {
      "id": 2,
      "fullName": "دکتر سارا فرهمند",
      "role": "specialist",
      "specialtyOrDept": "فوق‌تخصص ریه",
      "roomCode": "PULMO",
      "medicalCouncilCode": "۹۱۵۴۰",
      "permissions": [
        "مشاهده شرح حال و آلرژی",
        "مشاهده نتایج پاراکلینیک",
        "مشاهده نظر سایر متخصصین",
        "ثبت تشخیص و نسخه",
        "ارجاع به ایستگاه جدید"
      ],
      "isActive": true
    },
    {
      "id": 3,
      "fullName": "دکتر امیرحسین کاظمی",
      "role": "specialist",
      "specialtyOrDept": "جراح و دندانپزشک",
      "roomCode": "DENTAL",
      "medicalCouncilCode": "۱۰۴۳۲۰",
      "permissions": [
        "مشاهده شرح حال و آلرژی",
        "مشاهده نظر متخصص قلب",
        "ثبت تشخیص و نسخه",
        "ارجاع به رادیولوژی (OPG)"
      ],
      "isActive": true
    },
    {
      "id": 4,
      "fullName": "دکتر نازنین بهرامی",
      "role": "specialist",
      "specialtyOrDept": "متخصص رادیولوژی",
      "roomCode": "RADIO",
      "medicalCouncilCode": "۹۸۷۱۱",
      "permissions": [
        "مشاهده شرح حال و آلرژی",
        "آپلود گزارش تصویربرداری",
        "ثبت تشخیص رادیولوژی"
      ],
      "isActive": true
    },
    {
      "id": 5,
      "fullName": "علیرضا محمدی",
      "role": "paraclinic",
      "specialtyOrDept": "اپراتور آزمایشگاه تشخیص طبی",
      "roomCode": "LAB",
      "medicalCouncilCode": "LB-102",
      "permissions": [
        "مدیریت صف آزمایشگاه",
        "ثبت نمونه‌گیری",
        "آپلود جواب آزمایش"
      ],
      "isActive": true
    },
    {
      "id": 6,
      "fullName": "پریسا نادری",
      "role": "paraclinic",
      "specialtyOrDept": "اپراتور ارشد نوار قلب (ECG)",
      "roomCode": "ECG",
      "medicalCouncilCode": "EC-204",
      "permissions": [
        "مدیریت صف نوار قلب",
        "ثبت انجام تست",
        "آپلود تصویر نوار قلب"
      ],
      "isActive": true
    },
    {
      "id": 7,
      "fullName": "نگار رستگار",
      "role": "reception",
      "specialtyOrDept": "مسئول پذیرش و هماهنگ‌کننده جریان بیمار",
      "roomCode": null,
      "medicalCouncilCode": "RC-100",
      "permissions": [
        "پذیرش و صدور QR",
        "مدیریت پویا صف‌ها",
        "ارسال فراخوان و پیامک"
      ],
      "isActive": true
    },
    {
      "id": 8,
      "fullName": "دکتر فرهاد سعیدی",
      "role": "admin",
      "specialtyOrDept": "مدیریت ارشد و راهبر کلینیک",
      "roomCode": null,
      "medicalCouncilCode": "۶۵۱۰۲",
      "permissions": [
        "داشبورد گلوگاه‌های زمانی",
        "مدیریت پکیج‌ها",
        "مدیریت نقشه و طبقات",
        "مدیریت دسترسی کادر درمان"
      ],
      "isActive": true
    }
  ],
  "patients": [
    {
      "id": 1,
      "qrToken": "NBZ-1404-401",
      "fullName": "مریم‌السادات تابش",
      "nationalId": "0078451299",
      "age": 46,
      "gender": "زن",
      "phone": "09123458910",
      "pathwayTitle": "چکاپ جامع سلامت یک‌روزه",
      "checkInTime": "2026-11-12T19:19:17.662",
      "completedAt": null,
      "intakeCompleted": true,
      "medications": [
        {
          "id": "m1",
          "name": "لووتیروکسین سدیم (Levothyroxine)",
          "dosage": "۱۰۰ میکروگرم",
          "timing": "هر روز صبح ناشتا",
          "boxImage": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22320%22%20height%3D%22170%22%20viewBox%3D%220%200%20320%20170%22%3E%0A%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22170%22%20rx%3D%2216%22%20fill%3D%22%23F8FAFC%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2216%22%20y%3D%2216%22%20width%3D%22288%22%20height%3D%2236%22%20rx%3D%228%22%20fill%3D%22%230284C7%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%2240%22%20text-anchor%3D%22middle%22%20fill%3D%22%23FFFFFF%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20font-weight%3D%22bold%22%3E%D8%AF%D8%A7%D8%B1%D9%88%D8%AE%D8%A7%D9%86%D9%87%20%DA%A9%D9%84%DB%8C%D9%86%DB%8C%DA%A9%20%E2%80%94%20%D8%A7%D8%B3%DA%A9%D9%86%20%D8%AC%D8%B9%D8%A8%D9%87%20%D8%AF%D8%A7%D8%B1%D9%88%3C%2Ftext%3E%0A%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%2266%22%20width%3D%22280%22%20height%3D%2284%22%20rx%3D%2210%22%20fill%3D%22%23FFFFFF%22%20stroke%3D%22%23E2E8F0%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22100%22%20text-anchor%3D%22middle%22%20fill%3D%22%230F172A%22%20font-family%3D%22sans-serif%22%20font-size%3D%2217%22%20font-weight%3D%22bold%22%3ELevothyroxine%20100%20mcg%3C%2Ftext%3E%0A%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22128%22%20text-anchor%3D%22middle%22%20fill%3D%22%230369A1%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%3E%D8%B1%D9%88%D8%B2%DB%8C%20%DB%8C%DA%A9%20%D8%B9%D8%AF%D8%AF%20%D8%B5%D8%A8%D8%AD%20%D9%86%D8%A7%D8%B4%D8%AA%D8%A7%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E"
        },
        {
          "id": "m2",
          "name": "آملودیپین (Amlodipine)",
          "dosage": "۵ میلی‌گرم",
          "timing": "شب‌ها ساعت ۲۱",
          "boxImage": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22320%22%20height%3D%22170%22%20viewBox%3D%220%200%20320%20170%22%3E%0A%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22170%22%20rx%3D%2216%22%20fill%3D%22%23F8FAFC%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2216%22%20y%3D%2216%22%20width%3D%22288%22%20height%3D%2236%22%20rx%3D%228%22%20fill%3D%22%230D9488%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%2240%22%20text-anchor%3D%22middle%22%20fill%3D%22%23FFFFFF%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20font-weight%3D%22bold%22%3E%D8%AF%D8%A7%D8%B1%D9%88%D8%AE%D8%A7%D9%86%D9%87%20%DA%A9%D9%84%DB%8C%D9%86%DB%8C%DA%A9%20%E2%80%94%20%D8%A7%D8%B3%DA%A9%D9%86%20%D8%AC%D8%B9%D8%A8%D9%87%20%D8%AF%D8%A7%D8%B1%D9%88%3C%2Ftext%3E%0A%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%2266%22%20width%3D%22280%22%20height%3D%2284%22%20rx%3D%2210%22%20fill%3D%22%23FFFFFF%22%20stroke%3D%22%23E2E8F0%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22100%22%20text-anchor%3D%22middle%22%20fill%3D%22%230F172A%22%20font-family%3D%22sans-serif%22%20font-size%3D%2217%22%20font-weight%3D%22bold%22%3EAmlodipine%205%20mg%3C%2Ftext%3E%0A%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22128%22%20text-anchor%3D%22middle%22%20fill%3D%22%230369A1%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%3E%D8%B4%D8%A8%E2%80%8C%D9%87%D8%A7%20%DB%8C%DA%A9%20%D8%B9%D8%AF%D8%AF%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E"
        }
      ],
      "surgeries": [
        {
          "id": "s1",
          "type": "جراحی لاپاراسکوپی کیسه صفرا (کوله‌سیستکتومی)",
          "notes": "بدون عارضه پس از عمل، بستری ۲ روزه در بیمارستان بهمن",
          "approxDate": "پاییز ۱۳۹۹"
        }
      ],
      "familyHistory": [
        {
          "id": "f1",
          "relation": "مادر",
          "condition": "فشار خون بالا"
        },
        {
          "id": "f2",
          "relation": "پدر",
          "condition": "دیابت نوع ۲"
        }
      ],
      "allergies": [
        {
          "id": "a1",
          "category": "دارویی",
          "reaction": "کهیر پوستی شدید و تنگی نفس (آنافیلاکسی خفیف)",
          "severity": "شدید",
          "substance": "پنی‌سیلین و آنتی‌بیوتیک‌های بتالاکتام"
        },
        {
          "id": "a2",
          "category": "دارویی",
          "reaction": "برافروختگی و خارش عمومی",
          "severity": "متوسط",
          "substance": "ماده حاجب یددار تزریقی"
        }
      ],
      "recentConditions": [
        {
          "id": "seed-recent-401",
          "when": "دو هفته پیش",
          "notes": "با داروی خوراکی بهبود یافت؛ سرفه خشک گهگاهی باقی مانده است.",
          "title": "عفونت تنفسی خفیف"
        }
      ],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "دیشب ساعت ۲۱",
        "chestPain": "بله",
        "supplements": "امگا ۳ روزانه",
        "fastingStatus": "بله",
        "breathlessness": "بله",
        "dentalBleeding": "خیر",
        "diabetesStatus": "مرزی / نمی‌دانم",
        "currentSymptoms": "احساس سنگینی خفیف قفسه سینه هنگام بالا رفتن از پله طی دو هفته اخیر",
        "pregnancyStatus": "",
        "anticoagulantUse": "خیر",
        "medicationChanges": "آملودیپین از هفته گذشته طبق دستور پزشک قبلی شروع شده است."
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    },
    {
      "id": 2,
      "qrToken": "NBZ-1404-402",
      "fullName": "مهندس بهرام شمس",
      "nationalId": "0051239876",
      "age": 58,
      "gender": "مرد",
      "phone": "09121147852",
      "pathwayTitle": "چکاپ جامع سلامت یک‌روزه",
      "checkInTime": "2026-11-12T18:26:17.662",
      "completedAt": null,
      "intakeCompleted": true,
      "medications": [
        {
          "id": "m10",
          "name": "آتورواستاتین (Atorvastatin)",
          "dosage": "۲۰ میلی‌گرم",
          "timing": "شب‌ها پس از شام",
          "boxImage": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22320%22%20height%3D%22170%22%20viewBox%3D%220%200%20320%20170%22%3E%0A%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22170%22%20rx%3D%2216%22%20fill%3D%22%23F8FAFC%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2216%22%20y%3D%2216%22%20width%3D%22288%22%20height%3D%2236%22%20rx%3D%228%22%20fill%3D%22%230369A1%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%2240%22%20text-anchor%3D%22middle%22%20fill%3D%22%23FFFFFF%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20font-weight%3D%22bold%22%3E%D8%AF%D8%A7%D8%B1%D9%88%D8%AE%D8%A7%D9%86%D9%87%20%DA%A9%D9%84%DB%8C%D9%86%DB%8C%DA%A9%20%E2%80%94%20%D8%A7%D8%B3%DA%A9%D9%86%20%D8%AC%D8%B9%D8%A8%D9%87%20%D8%AF%D8%A7%D8%B1%D9%88%3C%2Ftext%3E%0A%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%2266%22%20width%3D%22280%22%20height%3D%2284%22%20rx%3D%2210%22%20fill%3D%22%23FFFFFF%22%20stroke%3D%22%23E2E8F0%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22100%22%20text-anchor%3D%22middle%22%20fill%3D%22%230F172A%22%20font-family%3D%22sans-serif%22%20font-size%3D%2217%22%20font-weight%3D%22bold%22%3EAtorvastatin%2020%20mg%3C%2Ftext%3E%0A%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22128%22%20text-anchor%3D%22middle%22%20fill%3D%22%230369A1%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%3E%D9%82%D8%B1%D8%B5%20%D8%B1%D9%88%DA%A9%D8%B4%E2%80%8C%D8%AF%D8%A7%D8%B1%20%E2%80%94%20%D8%B4%D8%A8%E2%80%8C%D9%87%D8%A7%20%DB%8C%DA%A9%20%D8%B9%D8%AF%D8%AF%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E"
        },
        {
          "id": "m11",
          "name": "متفورمین (Metformin)",
          "dosage": "۵۰۰ میلی‌گرم",
          "timing": "ظهر و شب همراه غذا"
        }
      ],
      "surgeries": [
        {
          "id": "s10",
          "type": "آپاندکتومی کلاسیک",
          "notes": "بهبودی کامل بدون عارضه",
          "approxDate": "سال ۱۳۸۴"
        }
      ],
      "familyHistory": [
        {
          "id": "f10",
          "relation": "پدر",
          "condition": "بیماری عروق کرونر و قلبی"
        },
        {
          "id": "f11",
          "relation": "برادر/خواهر",
          "condition": "فشار خون بالا"
        }
      ],
      "allergies": [
        {
          "id": "a10",
          "category": "دارویی",
          "reaction": "اسپاسم برونش، خس‌خس سینه و تحریک شدید معده",
          "severity": "شدید",
          "substance": "آسپرین و داروهای ضدالتهاب غیراستروئیدی (NSAIDs)"
        }
      ],
      "recentConditions": [
        {
          "id": "seed-recent-402",
          "when": "یک ماه پیش",
          "notes": "پس از مشاهده قند خون مرزی در آزمایش قبلی آغاز شد.",
          "title": "شروع متفورمین"
        }
      ],
      "intakeAnswers": {
        "smoking": "بله",
        "lastMeal": "امروز ساعت ۷ صبح",
        "chestPain": "خیر",
        "supplements": "",
        "fastingStatus": "بله",
        "breathlessness": "بله",
        "dentalBleeding": "خیر",
        "diabetesStatus": "بله",
        "currentSymptoms": "تنگی نفس هنگام فعالیت و احساس خستگی زودرس",
        "pregnancyStatus": "",
        "anticoagulantUse": "خیر",
        "medicationChanges": "متفورمین از ماه گذشته به درمان اضافه شده است."
      },
      "autoOpenWayfinding": true,
      "journeyIntroSeen": true
    },
    {
      "id": 3,
      "qrToken": "NBZ-1404-403",
      "fullName": "محمود رضایی‌پور",
      "nationalId": "1284569039",
      "age": 67,
      "gender": "مرد",
      "phone": "09132265498",
      "pathwayTitle": "چکاپ جامع سلامت یک‌روزه",
      "checkInTime": "2026-11-12T18:39:17.662",
      "completedAt": null,
      "intakeCompleted": true,
      "medications": [
        {
          "id": "m20",
          "name": "لوزارتان (Losartan)",
          "dosage": "۵۰ میلی‌گرم",
          "timing": "صبح و شب"
        }
      ],
      "surgeries": [
        {
          "id": "s20",
          "type": "جراحی آب‌مروارید چشم راست",
          "notes": "عمل سرپایی موفق",
          "approxDate": "بهمن ۱۴۰۱"
        }
      ],
      "familyHistory": [
        {
          "id": "f20",
          "relation": "مادر",
          "condition": "دیابت نوع ۲"
        }
      ],
      "allergies": [
        {
          "id": "a20",
          "category": "دارویی",
          "reaction": "ورم پلک و کهیر",
          "severity": "شدید",
          "substance": "ایبوپروفن و ژلوفن"
        }
      ],
      "recentConditions": [
        {
          "id": "seed-recent-403",
          "when": "سه سال پیش",
          "notes": "بهبودی کامل و بدون محدودیت فعلی.",
          "title": "جراحی آب‌مروارید چشم راست"
        }
      ],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "امروز ساعت ۶ صبح",
        "chestPain": "خیر",
        "supplements": "",
        "fastingStatus": "بله",
        "breathlessness": "بله",
        "dentalBleeding": "بله",
        "diabetesStatus": "بله",
        "currentSymptoms": "گاهی هنگام بالا رفتن از پله نفسم تنگ می‌شود.",
        "pregnancyStatus": "",
        "anticoagulantUse": "خیر",
        "medicationChanges": ""
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    },
    {
      "id": 4,
      "qrToken": "NBZ-1404-404",
      "fullName": "امیرعلی نوریان",
      "nationalId": "0018943217",
      "age": 34,
      "gender": "مرد",
      "phone": "09354128763",
      "pathwayTitle": "پکیج تخصصی قلب و ریه",
      "checkInTime": "2026-11-12T19:50:17.662",
      "completedAt": null,
      "intakeCompleted": false,
      "medications": [],
      "surgeries": [],
      "familyHistory": [
        {
          "id": "f30",
          "relation": "مادر",
          "condition": "آسم و بیماری ریوی"
        }
      ],
      "allergies": [],
      "recentConditions": [
        {
          "id": "seed-recent-404",
          "when": "ماه گذشته",
          "notes": "بدون بستری؛ با درمان سرپایی بهتر شده است.",
          "title": "سرفه خشک فصلی"
        }
      ],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "امروز ساعت ۸ صبح",
        "chestPain": "بله",
        "supplements": "ویتامین D هفتگی",
        "fastingStatus": "خیر",
        "breathlessness": "بله",
        "dentalBleeding": "خیر",
        "diabetesStatus": "مرزی / نمی‌دانم",
        "currentSymptoms": "گاهی تپش قلب و سرفه خشک، به‌خصوص پس از فعالیت",
        "pregnancyStatus": "",
        "anticoagulantUse": "خیر",
        "medicationChanges": ""
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    },
    {
      "id": 5,
      "qrToken": "NBZ-1404-405",
      "fullName": "الهام شریفی‌نژاد",
      "nationalId": "0063217899",
      "age": 51,
      "gender": "زن",
      "phone": "09128873412",
      "pathwayTitle": "چکاپ جامع سلامت یک‌روزه",
      "checkInTime": "2026-11-12T17:36:17.662",
      "completedAt": "2026-11-12T19:53:17.662",
      "intakeCompleted": true,
      "medications": [
        {
          "id": "m50",
          "name": "کلسی‌کر (کلسیم + ویتامین D3)",
          "dosage": "۵۰۰ میلی‌گرم",
          "timing": "روزی یک عدد بعد از ناهار"
        }
      ],
      "surgeries": [],
      "familyHistory": [
        {
          "id": "f50",
          "relation": "پدر",
          "condition": "فشار خون بالا"
        }
      ],
      "allergies": [
        {
          "id": "a50",
          "category": "دارویی",
          "reaction": "راش پوستی ماکولوپاپولر",
          "severity": "متوسط",
          "substance": "سولفونامیدها (کوتریموکسازول)"
        }
      ],
      "recentConditions": [
        {
          "id": "seed-recent-405",
          "when": "سال گذشته",
          "notes": "پس از مصرف کوتریموکسازول راش پوستی ایجاد شد.",
          "title": "حساسیت پوستی به آنتی‌بیوتیک"
        }
      ],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "دیشب ساعت ۲۰",
        "chestPain": "خیر",
        "supplements": "کلسیم و ویتامین D",
        "fastingStatus": "بله",
        "breathlessness": "خیر",
        "dentalBleeding": "بله",
        "diabetesStatus": "خیر",
        "currentSymptoms": "برای چکاپ دوره‌ای مراجعه کرده‌ام و علامت حاد ندارم.",
        "pregnancyStatus": "خیر",
        "anticoagulantUse": "خیر",
        "medicationChanges": ""
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    },
    {
      "id": 11,
      "qrToken": "NBZ-1404-406",
      "fullName": "سارا کریمی",
      "nationalId": "0045932174",
      "age": 29,
      "gender": "زن",
      "phone": "09124578123",
      "pathwayTitle": "پکیج تخصصی قلب و ریه",
      "checkInTime": "2026-11-13T07:39:43.913",
      "completedAt": null,
      "intakeCompleted": false,
      "medications": [
        {
          "id": "x406m1",
          "name": "سرترالین (Sertraline)",
          "dosage": "۵۰ میلی‌گرم",
          "timing": "هر روز صبح"
        }
      ],
      "surgeries": [],
      "familyHistory": [
        {
          "id": "x406f1",
          "relation": "مادر",
          "condition": "فشار خون بالا"
        }
      ],
      "allergies": [],
      "recentConditions": [
        {
          "id": "x406r1",
          "when": "دو ماه اخیر",
          "notes": "تحت درمان دارویی و بدون بستری.",
          "title": "حملات اضطرابی و تپش قلب"
        }
      ],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "امروز ساعت ۷ صبح",
        "chestPain": "بله",
        "supplements": "منیزیم شب‌ها",
        "fastingStatus": "خیر",
        "breathlessness": "بله",
        "dentalBleeding": "خیر",
        "diabetesStatus": "خیر",
        "currentSymptoms": "تپش قلب و احساس فشار قفسه سینه هنگام اضطراب",
        "pregnancyStatus": "خیر",
        "anticoagulantUse": "خیر",
        "medicationChanges": "سرترالین از دو ماه پیش شروع شده است."
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    },
    {
      "id": 12,
      "qrToken": "NBZ-1404-407",
      "fullName": "رضا احمدی",
      "nationalId": "0038741598",
      "age": 63,
      "gender": "مرد",
      "phone": "09131247865",
      "pathwayTitle": "مشاوره و تاییدیه پیش از جراحی",
      "checkInTime": "2026-11-13T06:43:43.913",
      "completedAt": null,
      "intakeCompleted": true,
      "medications": [
        {
          "id": "x407m1",
          "name": "متوپرولول (Metoprolol)",
          "dosage": "۵۰ میلی‌گرم",
          "timing": "صبح و شب"
        },
        {
          "id": "x407m2",
          "name": "آسپرین (Aspirin)",
          "dosage": "۸۰ میلی‌گرم",
          "timing": "هر روز صبح"
        }
      ],
      "surgeries": [
        {
          "id": "x407s1",
          "type": "تعویض مفصل زانو",
          "notes": "توان‌بخشی کامل شد.",
          "approxDate": "سال ۱۴۰۱"
        }
      ],
      "familyHistory": [
        {
          "id": "x407f1",
          "relation": "پدر",
          "condition": "دیابت نوع ۲"
        }
      ],
      "allergies": [
        {
          "id": "x407a1",
          "category": "محیطی",
          "reaction": "خارش و قرمزی پوست",
          "severity": "متوسط",
          "substance": "لاتکس"
        }
      ],
      "recentConditions": [
        {
          "id": "x407r1",
          "when": "همین هفته",
          "notes": "نیازمند تاییدیه قلب و تصویربرداری قفسه سینه.",
          "title": "آمادگی برای جراحی ارتوپدی"
        }
      ],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "دیشب ساعت ۲۱",
        "chestPain": "خیر",
        "supplements": "",
        "fastingStatus": "بله",
        "breathlessness": "خیر",
        "dentalBleeding": "خیر",
        "diabetesStatus": "بله",
        "currentSymptoms": "درد زانو و محدودیت حرکت؛ علامت قلبی حاد ندارم.",
        "pregnancyStatus": "",
        "anticoagulantUse": "بله",
        "medicationChanges": ""
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    },
    {
      "id": 13,
      "qrToken": "NBZ-1404-408",
      "fullName": "نیلوفر مرادی",
      "nationalId": "0062198459",
      "age": 41,
      "gender": "زن",
      "phone": "09374561289",
      "pathwayTitle": "پکیج دندانپزشکی ایمن بیماران قلبی",
      "checkInTime": "2026-11-13T07:30:43.913",
      "completedAt": null,
      "intakeCompleted": true,
      "medications": [
        {
          "id": "x408m1",
          "name": "وارفارین (Warfarin)",
          "dosage": "۵ میلی‌گرم",
          "timing": "هر روز عصر"
        },
        {
          "id": "x408m2",
          "name": "فروس سولفات",
          "dosage": "یک قرص",
          "timing": "یک روز در میان"
        }
      ],
      "surgeries": [],
      "familyHistory": [
        {
          "id": "x408f1",
          "relation": "پدر",
          "condition": "بیماری عروق کرونر و قلبی"
        }
      ],
      "allergies": [
        {
          "id": "x408a1",
          "category": "دارویی",
          "reaction": "کهیر و تورم لب",
          "severity": "شدید",
          "substance": "پنی‌سیلین"
        }
      ],
      "recentConditions": [
        {
          "id": "x408r1",
          "when": "سه روز اخیر",
          "notes": "بدون تب؛ خونریزی هنگام مسواک‌زدن دارد.",
          "title": "درد و تورم لثه"
        }
      ],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "امروز ساعت ۸ صبح",
        "chestPain": "خیر",
        "supplements": "",
        "fastingStatus": "خیر",
        "breathlessness": "خیر",
        "dentalBleeding": "بله",
        "diabetesStatus": "خیر",
        "currentSymptoms": "درد دندان و خونریزی لثه هنگام مسواک‌زدن",
        "pregnancyStatus": "خیر",
        "anticoagulantUse": "بله",
        "medicationChanges": ""
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    },
    {
      "id": 14,
      "qrToken": "NBZ-1404-409",
      "fullName": "حسین ناظری",
      "nationalId": "0014679329",
      "age": 72,
      "gender": "مرد",
      "phone": "09147852361",
      "pathwayTitle": "چکاپ جامع سلامت یک‌روزه",
      "checkInTime": "2026-11-13T06:12:43.913",
      "completedAt": null,
      "intakeCompleted": true,
      "medications": [
        {
          "id": "x409m1",
          "name": "انسولین گلارژین",
          "dosage": "۱۸ واحد",
          "timing": "شب‌ها"
        },
        {
          "id": "x409m2",
          "name": "کلوپیدوگرل (Clopidogrel)",
          "dosage": "۷۵ میلی‌گرم",
          "timing": "هر روز صبح"
        },
        {
          "id": "x409m3",
          "name": "لوزارتان (Losartan)",
          "dosage": "۵۰ میلی‌گرم",
          "timing": "هر روز صبح"
        }
      ],
      "surgeries": [
        {
          "id": "x409s1",
          "type": "جراحی بای‌پس عروق کرونر (CABG)",
          "notes": "پیگیری منظم قلبی دارد.",
          "approxDate": "سال ۱۳۹۷"
        }
      ],
      "familyHistory": [
        {
          "id": "x409f1",
          "relation": "برادر/خواهر",
          "condition": "دیابت نوع ۲"
        }
      ],
      "allergies": [],
      "recentConditions": [
        {
          "id": "x409r1",
          "when": "سه ماه پیش",
          "notes": "دوز انسولین توسط پزشک بازبینی شد.",
          "title": "افزایش HbA1c در آزمایش قبلی"
        }
      ],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "امروز ساعت ۶ صبح",
        "chestPain": "خیر",
        "supplements": "",
        "fastingStatus": "بله",
        "breathlessness": "بله",
        "dentalBleeding": "خیر",
        "diabetesStatus": "بله",
        "currentSymptoms": "خستگی و تنگی نفس خفیف هنگام فعالیت",
        "pregnancyStatus": "",
        "anticoagulantUse": "بله",
        "medicationChanges": "دوز انسولین سه ماه پیش تغییر کرده است."
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    },
    {
      "id": 15,
      "qrToken": "NBZ-1404-410",
      "fullName": "فاطمه رحیمی",
      "nationalId": "0057312486",
      "age": 36,
      "gender": "زن",
      "phone": "09361247859",
      "pathwayTitle": "پکیج تخصصی قلب و ریه",
      "checkInTime": "2026-11-13T07:05:43.913",
      "completedAt": null,
      "intakeCompleted": true,
      "medications": [
        {
          "id": "x410m1",
          "name": "اسپری سالبوتامول",
          "dosage": "۲ پاف",
          "timing": "هنگام تنگی نفس"
        }
      ],
      "surgeries": [],
      "familyHistory": [
        {
          "id": "x410f1",
          "relation": "مادر",
          "condition": "آسم و بیماری ریوی"
        }
      ],
      "allergies": [
        {
          "id": "x410a1",
          "category": "محیطی",
          "reaction": "سرفه و خس‌خس سینه",
          "severity": "متوسط",
          "substance": "گرد و غبار"
        }
      ],
      "recentConditions": [
        {
          "id": "x410r1",
          "when": "هفته گذشته",
          "notes": "اسپری نجات‌بخش بیشتر از معمول استفاده شده است.",
          "title": "تشدید سرفه در هوای سرد"
        }
      ],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "امروز ساعت ۷ صبح",
        "chestPain": "خیر",
        "supplements": "",
        "fastingStatus": "بله",
        "breathlessness": "بله",
        "dentalBleeding": "خیر",
        "diabetesStatus": "خیر",
        "currentSymptoms": "سرفه و تنگی نفس خفیف، بیشتر در هوای سرد",
        "pregnancyStatus": "خیر",
        "anticoagulantUse": "خیر",
        "medicationChanges": ""
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    },
    {
      "id": 16,
      "qrToken": "NBZ-1404-411",
      "fullName": "داریوش اعتمادی",
      "nationalId": "0029864313",
      "age": 55,
      "gender": "مرد",
      "phone": "09125687413",
      "pathwayTitle": "چکاپ جامع سلامت یک‌روزه",
      "checkInTime": "2026-11-13T05:55:43.913",
      "completedAt": null,
      "intakeCompleted": true,
      "medications": [
        {
          "id": "x411m1",
          "name": "آتورواستاتین (Atorvastatin)",
          "dosage": "۲۰ میلی‌گرم",
          "timing": "شب‌ها"
        },
        {
          "id": "x411m2",
          "name": "امپرازول (Omeprazole)",
          "dosage": "۲۰ میلی‌گرم",
          "timing": "صبح ناشتا"
        }
      ],
      "surgeries": [
        {
          "id": "x411s1",
          "type": "آپاندکتومی",
          "notes": "بدون عارضه.",
          "approxDate": "سال ۱۳۸۹"
        }
      ],
      "familyHistory": [
        {
          "id": "x411f1",
          "relation": "پدر",
          "condition": "سکته مغزی"
        }
      ],
      "allergies": [
        {
          "id": "x411a1",
          "category": "دارویی",
          "reaction": "درد معده و کهیر خفیف",
          "severity": "متوسط",
          "substance": "داروهای ضدالتهاب غیراستروئیدی (NSAIDs)"
        }
      ],
      "recentConditions": [
        {
          "id": "x411r1",
          "when": "یک هفته اخیر",
          "notes": "حساسیت به سرما دارد.",
          "title": "درد مبهم دندان"
        }
      ],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "دیشب ساعت ۲۲",
        "chestPain": "خیر",
        "supplements": "",
        "fastingStatus": "بله",
        "breathlessness": "خیر",
        "dentalBleeding": "بله",
        "diabetesStatus": "خیر",
        "currentSymptoms": "چکاپ دوره‌ای و درد مبهم دندان",
        "pregnancyStatus": "",
        "anticoagulantUse": "خیر",
        "medicationChanges": ""
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    },
    {
      "id": 17,
      "qrToken": "NBZ-1404-412",
      "fullName": "لیلا حسینی",
      "nationalId": "0041287691",
      "age": 48,
      "gender": "زن",
      "phone": "09198742365",
      "pathwayTitle": "مشاوره و تاییدیه پیش از جراحی",
      "checkInTime": "2026-11-13T06:53:43.913",
      "completedAt": null,
      "intakeCompleted": false,
      "medications": [
        {
          "id": "x412m1",
          "name": "لووتیروکسین (Levothyroxine)",
          "dosage": "۷۵ میکروگرم",
          "timing": "صبح ناشتا"
        }
      ],
      "surgeries": [],
      "familyHistory": [
        {
          "id": "x412f1",
          "relation": "مادر",
          "condition": "کم‌کاری / پرکاری تیروئید"
        }
      ],
      "allergies": [
        {
          "id": "x412a1",
          "category": "دارویی",
          "reaction": "خارش عمومی و برافروختگی",
          "severity": "شدید",
          "substance": "ماده حاجب یددار"
        }
      ],
      "recentConditions": [
        {
          "id": "x412r1",
          "when": "دو ماه اخیر",
          "notes": "دوز لووتیروکسین هنوز بازبینی نشده است.",
          "title": "خستگی و افزایش وزن"
        }
      ],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "دیشب ساعت ۲۰",
        "chestPain": "خیر",
        "supplements": "آهن یک روز در میان",
        "fastingStatus": "بله",
        "breathlessness": "خیر",
        "dentalBleeding": "خیر",
        "diabetesStatus": "خیر",
        "currentSymptoms": "خستگی و احساس سرمای بیشتر از معمول",
        "pregnancyStatus": "خیر",
        "anticoagulantUse": "خیر",
        "medicationChanges": ""
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    },
    {
      "id": 18,
      "qrToken": "NBZ-1404-413",
      "fullName": "آرمان صادقی",
      "nationalId": "0035196246",
      "age": 26,
      "gender": "مرد",
      "phone": "09358741296",
      "pathwayTitle": "پکیج تخصصی قلب و ریه",
      "checkInTime": "2026-11-13T07:51:43.913",
      "completedAt": null,
      "intakeCompleted": false,
      "medications": [],
      "surgeries": [],
      "familyHistory": [
        {
          "id": "x413f1",
          "relation": "پدر",
          "condition": "فشار خون بالا"
        }
      ],
      "allergies": [],
      "recentConditions": [],
      "intakeAnswers": {
        "smoking": "خیر",
        "lastMeal": "امروز صبح",
        "chestPain": "خیر",
        "supplements": "",
        "fastingStatus": "خیر",
        "breathlessness": "خیر",
        "dentalBleeding": "خیر",
        "diabetesStatus": "خیر",
        "currentSymptoms": "گاهی پس از ورزش سنگین احساس تپش قلب دارم.",
        "pregnancyStatus": "",
        "anticoagulantUse": "خیر",
        "medicationChanges": ""
      },
      "autoOpenWayfinding": false,
      "journeyIntroSeen": false
    }
  ],
  "stations": [
    {
      "id": 1,
      "patientId": 1,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "sample_taken",
      "enteredQueueAt": "2026-11-12T19:21:17.662",
      "checkedInAt": "2026-11-12T19:23:17.662",
      "startedAt": "2026-11-12T19:27:17.662",
      "completedAt": null,
      "spentMinutes": 14,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 2,
      "patientId": 1,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "waiting",
      "enteredQueueAt": "2026-11-12T19:36:17.662",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 8,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 3,
      "patientId": 1,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 3,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 4,
      "patientId": 1,
      "roomCode": "PULMO",
      "roomName": "مطب فوق‌تخصصی ریه",
      "category": "specialist",
      "stepOrder": 4,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 5,
      "patientId": 1,
      "roomCode": "DENTAL",
      "roomName": "کلینیک دندانپزشکی",
      "category": "specialist",
      "stepOrder": 5,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 6,
      "patientId": 2,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "completed",
      "enteredQueueAt": "2026-11-12T18:27:17.662",
      "checkedInAt": "2026-11-12T18:29:17.662",
      "startedAt": "2026-11-12T18:33:17.662",
      "completedAt": "2026-11-12T18:46:17.662",
      "spentMinutes": 16,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 7,
      "patientId": 2,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "completed",
      "enteredQueueAt": "2026-11-12T18:47:17.662",
      "checkedInAt": "2026-11-12T18:50:17.662",
      "startedAt": "2026-11-12T18:53:17.662",
      "completedAt": "2026-11-12T19:03:17.662",
      "spentMinutes": 13,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 8,
      "patientId": 2,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 3,
      "status": "completed",
      "enteredQueueAt": "2026-11-12T19:04:17.662",
      "checkedInAt": "2026-11-12T19:09:17.662",
      "startedAt": "2026-11-12T19:17:17.662",
      "completedAt": "2026-11-12T19:41:17.662",
      "spentMinutes": 32,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 9,
      "patientId": 2,
      "roomCode": "PULMO",
      "roomName": "مطب فوق‌تخصصی ریه",
      "category": "specialist",
      "stepOrder": 4,
      "status": "checked_in",
      "enteredQueueAt": "2026-11-12T19:42:17.662",
      "checkedInAt": "2026-11-12T19:49:17.662",
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 19,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 10,
      "patientId": 2,
      "roomCode": "DENTAL",
      "roomName": "کلینیک دندانپزشکی",
      "category": "specialist",
      "stepOrder": 5,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 11,
      "patientId": 3,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "completed",
      "enteredQueueAt": "2026-11-12T18:41:17.662",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": "2026-11-12T18:57:17.662",
      "spentMinutes": 16,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 12,
      "patientId": 3,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "completed",
      "enteredQueueAt": "2026-11-12T18:58:17.662",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": "2026-11-12T19:12:17.662",
      "spentMinutes": 14,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 13,
      "patientId": 3,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 3,
      "status": "waiting",
      "enteredQueueAt": "2026-11-12T19:27:17.662",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 34,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 14,
      "patientId": 3,
      "roomCode": "DENTAL",
      "roomName": "کلینیک دندانپزشکی",
      "category": "specialist",
      "stepOrder": 4,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 15,
      "patientId": 3,
      "roomCode": "PULMO",
      "roomName": "مطب فوق‌تخصصی ریه",
      "category": "specialist",
      "stepOrder": 5,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 16,
      "patientId": 4,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "waiting",
      "enteredQueueAt": "2026-11-12T19:51:17.662",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 10,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 17,
      "patientId": 4,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 18,
      "patientId": 4,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 3,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 19,
      "patientId": 4,
      "roomCode": "PULMO",
      "roomName": "مطب فوق‌تخصصی ریه",
      "category": "specialist",
      "stepOrder": 4,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 20,
      "patientId": 5,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "completed",
      "enteredQueueAt": "2026-11-12T17:39:17.662",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": "2026-11-12T17:53:17.662",
      "spentMinutes": 14,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 21,
      "patientId": 5,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "completed",
      "enteredQueueAt": "2026-11-12T17:55:17.662",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": "2026-11-12T18:06:17.662",
      "spentMinutes": 11,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 22,
      "patientId": 5,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 3,
      "status": "completed",
      "enteredQueueAt": "2026-11-12T18:08:17.662",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": "2026-11-12T18:37:17.662",
      "spentMinutes": 29,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 23,
      "patientId": 5,
      "roomCode": "PULMO",
      "roomName": "مطب فوق‌تخصصی ریه",
      "category": "specialist",
      "stepOrder": 4,
      "status": "completed",
      "enteredQueueAt": "2026-11-12T18:39:17.662",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": "2026-11-12T19:05:17.662",
      "spentMinutes": 26,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 24,
      "patientId": 5,
      "roomCode": "DENTAL",
      "roomName": "کلینیک دندانپزشکی",
      "category": "specialist",
      "stepOrder": 5,
      "status": "completed",
      "enteredQueueAt": "2026-11-12T19:07:17.662",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": "2026-11-12T19:53:17.662",
      "spentMinutes": 22,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 40,
      "patientId": 11,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "waiting",
      "enteredQueueAt": "2026-11-13T07:41:43.913",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 7,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 41,
      "patientId": 11,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 42,
      "patientId": 11,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 3,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 43,
      "patientId": 11,
      "roomCode": "PULMO",
      "roomName": "مطب فوق‌تخصصی ریه",
      "category": "specialist",
      "stepOrder": 4,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 44,
      "patientId": 12,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "completed",
      "enteredQueueAt": "2026-11-13T06:45:43.913",
      "checkedInAt": "2026-11-13T06:47:43.913",
      "startedAt": "2026-11-13T06:49:43.913",
      "completedAt": "2026-11-13T07:00:43.913",
      "spentMinutes": 15,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 45,
      "patientId": 12,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "completed",
      "enteredQueueAt": "2026-11-13T07:02:43.913",
      "checkedInAt": "2026-11-13T07:04:43.913",
      "startedAt": "2026-11-13T07:06:43.913",
      "completedAt": "2026-11-13T07:14:43.913",
      "spentMinutes": 12,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 46,
      "patientId": 12,
      "roomCode": "RADIO",
      "roomName": "رادیولوژی و تصویربرداری دیجیتال",
      "category": "paraclinic",
      "stepOrder": 3,
      "status": "waiting",
      "enteredQueueAt": "2026-11-13T07:17:43.913",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 18,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 47,
      "patientId": 12,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 4,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 48,
      "patientId": 13,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "checked_in",
      "enteredQueueAt": "2026-11-13T07:33:43.913",
      "checkedInAt": "2026-11-13T07:35:43.913",
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 6,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 49,
      "patientId": 13,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 2,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 50,
      "patientId": 13,
      "roomCode": "DENTAL",
      "roomName": "کلینیک دندانپزشکی",
      "category": "specialist",
      "stepOrder": 3,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 51,
      "patientId": 14,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "completed",
      "enteredQueueAt": "2026-11-13T06:15:43.913",
      "checkedInAt": "2026-11-13T06:17:43.913",
      "startedAt": "2026-11-13T06:19:43.913",
      "completedAt": "2026-11-13T06:32:43.913",
      "spentMinutes": 17,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 52,
      "patientId": 14,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "completed",
      "enteredQueueAt": "2026-11-13T06:35:43.913",
      "checkedInAt": "2026-11-13T06:37:43.913",
      "startedAt": "2026-11-13T06:39:43.913",
      "completedAt": "2026-11-13T06:47:43.913",
      "spentMinutes": 12,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 53,
      "patientId": 14,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 3,
      "status": "in_progress",
      "enteredQueueAt": "2026-11-13T06:51:43.913",
      "checkedInAt": "2026-11-13T06:53:43.913",
      "startedAt": "2026-11-13T06:55:43.913",
      "completedAt": null,
      "spentMinutes": 24,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 54,
      "patientId": 14,
      "roomCode": "PULMO",
      "roomName": "مطب فوق‌تخصصی ریه",
      "category": "specialist",
      "stepOrder": 4,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 55,
      "patientId": 14,
      "roomCode": "DENTAL",
      "roomName": "کلینیک دندانپزشکی",
      "category": "specialist",
      "stepOrder": 5,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 56,
      "patientId": 15,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "sample_taken",
      "enteredQueueAt": "2026-11-13T07:07:43.913",
      "checkedInAt": "2026-11-13T07:09:43.913",
      "startedAt": "2026-11-13T07:11:43.913",
      "completedAt": null,
      "spentMinutes": 13,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 57,
      "patientId": 15,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "waiting",
      "enteredQueueAt": "2026-11-13T07:23:43.913",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 9,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 58,
      "patientId": 15,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 3,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 59,
      "patientId": 15,
      "roomCode": "PULMO",
      "roomName": "مطب فوق‌تخصصی ریه",
      "category": "specialist",
      "stepOrder": 4,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 60,
      "patientId": 16,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "completed",
      "enteredQueueAt": "2026-11-13T05:57:43.913",
      "checkedInAt": "2026-11-13T05:59:43.913",
      "startedAt": "2026-11-13T06:01:43.913",
      "completedAt": "2026-11-13T06:11:43.913",
      "spentMinutes": 14,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 61,
      "patientId": 16,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "completed",
      "enteredQueueAt": "2026-11-13T06:13:43.913",
      "checkedInAt": "2026-11-13T06:15:43.913",
      "startedAt": "2026-11-13T06:17:43.913",
      "completedAt": "2026-11-13T06:24:43.913",
      "spentMinutes": 11,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 62,
      "patientId": 16,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 3,
      "status": "completed",
      "enteredQueueAt": "2026-11-13T06:23:43.913",
      "checkedInAt": "2026-11-13T06:25:43.913",
      "startedAt": "2026-11-13T06:27:43.913",
      "completedAt": "2026-11-13T06:46:43.913",
      "spentMinutes": 23,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 63,
      "patientId": 16,
      "roomCode": "PULMO",
      "roomName": "مطب فوق‌تخصصی ریه",
      "category": "specialist",
      "stepOrder": 4,
      "status": "completed",
      "enteredQueueAt": "2026-11-13T06:49:43.913",
      "checkedInAt": "2026-11-13T06:51:43.913",
      "startedAt": "2026-11-13T06:53:43.913",
      "completedAt": "2026-11-13T07:08:43.913",
      "spentMinutes": 19,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 64,
      "patientId": 16,
      "roomCode": "DENTAL",
      "roomName": "کلینیک دندانپزشکی",
      "category": "specialist",
      "stepOrder": 5,
      "status": "waiting",
      "enteredQueueAt": "2026-11-13T07:13:43.913",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 26,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 65,
      "patientId": 17,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "completed",
      "enteredQueueAt": "2026-11-13T06:55:43.913",
      "checkedInAt": "2026-11-13T06:57:43.913",
      "startedAt": "2026-11-13T06:59:43.913",
      "completedAt": "2026-11-13T07:11:43.913",
      "spentMinutes": 16,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 66,
      "patientId": 17,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "completed",
      "enteredQueueAt": "2026-11-13T07:12:43.913",
      "checkedInAt": "2026-11-13T07:14:43.913",
      "startedAt": "2026-11-13T07:16:43.913",
      "completedAt": "2026-11-13T07:24:43.913",
      "spentMinutes": 12,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 67,
      "patientId": 17,
      "roomCode": "RADIO",
      "roomName": "رادیولوژی و تصویربرداری دیجیتال",
      "category": "paraclinic",
      "stepOrder": 3,
      "status": "in_progress",
      "enteredQueueAt": "2026-11-13T07:27:43.913",
      "checkedInAt": "2026-11-13T07:29:43.913",
      "startedAt": "2026-11-13T07:31:43.913",
      "completedAt": null,
      "spentMinutes": 17,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 68,
      "patientId": 17,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 4,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 69,
      "patientId": 18,
      "roomCode": "LAB",
      "roomName": "آزمایشگاه تشخیص طبی",
      "category": "paraclinic",
      "stepOrder": 1,
      "status": "waiting",
      "enteredQueueAt": "2026-11-13T07:52:43.913",
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 4,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 70,
      "patientId": 18,
      "roomCode": "ECG",
      "roomName": "نوار قلب (ECG)",
      "category": "paraclinic",
      "stepOrder": 2,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 71,
      "patientId": 18,
      "roomCode": "CARDIO",
      "roomName": "مطب تخصصی قلب و عروق",
      "category": "specialist",
      "stepOrder": 3,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    },
    {
      "id": 72,
      "patientId": 18,
      "roomCode": "PULMO",
      "roomName": "مطب فوق‌تخصصی ریه",
      "category": "specialist",
      "stepOrder": 4,
      "status": "pending",
      "enteredQueueAt": null,
      "checkedInAt": null,
      "startedAt": null,
      "completedAt": null,
      "spentMinutes": 0,
      "addedByDoctor": null,
      "queueRank": 0
    }
  ],
  "notes": [
    {
      "id": 1,
      "patientId": 2,
      "stationId": 8,
      "roomCode": "CARDIO",
      "doctorName": "دکتر کیانوش راد",
      "specialty": "متخصص قلب و عروق",
      "chiefComplaint": "احساس خستگی هنگام بالا رفتن از پله و پایش چربی خون",
      "examFindings": "فشار خون بازوی راست: 142/88 mmHg. سمع قلب S1 و S2 منظم، بدون سوفل پاتولوژیک. اکوکاردیوگرافی در مطب انجام شد: EF = 58%، هیپرتروفی خفیف بطن چپ. با توجه به آلرژی شدید بیمار به آسپرین، از تجویز ASA خودداری گردید.",
      "diagnosis": "پرفشاری خون مرحله اول (Stage 1 Hypertension) + دیس‌لیپیدمی؛ عدم شواهد نارسایی قلبی در تنگی نفس کوششی (جهت بررسی ریه به همکار محترم فوق‌تخصص ریه ارجاع شد).",
      "prescriptions": [
        {
          "drug": "قرص والزارتان ۸۰ میلی‌گرم (Valsartan)",
          "dosage": "۸۰ میلی‌گرم",
          "duration": "۳ ماه",
          "instruction": "روزی یک عدد صبح‌ها"
        },
        {
          "drug": "قرص رزوواستاتین ۲۰ میلی‌گرم (Rosuvastatin)",
          "dosage": "۲۰ میلی‌گرم",
          "duration": "۳ ماه",
          "instruction": "شب‌ها یک عدد (جایگزین آتورواستاتین قبلی)"
        }
      ],
      "referralNote": "همکار گرامی سرکار خانم دکتر فرهمند، از نظر قلبی EF بیمار ۵۸٪ و طبیعی است؛ لطفاً تنگی نفس کوششی و سابقه اسپاسم برونش ناشی از NSAID بررسی گردد.",
      "createdAt": "2026-11-12T19:39:17.662"
    },
    {
      "id": 2,
      "patientId": 5,
      "stationId": null,
      "roomCode": "CARDIO",
      "doctorName": "دکتر کیانوش راد",
      "specialty": "متخصص قلب و عروق",
      "chiefComplaint": "چکاپ دوره‌ای سالانه قلب و عروق",
      "examFindings": "فشار خون 118/76 mmHg. سمع قلب و عروق کاروتید طبیعی. نوار قلب کاملاً نرمال.",
      "diagnosis": "سلامت کامل قلبی-عروقی؛ ریسک ۱۰ ساله قلبی پایین.",
      "prescriptions": [
        {
          "drug": "کپسول امگا ۳ (Omega-3 1000mg)",
          "dosage": "۱۰۰۰ میلی‌گرم",
          "duration": "۲ ماه",
          "instruction": "یک روز در میان همراه ناهار"
        }
      ],
      "referralNote": null,
      "createdAt": "2026-11-12T18:37:17.662"
    },
    {
      "id": 3,
      "patientId": 5,
      "stationId": null,
      "roomCode": "PULMO",
      "doctorName": "دکتر سارا فرهمند",
      "specialty": "فوق‌تخصص ریه",
      "chiefComplaint": "ارزیابی سلامت تنفسی در چکاپ سالانه",
      "examFindings": "اشباع اکسیژن خون SpO2 = 98% در هوای اتاق. سمع هر دو ریه شفاف. FEV1/FVC = 84%.",
      "diagnosis": "عملکرد تهویه‌ای ریه کاملاً طبیعی.",
      "prescriptions": [],
      "referralNote": null,
      "createdAt": "2026-11-12T19:05:17.662"
    },
    {
      "id": 4,
      "patientId": 5,
      "stationId": null,
      "roomCode": "DENTAL",
      "doctorName": "دکتر امیرحسین کاظمی",
      "specialty": "جراح و دندانپزشک",
      "chiefComplaint": "معاینه سلامت دهان، لثه و جرم‌گیری پیشگیرانه",
      "examFindings": "پوسیدگی سطحی مینا در دندان مولر اول پایین چپ (شماره ۳۶)؛ التهاب خفیف لثه.",
      "diagnosis": "نیازمند جرم‌گیری اولتراسونیک و ترمیم کامپوزیت دندان ۳۶ در نوبت انتخابی.",
      "prescriptions": [
        {
          "drug": "دهان‌شویه کلرهگزیدین ۰.۱۲٪ (فاقد الکل)",
          "dosage": "۱۵ میلی‌لیتر",
          "duration": "۷ روز",
          "instruction": "شب‌ها پس از مسواک به مدت ۳۰ ثانیه قرقره شود"
        }
      ],
      "referralNote": null,
      "createdAt": "2026-11-12T19:52:17.662"
    },
    {
      "id": 7,
      "patientId": 16,
      "stationId": 62,
      "roomCode": "CARDIO",
      "doctorName": "دکتر کیانوش راد",
      "specialty": "متخصص قلب و عروق",
      "chiefComplaint": "چکاپ قلبی دوره‌ای",
      "examFindings": "فشار خون 124/78 و سمع قلب طبیعی.",
      "diagnosis": "وضعیت قلبی پایدار؛ ادامه درمان فعلی.",
      "prescriptions": [],
      "referralNote": null,
      "createdAt": "2026-11-13T06:45:43.913"
    },
    {
      "id": 8,
      "patientId": 16,
      "stationId": 63,
      "roomCode": "PULMO",
      "doctorName": "دکتر سارا فرهمند",
      "specialty": "فوق‌تخصص ریه",
      "chiefComplaint": "ارزیابی تنفسی چکاپ",
      "examFindings": "SpO2 برابر ۹۸٪ و سمع ریه شفاف.",
      "diagnosis": "عملکرد تنفسی طبیعی.",
      "prescriptions": [],
      "referralNote": null,
      "createdAt": "2026-11-13T07:07:43.913"
    }
  ],
  "results": [
    {
      "id": 1,
      "patientId": 2,
      "stationId": 6,
      "roomCode": "LAB",
      "title": "پانل کامل بیوشیمی، چربی خون و هماتولوژی (CBC, Lipid, HbA1c)",
      "resultType": "lab_panel",
      "operatorName": "علیرضا محمدی",
      "summaryStatus": "نیازمند توجه پزشک",
      "metrics": [
        {
          "unit": "mg/dL",
          "value": "118",
          "abnormal": true,
          "parameter": "قند خون ناشتا (FBS)",
          "normalRange": "70 - 99"
        },
        {
          "unit": "%",
          "value": "6.3",
          "abnormal": true,
          "parameter": "HbA1c",
          "normalRange": "4.0 - 5.6"
        },
        {
          "unit": "mg/dL",
          "value": "158",
          "abnormal": true,
          "parameter": "کلسترول بد (LDL-C)",
          "normalRange": "< 100"
        },
        {
          "unit": "g/dL",
          "value": "14.8",
          "abnormal": false,
          "parameter": "هموگلوبین (Hb)",
          "normalRange": "13.5 - 17.5"
        },
        {
          "unit": "mg/dL",
          "value": "0.95",
          "abnormal": false,
          "parameter": "کراتینین (Cr)",
          "normalRange": "0.7 - 1.3"
        }
      ],
      "interpretation": "افزایش متوسط کلسترول LDL و قند ناشتای مرزی (Prediabetic range). عملکرد کلیوی و شمارش سلولی خون کاملاً طبیعی است.",
      "attachmentUrl": null,
      "fileName": "Lab_Report_Shams_1404.pdf",
      "createdAt": "2026-11-12T19:01:17.662"
    },
    {
      "id": 2,
      "patientId": 2,
      "stationId": 7,
      "roomCode": "ECG",
      "title": "نوار قلب ۱۲ لید در حالت استراحت (Resting 12-Lead ECG)",
      "resultType": "ecg_trace",
      "operatorName": "پریسا نادری",
      "summaryStatus": "نرمال",
      "metrics": [
        {
          "unit": "bpm",
          "value": "74",
          "abnormal": false,
          "parameter": "ضربان قلب (Ventricular Rate)",
          "normalRange": "60 - 100"
        },
        {
          "unit": "ms",
          "value": "164",
          "abnormal": false,
          "parameter": "فاصله PR",
          "normalRange": "120 - 200"
        },
        {
          "unit": "ms",
          "value": "88",
          "abnormal": false,
          "parameter": "کمپلکس QRS",
          "normalRange": "< 120"
        }
      ],
      "interpretation": "ریتم سینوسی منظم (Normal Sinus Rhythm)، محور طبیعی قلب، بدون شواهد ایسکمی حاد یا تغییر قطعه ST.",
      "attachmentUrl": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22760%22%20height%3D%22240%22%20viewBox%3D%220%200%20760%20240%22%3E%0A%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22smallGrid%22%20width%3D%2210%22%20height%3D%2210%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2010%200%20L%200%200%200%2010%22%20fill%3D%22none%22%20stroke%3D%22%23FECDD3%22%20stroke-width%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22grid%22%20width%3D%2250%22%20height%3D%2250%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22url(%23smallGrid)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2050%200%20L%200%200%200%2050%22%20fill%3D%22none%22%20stroke%3D%22%23FDA4AF%22%20stroke-width%3D%221.2%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22%23FFF1F2%22%2F%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22url(%23grid)%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2212%22%20y%3D%2210%22%20width%3D%22736%22%20height%3D%2230%22%20rx%3D%226%22%20fill%3D%22%23FFFFFF%22%20fill-opacity%3D%220.92%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%2230%22%20fill%3D%22%230F172A%22%20font-family%3D%22monospace%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E12-LEAD%20ECG%20%7C%20HR%3A%2074%20bpm%20%7C%2025mm%2Fs%2010mm%2FmV%20%7C%20Normal%20Sinus%20Rhythm%20-%20No%20ST%20Elevation%3C%2Ftext%3E%0A%20%20%20%20%3Ctext%20x%3D%22734%22%20y%3D%2230%22%20text-anchor%3D%22end%22%20fill%3D%22%23334155%22%20font-family%3D%22sans-serif%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E%D9%85%D9%87%D9%86%D8%AF%D8%B3%20%D8%A8%D9%87%D8%B1%D8%A7%D9%85%20%D8%B4%D9%85%D8%B3%3C%2Ftext%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2015%20145%20L%2055%20145%20Q%2065%20133%2075%20145%20L%2088%20145%20L%2094%20156%20L%20102%2072%20L%20110%20175%20L%20118%20145%20L%20138%20145%20Q%20154%20122%20170%20145%20L%20215%20145%20Q%20225%20133%20235%20145%20L%20248%20145%20L%20254%20156%20L%20262%2068%20L%20270%20176%20L%20278%20145%20L%20298%20145%20Q%20314%20122%20330%20145%20L%20375%20145%20Q%20385%20133%20395%20145%20L%20408%20145%20L%20414%20156%20L%20422%2074%20L%20430%20174%20L%20438%20145%20L%20458%20145%20Q%20474%20122%20490%20145%20L%20535%20145%20Q%20545%20133%20555%20145%20L%20568%20145%20L%20574%20156%20L%20582%2070%20L%20590%20176%20L%20598%20145%20L%20618%20145%20Q%20634%20122%20650%20145%20L%20700%20145%20Q%20710%20133%20720%20145%20L%20745%20145%22%0A%20%20%20%20%20%20fill%3D%22none%22%20stroke%3D%22%230F172A%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%22222%22%20fill%3D%22%23be123c%22%20font-family%3D%22monospace%22%20font-size%3D%2211%22%3ELead%20II%20Rhythm%20Strip%20%E2%80%94%20PR%3A%20162ms%20%7C%20QRS%3A%2088ms%20%7C%20QTc%3A%20412ms%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E",
      "fileName": "ECG_12Lead_Shams.svg",
      "createdAt": "2026-11-12T19:03:17.662"
    },
    {
      "id": 3,
      "patientId": 3,
      "stationId": null,
      "roomCode": "ECG",
      "title": "نوار قلب ۱۲ لید — محمود رضایی‌پور",
      "resultType": "ecg_trace",
      "operatorName": "پریسا نادری",
      "summaryStatus": "نیازمند توجه پزشک",
      "metrics": [
        {
          "unit": "bpm",
          "value": "84",
          "abnormal": false,
          "parameter": "ضربان قلب",
          "normalRange": "60 - 100"
        },
        {
          "unit": "deg",
          "value": "-25°",
          "abnormal": true,
          "parameter": "محور الکتریکی",
          "normalRange": "-30° to +90°"
        }
      ],
      "interpretation": "ریتم سینوسی همراه انحراف خفیف محور به چپ؛ توصیه به تطبیق بالینی.",
      "attachmentUrl": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22760%22%20height%3D%22240%22%20viewBox%3D%220%200%20760%20240%22%3E%0A%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22smallGrid%22%20width%3D%2210%22%20height%3D%2210%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2010%200%20L%200%200%200%2010%22%20fill%3D%22none%22%20stroke%3D%22%23FECDD3%22%20stroke-width%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22grid%22%20width%3D%2250%22%20height%3D%2250%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22url(%23smallGrid)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2050%200%20L%200%200%200%2050%22%20fill%3D%22none%22%20stroke%3D%22%23FDA4AF%22%20stroke-width%3D%221.2%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22%23FFF1F2%22%2F%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22url(%23grid)%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2212%22%20y%3D%2210%22%20width%3D%22736%22%20height%3D%2230%22%20rx%3D%226%22%20fill%3D%22%23FFFFFF%22%20fill-opacity%3D%220.92%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%2230%22%20fill%3D%22%230F172A%22%20font-family%3D%22monospace%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E12-LEAD%20ECG%20%7C%20HR%3A%2084%20bpm%20%7C%2025mm%2Fs%2010mm%2FmV%20%7C%20Sinus%20Rhythm%20-%20Mild%20Left%20Axis%3C%2Ftext%3E%0A%20%20%20%20%3Ctext%20x%3D%22734%22%20y%3D%2230%22%20text-anchor%3D%22end%22%20fill%3D%22%23334155%22%20font-family%3D%22sans-serif%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E%D9%85%D8%AD%D9%85%D9%88%D8%AF%20%D8%B1%D8%B6%D8%A7%DB%8C%DB%8C%E2%80%8C%D9%BE%D9%88%D8%B1%3C%2Ftext%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2015%20145%20L%2055%20145%20Q%2065%20133%2075%20145%20L%2088%20145%20L%2094%20156%20L%20102%2072%20L%20110%20175%20L%20118%20145%20L%20138%20145%20Q%20154%20122%20170%20145%20L%20215%20145%20Q%20225%20133%20235%20145%20L%20248%20145%20L%20254%20156%20L%20262%2068%20L%20270%20176%20L%20278%20145%20L%20298%20145%20Q%20314%20122%20330%20145%20L%20375%20145%20Q%20385%20133%20395%20145%20L%20408%20145%20L%20414%20156%20L%20422%2074%20L%20430%20174%20L%20438%20145%20L%20458%20145%20Q%20474%20122%20490%20145%20L%20535%20145%20Q%20545%20133%20555%20145%20L%20568%20145%20L%20574%20156%20L%20582%2070%20L%20590%20176%20L%20598%20145%20L%20618%20145%20Q%20634%20122%20650%20145%20L%20700%20145%20Q%20710%20133%20720%20145%20L%20745%20145%22%0A%20%20%20%20%20%20fill%3D%22none%22%20stroke%3D%22%230F172A%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%22222%22%20fill%3D%22%23be123c%22%20font-family%3D%22monospace%22%20font-size%3D%2211%22%3ELead%20II%20Rhythm%20Strip%20%E2%80%94%20PR%3A%20162ms%20%7C%20QRS%3A%2088ms%20%7C%20QTc%3A%20412ms%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E",
      "fileName": "ECG_Rezaei.svg",
      "createdAt": "2026-11-12T19:12:17.662"
    },
    {
      "id": 4,
      "patientId": 5,
      "stationId": null,
      "roomCode": "LAB",
      "title": "چکاپ کامل بیوشیمی، تیروئید و ویتامین D3",
      "resultType": "lab_panel",
      "operatorName": "علیرضا محمدی",
      "summaryStatus": "نرمال",
      "metrics": [
        {
          "unit": "mg/dL",
          "value": "91",
          "abnormal": false,
          "parameter": "قند خون ناشتا (FBS)",
          "normalRange": "70 - 99"
        },
        {
          "unit": "mg/dL",
          "value": "176",
          "abnormal": false,
          "parameter": "کلسترول تام",
          "normalRange": "< 200"
        },
        {
          "unit": "mIU/L",
          "value": "2.4",
          "abnormal": false,
          "parameter": "TSH",
          "normalRange": "0.4 - 4.2"
        },
        {
          "unit": "ng/mL",
          "value": "38",
          "abnormal": false,
          "parameter": "ویتامین 25(OH)D",
          "normalRange": "30 - 100"
        }
      ],
      "interpretation": "کلیه شاخص‌های هماتولوژی، متابولیک و تیروئید در محدوده مطلوب قرار دارند.",
      "attachmentUrl": null,
      "fileName": "Lab_Complete_Sharifi.pdf",
      "createdAt": "2026-11-12T18:21:17.662"
    },
    {
      "id": 5,
      "patientId": 5,
      "stationId": null,
      "roomCode": "ECG",
      "title": "نوار قلب ۱۲ لید در حالت استراحت",
      "resultType": "ecg_trace",
      "operatorName": "پریسا نادری",
      "summaryStatus": "نرمال",
      "metrics": [
        {
          "unit": "bpm",
          "value": "68",
          "abnormal": false,
          "parameter": "ضربان قلب",
          "normalRange": "60 - 100"
        }
      ],
      "interpretation": "ریتم سینوسی طبیعی بدون هیچ‌گونه آریتمی یا اختلال هدایتی.",
      "attachmentUrl": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22760%22%20height%3D%22240%22%20viewBox%3D%220%200%20760%20240%22%3E%0A%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22smallGrid%22%20width%3D%2210%22%20height%3D%2210%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2010%200%20L%200%200%200%2010%22%20fill%3D%22none%22%20stroke%3D%22%23FECDD3%22%20stroke-width%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22grid%22%20width%3D%2250%22%20height%3D%2250%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22url(%23smallGrid)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2050%200%20L%200%200%200%2050%22%20fill%3D%22none%22%20stroke%3D%22%23FDA4AF%22%20stroke-width%3D%221.2%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22%23FFF1F2%22%2F%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22url(%23grid)%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2212%22%20y%3D%2210%22%20width%3D%22736%22%20height%3D%2230%22%20rx%3D%226%22%20fill%3D%22%23FFFFFF%22%20fill-opacity%3D%220.92%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%2230%22%20fill%3D%22%230F172A%22%20font-family%3D%22monospace%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E12-LEAD%20ECG%20%7C%20HR%3A%2068%20bpm%20%7C%2025mm%2Fs%2010mm%2FmV%20%7C%20Normal%20Sinus%20Rhythm%3C%2Ftext%3E%0A%20%20%20%20%3Ctext%20x%3D%22734%22%20y%3D%2230%22%20text-anchor%3D%22end%22%20fill%3D%22%23334155%22%20font-family%3D%22sans-serif%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E%D8%A7%D9%84%D9%87%D8%A7%D9%85%20%D8%B4%D8%B1%DB%8C%D9%81%DB%8C%E2%80%8C%D9%86%DA%98%D8%A7%D8%AF%3C%2Ftext%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2015%20145%20L%2055%20145%20Q%2065%20133%2075%20145%20L%2088%20145%20L%2094%20156%20L%20102%2072%20L%20110%20175%20L%20118%20145%20L%20138%20145%20Q%20154%20122%20170%20145%20L%20215%20145%20Q%20225%20133%20235%20145%20L%20248%20145%20L%20254%20156%20L%20262%2068%20L%20270%20176%20L%20278%20145%20L%20298%20145%20Q%20314%20122%20330%20145%20L%20375%20145%20Q%20385%20133%20395%20145%20L%20408%20145%20L%20414%20156%20L%20422%2074%20L%20430%20174%20L%20438%20145%20L%20458%20145%20Q%20474%20122%20490%20145%20L%20535%20145%20Q%20545%20133%20555%20145%20L%20568%20145%20L%20574%20156%20L%20582%2070%20L%20590%20176%20L%20598%20145%20L%20618%20145%20Q%20634%20122%20650%20145%20L%20700%20145%20Q%20710%20133%20720%20145%20L%20745%20145%22%0A%20%20%20%20%20%20fill%3D%22none%22%20stroke%3D%22%230F172A%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%22222%22%20fill%3D%22%23be123c%22%20font-family%3D%22monospace%22%20font-size%3D%2211%22%3ELead%20II%20Rhythm%20Strip%20%E2%80%94%20PR%3A%20162ms%20%7C%20QRS%3A%2088ms%20%7C%20QTc%3A%20412ms%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E",
      "fileName": "ECG_Sharifi.svg",
      "createdAt": "2026-11-12T18:06:17.662"
    },
    {
      "id": 8,
      "patientId": 12,
      "stationId": 44,
      "roomCode": "LAB",
      "title": "آزمایش‌های پیش از جراحی (CBC, PT/PTT, قند و کلیه)",
      "resultType": "lab_panel",
      "operatorName": "علیرضا محمدی",
      "summaryStatus": "نرمال",
      "metrics": [
        {
          "unit": "g/dL",
          "value": "13.9",
          "abnormal": false,
          "parameter": "هموگلوبین (Hb)",
          "normalRange": "13.5 - 17.5"
        },
        {
          "unit": "mg/dL",
          "value": "1.02",
          "abnormal": false,
          "parameter": "کراتینین (Cr)",
          "normalRange": "0.7 - 1.3"
        },
        {
          "unit": "sec",
          "value": "12.4",
          "abnormal": false,
          "parameter": "PT",
          "normalRange": "11 - 13.5"
        }
      ],
      "interpretation": "شاخص‌های انعقادی و کلیوی برای ادامه ارزیابی پیش از جراحی مناسب‌اند.",
      "attachmentUrl": null,
      "fileName": "Result_NBZ-1404-407.pdf",
      "createdAt": "2026-11-13T06:59:43.913"
    },
    {
      "id": 9,
      "patientId": 12,
      "stationId": 45,
      "roomCode": "ECG",
      "title": "نوار قلب ۱۲ لید پیش از جراحی",
      "resultType": "ecg_trace",
      "operatorName": "پریسا نادری",
      "summaryStatus": "نرمال",
      "metrics": [
        {
          "unit": "bpm",
          "value": "66",
          "abnormal": false,
          "parameter": "ضربان قلب",
          "normalRange": "60 - 100"
        }
      ],
      "interpretation": "ریتم سینوسی منظم؛ تغییر حاد ایسکمیک دیده نشد.",
      "attachmentUrl": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22760%22%20height%3D%22240%22%20viewBox%3D%220%200%20760%20240%22%3E%0A%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22smallGrid%22%20width%3D%2210%22%20height%3D%2210%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2010%200%20L%200%200%200%2010%22%20fill%3D%22none%22%20stroke%3D%22%23FECDD3%22%20stroke-width%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22grid%22%20width%3D%2250%22%20height%3D%2250%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22url(%23smallGrid)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2050%200%20L%200%200%200%2050%22%20fill%3D%22none%22%20stroke%3D%22%23FDA4AF%22%20stroke-width%3D%221.2%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22%23FFF1F2%22%2F%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22url(%23grid)%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2212%22%20y%3D%2210%22%20width%3D%22736%22%20height%3D%2230%22%20rx%3D%226%22%20fill%3D%22%23FFFFFF%22%20fill-opacity%3D%220.92%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%2230%22%20fill%3D%22%230F172A%22%20font-family%3D%22monospace%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E12-LEAD%20ECG%20%7C%20HR%3A%2066%20bpm%20%7C%2025mm%2Fs%2010mm%2FmV%20%7C%20Normal%20Sinus%20Rhythm%3C%2Ftext%3E%0A%20%20%20%20%3Ctext%20x%3D%22734%22%20y%3D%2230%22%20text-anchor%3D%22end%22%20fill%3D%22%23334155%22%20font-family%3D%22sans-serif%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E%D8%B1%D8%B6%D8%A7%20%D8%A7%D8%AD%D9%85%D8%AF%DB%8C%3C%2Ftext%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2015%20145%20L%2055%20145%20Q%2065%20133%2075%20145%20L%2088%20145%20L%2094%20156%20L%20102%2072%20L%20110%20175%20L%20118%20145%20L%20138%20145%20Q%20154%20122%20170%20145%20L%20215%20145%20Q%20225%20133%20235%20145%20L%20248%20145%20L%20254%20156%20L%20262%2068%20L%20270%20176%20L%20278%20145%20L%20298%20145%20Q%20314%20122%20330%20145%20L%20375%20145%20Q%20385%20133%20395%20145%20L%20408%20145%20L%20414%20156%20L%20422%2074%20L%20430%20174%20L%20438%20145%20L%20458%20145%20Q%20474%20122%20490%20145%20L%20535%20145%20Q%20545%20133%20555%20145%20L%20568%20145%20L%20574%20156%20L%20582%2070%20L%20590%20176%20L%20598%20145%20L%20618%20145%20Q%20634%20122%20650%20145%20L%20700%20145%20Q%20710%20133%20720%20145%20L%20745%20145%22%0A%20%20%20%20%20%20fill%3D%22none%22%20stroke%3D%22%230F172A%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%22222%22%20fill%3D%22%23be123c%22%20font-family%3D%22monospace%22%20font-size%3D%2211%22%3ELead%20II%20Rhythm%20Strip%20%E2%80%94%20PR%3A%20162ms%20%7C%20QRS%3A%2088ms%20%7C%20QTc%3A%20412ms%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E",
      "fileName": "ECG_NBZ-1404-407.svg",
      "createdAt": "2026-11-13T07:13:43.913"
    },
    {
      "id": 10,
      "patientId": 14,
      "stationId": 51,
      "roomCode": "LAB",
      "title": "پانل دیابت و چربی خون",
      "resultType": "lab_panel",
      "operatorName": "علیرضا محمدی",
      "summaryStatus": "نیازمند توجه پزشک",
      "metrics": [
        {
          "unit": "%",
          "value": "7.4",
          "abnormal": true,
          "parameter": "HbA1c",
          "normalRange": "4.0 - 5.6"
        },
        {
          "unit": "mg/dL",
          "value": "132",
          "abnormal": true,
          "parameter": "قند خون ناشتا (FBS)",
          "normalRange": "70 - 99"
        }
      ],
      "interpretation": "کنترل قند خون نیازمند بازبینی درمان است.",
      "attachmentUrl": null,
      "fileName": "Result_NBZ-1404-409.pdf",
      "createdAt": "2026-11-13T06:33:43.913"
    },
    {
      "id": 11,
      "patientId": 14,
      "stationId": 52,
      "roomCode": "ECG",
      "title": "نوار قلب ۱۲ لید",
      "resultType": "ecg_trace",
      "operatorName": "پریسا نادری",
      "summaryStatus": "نرمال",
      "metrics": [
        {
          "unit": "bpm",
          "value": "71",
          "abnormal": false,
          "parameter": "ضربان قلب",
          "normalRange": "60 - 100"
        }
      ],
      "interpretation": "ریتم سینوسی؛ بدون تغییر حاد ST.",
      "attachmentUrl": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22760%22%20height%3D%22240%22%20viewBox%3D%220%200%20760%20240%22%3E%0A%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22smallGrid%22%20width%3D%2210%22%20height%3D%2210%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2010%200%20L%200%200%200%2010%22%20fill%3D%22none%22%20stroke%3D%22%23FECDD3%22%20stroke-width%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22grid%22%20width%3D%2250%22%20height%3D%2250%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22url(%23smallGrid)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2050%200%20L%200%200%200%2050%22%20fill%3D%22none%22%20stroke%3D%22%23FDA4AF%22%20stroke-width%3D%221.2%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22%23FFF1F2%22%2F%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22url(%23grid)%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2212%22%20y%3D%2210%22%20width%3D%22736%22%20height%3D%2230%22%20rx%3D%226%22%20fill%3D%22%23FFFFFF%22%20fill-opacity%3D%220.92%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%2230%22%20fill%3D%22%230F172A%22%20font-family%3D%22monospace%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E12-LEAD%20ECG%20%7C%20HR%3A%2071%20bpm%20%7C%2025mm%2Fs%2010mm%2FmV%20%7C%20Normal%20Sinus%20Rhythm%3C%2Ftext%3E%0A%20%20%20%20%3Ctext%20x%3D%22734%22%20y%3D%2230%22%20text-anchor%3D%22end%22%20fill%3D%22%23334155%22%20font-family%3D%22sans-serif%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E%D8%AD%D8%B3%DB%8C%D9%86%20%D9%86%D8%A7%D8%B8%D8%B1%DB%8C%3C%2Ftext%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2015%20145%20L%2055%20145%20Q%2065%20133%2075%20145%20L%2088%20145%20L%2094%20156%20L%20102%2072%20L%20110%20175%20L%20118%20145%20L%20138%20145%20Q%20154%20122%20170%20145%20L%20215%20145%20Q%20225%20133%20235%20145%20L%20248%20145%20L%20254%20156%20L%20262%2068%20L%20270%20176%20L%20278%20145%20L%20298%20145%20Q%20314%20122%20330%20145%20L%20375%20145%20Q%20385%20133%20395%20145%20L%20408%20145%20L%20414%20156%20L%20422%2074%20L%20430%20174%20L%20438%20145%20L%20458%20145%20Q%20474%20122%20490%20145%20L%20535%20145%20Q%20545%20133%20555%20145%20L%20568%20145%20L%20574%20156%20L%20582%2070%20L%20590%20176%20L%20598%20145%20L%20618%20145%20Q%20634%20122%20650%20145%20L%20700%20145%20Q%20710%20133%20720%20145%20L%20745%20145%22%0A%20%20%20%20%20%20fill%3D%22none%22%20stroke%3D%22%230F172A%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%22222%22%20fill%3D%22%23be123c%22%20font-family%3D%22monospace%22%20font-size%3D%2211%22%3ELead%20II%20Rhythm%20Strip%20%E2%80%94%20PR%3A%20162ms%20%7C%20QRS%3A%2088ms%20%7C%20QTc%3A%20412ms%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E",
      "fileName": "ECG_NBZ-1404-409.svg",
      "createdAt": "2026-11-13T06:47:43.913"
    },
    {
      "id": 12,
      "patientId": 16,
      "stationId": 60,
      "roomCode": "LAB",
      "title": "پانل بیوشیمی و چربی خون",
      "resultType": "lab_panel",
      "operatorName": "علیرضا محمدی",
      "summaryStatus": "نرمال",
      "metrics": [
        {
          "unit": "mg/dL",
          "value": "96",
          "abnormal": false,
          "parameter": "کلسترول LDL",
          "normalRange": "< 100"
        }
      ],
      "interpretation": "شاخص‌های اصلی در محدوده قابل قبول‌اند.",
      "attachmentUrl": null,
      "fileName": "Result_NBZ-1404-411.pdf",
      "createdAt": "2026-11-13T06:11:43.913"
    },
    {
      "id": 13,
      "patientId": 16,
      "stationId": 61,
      "roomCode": "ECG",
      "title": "نوار قلب ۱۲ لید",
      "resultType": "ecg_trace",
      "operatorName": "پریسا نادری",
      "summaryStatus": "نرمال",
      "metrics": [
        {
          "unit": "bpm",
          "value": "69",
          "abnormal": false,
          "parameter": "ضربان قلب",
          "normalRange": "60 - 100"
        }
      ],
      "interpretation": "ریتم سینوسی طبیعی.",
      "attachmentUrl": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22760%22%20height%3D%22240%22%20viewBox%3D%220%200%20760%20240%22%3E%0A%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22smallGrid%22%20width%3D%2210%22%20height%3D%2210%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2010%200%20L%200%200%200%2010%22%20fill%3D%22none%22%20stroke%3D%22%23FECDD3%22%20stroke-width%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%20%20%3Cpattern%20id%3D%22grid%22%20width%3D%2250%22%20height%3D%2250%22%20patternUnits%3D%22userSpaceOnUse%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22url(%23smallGrid)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2050%200%20L%200%200%200%2050%22%20fill%3D%22none%22%20stroke%3D%22%23FDA4AF%22%20stroke-width%3D%221.2%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fpattern%3E%0A%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22%23FFF1F2%22%2F%3E%0A%20%20%20%20%3Crect%20width%3D%22760%22%20height%3D%22240%22%20rx%3D%2212%22%20fill%3D%22url(%23grid)%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2212%22%20y%3D%2210%22%20width%3D%22736%22%20height%3D%2230%22%20rx%3D%226%22%20fill%3D%22%23FFFFFF%22%20fill-opacity%3D%220.92%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%2230%22%20fill%3D%22%230F172A%22%20font-family%3D%22monospace%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E12-LEAD%20ECG%20%7C%20HR%3A%2069%20bpm%20%7C%2025mm%2Fs%2010mm%2FmV%20%7C%20Normal%20Sinus%20Rhythm%3C%2Ftext%3E%0A%20%20%20%20%3Ctext%20x%3D%22734%22%20y%3D%2230%22%20text-anchor%3D%22end%22%20fill%3D%22%23334155%22%20font-family%3D%22sans-serif%22%20font-size%3D%2213%22%20font-weight%3D%22bold%22%3E%D8%AF%D8%A7%D8%B1%DB%8C%D9%88%D8%B4%20%D8%A7%D8%B9%D8%AA%D9%85%D8%A7%D8%AF%DB%8C%3C%2Ftext%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2015%20145%20L%2055%20145%20Q%2065%20133%2075%20145%20L%2088%20145%20L%2094%20156%20L%20102%2072%20L%20110%20175%20L%20118%20145%20L%20138%20145%20Q%20154%20122%20170%20145%20L%20215%20145%20Q%20225%20133%20235%20145%20L%20248%20145%20L%20254%20156%20L%20262%2068%20L%20270%20176%20L%20278%20145%20L%20298%20145%20Q%20314%20122%20330%20145%20L%20375%20145%20Q%20385%20133%20395%20145%20L%20408%20145%20L%20414%20156%20L%20422%2074%20L%20430%20174%20L%20438%20145%20L%20458%20145%20Q%20474%20122%20490%20145%20L%20535%20145%20Q%20545%20133%20555%20145%20L%20568%20145%20L%20574%20156%20L%20582%2070%20L%20590%20176%20L%20598%20145%20L%20618%20145%20Q%20634%20122%20650%20145%20L%20700%20145%20Q%20710%20133%20720%20145%20L%20745%20145%22%0A%20%20%20%20%20%20fill%3D%22none%22%20stroke%3D%22%230F172A%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%2224%22%20y%3D%22222%22%20fill%3D%22%23be123c%22%20font-family%3D%22monospace%22%20font-size%3D%2211%22%3ELead%20II%20Rhythm%20Strip%20%E2%80%94%20PR%3A%20162ms%20%7C%20QRS%3A%2088ms%20%7C%20QTc%3A%20412ms%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E",
      "fileName": "ECG_NBZ-1404-411.svg",
      "createdAt": "2026-11-13T06:23:43.913"
    },
    {
      "id": 14,
      "patientId": 17,
      "stationId": 65,
      "roomCode": "LAB",
      "title": "آزمایش تیروئید و CBC",
      "resultType": "lab_panel",
      "operatorName": "علیرضا محمدی",
      "summaryStatus": "نیازمند توجه پزشک",
      "metrics": [
        {
          "unit": "mIU/L",
          "value": "6.8",
          "abnormal": true,
          "parameter": "TSH",
          "normalRange": "0.4 - 4.2"
        },
        {
          "unit": "g/dL",
          "value": "12.1",
          "abnormal": false,
          "parameter": "هموگلوبین (Hb)",
          "normalRange": "12.0 - 16.0"
        }
      ],
      "interpretation": "TSH بالاتر از محدوده مرجع است و باید با علائم بیمار تطبیق داده شود.",
      "attachmentUrl": null,
      "fileName": "Result_NBZ-1404-412.pdf",
      "createdAt": "2026-11-13T07:10:43.913"
    }
  ],
  "links": [
    {
      "id": 1,
      "userId": 1,
      "patientId": 1,
      "relationship": "child",
      "permission": "manage",
      "visibility": {
        "journey": true,
        "reports": false,
        "results": false,
        "allergies": false,
        "diagnoses": false,
        "medications": false,
        "familyHistory": false
      },
      "createdAt": "2026-11-12T20:56:30.421086"
    },
    {
      "id": 2,
      "userId": 1,
      "patientId": 2,
      "relationship": "relative",
      "permission": "follow",
      "visibility": {
        "journey": true,
        "reports": false,
        "results": false,
        "allergies": false,
        "diagnoses": false,
        "medications": false,
        "familyHistory": false
      },
      "createdAt": "2026-11-12T20:56:30.422724"
    },
    {
      "id": 4,
      "userId": 4,
      "patientId": 1,
      "relationship": "self",
      "permission": "manage",
      "visibility": {
        "journey": true,
        "reports": false,
        "results": false,
        "allergies": false,
        "diagnoses": false,
        "medications": false,
        "familyHistory": false
      },
      "createdAt": "2026-11-13T07:11:39.691398"
    },
    {
      "id": 5,
      "userId": 5,
      "patientId": 5,
      "relationship": "self",
      "permission": "manage",
      "visibility": {
        "journey": true,
        "reports": false,
        "results": false,
        "allergies": false,
        "diagnoses": false,
        "medications": false,
        "familyHistory": false
      },
      "createdAt": "2026-11-13T07:33:26.747987"
    },
    {
      "id": 6,
      "userId": 6,
      "patientId": 1,
      "relationship": "child",
      "permission": "manage",
      "visibility": {
        "journey": true,
        "reports": false,
        "results": false,
        "allergies": true,
        "diagnoses": false,
        "medications": true,
        "familyHistory": true
      },
      "createdAt": "2026-11-13T07:33:26.751805"
    },
    {
      "id": 7,
      "userId": 1,
      "patientId": 5,
      "relationship": "spouse",
      "permission": "follow",
      "visibility": {
        "journey": true,
        "reports": false,
        "results": false,
        "allergies": false,
        "diagnoses": false,
        "medications": false,
        "familyHistory": false
      },
      "createdAt": "2026-11-13T07:33:26.756748"
    },
    {
      "id": 8,
      "userId": 4,
      "patientId": 2,
      "relationship": "relative",
      "permission": "follow",
      "visibility": {
        "journey": true,
        "reports": false,
        "results": false,
        "allergies": false,
        "diagnoses": false,
        "medications": false,
        "familyHistory": false
      },
      "createdAt": "2026-11-13T07:57:43.900725"
    }
  ],
  "alerts": [
    {
      "id": 1,
      "patientId": 1,
      "senderRole": "آزمایشگاه تشخیص طبی",
      "alertType": "move_to_room",
      "message": "سرکار خانم تابش، نمونه‌گیری خون شما ثبت شد و جواب در حال آماده‌سازی است. لطفاً بدون معطلی به طبقه ۲، اتاق ۲۰۴ (نوار قلب) تشریف ببرید.",
      "isRead": false,
      "createdAt": "2026-11-12T19:36:17.662"
    },
    {
      "id": 2,
      "patientId": 5,
      "senderRole": "پذیرش و هماهنگ‌کننده",
      "alertType": "result_ready",
      "message": "سرکار خانم شریفی‌نژاد، کلیه ۵ ایستگاه چکاپ امروز شما با موفقیت به پایان رسید. فایل PDF پرونده الکترونیک جامع امروز در تب «پرونده امروز» آماده دانلود است.",
      "isRead": false,
      "createdAt": "2026-11-12T19:54:17.662"
    },
    {
      "id": 14,
      "patientId": 11,
      "senderRole": "پذیرش مرکزی",
      "alertType": "general",
      "message": "سارا کریمی عزیز، پذیرش شما ثبت شد. ایستگاه فعلی شما آزمایشگاه تشخیص طبی است.",
      "isRead": false,
      "createdAt": "2026-11-13T07:52:43.913"
    },
    {
      "id": 15,
      "patientId": 12,
      "senderRole": "پذیرش مرکزی",
      "alertType": "general",
      "message": "رضا احمدی عزیز، پذیرش شما ثبت شد. ایستگاه فعلی شما رادیولوژی و تصویربرداری دیجیتال است.",
      "isRead": false,
      "createdAt": "2026-11-13T07:52:43.913"
    },
    {
      "id": 16,
      "patientId": 13,
      "senderRole": "پذیرش مرکزی",
      "alertType": "general",
      "message": "نیلوفر مرادی عزیز، پذیرش شما ثبت شد. ایستگاه فعلی شما نوار قلب (ECG) است.",
      "isRead": false,
      "createdAt": "2026-11-13T07:52:43.913"
    },
    {
      "id": 17,
      "patientId": 14,
      "senderRole": "پذیرش مرکزی",
      "alertType": "general",
      "message": "حسین ناظری عزیز، پذیرش شما ثبت شد. ایستگاه فعلی شما مطب تخصصی قلب و عروق است.",
      "isRead": false,
      "createdAt": "2026-11-13T07:52:43.913"
    },
    {
      "id": 18,
      "patientId": 15,
      "senderRole": "پذیرش مرکزی",
      "alertType": "general",
      "message": "فاطمه رحیمی عزیز، پذیرش شما ثبت شد. ایستگاه فعلی شما نوار قلب (ECG) است.",
      "isRead": false,
      "createdAt": "2026-11-13T07:52:43.913"
    },
    {
      "id": 19,
      "patientId": 16,
      "senderRole": "پذیرش مرکزی",
      "alertType": "general",
      "message": "داریوش اعتمادی عزیز، پذیرش شما ثبت شد. ایستگاه فعلی شما کلینیک دندانپزشکی است.",
      "isRead": false,
      "createdAt": "2026-11-13T07:52:43.913"
    },
    {
      "id": 20,
      "patientId": 17,
      "senderRole": "پذیرش مرکزی",
      "alertType": "general",
      "message": "لیلا حسینی عزیز، پذیرش شما ثبت شد. ایستگاه فعلی شما رادیولوژی و تصویربرداری دیجیتال است.",
      "isRead": false,
      "createdAt": "2026-11-13T07:52:43.913"
    },
    {
      "id": 21,
      "patientId": 18,
      "senderRole": "پذیرش مرکزی",
      "alertType": "general",
      "message": "آرمان صادقی عزیز، پذیرش شما ثبت شد. ایستگاه فعلی شما آزمایشگاه تشخیص طبی است.",
      "isRead": false,
      "createdAt": "2026-11-13T07:52:43.913"
    }
  ]
};
