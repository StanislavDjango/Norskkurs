import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import ApiStatusOverlay from "./components/ApiStatusOverlay";
import AuthFields from "./components/AuthFields";
import Footer from "./components/Footer";
import Header from "./components/Header";
import SectionContent from "./components/SectionContent";
import SnowOverlay from "./components/SnowOverlay";
import type { Level, Stream } from "./types";
import { useAuthProfile } from "./hooks/useAuthProfile";
import { useLearningContent } from "./hooks/useLearningContent";
import { useLexemes } from "./hooks/useLexemes";
import { useSectionRoute } from "./hooks/useSectionRoute";
import type { Section, TestProfileDraft } from "./app/types";
import { error as logError } from "./logger";

const TestsPage = React.lazy(() => import("./pages/TestsPage"));
const SUPPORT_EMAIL = "support@norskkurs.no";

const App = () => {
  const { t, i18n } = useTranslation();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const { activeSection, navigateToSection } = useSectionRoute();
  const {
    profile,
    setProfile,
    auth,
    studentEmail,
    setStudentEmail,
    isTeacher,
    stream,
    currentLevel,
    handleStreamChange,
    handleLevelChange,
    vocabFavorites,
    setVocabFavorites,
    expressionFavorites,
    setExpressionFavorites,
    expressionView,
    setExpressionView,
    glossaryInitialView,
    setGlossaryInitialView,
    isAuthModalOpen,
    setIsAuthModalOpen,
    profileAuthForm,
    setProfileAuthForm,
    profileAuthLoading,
    profileAuthError,
    setProfileAuthError,
    profileSaveSuccess,
    authMode,
    setAuthMode,
    handleLogout,
    handleProfileSave,
    handleRegister,
    handleLogin,
  } = useAuthProfile(t);
  const {
    userLexemes,
    userLexemesLoading,
    handleRefreshLexemes,
    handleCreateLexeme,
    handleUpdateLexeme,
    handleDeleteLexeme,
    handleReviewLexeme,
    handleExportLexemesCsv,
    handleImportLexemesCsv,
    toggleVocabFavorite,
  } = useLexemes({
    auth,
    stream,
    vocabFavorites,
    setVocabFavorites,
    onError: logError,
  });
  const { materials, homework, exercises, expressions } = useLearningContent({
    studentEmail,
    stream,
    currentLevel,
  });

  const levelLabel = (level: Level) => t(`levelLabel.${level}`);
  const streamLabel = (value: Stream) => {
    const labels: Record<Stream, string> = {
      bokmaal: t("streamLabels.bokmaal"),
      nynorsk: t("streamLabels.nynorsk"),
      english: t("streamLabels.english"),
    };
    return labels[value] || value;
  };

  const navItems = useMemo(
    () => [
      { key: "profile" as Section, label: t("nav.dashboard") },
      { key: "readings" as Section, label: t("nav.readings") },
      { key: "materials" as Section, label: t("nav.materials") },
      { key: "exercises" as Section, label: t("nav.exercises") },
      { key: "tests" as Section, label: t("nav.tests") },
      { key: "homework" as Section, label: t("nav.homework") },
      {
        key: "partsOfSpeech" as Section,
        label: t("nav.partsOfSpeech", { defaultValue: "Parts of speech" }),
      },
      { key: "expressions" as Section, label: t("nav.expressions") },
      {
        key: "myWords" as Section,
        label: t("nav.myWords", { defaultValue: "My words" }),
      },
      { key: "games" as Section, label: t("nav.games") },
      { key: "glossary" as Section, label: t("nav.glossary") },
      { key: "contact" as Section, label: t("nav.contact") },
    ],
    [t],
  );

  const openSection = (section: Section) => {
    if (section === "glossary") {
      setGlossaryInitialView("all");
    }
    navigateToSection(section);
    setIsNavOpen(false);
  };

  const renderAuthFields = () => (
    <AuthFields
      auth={auth}
      authMode={authMode}
      profileAuthForm={profileAuthForm}
      setProfileAuthForm={setProfileAuthForm}
      profileAuthLoading={profileAuthLoading}
      profileAuthError={profileAuthError}
      supportMessage={supportMessage}
      onSubmit={authMode === "login" ? handleLogin : handleRegister}
      onToggleMode={() => {
        setProfileAuthError(null);
        setSupportMessage(null);
        setAuthMode((prev) => (prev === "login" ? "register" : "login"));
      }}
      onForgotPassword={() => {
        setSupportMessage(t("auth.resetHelp", { email: SUPPORT_EMAIL }));
      }}
    />
  );

  const toggleExpressionFavorite = (id: number) => {
    setExpressionFavorites((prev) => {
      const exists = prev.includes(id);
      return exists ? prev.filter((value) => value !== id) : [...prev, id];
    });
  };

  const testProfile = useMemo<TestProfileDraft>(
    () => ({ name: profile.name, email: profile.email }),
    [profile.name, profile.email],
  );

  const setTestProfile = (
    update: React.SetStateAction<TestProfileDraft>,
  ) => {
    setProfile((prev) => {
      const current = { name: prev.name, email: prev.email };
      const next = typeof update === "function" ? update(current) : update;
      return { ...prev, ...next };
    });
  };

  return (
    <div className="page">
      <SnowOverlay />
      <ApiStatusOverlay />
      <Header
        auth={auth}
        isTeacher={isTeacher}
        onLogout={handleLogout}
        currentLang={i18n.language}
        changeLanguage={(language) => i18n.changeLanguage(language)}
        stream={stream}
        level={currentLevel}
        onChangeStream={handleStreamChange}
        onChangeLevel={handleLevelChange}
        onOpenAuthModal={() => {
          setProfileAuthError(null);
          setSupportMessage(null);
          setAuthMode("login");
          setIsAuthModalOpen(true);
        }}
      />

      <div className="mobile-nav-toggle">
        <button
          className="pill"
          onClick={() => setIsNavOpen((open) => !open)}
          aria-expanded={isNavOpen}
        >
          {"Menu \u2192 "}
          {navItems.find((item) => item.key === activeSection)?.label || "Menu"}
        </button>
      </div>

      <div className={`section-nav ${isNavOpen ? "is-open" : "is-closed"}`}>
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`pill ${activeSection === item.key ? "pill--active" : ""}`}
            onClick={() => openSection(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isAuthModalOpen && (
        <div className="auth-modal">
          <div
            className="auth-dialog"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="auth-dialog-header">
              <h2>{t("auth.modalTitle")}</h2>
              <button
                type="button"
                className="auth-dialog-close"
                onClick={() => {
                  setSupportMessage(null);
                  setIsAuthModalOpen(false);
                }}
                aria-label={t("close")}
              >
                ×
              </button>
            </div>
            <div className="auth-dialog-body">{renderAuthFields()}</div>
          </div>
        </div>
      )}

      <React.Suspense
        fallback={
          <div className="layout single-panel">
            <main className="panel">
              <p className="muted">{t("loading")}</p>
            </main>
          </div>
        }
      >
        {activeSection === "tests" ? (
          <TestsPage
            auth={auth}
            isTeacher={isTeacher}
            renderAuthFields={renderAuthFields}
            stream={stream}
            currentLevel={currentLevel}
            studentEmail={studentEmail}
            setStudentEmail={setStudentEmail}
            levelLabel={levelLabel}
            profile={testProfile}
            setProfile={setTestProfile}
          />
        ) : (
          <div className="layout single-panel">
            <main className="panel">
              <SectionContent
                activeSection={activeSection}
                auth={auth}
                profile={profile}
                setProfile={setProfile}
                studentEmail={studentEmail}
                profileAuthError={profileAuthError}
                profileSaveSuccess={profileSaveSuccess}
                onSaveProfile={handleProfileSave}
                vocabFavoritesCount={vocabFavorites.length}
                expressionFavoritesCount={expressionFavorites.length}
                onOpenVocabFavorites={() => navigateToSection("myWords")}
                onOpenExpressionsFavorites={() => {
                  setExpressionView("favorites");
                  navigateToSection("expressions");
                }}
                onOpenMyWords={() => navigateToSection("myWords")}
                stream={stream}
                currentLevel={currentLevel}
                vocabFavorites={vocabFavorites}
                onToggleVocabFavorite={toggleVocabFavorite}
                onOpenGlossaryFavorites={() => {
                  setGlossaryInitialView("favorites");
                  navigateToSection("glossary");
                }}
                streamLabel={streamLabel}
                materials={materials}
                exercises={exercises}
                homework={homework}
                levelLabel={levelLabel}
                expressions={expressions}
                expressionFavorites={expressionFavorites}
                expressionView={expressionView}
                onChangeExpressionView={setExpressionView}
                onToggleExpressionFavorite={toggleExpressionFavorite}
                userLexemes={userLexemes}
                userLexemesLoading={userLexemesLoading}
                onRefreshLexemes={handleRefreshLexemes}
                onAddLexeme={handleCreateLexeme}
                onUpdateLexeme={handleUpdateLexeme}
                onDeleteLexeme={handleDeleteLexeme}
                onReviewLexeme={handleReviewLexeme}
                onExportLexemesCsv={handleExportLexemesCsv}
                onImportLexemesCsv={handleImportLexemesCsv}
                glossaryInitialView={glossaryInitialView}
              />
            </main>
          </div>
        )}
      </React.Suspense>
      <Footer />
    </div>
  );
};

export default App;
