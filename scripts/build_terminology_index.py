# -*- coding: utf-8 -*-
"""Build bundled terminology index (CUI + names + codes) from form-item-coding-map."""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / "scripts" / "form-item-coding-map.json"
SEED = ROOT / "frontend" / "src" / "lib" / "form-catalog.seed.json"
OUT = ROOT / "frontend" / "src" / "lib" / "terminology-index.json"

# Curated preferred names for catalog CUIs (not full UMLS).
NAMES: dict[str, tuple[str, str]] = {
    "C0000737": ("Abdominal pain", "درد شکمی"),
    "C0001486": ("Human papillomavirus infection", "عفونت HPV"),
    "C0001948": ("Alcohol use", "مصرف الکل"),
    "C0002871": ("Anemia", "کم‌خونی"),
    "C0003123": ("Anorexia", "بی‌اشتهایی"),
    "C0005558": ("Biopsy", "بیوپسی"),
    "C0005890": ("Body height", "قد"),
    "C0005910": ("Body weight", "وزن"),
    "C0006145": ("Breast inflammation / erythema", "قرمزی یا التهاب پستان"),
    "C0006147": ("Breastfeeding", "شیردهی"),
    "C0006826": ("Malignant neoplasm / cancer history", "سابقه سرطان"),
    "C0008031": ("Chest pain", "درد قفسه سینه"),
    "C0009214": ("Change in bowel habit", "تغییر عادت اجابت مزاج"),
    "C0009324": ("Ulcerative colitis", "کولیت اولسراتیو"),
    "C0009378": ("Colonoscopy", "کولونوسکوپی"),
    "C0009806": ("Constipation", "یبوست"),
    "C0009905": ("Contraceptives / hormone therapy", "هورمون‌درمانی / ضدبارداری"),
    "C0010200": ("Cough", "سرفه"),
    "C0010346": ("Crohn disease", "بیماری کرون"),
    "C0011008": ("Date of birth", "تاریخ تولد"),
    "C0011168": ("Dysphagia", "دشواری بلع"),
    "C0011860": ("Type 2 diabetes mellitus", "دیابت نوع ۲"),
    "C0011991": ("Diarrhea", "اسهال"),
    "C0013378": ("Dysuria", "سوزش ادرار"),
    "C0013394": ("Dyspareunia", "درد هنگام رابطه"),
    "C0013404": ("Dyspnea", "تنگی نفس"),
    "C0013916": ("City of residence", "شهر محل سکونت"),
    "C0015672": ("Fatigue", "خستگی"),
    "C0015967": ("Fever", "تب"),
    "C0016204": ("Flatulence / bloating", "نفخ"),
    "C0016399": ("Fecal occult blood test", "آزمایش خون مخفی مدفوع"),
    "C0018834": ("Gastroesophageal reflux", "ریفلاکس معده"),
    "C0018932": ("Hematochezia", "خون روشن در مدفوع"),
    "C0018965": ("Hematuria", "خون در ادرار"),
    "C0018978": ("Hematospermia", "خون در منی"),
    "C0019079": ("Hemoptysis", "خلط خونی"),
    "C0019163": ("Hepatitis B", "هپاتیت B"),
    "C0019196": ("Hepatitis C", "هپاتیت C"),
    "C0019559": ("Pelvic pain", "درد لگنی"),
    "C0019693": ("HIV infection", "HIV"),
    "C0019825": ("Hoarseness", "گرفتگی صدا"),
    "C0020473": ("Hyperlipidemia", "چربی خون"),
    "C0020538": ("Hypertension", "فشار خون"),
    "C0021051": ("Immunodeficiency", "نقص ایمنی"),
    "C0021359": ("Infertility", "ناباروری"),
    "C0022821": ("Low back pain", "کمردرد"),
    "C0024485": ("Magnetic resonance imaging", "MRI"),
    "C0024671": ("Mammography", "ماموگرافی"),
    "C0024841": ("Marital status", "وضعیت تاهل"),
    "C0024902": ("Mastalgia", "درد پستان"),
    "C0025202": ("Melanoma / changing mole", "خال مشکوک / ملانوم"),
    "C0025222": ("Melena", "مدفوع قیری"),
    "C0025322": ("Menorrhagia", "قاعدگی شدید"),
    "C0025323": ("Intermenstrual bleeding", "خونریزی بین‌قاعدگی"),
    "C0025325": ("Menopause", "یائسگی"),
    "C0025329": ("Menarche", "اولین قاعدگی"),
    "C0025566": ("Breast lump", "توده پستان"),
    "C0027365": ("Patient name", "نام بیمار"),
    "C0027497": ("Nausea and vomiting", "تهوع و استفراغ"),
    "C0027696": ("Organ transplant", "پیوند عضو"),
    "C0028081": ("Night sweats", "تعریق شبانه"),
    "C0028754": ("Obesity", "چاقی"),
    "C0030193": ("Pain", "درد"),
    "C0030354": ("Papanicolaou smear", "پاپ اسمیر"),
    "C0031225": ("Pesticide exposure", "مواجهه با آفت‌کش"),
    "C0032460": ("Polycystic ovary syndrome", "PCOS"),
    "C0032584": ("Precancerous condition / polyp", "ضایعه پیش‌سرطانی"),
    "C0032977": ("Nulliparity", "عدم بارداری کامل"),
    "C0034559": ("Radiation exposure", "مواجهه با اشعه"),
    "C0037285": ("Skin lesion", "ضایعه پوستی"),
    "C0037369": ("Current tobacco smoker", "سیگار فعلی"),
    "C0037370": ("Passive smoking", "دود دست‌دوم"),
    "C0038436": ("Occupational carcinogen exposure", "مواجهه شغلی سرطان‌زا"),
    "C0038814": ("Sunburn", "آفتاب‌سوختگی"),
    "C0039591": ("Testicular pain", "درد بیضه"),
    "C0040405": ("Computed tomography", "سی‌تی اسکن"),
    "C0041618": ("Ultrasonography", "سونوگرافی"),
    "C0042023": ("Urinary frequency", "تکرر ادرار"),
    "C0042251": ("Vaginal discharge", "ترشح واژینال"),
    "C0043096": ("Weight loss", "کاهش وزن"),
    "C0080274": ("Nocturia", "شب‌ادراری"),
    "C0080276": ("Urinary hesitancy", "تأخیر شروع ادرار"),
    "C0085508": ("Helicobacter pylori", "هلیکوباکتر پیلوری"),
    "C0135212": ("Postmenopausal bleeding", "خونریزی بعد از یائسگی"),
    "C0149740": ("Nipple discharge", "ترشح نوک پستان"),
    "C0162316": ("Iron deficiency", "فقر آهن"),
    "C0201544": ("Prostate-specific antigen", "PSA"),
    "C0201570": ("Digital rectal examination", "معاینه انگشتی پروستات"),
    "C0232849": ("Incomplete bladder emptying", "تخلیه ناقص مثانه"),
    "C0232940": ("Testicular mass", "توده بیضه"),
    "C0235873": ("Family history of prostate cancer", "سابقه خانوادگی سرطان پروستات"),
    "C0239135": ("Early satiety", "سیری زودرس"),
    "C0239379": ("Breast deformity / size change", "تغییر شکل پستان"),
    "C0239381": ("Peau d'orange / skin dimpling", "پوست پرتقالی پستان"),
    "C0239382": ("Nipple retraction / change", "تغییر نوک پستان"),
    "C0241888": ("Family history of cancer", "سابقه خانوادگی سرطان"),
    "C0260418": ("Family history of colorectal cancer", "سابقه خانوادگی سرطان روده"),
    "C0260419": ("Family history of gastric/esophageal cancer", "سابقه خانوادگی سرطان معده/مری"),
    "C0260420": ("Family history of lung cancer", "سابقه خانوادگی سرطان ریه"),
    "C0260421": ("Family history of ovarian cancer", "سابقه خانوادگی سرطان تخمدان"),
    "C0282411": ("Hormone replacement therapy", "هورمون‌درمانی یائسگی"),
    "C0349218": ("Central obesity", "چاقی شکمی"),
    "C0420112": ("Abnormal screening finding", "نتیجه غیرطبیعی غربالگری"),
    "C0420113": ("Colorectal screening awareness", "آگاهی غربالگری روده"),
    "C0420114": ("Prostate screening awareness", "آگاهی غربالگری پروستات"),
    "C0420115": ("Breast self-exam awareness", "آگاهی خودآزمایی پستان"),
    "C0421447": ("Telephone number", "شماره تماس"),
    "C0424472": ("Care-seeking behavior", "رفتار مراجعه به پزشک"),
    "C0424473": ("Care avoidance", "انصراف از پیگیری"),
    "C0424947": ("Tobacco pack-years", "پاکت-سال سیگار"),
    "C0425305": ("Physical inactivity", "کم‌تحرکی"),
    "C0425411": ("Low fruit and vegetable intake", "کمبود میوه و سبزی"),
    "C0425959": ("Late first pregnancy", "بارداری اول دیرهنگام"),
    "C0426395": ("Weak urinary stream", "جریان ضعیف ادرار"),
    "C0429966": ("Family history of breast cancer", "سابقه خانوادگی سرطان پستان"),
    "C0455829": ("Waist circumference", "دور کمر"),
    "C0577559": ("Mass / lump finding", "توده یا برآمدگی"),
    "C0578736": ("Axillary lymphadenopathy", "توده زیر بغل"),
    "C0684233": ("Processed / red meat intake", "مصرف گوشت قرمز/فرآوری‌شده"),
    "C1301886": ("Date form completed", "تاریخ تکمیل فرم"),
    "C1301944": ("Patient identifier", "شناسه بیمار / کدملی"),
    "C1333991": ("Lynch syndrome", "سندرم لینچ"),
    "C1515110": ("HPV test", "تست HPV"),
    "C1515111": ("HPV vaccine", "واکسن HPV"),
    "C1515112": ("BRCA gene mutation", "جهش BRCA"),
    "C1522449": ("Radiotherapy", "پرتودرمانی"),
    "C3241966": ("Former smoker", "سابقه سیگار"),
    "C3665472": ("Chemotherapy / immunosuppression", "شیمی‌درمانی / سرکوب ایمنی"),
    "C4554196": ("Waterpipe tobacco", "قلیان"),
}


def main() -> None:
    coding_map = json.loads(MAP.read_text(encoding="utf-8"))
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    code_meta = {
        item["code"]: {
            "label": item["labelFa"],
            "kind": item["coding"]["conceptKind"],
        }
        for form in seed["forms"]
        for item in form["items"]
    }

    agg: dict[str, dict] = defaultdict(
        lambda: {
            "snomed": set(),
            "loinc": set(),
            "icd10": set(),
            "kinds": set(),
            "labels": [],
        }
    )

    for code, row in coding_map.items():
        meta = code_meta.get(code, {})
        for cui in row.get("umls") or []:
            bucket = agg[cui]
            bucket["snomed"].update(row.get("snomed") or [])
            bucket["loinc"].update(row.get("loinc") or [])
            bucket["icd10"].update(row.get("icd10") or [])
            if meta.get("kind"):
                bucket["kinds"].add(meta["kind"])
            if meta.get("label"):
                bucket["labels"].append(meta["label"])

    missing_names = sorted(set(agg) - set(NAMES))
    if missing_names:
        raise SystemExit(f"missing NAMES for CUIs: {missing_names}")

    concepts = []
    for cui in sorted(agg):
        name_en, name_fa = NAMES[cui]
        bucket = agg[cui]
        concepts.append(
            {
                "cui": cui,
                "nameEn": name_en,
                "nameFa": name_fa,
                "snomed": sorted(bucket["snomed"]),
                "loinc": sorted(bucket["loinc"]),
                "icd10": sorted(bucket["icd10"]),
                "kinds": sorted(bucket["kinds"]),
            }
        )

    OUT.write_text(
        json.dumps({"concepts": concepts, "schemaVersion": 1}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT} concepts={len(concepts)}")


if __name__ == "__main__":
    main()
