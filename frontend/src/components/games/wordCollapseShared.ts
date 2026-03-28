import type { GlossaryTerm, Stream, VerbEntry } from "../../types";

export type SpawnSpeed = 1500 | 2500 | 4000 | 6000 | 8000 | 10000 | 12000;
export type LanguageOption = Stream | "russian";
export type PlayableTerm = GlossaryTerm & { source: "glossary" | "verb" };
export type SpawnPair = { termKey: string; leftText: string; rightText: string };

export const languageOptions = [
  "bokmaal",
  "nynorsk",
  "english",
  "russian",
] as const;
export const spawnSpeedOptions: SpawnSpeed[] = [
  1500, 2500, 4000, 6000, 8000, 10000, 12000,
];
export const allowedLives = [3, 5, 10, 20] as const;
export const fallSpeedOptions = [60, 90, 120, 150, 180] as const;

export const partOptions = [
  { value: "verb", label: "parts.verb" },
  { value: "noun", label: "parts.noun" },
  { value: "adjective", label: "parts.adjective" },
  { value: "adverb", label: "parts.adverb" },
  { value: "pronoun", label: "parts.pronoun" },
  { value: "numeral", label: "parts.numeral" },
  { value: "preposition", label: "parts.preposition" },
  { value: "conjunction", label: "parts.conjunction" },
  { value: "interjection", label: "parts.interjection" },
] as const;

export const mapVerbEntryToPlayable = (entry: VerbEntry): PlayableTerm => ({
  id: entry.id,
  term: entry.infinitive,
  translation: entry.translation_en || entry.translation_nb || entry.translation_ru || "",
  translation_en: entry.translation_en,
  translation_ru: entry.translation_ru,
  translation_nb: entry.translation_nb,
  translation_nn: entry.translation_nb,
  explanation: "",
  stream: entry.stream,
  level: "A1",
  tags: [entry.part_of_speech, ...(entry.tags || [])],
  source: "verb",
});

export const termKeyFor = (term: PlayableTerm) => `${term.source}:${term.id}`;

export const normalizeForCompare = (value: string) =>
  value.replace(/\s+/g, " ").trim().toLowerCase();

export const pickTextForLanguage = (
  term: GlossaryTerm,
  lang: LanguageOption,
  strict: boolean,
) => {
  if (lang === "bokmaal") {
    return strict ? term.translation_nb || null : term.translation_nb || term.term;
  }
  if (lang === "nynorsk") {
    return strict
      ? term.translation_nn || null
      : term.translation_nn || term.translation_nb || term.term;
  }
  if (lang === "russian") {
    return strict
      ? term.translation_ru || null
      : term.translation_ru || term.translation_en || term.term;
  }
  return strict ? term.translation_en || null : term.translation_en || term.term;
};

export const defaultRightLanguageForUi = (
  uiLanguage: string,
): LanguageOption => {
  if (uiLanguage.startsWith("ru")) return "russian";
  if (uiLanguage.startsWith("nn")) return "nynorsk";
  if (uiLanguage.startsWith("nb") || uiLanguage.startsWith("no")) {
    return "bokmaal";
  }
  return "english";
};

export const randomInt = (max: number) => Math.floor(Math.random() * max);

export const shuffleInPlace = <T,>(items: T[]) => {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

export const sampleWithoutReplacement = <T,>(items: T[], count: number) => {
  if (count >= items.length) return [...items];
  const copy = [...items];
  for (let i = 0; i < count; i += 1) {
    const j = i + randomInt(copy.length - i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
};

export const isLanguageOption = (value: string): value is LanguageOption =>
  (languageOptions as readonly string[]).includes(value);

export const isSpawnSpeed = (value: number): value is SpawnSpeed =>
  spawnSpeedOptions.includes(value as SpawnSpeed);

export const isAllowedLives = (
  value: number,
): value is (typeof allowedLives)[number] =>
  (allowedLives as readonly number[]).includes(value);

export const isFallSpeed = (value: number): value is (typeof fallSpeedOptions)[number] =>
  (fallSpeedOptions as readonly number[]).includes(value);

export const clampInt = (value: number, min: number, max: number) => {
  const rounded = Math.round(value);
  return Math.min(max, Math.max(min, rounded));
};

export const isMobileViewport = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(max-width: 768px)")?.matches ??
    window.innerWidth <= 768
  );
};
