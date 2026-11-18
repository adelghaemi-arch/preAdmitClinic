import terminologyIndex from "@/lib/terminology-index.json";
import type { FormItemCoding } from "@/types/clinic";
import { matchesAllTerms } from "@/lib/workspace";

export interface TerminologyConcept {
  cui: string;
  nameEn: string;
  nameFa: string;
  snomed: string[];
  loinc: string[];
  icd10: string[];
  kinds: string[];
}

const CONCEPTS: TerminologyConcept[] = (
  terminologyIndex as { concepts: TerminologyConcept[] }
).concepts;

const BY_CUI = new Map(CONCEPTS.map((c) => [c.cui, c]));

function conceptHaystack(concept: TerminologyConcept): string {
  return [
    concept.cui,
    concept.nameEn,
    concept.nameFa,
    ...concept.snomed,
    ...concept.loinc,
    ...concept.icd10,
    ...concept.kinds,
  ].join(" ");
}

export function listTerminologyConcepts(): TerminologyConcept[] {
  return CONCEPTS;
}

export function getConceptByCui(cui: string): TerminologyConcept | undefined {
  return BY_CUI.get(cui.trim().toUpperCase()) ?? BY_CUI.get(cui.trim());
}

export function searchTerminology(query: string, limit = 12): TerminologyConcept[] {
  const q = query.trim();
  if (!q) return CONCEPTS.slice(0, limit);
  const matched = CONCEPTS.filter((c) => matchesAllTerms(conceptHaystack(c), q));
  return matched.slice(0, limit);
}

function unionCodes(existing: string[] | undefined, incoming: string[]): string[] {
  const out = [...(existing ?? [])];
  for (const code of incoming) {
    if (code && !out.includes(code)) out.push(code);
  }
  return out;
}

/** Merge a picked concept into item coding without dropping prior codes. */
export function mergeCodingFromConcept(
  current: FormItemCoding,
  concept: TerminologyConcept
): FormItemCoding {
  return {
    ...current,
    umls: unionCodes(current.umls, [concept.cui]),
    snomed: unionCodes(current.snomed, concept.snomed),
    loinc: unionCodes(current.loinc, concept.loinc),
    icd10: unionCodes(current.icd10, concept.icd10),
  };
}

export function formatConceptLabel(concept: TerminologyConcept): string {
  return `${concept.nameFa} · ${concept.nameEn} · ${concept.cui}`;
}

export function resolveCuiLabels(cuis: string[]): string[] {
  return cuis
    .map((cui) => {
      const hit = getConceptByCui(cui);
      return hit ? `${hit.nameFa} (${cui})` : cui;
    })
    .filter(Boolean);
}
