import { describe, expect, it } from "vitest";

import {
  mergeExpressionFavorites,
  mergeProfileDraftFromInfo,
  mergeVocabFavorites,
} from "./profile";

describe("profile helpers", () => {
  it("merges vocab favorites without duplicates", () => {
    const result = mergeVocabFavorites(["hi|hei|||"], ["hi|hei|||", "hello|||"]);
    expect(result).toEqual(["hi|hei||", "hello|||"]);
  });

  it("merges expression favorites as numbers", () => {
    const result = mergeExpressionFavorites([1], [1, "2", "bad"]);
    expect(result).toEqual([1, 2]);
  });

  it("fills missing profile draft fields from profile info", () => {
    const result = mergeProfileDraftFromInfo(
      {
        name: "",
        email: "",
        firstName: "",
        lastName: "",
        middleName: "",
        dateOfBirth: "",
        learningLanguage: "",
        nativeLanguage: "",
      },
      {
        is_teacher: false,
        is_authenticated: true,
        display_name: "Student Demo",
        first_name: "Student",
        last_name: "Demo",
        native_language: "ru",
      },
    );
    expect(result.name).toBe("Student Demo");
    expect(result.firstName).toBe("Student");
    expect(result.lastName).toBe("Demo");
    expect(result.nativeLanguage).toBe("ru");
  });
});
