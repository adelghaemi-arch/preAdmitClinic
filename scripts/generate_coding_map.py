# -*- coding: utf-8 -*-
"""Generate form-item-coding-map.json with best-effort SNOMED/LOINC/ICD-10/UMLS for all catalog items."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "frontend" / "src" / "lib" / "form-catalog.seed.json"
OUT = ROOT / "scripts" / "form-item-coding-map.json"


def c(snomed=None, loinc=None, icd10=None, umls=None):
    return {
        "snomed": list(snomed or []),
        "loinc": list(loinc or []),
        "icd10": list(icd10 or []),
        "umls": list(umls or []),
    }


# Shared demographics / base-info fields (apply to both CA_M_BASE_* and CA_F_BASE_*)
BASE_FIELDS = {
    "fullName": c(
        snomed=["371484003"],  # Patient name
        loinc=["45392-8"],
        umls=["C0027365"],
    ),
    "nationalId": c(
        snomed=["398724002"],  # Identifier
        loinc=["45397-7"],
        umls=["C1301944"],
    ),
    "birthDate": c(
        snomed=["184099003"],  # Date of birth
        loinc=["21112-8"],
        umls=["C0011008"],
    ),
    "formDate": c(
        snomed=["399651003"],  # Date of examination / form
        loinc=["29846-2"],
        umls=["C1301886"],
    ),
    "heightCm": c(
        snomed=["50373000"],  # Body height
        loinc=["8302-2"],
        umls=["C0005890"],
    ),
    "weightKg": c(
        snomed=["27113001"],  # Body weight
        loinc=["29463-7"],
        umls=["C0005910"],
    ),
    "waistCm": c(
        snomed=["276361009"],  # Waist circumference
        loinc=["8280-0"],
        umls=["C0455829"],
    ),
    "phone": c(
        snomed=["428341000124108"],
        loinc=["42077-8"],
        umls=["C0421447"],
    ),
    "city": c(
        snomed=["224294005"],  # City of residence
        loinc=["52831-5"],
        umls=["C0013916"],
    ),
    "maritalStatus": c(
        snomed=["125680007"],
        loinc=["11370-4"],
        umls=["C0024841"],
    ),
}

# Male clinical questions keyed by Q number
MALE_Q = {
    1: c(snomed=["363346000"], icd10=["Z85.9"], umls=["C0006826"]),  # Neoplasm / Hx cancer
    2: c(snomed=["128301008"], icd10=["K63.5"], umls=["C0032584"]),  # Precancerous GI / polyp
    3: c(snomed=["108290001"], loinc=["21946-9"], umls=["C1522449"]),  # Radiotherapy
    4: c(snomed=["367336001"], loinc=["55752-0"], umls=["C3665472"]),  # Chemotherapy / immunosuppression
    5: c(snomed=["313039003"], icd10=["Z94.9"], umls=["C0027696"]),  # Organ transplant
    6: c(snomed=["44054006"], icd10=["E11"], umls=["C0011860"]),  # T2DM
    7: c(snomed=["24526004", "34000006"], icd10=["K51", "K50"], umls=["C0009324", "C0010346"]),  # IBD
    8: c(snomed=["307058004"], icd10=["B96.81"], umls=["C0085508"]),  # H. pylori
    9: c(snomed=["66071002", "50711007"], icd10=["B18.1", "B18.2"], umls=["C0019163", "C0019196"]),  # Hep B/C
    10: c(snomed=["86406008"], icd10=["B20"], umls=["C0019693"]),  # HIV
    11: c(snomed=["275937001"], icd10=["Z80.9"], umls=["C0241888"]),  # FH cancer
    12: c(snomed=["275938006"], icd10=["Z80.42"], umls=["C0235873"]),  # FH prostate ca
    13: c(snomed=["275937001"], icd10=["Z80.0"], umls=["C0260418"]),  # FH colorectal
    14: c(snomed=["429740004"], icd10=["Z80.3", "Z80.41"], umls=["C0429966"]),  # FH breast/ovary/pancreas
    15: c(snomed=["275940002"], icd10=["Z80.0"], umls=["C0260419"]),  # FH stomach/esophagus
    16: c(snomed=["275939003"], icd10=["Z80.1"], umls=["C0260420"]),  # FH lung
    17: c(snomed=["275937001"], icd10=["Z80.9"], umls=["C0241888"]),  # Early onset FH
    18: c(snomed=["275937001"], icd10=["Z80.9"], umls=["C0241888"]),  # Multiple relatives
    19: c(snomed=["412734009", "445243001"], loinc=["50995-0"], umls=["C1515112", "C1333991"]),  # BRCA/Lynch
    20: c(snomed=["77176002"], icd10=["F17.210"], umls=["C0037369"]),  # Current smoker
    21: c(snomed=["8517006"], icd10=["Z87.891"], umls=["C3241966"]),  # Ex-smoker
    22: c(snomed=["160603005"], loinc=["64234-8"], umls=["C0424947"]),  # Pack years
    23: c(snomed=["228523000"], icd10=["Z77.22"], umls=["C0037370"]),  # Passive smoking
    24: c(snomed=["722499006"], icd10=["F17.290"], umls=["C4554196"]),  # Waterpipe / tobacco product
    25: c(snomed=["219006"], icd10=["F10.10"], umls=["C0001948"]),  # Alcohol
    26: c(snomed=["228448000"], loinc=["68516-4"], umls=["C0425305"]),  # Physical inactivity
    27: c(snomed=["414915002", "414916001"], icd10=["E66.9"], umls=["C0028754"]),  # Obesity
    28: c(snomed=["226167000"], loinc=["75285-2"], umls=["C0425411"]),  # Low fruit/veg
    29: c(snomed=["226145004"], umls=["C0684233"]),  # Processed/red meat
    30: c(snomed=["370977006"], icd10=["Z57.5"], umls=["C0038436"]),  # Carcinogen exposure
    31: c(snomed=["418189009"], icd10=["Z57.4"], umls=["C0031225"]),  # Pesticide exposure
    32: c(snomed=["370952001"], icd10=["Z57.1"], umls=["C0034559"]),  # Ionizing radiation exposure
    33: c(snomed=["89362005"], icd10=["R63.4"], umls=["C0043096"]),  # Weight loss
    34: c(snomed=["79890006"], icd10=["R63.0"], umls=["C0003123"]),  # Anorexia
    35: c(snomed=["84229001"], icd10=["R53.83"], umls=["C0015672"]),  # Fatigue
    36: c(snomed=["42984000"], icd10=["R61"], umls=["C0028081"]),  # Night sweats
    37: c(snomed=["386661006"], icd10=["R50.9"], umls=["C0015967"]),  # Fever
    38: c(snomed=["22253000"], icd10=["R52"], umls=["C0030193"]),  # Pain
    39: c(snomed=["274667000"], icd10=["R22.9"], umls=["C0577559"]),  # Mass/lump
    40: c(snomed=["95324001"], icd10=["L98.9"], umls=["C0037285"]),  # Skin lesion non-healing
    41: c(snomed=["162116003"], icd10=["R35.0"], umls=["C0042023"]),  # Frequency of urination
    42: c(snomed=["51178009"], icd10=["R35.1"], umls=["C0080274"]),  # Nocturia
    43: c(snomed=["49650001"], icd10=["R30.0"], umls=["C0013378"]),  # Dysuria
    44: c(snomed=["267064002"], icd10=["R39.1"], umls=["C0080276"]),  # Hesitancy
    45: c(snomed=["250450001"], icd10=["R39.14"], umls=["C0426395"]),  # Weak stream
    46: c(snomed=["162103003"], icd10=["R39.14"], umls=["C0232849"]),  # Incomplete emptying
    47: c(snomed=["34436003"], icd10=["R31.9"], umls=["C0018965"]),  # Hematuria
    48: c(snomed=["405729008"], icd10=["R36.1"], umls=["C0018978"]),  # Hematospermia
    49: c(snomed=["30473006", "279039007"], icd10=["R10.2", "M54.5"], umls=["C0019559", "C0022821"]),  # Pelvic/groin/LBP
    50: c(snomed=["266529003"], icd10=["R19.4"], umls=["C0009214"]),  # Change in bowel habit
    51: c(snomed=["14760008", "62315008"], icd10=["K59.00", "K59.1"], umls=["C0009806", "C0011991"]),  # Constipation/diarrhea
    52: c(snomed=["405729008"], icd10=["K92.1"], umls=["C0018932"]),  # Hematochezia
    53: c(snomed=["2901004"], icd10=["K92.1"], umls=["C0025222"]),  # Melena
    54: c(snomed=["21522001"], icd10=["R10.9"], umls=["C0000737"]),  # Abdominal pain
    55: c(snomed=["73879007", "162059005"], icd10=["R14.0"], umls=["C0016204", "C0239135"]),  # Bloating / early satiety
    56: c(snomed=["422587007", "288227007"], icd10=["R11.2", "R13.10"], umls=["C0027497", "C0011168"]),  # Nausea/vomiting / dysphagia
    57: c(snomed=["271737000", "87572000"], icd10=["D50.9"], umls=["C0002871", "C0162316"]),  # Anemia / iron deficiency
    58: c(snomed=["49727002"], icd10=["R05.9"], umls=["C0010200"]),  # Cough
    59: c(snomed=["49727002"], icd10=["R05.3"], umls=["C0010200"]),  # Change in cough
    60: c(snomed=["267036007"], icd10=["R06.02"], umls=["C0013404"]),  # Dyspnea
    61: c(snomed=["29857009"], icd10=["R07.9"], umls=["C0008031"]),  # Chest pain
    62: c(snomed=["66857006"], icd10=["R04.2"], umls=["C0019079"]),  # Hemoptysis
    63: c(snomed=["1641000119105"], icd10=["R49.0"], umls=["C0019825"]),  # Hoarseness
    64: c(snomed=["300888008"], icd10=["N50.9"], umls=["C0232940"]),  # Testicular mass
    65: c(snomed=["102616008"], icd10=["N50.81"], umls=["C0039591"]),  # Testicular pain/heaviness
    66: c(snomed=["26946001"], icd10=["D48.5"], umls=["C0025202"]),  # Changing mole / melanoma concern
    67: c(snomed=["403180003", "399963005"], icd10=["L55.9"], umls=["C0038814"]),  # Sunburn / tanning bed
    68: c(snomed=["63476007"], loinc=["2857-1"], umls=["C0201544"]),  # PSA
    69: c(snomed=["410457007"], loinc=["32465-7"], umls=["C0201570"]),  # DRE prostate
    70: c(snomed=["73761001"], loinc=["28026-4"], umls=["C0009378"]),  # Colonoscopy
    71: c(snomed=["167777007"], loinc=["2335-8"], umls=["C0016399"]),  # FOBT
    72: c(snomed=["16310003"], loinc=["79190-6"], umls=["C0040405"]),  # Low-dose CT lung
    73: c(snomed=["439401001"], icd10=["Z12.9"], umls=["C0420112"]),  # Abnormal screening
    74: c(snomed=["171207006"], umls=["C0420113"]),  # Colorectal screening awareness
    75: c(snomed=["171207006"], umls=["C0420114"]),  # Prostate screening awareness
    76: c(snomed=["225328001"], umls=["C0424472"]),  # Delayed care seeking
    77: c(snomed=["266757002"], umls=["C0424473"]),  # Care avoidance fear/cost
}

# Female clinical questions
FEMALE_Q = {
    1: c(snomed=["275937001"], icd10=["Z80.9"], umls=["C0241888"]),
    2: c(snomed=["429740004"], icd10=["Z80.3"], umls=["C0429966"]),
    3: c(snomed=["275941003"], icd10=["Z80.41"], umls=["C0260421"]),
    4: c(snomed=["275937001"], icd10=["Z80.0", "Z80.49"], umls=["C0260418"]),
    5: c(snomed=["275937001"], icd10=["Z80.9"], umls=["C0241888"]),
    6: c(snomed=["275937001"], icd10=["Z80.9"], umls=["C0241888"]),
    7: c(snomed=["429740004"], icd10=["Z80.3"], umls=["C0429966"]),
    8: c(snomed=["412734009", "445243001"], loinc=["50995-0"], umls=["C1515112", "C1333991"]),
    9: c(snomed=["363346000"], icd10=["Z85.9"], umls=["C0006826"]),
    10: c(snomed=["86273004"], loinc=["33717-0"], umls=["C0005558"]),  # Biopsy
    11: c(snomed=["108290001"], icd10=["Z92.3"], umls=["C1522449"]),  # Chest radiotherapy
    12: c(snomed=["24526004", "34000006"], icd10=["K51", "K50"], umls=["C0009324", "C0010346"]),
    13: c(snomed=["66071002", "50711007"], icd10=["B18.1", "B18.2"], umls=["C0019163", "C0019196"]),
    14: c(snomed=["370388006"], icd10=["D84.9"], umls=["C0021051"]),  # Immunodeficiency / steroids
    15: c(snomed=["240532009"], icd10=["B97.7"], umls=["C0001486"]),  # HPV / genital warts
    16: c(snomed=["44054006", "38341003", "55822004"], icd10=["E11", "I10", "E78.5"], umls=["C0011860", "C0020538", "C0020473"]),
    17: c(snomed=["398057008"], loinc=["42759-4"], umls=["C0025329"]),  # Age at menarche
    18: c(snomed=["161712005"], loinc=["42829-5"], umls=["C0025325"]),  # Age at menopause
    19: c(snomed=["102872001"], icd10=["Z64.0"], umls=["C0032977"]),  # Nulliparity
    20: c(snomed=["102873006"], umls=["C0425959"]),  # Late first pregnancy
    21: c(snomed=["8619003"], icd10=["N97.9"], umls=["C0021359"]),  # Infertility
    22: c(snomed=["169741004"], umls=["C0006147"]),  # Breastfeeding history
    23: c(snomed=["182838006", "266717002"], icd10=["Z79.3"], umls=["C0009905", "C0282411"]),  # HRT / OCP
    24: c(snomed=["237055002"], icd10=["E28.2"], umls=["C0032460"]),  # PCOS
    25: c(snomed=["271825005"], icd10=["N63"], umls=["C0025566"]),  # Breast lump
    26: c(snomed=["127189005"], icd10=["R59.0"], umls=["C0578736"]),  # Axillary / clavicular mass
    27: c(snomed=["290113009"], icd10=["N64.89"], umls=["C0239379"]),  # Breast size/shape change
    28: c(snomed=["290066008"], icd10=["N64.59"], umls=["C0239381"]),  # Skin dimpling / peau d'orange
    29: c(snomed=["290113009"], icd10=["N61"], umls=["C0006145"]),  # Breast erythema/thickening
    30: c(snomed=["290068009"], icd10=["N64.52"], umls=["C0149740"]),  # Nipple discharge
    31: c(snomed=["290113009"], icd10=["N64.59"], umls=["C0239382"]),  # Nipple changes
    32: c(snomed=["53430007"], icd10=["N64.4"], umls=["C0024902"]),  # Mastalgia
    33: c(snomed=["266599000"], icd10=["N92.1"], umls=["C0025323"]),  # Intermenstrual / postcoital bleeding
    34: c(snomed=["21840007"], icd10=["N95.0"], umls=["C0135212"]),  # Postmenopausal bleeding
    35: c(snomed=["386692008"], icd10=["N92.0"], umls=["C0025322"]),  # Menorrhagia
    36: c(snomed=["30473006"], icd10=["R10.2"], umls=["C0019559"]),  # Pelvic pain
    37: c(snomed=["271939006"], icd10=["N89.8"], umls=["C0042251"]),  # Abnormal vaginal discharge
    38: c(snomed=["266599000"], icd10=["N94.1"], umls=["C0013394"]),  # Dyspareunia
    39: c(snomed=["73879007", "162059005"], icd10=["R14.0"], umls=["C0016204", "C0239135"]),
    40: c(snomed=["162116003", "30473006"], icd10=["R35.0", "R10.2"], umls=["C0042023", "C0019559"]),
    41: c(snomed=["89362005"], icd10=["R63.4"], umls=["C0043096"]),
    42: c(snomed=["84229001"], icd10=["R53.83"], umls=["C0015672"]),
    43: c(snomed=["271737000", "87572000"], icd10=["D50.9"], umls=["C0002871", "C0162316"]),
    44: c(snomed=["266529003"], icd10=["R19.4"], umls=["C0009214"]),
    45: c(snomed=["405729008", "2901004"], icd10=["K92.1"], umls=["C0018932", "C0025222"]),
    46: c(snomed=["21522001", "79890006"], icd10=["R10.9", "R63.0"], umls=["C0000737", "C0003123"]),
    47: c(snomed=["266433003", "288227007"], icd10=["K21.9", "R13.10"], umls=["C0018834", "C0011168"]),
    48: c(snomed=["49727002", "267036007", "66857006"], icd10=["R05.9", "R06.02", "R04.2"], umls=["C0010200", "C0013404", "C0019079"]),
    49: c(snomed=["77176002", "8517006"], icd10=["F17.210", "Z87.891"], umls=["C0037369", "C3241966"]),
    50: c(snomed=["722499006"], icd10=["F17.290"], umls=["C4554196"]),
    51: c(snomed=["219006"], icd10=["F10.10"], umls=["C0001948"]),
    52: c(snomed=["228448000"], loinc=["68516-4"], umls=["C0425305"]),
    53: c(snomed=["226145004"], umls=["C0684233"]),
    54: c(snomed=["226167000"], loinc=["75285-2"], umls=["C0425411"]),
    55: c(snomed=["414916001", "238136002"], icd10=["E66.9"], umls=["C0028754", "C0349218"]),
    56: c(snomed=["370977006"], icd10=["Z57.5"], umls=["C0038436"]),
    57: c(snomed=["171149006", "439958008"], loinc=["10524-7", "77378-9"], umls=["C0030354", "C1515110"]),  # Pap/HPV
    58: c(snomed=["439401001"], icd10=["R87.61"], umls=["C0420112"]),
    59: c(snomed=["33879002"], loinc=["30940-0"], umls=["C1515111"]),  # HPV vaccine
    60: c(snomed=["71651007"], loinc=["24606-6"], umls=["C0024671"]),  # Mammography
    61: c(snomed=["47079000", "241615005"], loinc=["24604-1", "30719-6"], umls=["C0041618", "C0024485"]),  # Breast US/MRI
    62: c(snomed=["73761001", "167777007"], loinc=["28026-4", "2335-8"], umls=["C0009378", "C0016399"]),
    63: c(snomed=["171207006"], umls=["C0420115"]),  # Breast self-exam awareness
    64: c(snomed=["225328001"], umls=["C0424472"]),  # Prompt care seeking
}


def main():
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    mapping: dict[str, dict] = {}

    for form in seed["forms"]:
        for item in form["items"]:
            code = item["code"]
            if "_BASE_" in code:
                field = code.split("_BASE_", 1)[1]
                if field not in BASE_FIELDS:
                    raise SystemExit(f"missing demographics coding for {code}")
                mapping[code] = BASE_FIELDS[field]
                continue
            if "_Q" in code:
                num = int(code.rsplit("_Q", 1)[1])
                table = MALE_Q if code.startswith("CA_M_") else FEMALE_Q
                if num not in table:
                    raise SystemExit(f"missing Q coding for {code}")
                mapping[code] = table[num]
                continue
            raise SystemExit(f"unhandled item code {code}")

    expected = {i["code"] for f in seed["forms"] for i in f["items"]}
    missing = expected - set(mapping)
    extra = set(mapping) - expected
    if missing or extra:
        raise SystemExit(f"map mismatch missing={sorted(missing)} extra={sorted(extra)}")

    for code, row in mapping.items():
        if not row["umls"]:
            raise SystemExit(f"{code} missing umls")
        if not (row["snomed"] or row["loinc"] or row["icd10"]):
            raise SystemExit(f"{code} missing terminology codes")
        for cui in row["umls"]:
            if not (cui.startswith("C") and cui[1:].isdigit() and len(cui) == 8):
                raise SystemExit(f"{code} invalid umls CUI {cui}")

    OUT.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} entries={len(mapping)}")


if __name__ == "__main__":
    main()
