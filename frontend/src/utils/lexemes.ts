import type { GlossaryTerm } from "../types";

const normalizeLexemeValue = (value: string): string =>
  (value || "").replace(/\s+/g, " ").trim().toLowerCase();

export const buildConceptKey = (
  translationEn?: string,
  translationNb?: string,
  translationNn?: string,
  translationRu?: string,
): string =>
  [
    normalizeLexemeValue(translationEn || ""),
    normalizeLexemeValue(translationNb || ""),
    normalizeLexemeValue(translationNn || ""),
    normalizeLexemeValue(translationRu || ""),
  ].join("|");

export const buildConceptKeyFromTerm = (term: GlossaryTerm): string => {
  const conceptEn = term.translation_en || (term.stream === "english" ? term.term : "");
  const conceptNb = term.translation_nb || (term.stream === "bokmaal" ? term.term : "");
  const conceptNn = term.translation_nn || (term.stream === "nynorsk" ? term.term : "");
  const conceptRu = term.translation_ru || "";
  return buildConceptKey(conceptEn, conceptNb, conceptNn, conceptRu);
};

export const normalizeVocabId = (value: string): string => {
  const parts = String(value || "").split("|");
  if (parts.length === 3) {
    const [en, nb, ru] = parts;
    return buildConceptKey(en, nb, "", ru);
  }
  const [en = "", nb = "", nn = "", ru = ""] = parts;
  return buildConceptKey(en, nb, nn, ru);
};
