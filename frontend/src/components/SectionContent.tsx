import React from "react";

import type { ProfileInfo, Stream, Level, Material, Homework, Exercise, Expression, UserLexeme, UserLexemeImportResult } from "../types";
import type { ProfileDraft, Section } from "../app/types";

const ReadingsPage = React.lazy(() => import("../pages/ReadingsPage"));
const ProfilePage = React.lazy(() => import("../pages/ProfilePage"));
const GlossaryPage = React.lazy(() => import("../pages/GlossaryPage"));
const GamesPage = React.lazy(() => import("../pages/GamesPage"));
const VerbsPage = React.lazy(() => import("../pages/VerbsPage"));
const MaterialsPage = React.lazy(() => import("../pages/MaterialsPage"));
const ExercisesPage = React.lazy(() => import("../pages/ExercisesPage"));
const HomeworkPage = React.lazy(() => import("../pages/HomeworkPage"));
const ExpressionsPage = React.lazy(() => import("../pages/ExpressionsPage"));
const ContactPage = React.lazy(() => import("../pages/ContactPage"));
const MyWordsPage = React.lazy(() => import("../pages/MyWordsPage"));

type Props = {
  activeSection: Section;
  auth: ProfileInfo | null;
  profile: ProfileDraft;
  setProfile: React.Dispatch<React.SetStateAction<ProfileDraft>>;
  studentEmail: string;
  profileAuthError: string | null;
  profileSaveSuccess: boolean;
  onSaveProfile: () => void;
  vocabFavoritesCount: number;
  expressionFavoritesCount: number;
  onOpenVocabFavorites: () => void;
  onOpenExpressionsFavorites: () => void;
  onOpenMyWords: () => void;
  stream: Stream;
  currentLevel: Level;
  vocabFavorites: string[];
  onToggleVocabFavorite: (id: string, meta?: Partial<UserLexeme>) => Promise<void>;
  onOpenGlossaryFavorites: () => void;
  streamLabel: (value: Stream) => string;
  materials: Material[];
  exercises: Exercise[];
  homework: Homework[];
  levelLabel: (level: string) => string;
  expressions: Expression[];
  expressionFavorites: number[];
  expressionView: "all" | "favorites";
  onChangeExpressionView: React.Dispatch<React.SetStateAction<"all" | "favorites">>;
  onToggleExpressionFavorite: (id: number) => void;
  userLexemes: UserLexeme[];
  userLexemesLoading: boolean;
  onRefreshLexemes: () => Promise<void>;
  onAddLexeme: (
    payload: Partial<UserLexeme> & {
      text?: string;
      translation_en?: string;
      translation_nb?: string;
      translation_nn?: string;
      translation_ru?: string;
    },
  ) => Promise<UserLexeme | null>;
  onUpdateLexeme: (id: number, payload: Partial<UserLexeme>) => Promise<UserLexeme | null>;
  onDeleteLexeme: (id: number) => Promise<void>;
  onReviewLexeme: (id: number, correct: boolean) => Promise<UserLexeme | null>;
  onExportLexemesCsv: () => Promise<{ blob: Blob; filename: string }>;
  onImportLexemesCsv: (
    file: File,
    options?: { update?: boolean },
  ) => Promise<UserLexemeImportResult>;
  glossaryInitialView: "all" | "favorites";
};

const SectionContent: React.FC<Props> = ({
  activeSection,
  auth,
  profile,
  setProfile,
  studentEmail,
  profileAuthError,
  profileSaveSuccess,
  onSaveProfile,
  vocabFavoritesCount,
  expressionFavoritesCount,
  onOpenVocabFavorites,
  onOpenExpressionsFavorites,
  onOpenMyWords,
  stream,
  currentLevel,
  vocabFavorites,
  onToggleVocabFavorite,
  onOpenGlossaryFavorites,
  streamLabel,
  materials,
  exercises,
  homework,
  levelLabel,
  expressions,
  expressionFavorites,
  expressionView,
  onChangeExpressionView,
  onToggleExpressionFavorite,
  userLexemes,
  userLexemesLoading,
  onRefreshLexemes,
  onAddLexeme,
  onUpdateLexeme,
  onDeleteLexeme,
  onReviewLexeme,
  onExportLexemesCsv,
  onImportLexemesCsv,
  glossaryInitialView,
}) => {
  switch (activeSection) {
    case "profile":
      return (
        <ProfilePage
          auth={auth}
          profile={profile}
          setProfile={setProfile}
          studentEmail={studentEmail}
          profileAuthError={profileAuthError}
          profileSaveSuccess={profileSaveSuccess}
          onSaveProfile={onSaveProfile}
          vocabFavoritesCount={vocabFavoritesCount}
          expressionFavoritesCount={expressionFavoritesCount}
          onOpenVocabFavorites={onOpenVocabFavorites}
          onOpenExpressionsFavorites={onOpenExpressionsFavorites}
          onOpenMyWords={onOpenMyWords}
        />
      );
    case "readings":
      return (
        <ReadingsPage
          stream={stream}
          currentLevel={currentLevel}
          studentEmail={studentEmail}
          vocabFavorites={vocabFavorites}
          isAuthenticated={auth?.is_authenticated}
          onToggleVocabFavorite={onToggleVocabFavorite}
          onOpenMyWords={onOpenGlossaryFavorites}
          streamLabel={streamLabel}
        />
      );
    case "materials":
      return <MaterialsPage materials={materials} streamLabel={streamLabel} />;
    case "exercises":
      return <ExercisesPage exercises={exercises} streamLabel={streamLabel} />;
    case "homework":
      return (
        <HomeworkPage
          homework={homework}
          stream={stream}
          currentLevel={currentLevel}
          streamLabel={streamLabel}
          levelLabel={levelLabel}
        />
      );
    case "partsOfSpeech":
      return (
        <VerbsPage
          stream={stream}
          currentLevel={currentLevel}
          studentEmail={studentEmail}
          defaultTag="all"
          initialPartOfSpeech="verb"
        />
      );
    case "expressions":
      return (
        <ExpressionsPage
          expressions={expressions}
          expressionFavorites={expressionFavorites}
          expressionView={expressionView}
          onChangeView={onChangeExpressionView}
          onToggleFavorite={onToggleExpressionFavorite}
          streamLabel={streamLabel}
        />
      );
    case "myWords":
      return (
        <MyWordsPage
          auth={auth}
          lexemes={userLexemes}
          loading={userLexemesLoading}
          onRefresh={onRefreshLexemes}
          onAdd={onAddLexeme}
          onUpdate={onUpdateLexeme}
          onDelete={onDeleteLexeme}
          onToggleFavorite={onToggleVocabFavorite}
          onReview={onReviewLexeme}
          onExportCsv={onExportLexemesCsv}
          onImportCsv={onImportLexemesCsv}
        />
      );
    case "games":
      return (
        <GamesPage
          stream={stream}
          currentLevel={currentLevel}
          vocabFavorites={vocabFavorites}
          onToggleVocabFavorite={onToggleVocabFavorite}
        />
      );
    case "glossary":
      return (
        <GlossaryPage
          stream={stream}
          currentLevel={currentLevel}
          vocabFavorites={vocabFavorites}
          isAuthenticated={auth?.is_authenticated}
          onToggleFavorite={onToggleVocabFavorite}
          initialView={glossaryInitialView}
        />
      );
    case "contact":
      return <ContactPage />;
    default:
      return null;
  }
};

export default SectionContent;
