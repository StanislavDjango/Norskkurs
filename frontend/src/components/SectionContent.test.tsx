import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SectionContent from "./SectionContent";
import type { Exercise, Expression, Homework, Material, UserLexeme, UserLexemeImportResult } from "../types";
import type { ProfileDraft } from "../app/types";

vi.mock("../pages/ProfilePage", () => ({
  default: () => <div>Profile page</div>,
}));
vi.mock("../pages/ReadingsPage", () => ({
  default: () => <div>Readings page</div>,
}));
vi.mock("../pages/MaterialsPage", () => ({
  default: ({ materials }: { materials: Array<{ title: string }> }) => (
    <div>Materials: {materials.map((item) => item.title).join(", ")}</div>
  ),
}));
vi.mock("../pages/ExercisesPage", () => ({
  default: () => <div>Exercises page</div>,
}));
vi.mock("../pages/HomeworkPage", () => ({
  default: ({ homework }: { homework: Array<{ title: string }> }) => (
    <div>Homework: {homework.map((item) => item.title).join(", ")}</div>
  ),
}));
vi.mock("../pages/VerbsPage", () => ({
  default: () => <div>Verbs page</div>,
}));
vi.mock("../pages/ExpressionsPage", () => ({
  default: () => <div>Expressions page</div>,
}));
vi.mock("../pages/MyWordsPage", () => ({
  default: () => <div>My words page</div>,
}));
vi.mock("../pages/GamesPage", () => ({
  default: () => <div>Games page</div>,
}));
vi.mock("../pages/GlossaryPage", () => ({
  default: () => <div>Glossary page</div>,
}));
vi.mock("../pages/ContactPage", () => ({
  default: () => <div>Contact page</div>,
}));

const baseProfile: ProfileDraft = {
  name: "",
  email: "",
  firstName: "",
  lastName: "",
  middleName: "",
  dateOfBirth: "",
  learningLanguage: "",
  nativeLanguage: "",
};

const materials: Material[] = [
  {
    id: 1,
    title: "Intro",
    stream: "bokmaal",
    level: "A1",
    material_type: "text",
    body: "",
    url: "",
    tags: [],
  },
];

const homework: Homework[] = [
  {
    id: 2,
    title: "Essay",
    stream: "bokmaal",
    level: "A1",
    instructions: "",
    attachments: [],
    status: "published",
  },
];

const baseProps = {
  auth: null,
  profile: baseProfile,
  setProfile: vi.fn(),
  studentEmail: "",
  profileAuthError: null,
  profileSaveSuccess: false,
  onSaveProfile: vi.fn(),
  vocabFavoritesCount: 0,
  expressionFavoritesCount: 0,
  onOpenVocabFavorites: vi.fn(),
  onOpenExpressionsFavorites: vi.fn(),
  onOpenMyWords: vi.fn(),
  stream: "bokmaal" as const,
  currentLevel: "A1" as const,
  vocabFavorites: [],
  onToggleVocabFavorite: vi.fn(),
  onOpenGlossaryFavorites: vi.fn(),
  streamLabel: (value: "bokmaal" | "nynorsk" | "english") => value,
  materials,
  exercises: [] as Exercise[],
  homework,
  levelLabel: (value: "A1" | "A2" | "B1" | "B2") => value,
  expressions: [] as Expression[],
  expressionFavorites: [],
  expressionView: "all" as const,
  onChangeExpressionView: vi.fn(),
  onToggleExpressionFavorite: vi.fn(),
  userLexemes: [] as UserLexeme[],
  userLexemesLoading: false,
  onRefreshLexemes: vi.fn<() => Promise<void>>(),
  onAddLexeme: vi.fn<
    (
      payload: Partial<UserLexeme> & {
        text?: string;
        translation_en?: string;
        translation_nb?: string;
        translation_nn?: string;
        translation_ru?: string;
      },
    ) => Promise<UserLexeme | null>
  >(),
  onUpdateLexeme: vi.fn<
    (id: number, payload: Partial<UserLexeme>) => Promise<UserLexeme | null>
  >(),
  onDeleteLexeme: vi.fn<(id: number) => Promise<void>>(),
  onReviewLexeme: vi.fn<
    (id: number, correct: boolean) => Promise<UserLexeme | null>
  >(),
  onExportLexemesCsv: vi.fn<() => Promise<{ blob: Blob; filename: string }>>(),
  onImportLexemesCsv: vi.fn<
    (file: File, options?: { update?: boolean }) => Promise<UserLexemeImportResult>
  >(),
  glossaryInitialView: "all" as const,
};

describe("SectionContent", () => {
  it("renders the page that matches the active section", async () => {
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <SectionContent {...baseProps} activeSection="materials" />
      </React.Suspense>,
    );

    expect(await screen.findByText("Materials: Intro")).toBeInTheDocument();
  });

  it("switches to another lazy section when the section changes", async () => {
    const { rerender } = render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <SectionContent {...baseProps} activeSection="homework" />
      </React.Suspense>,
    );

    expect(await screen.findByText("Homework: Essay")).toBeInTheDocument();

    rerender(
      <React.Suspense fallback={<div>Loading...</div>}>
        <SectionContent {...baseProps} activeSection="myWords" />
      </React.Suspense>,
    );

    expect(await screen.findByText("My words page")).toBeInTheDocument();
  });
});
