import type { Section } from "./types";

export const DEFAULT_SECTION: Section = "readings";

export const SECTION_SLUGS: Record<Section, string> = {
  profile: "profile",
  readings: "readings",
  materials: "materials",
  exercises: "exercises",
  tests: "tests",
  homework: "homework",
  partsOfSpeech: "parts-of-speech",
  expressions: "expressions",
  myWords: "my-words",
  games: "games",
  glossary: "glossary",
  contact: "contact",
};

const SLUG_TO_SECTION = Object.entries(SECTION_SLUGS).reduce<
  Record<string, Section>
>((acc, [section, slug]) => {
  acc[slug] = section as Section;
  return acc;
}, {});

export const buildSectionPath = (section: Section): string =>
  `/${SECTION_SLUGS[section]}`;

export const parseSectionFromPathname = (pathname: string): Section => {
  const normalized = String(pathname || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .trim()
    .toLowerCase();

  return SLUG_TO_SECTION[normalized] || DEFAULT_SECTION;
};
