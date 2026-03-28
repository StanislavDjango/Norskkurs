import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchMaterials,
  fetchHomework,
  fetchExercises,
  fetchExpressions,
} = vi.hoisted(() => ({
  fetchMaterials: vi.fn(),
  fetchHomework: vi.fn(),
  fetchExercises: vi.fn(),
  fetchExpressions: vi.fn(),
}));

vi.mock("../api", () => ({
  fetchMaterials,
  fetchHomework,
  fetchExercises,
  fetchExpressions,
}));

import { useLearningContent } from "./useLearningContent";

describe("useLearningContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMaterials.mockResolvedValue([
      {
        id: 1,
        title: "Material",
        stream: "bokmaal",
        level: "A1",
        material_type: "text",
        body: "Body",
        url: "",
        tags: [],
      },
    ]);
    fetchHomework.mockResolvedValue([
      {
        id: 2,
        title: "Homework",
        stream: "bokmaal",
        level: "A1",
        instructions: "Do it",
        attachments: [],
        status: "published",
      },
    ]);
    fetchExercises.mockResolvedValue([
      {
        id: 3,
        title: "Exercise",
        stream: "bokmaal",
        level: "A1",
        kind: "quiz",
        prompt: "Prompt",
        tags: [],
        estimated_minutes: 5,
      },
    ]);
    fetchExpressions.mockResolvedValue([
      {
        id: 4,
        phrase: "ha det",
        meaning_en: "bye",
        meaning_nb: "ha det",
        meaning_nn: "ha det",
        meaning_ru: "пока",
        example: "Ha det!",
        stream: "bokmaal",
        tags: [],
      },
    ]);
  });

  it("loads learning content collections for the selected stream and level", async () => {
    const { result } = renderHook(() =>
      useLearningContent({
        studentEmail: "student@example.com",
        stream: "bokmaal",
        currentLevel: "A1",
      }),
    );

    await waitFor(() => {
      expect(result.current.materials).toHaveLength(1);
      expect(result.current.homework).toHaveLength(1);
      expect(result.current.exercises).toHaveLength(1);
      expect(result.current.expressions).toHaveLength(1);
    });

    expect(fetchMaterials).toHaveBeenCalledWith({
      student_email: "student@example.com",
      stream: "bokmaal",
      level: "A1",
    });
    expect(fetchHomework).toHaveBeenCalledWith({
      student_email: "student@example.com",
      stream: "bokmaal",
      level: "A1",
    });
  });

  it("falls back to empty collections when requests fail", async () => {
    fetchMaterials.mockRejectedValueOnce(new Error("boom"));
    fetchHomework.mockRejectedValueOnce(new Error("boom"));
    fetchExercises.mockRejectedValueOnce(new Error("boom"));
    fetchExpressions.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() =>
      useLearningContent({
        studentEmail: "",
        stream: "nynorsk",
        currentLevel: "B1",
      }),
    );

    await waitFor(() => {
      expect(result.current.materials).toEqual([]);
      expect(result.current.homework).toEqual([]);
      expect(result.current.exercises).toEqual([]);
      expect(result.current.expressions).toEqual([]);
    });

    expect(fetchMaterials).toHaveBeenCalledWith({
      student_email: undefined,
      stream: "nynorsk",
      level: "B1",
    });
  });
});
