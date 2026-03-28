import { describe, expect, it } from "vitest";

import { __testables } from "./api";

describe("api normalizers", () => {
  it("normalizes glossary terms with missing optional fields", () => {
    const result = __testables.normalizeGlossaryTerm({
      id: 7,
      term: "hei",
      stream: "bokmaal",
      level: "A1",
    });

    expect(result).toEqual({
      id: 7,
      term: "hei",
      translation: "",
      translation_en: "",
      translation_ru: "",
      translation_nn: "",
      translation_nb: "",
      explanation: "",
      stream: "bokmaal",
      level: "A1",
      tags: [],
    });
  });

  it("normalizes user lexemes and fills safe defaults", () => {
    const result = __testables.normalizeUserLexeme({
      id: 3,
      times_reviewed: 2,
      times_correct: 1,
      last_reviewed_at: null,
      created_at: "2026-03-28T12:00:00Z",
      updated_at: "2026-03-28T12:30:00Z",
    });

    expect(result).toMatchObject({
      id: 3,
      source: "glossary",
      kind: "word",
      glossary_term: null,
      concept_key: "",
      text: "",
      translation_en: "",
      translation_ru: "",
      translation_nb: "",
      translation_nn: "",
      example: "",
      notes: "",
      tags: [],
      language: "",
      level: "",
      times_reviewed: 2,
      times_correct: 1,
      last_reviewed_at: null,
      is_archived: false,
    });
  });

  it("normalizes test detail question metadata", () => {
    const result = __testables.normalizeTestDetail({
      id: 1,
      title: "Placement A1",
      slug: "placement-a1",
      level: "A1",
      question_count: 1,
      question_mode: "mixed",
      is_restricted: false,
      questions: [
        {
          id: 101,
          text: "Choose",
          options: [{ id: 1, text: "A" }],
        },
      ],
    });

    expect(result.question_mode).toBe("mixed");
    expect(result.stream).toBe("bokmaal");
    expect(result.questions[0]).toEqual({
      id: 101,
      text: "Choose",
      question_type: "single",
      order: 0,
      options: [{ id: 1, text: "A", order: 0 }],
    });
  });

  it("validates normalized profile data with runtime schema", () => {
    const result = __testables.parseValidated(
      __testables.profileInfoSchema,
      {
        is_teacher: false,
        is_authenticated: true,
        display_name: "Stanislav",
        stream: "bokmaal",
        level: "A1",
      },
      "profile",
    );

    expect(result).toMatchObject({
      is_authenticated: true,
      display_name: "Stanislav",
      stream: "bokmaal",
      level: "A1",
    });
  });

  it("throws on invalid runtime schema payloads", () => {
    expect(() =>
      __testables.parseValidated(
        __testables.testsSchema,
        [
          {
            id: 1,
            title: "Broken test",
            slug: "broken-test",
            description: "",
            level: "C1",
            stream: "bokmaal",
            estimated_minutes: 10,
            question_count: 1,
            question_mode: "single",
            is_restricted: false,
          },
        ],
        "tests",
      ),
    ).toThrow(/tests validation failed/i);
  });
});
