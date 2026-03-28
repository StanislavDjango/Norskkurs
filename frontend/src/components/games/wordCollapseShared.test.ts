import { describe, expect, it } from "vitest";

import {
  clampInt,
  defaultRightLanguageForUi,
  normalizeForCompare,
  pickTextForLanguage,
  termKeyFor,
} from "./wordCollapseShared";

describe("wordCollapseShared", () => {
  it("normalizes strings for matching", () => {
    expect(normalizeForCompare("  Hei   verden ")).toBe("hei verden");
  });

  it("selects the correct translation for a language", () => {
    const term = {
      id: 1,
      term: "hei",
      translation: "hi",
      translation_en: "hi",
      translation_nb: "hei",
      translation_nn: "hei",
      translation_ru: "привет",
      explanation: "",
      stream: "bokmaal" as const,
      level: "A1" as const,
      tags: [],
    };

    expect(pickTextForLanguage(term, "english", true)).toBe("hi");
    expect(pickTextForLanguage(term, "russian", true)).toBe("привет");
    expect(pickTextForLanguage(term, "bokmaal", true)).toBe("hei");
  });

  it("chooses a sensible default language from UI locale", () => {
    expect(defaultRightLanguageForUi("ru")).toBe("russian");
    expect(defaultRightLanguageForUi("nb-NO")).toBe("bokmaal");
    expect(defaultRightLanguageForUi("en-US")).toBe("english");
  });

  it("builds stable term keys and clamps integers", () => {
    expect(
      termKeyFor({
        id: 8,
        term: "snakke",
        translation: "speak",
        translation_en: "speak",
        translation_nb: "snakke",
        translation_nn: "snakke",
        translation_ru: "говорить",
        explanation: "",
        stream: "bokmaal",
        level: "A1",
        tags: [],
        source: "glossary",
      }),
    ).toBe("glossary:8");
    expect(clampInt(13.6, 3, 10)).toBe(10);
    expect(clampInt(1.2, 3, 10)).toBe(3);
  });
});
