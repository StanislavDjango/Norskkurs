import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchUserLexemes,
  createUserLexeme,
  deleteUserLexeme,
  exportUserLexemesCsv,
  fetchGlossary,
  importUserLexemesCsv,
  reviewUserLexeme,
  toggleUserLexeme,
  updateUserLexeme,
} = vi.hoisted(() => ({
  fetchUserLexemes: vi.fn(),
  createUserLexeme: vi.fn(),
  deleteUserLexeme: vi.fn(),
  exportUserLexemesCsv: vi.fn(),
  fetchGlossary: vi.fn(),
  importUserLexemesCsv: vi.fn(),
  reviewUserLexeme: vi.fn(),
  toggleUserLexeme: vi.fn(),
  updateUserLexeme: vi.fn(),
}));

vi.mock("../api", () => ({
  fetchUserLexemes,
  createUserLexeme,
  deleteUserLexeme,
  exportUserLexemesCsv,
  fetchGlossary,
  importUserLexemesCsv,
  reviewUserLexeme,
  toggleUserLexeme,
  updateUserLexeme,
}));

import { useLexemes } from "./useLexemes";

describe("useLexemes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchUserLexemes.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 11,
          source: "custom",
          kind: "word",
          glossary_term: null,
          concept_key: "hello|hallo|||",
          text: "hello",
          translation_en: "hello",
          translation_nb: "hallo",
          translation_nn: "",
          translation_ru: "",
          example: "",
          notes: "",
          tags: [],
          language: "english",
          level: "A1",
          times_reviewed: 0,
          times_correct: 0,
          last_reviewed_at: null,
          is_archived: false,
          created_at: "2026-03-28T10:00:00Z",
          updated_at: "2026-03-28T10:00:00Z",
        },
      ],
    });
    fetchGlossary.mockResolvedValue([]);
  });

  it("loads user lexemes for authenticated users", async () => {
    const setVocabFavorites = vi.fn();
    const { result } = renderHook(() =>
      useLexemes({
        auth: { is_authenticated: true, is_teacher: false },
        stream: "bokmaal",
        vocabFavorites: [],
        setVocabFavorites,
      }),
    );

    await waitFor(() => {
      expect(result.current.userLexemesLoading).toBe(false);
      expect(result.current.userLexemes).toHaveLength(1);
    });

    expect(fetchUserLexemes).toHaveBeenCalledWith({ page: 1, page_size: 200 });
  });

  it("toggles local favorites without API when the user is not authenticated", async () => {
    const setVocabFavorites = vi.fn();
    const { result } = renderHook(() =>
      useLexemes({
        auth: null,
        stream: "bokmaal",
        vocabFavorites: [],
        setVocabFavorites,
      }),
    );

    await act(async () => {
      await result.current.toggleVocabFavorite("hello|hallo|||");
    });

    expect(toggleUserLexeme).not.toHaveBeenCalled();
    expect(setVocabFavorites).toHaveBeenCalledTimes(1);

    const update = setVocabFavorites.mock.calls[0][0] as (prev: string[]) => string[];
    expect(update([])).toEqual(["hello|hallo||"]);
    expect(update(["hello|hallo||"])).toEqual([]);
  });
});
