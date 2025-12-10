import type { GlossaryTerm, Stream } from "../types";

export const getNorwegianForTerm = (term: GlossaryTerm, stream: Stream): string | null => {
  if (stream === "bokmaal") {
    return term.translation_nb || term.term;
  }
  if (stream === "nynorsk") {
    return term.translation_nn || term.translation_nb || term.term;
  }
  return term.term;
};

export const pickTranslationForTower = (term: GlossaryTerm, i18n: { language: string }): string => {
    const lang = i18n.language;
    if (lang.startsWith("ru")) {
      return (
        term.translation_ru ||
        term.translation_en ||
        term.translation_nb ||
        term.translation_nn ||
        term.term
      );
    }
    return (
      term.translation_en ||
      term.translation_ru ||
      term.translation_nb ||
      term.translation_nn ||
      term.term
    );
};
