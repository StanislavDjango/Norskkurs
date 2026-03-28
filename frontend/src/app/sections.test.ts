import { describe, expect, it } from "vitest";

import { buildSectionPath, parseSectionFromPathname } from "./sections";

describe("section routes", () => {
  it("builds stable paths for sections", () => {
    expect(buildSectionPath("readings")).toBe("/readings");
    expect(buildSectionPath("myWords")).toBe("/my-words");
    expect(buildSectionPath("partsOfSpeech")).toBe("/parts-of-speech");
  });

  it("parses section paths and falls back to the default section", () => {
    expect(parseSectionFromPathname("/tests")).toBe("tests");
    expect(parseSectionFromPathname("/my-words/")).toBe("myWords");
    expect(parseSectionFromPathname("/unknown")).toBe("readings");
    expect(parseSectionFromPathname("")).toBe("readings");
  });
});
