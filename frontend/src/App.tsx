import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "./components/Header";
import Footer from "./components/Footer";
import SnowOverlay from "./components/SnowOverlay";
import ApiStatusOverlay from "./components/ApiStatusOverlay";
import { error as logError } from "./logger";

import {
  fetchExercises,
  fetchExpressions,
  fetchGlossary,
  fetchHomework,
  fetchMaterials,
  fetchProfile,
  loginProfile,
  logoutProfile,
  registerProfile,
  updateProfile,
  updateStreamLevel,
  fetchUserLexemes,
  createUserLexeme,
  updateUserLexeme,
  deleteUserLexeme,
  toggleUserLexeme,
  reviewUserLexeme,
  exportUserLexemesCsv,
  importUserLexemesCsv,
} from "./api";
import type {
  Exercise,
  Expression,
  GlossaryTerm,
  Homework,
  Material,
  ProfileInfo,
  Stream,
  Level,
  UserLexeme,
  UserLexemeImportResult,
} from "./types";
import { buildConceptKeyFromTerm, normalizeVocabId } from "./utils/lexemes";
const ReadingsPage = React.lazy(() => import("./pages/ReadingsPage"));

const TestsPage = React.lazy(() => import("./pages/TestsPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const GlossaryPage = React.lazy(() => import("./pages/GlossaryPage"));
const GamesPage = React.lazy(() => import("./pages/GamesPage"));
const VerbsPage = React.lazy(() => import("./pages/VerbsPage"));
const MaterialsPage = React.lazy(() => import("./pages/MaterialsPage"));
const ExercisesPage = React.lazy(() => import("./pages/ExercisesPage"));
const HomeworkPage = React.lazy(() => import("./pages/HomeworkPage"));
const ExpressionsPage = React.lazy(() => import("./pages/ExpressionsPage"));
const ContactPage = React.lazy(() => import("./pages/ContactPage"));
const MyWordsPage = React.lazy(() => import("./pages/MyWordsPage"));

const extractAuthErrorMessage = (
  error: any,
  fallback: string,
): string => {
  const responseData = error?.response?.data;
  if (responseData) {
    if (typeof responseData === "string") {
      return responseData;
    }
    if (typeof responseData.detail === "string") {
      return responseData.detail;
    }
    if (typeof responseData === "object") {
      const parts: string[] = [];
      Object.entries(responseData).forEach(([field, value]) => {
        if (Array.isArray(value)) {
          parts.push(`${field}: ${value.join(" ")}`);
        }
      });
      if (parts.length > 0) {
        return parts.join(" ");
      }
    }
  }
  if (typeof error?.message === "string" && error.message) {
    return error.message;
  }
  return fallback;
};

type Section =
  | "profile"
  | "readings"
  | "materials"
  | "exercises"
  | "tests"
  | "homework"
  | "partsOfSpeech"
  | "expressions"
  | "myWords"
  | "games"
  | "glossary"
  | "contact";

const App = () => {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    learningLanguage: "",
    nativeLanguage: "",
  });
  const [auth, setAuth] = useState<ProfileInfo | null>(null);
  const [studentEmail, setStudentEmail] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const [stream, setStream] = useState<Stream>(() => {
    const stored = localStorage.getItem("norskkurs_stream") as Stream | null;
    return stored || "bokmaal";
  });
  const [currentLevel, setCurrentLevel] = useState<Level>(() => {
    const stored = localStorage.getItem("norskkurs_level") as Level | null;
    return stored || "A1";
  });
  const [activeSection, setActiveSection] = useState<Section>("readings");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [expressions, setExpressions] = useState<Expression[]>([]);
  const [userLexemes, setUserLexemes] = useState<UserLexeme[]>([]);
  const [userLexemesLoading, setUserLexemesLoading] = useState(false);
  const [lexemesLoaded, setLexemesLoaded] = useState(false);
  const [lexemeSyncDone, setLexemeSyncDone] = useState(false);
  const [expressionFavorites, setExpressionFavorites] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("norskkurs_expression_favs");
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
    } catch {
      return [];
    }
  });
  const [expressionView, setExpressionView] = useState<"all" | "favorites">("all");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [profileAuthForm, setProfileAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [profileAuthLoading, setProfileAuthLoading] = useState(false);
  const [profileAuthError, setProfileAuthError] = useState<string | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [vocabFavorites, setVocabFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("norskkurs_vocab_favs");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((value) => normalizeVocabId(String(value)));
    } catch {
      return [];
    }
  });
  const [glossaryInitialView, setGlossaryInitialView] =
    useState<"all" | "favorites">("all");

  useEffect(() => {
    localStorage.setItem("norskkurs_stream", stream);
  }, [stream]);

  useEffect(() => {
    localStorage.setItem("norskkurs_level", currentLevel);
  }, [currentLevel]);

  useEffect(() => {
    try {
      localStorage.setItem("norskkurs_vocab_favs", JSON.stringify(vocabFavorites));
    } catch {
      // ignore storage errors
    }
  }, [vocabFavorites]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "norskkurs_expression_favs",
        JSON.stringify(expressionFavorites),
      );
    } catch {
      // ignore storage errors
    }
  }, [expressionFavorites]);

  useEffect(() => {
    fetchProfile()
      .then((data) => {
        setAuth(data);
        setIsTeacher(data.is_teacher);
        const vocabFromApi = Array.isArray(data.vocab_favorites)
          ? data.vocab_favorites
          : [];
        const exprFromApi = Array.isArray(data.expression_favorites)
          ? data.expression_favorites
          : [];

        if (vocabFromApi.length > 0) {
          setVocabFavorites((prev) => {
            const existing = new Set(prev.map((value) => normalizeVocabId(value)));
            vocabFromApi
              .map((value) => normalizeVocabId(String(value)))
              .forEach((value) => existing.add(value));
            return Array.from(existing);
          });
        }

        if (exprFromApi.length > 0) {
          setExpressionFavorites((prev) => {
            const existing = new Set(prev);
            exprFromApi
              .map((value) => Number(value))
              .filter((value) => !Number.isNaN(value))
              .forEach((value) => existing.add(value));
            return Array.from(existing);
          });
        }
        setProfile((prev) => ({
          ...prev,
          name: prev.name || data.display_name || prev.name,
          firstName: data.first_name || prev.firstName,
          lastName: data.last_name || prev.lastName,
          middleName: data.middle_name || prev.middleName,
          dateOfBirth: data.date_of_birth || prev.dateOfBirth,
          learningLanguage: data.learning_language || prev.learningLanguage,
          nativeLanguage: data.native_language || prev.nativeLanguage,
        }));
        if (data.stream) {
          setStream(data.stream);
          localStorage.setItem("norskkurs_stream", data.stream);
        }
        if (data.level) {
          setCurrentLevel(data.level);
          localStorage.setItem("norskkurs_level", data.level);
        }
      })
      .catch(() => {
        setAuth(null);
        setIsTeacher(false);
      });
  }, [studentEmail]);

  useEffect(() => {
    const params = {
      student_email: studentEmail || undefined,
      stream,
      level: currentLevel,
    };
    fetchMaterials(params).then(setMaterials).catch(() => setMaterials([]));
    fetchHomework(params).then(setHomework).catch(() => setHomework([]));
    fetchExercises(params).then(setExercises).catch(() => setExercises([]));
    fetchExpressions(params).then(setExpressions).catch(() => setExpressions([]));
  }, [stream, currentLevel, studentEmail]);

  const fetchAllUserLexemes = async (): Promise<UserLexeme[]> => {
    const results: UserLexeme[] = [];
    let page = 1;
    while (true) {
      const data = await fetchUserLexemes({ page, page_size: 200 });
      results.push(...data.results);
      if (!data.next) break;
      page += 1;
    }
    return results;
  };

  useEffect(() => {
    if (!auth?.is_authenticated) {
      setUserLexemes([]);
      setLexemesLoaded(false);
      setLexemeSyncDone(false);
      return;
    }
    setUserLexemesLoading(true);
    setLexemesLoaded(false);
    fetchAllUserLexemes()
      .then((data) => setUserLexemes(data))
      .catch(() => setUserLexemes([]))
      .finally(() => {
        setUserLexemesLoading(false);
        setLexemesLoaded(true);
      });
  }, [auth?.is_authenticated]);

  const persistStreamLevel = (payload: { stream?: Stream; level?: Level }) => {
    const emailForProfile = studentEmail || profile.email || auth?.username || "";
    if (!emailForProfile) return;
    updateStreamLevel({ email: emailForProfile, ...payload }).catch(() => null);
  };

  const handleStreamChange = (value: Stream) => {
    setStream(value);
    persistStreamLevel({ stream: value, level: currentLevel });
  };

  const handleLevelChange = (value: Level) => {
    setCurrentLevel(value);
    persistStreamLevel({ level: value, stream });
  };

  const levelLabel = (level: string) => t(`levelLabel.${level}`);
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
      { key: "partsOfSpeech" as Section, label: t("nav.partsOfSpeech", { defaultValue: "Parts of speech" }) },
      { key: "expressions" as Section, label: t("nav.expressions") },
      { key: "myWords" as Section, label: t("nav.myWords", { defaultValue: "My words" }) },
      { key: "games" as Section, label: t("nav.games") },
      { key: "glossary" as Section, label: t("nav.glossary") },
      { key: "contact" as Section, label: t("nav.contact") },
    ],
    [t],
  );

  const handleLogout = async () => {
    try {
      await logoutProfile();
      setAuth(null);
      setIsTeacher(false);
    } catch (e) {
      logError(e);
    }
  };

  const handleAuthSuccess = (profileInfo: ProfileInfo, email: string) => {
    setAuth(profileInfo);
    setIsTeacher(profileInfo.is_teacher);
    const vocabFromApi = Array.isArray(profileInfo.vocab_favorites)
      ? profileInfo.vocab_favorites
      : [];
    const exprFromApi = Array.isArray(profileInfo.expression_favorites)
      ? profileInfo.expression_favorites
      : [];

    if (vocabFromApi.length > 0) {
      setVocabFavorites((prev) => {
        const existing = new Set(prev.map((value) => normalizeVocabId(value)));
        vocabFromApi
          .map((value) => normalizeVocabId(String(value)))
          .forEach((value) => existing.add(value));
        return Array.from(existing);
      });
    }

    if (exprFromApi.length > 0) {
      setExpressionFavorites((prev) => {
        const existing = new Set(prev);
        exprFromApi
          .map((value) => Number(value))
          .filter((value) => !Number.isNaN(value))
          .forEach((value) => existing.add(value));
        return Array.from(existing);
      });
    }
    setProfile((prev) => ({
      ...prev,
      name: prev.name || profileInfo.display_name || prev.name,
      firstName: profileInfo.first_name || prev.firstName,
      lastName: profileInfo.last_name || prev.lastName,
      middleName: profileInfo.middle_name || prev.middleName,
      dateOfBirth: profileInfo.date_of_birth || prev.dateOfBirth,
      learningLanguage: profileInfo.learning_language || prev.learningLanguage,
      nativeLanguage: profileInfo.native_language || prev.nativeLanguage,
    }));
    if (profileInfo.stream) {
      setStream(profileInfo.stream);
      localStorage.setItem("norskkurs_stream", profileInfo.stream);
    }
    if (profileInfo.level) {
      setCurrentLevel(profileInfo.level);
      localStorage.setItem("norskkurs_level", profileInfo.level);
    }
    if (email) {
      setStudentEmail(email);
    }
  };

  const syncFavorites = async (
    currentVocab: string[],
    currentExpressions: number[],
  ) => {
    if (!auth?.is_authenticated) {
      return;
    }
    try {
      const updated = await updateProfile({
        vocab_favorites: currentVocab,
        expression_favorites: currentExpressions,
      });
      setAuth(updated);
    } catch {
      // If sync fails, we still keep favorites locally.
    }
  };

  useEffect(() => {
    if (!auth?.is_authenticated) return;
    void syncFavorites(vocabFavorites, expressionFavorites);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.is_authenticated, vocabFavorites, expressionFavorites]);

  const upsertLexeme = (lexeme: UserLexeme, keepArchived = false) => {
    setUserLexemes((prev) => {
      const others = prev.filter((item) => item.id !== lexeme.id);
      const next = keepArchived ? [lexeme, ...others] : [lexeme, ...others].filter((item) => !item.is_archived);
      return next;
    });
    if (!lexeme.is_archived && lexeme.concept_key) {
      const key = normalizeVocabId(lexeme.concept_key);
      setVocabFavorites((prev) => (prev.includes(key) ? prev : [...prev, key]));
    } else if (lexeme.concept_key) {
      const key = normalizeVocabId(lexeme.concept_key);
      setVocabFavorites((prev) => prev.filter((value) => value !== key));
    }
  };

  const buildGlossaryIndex = (terms: GlossaryTerm[]) => {
    const index = new Map<
      string,
      { any: GlossaryTerm; byStream: Partial<Record<Stream, GlossaryTerm>> }
    >();
    terms.forEach((term) => {
      const key = buildConceptKeyFromTerm(term);
      if (!key.replace(/\|/g, "").trim()) return;
      const entry = index.get(key) || { any: term, byStream: {} };
      if (!entry.byStream[term.stream]) {
        entry.byStream[term.stream] = term;
      }
      index.set(key, entry);
    });
    return index;
  };

  useEffect(() => {
    if (!auth?.is_authenticated || !lexemesLoaded || lexemeSyncDone) return;
    const serverFavs = userLexemes
      .filter((lex) => lex.source === "glossary" && !lex.is_archived && lex.concept_key)
      .map((lex) => normalizeVocabId(lex.concept_key));
    const localFavs = vocabFavorites.map((value) => normalizeVocabId(value));
    const merged = Array.from(new Set([...serverFavs, ...localFavs]));
    const sameSet =
      merged.length === vocabFavorites.length &&
      merged.every((value) => vocabFavorites.includes(value));
    if (!sameSet && merged.length > 0) {
      setVocabFavorites(merged);
    }
    const missing = localFavs.filter((key) => !serverFavs.includes(key));
    if (missing.length === 0) {
      setLexemeSyncDone(true);
      return;
    }
    setLexemeSyncDone(true);

    let cancelled = false;
    const sync = async () => {
      try {
        const terms = await fetchGlossary();
        if (cancelled) return;
        const index = buildGlossaryIndex(terms);
        await Promise.all(
          missing.map(async (key) => {
            const entry = index.get(key);
            const term = entry?.byStream[stream] || entry?.any;
            if (!term) return;
            try {
              const translationEn =
                term.translation_en || (term.stream === "english" ? term.term : "");
              const translationNb =
                term.translation_nb || (term.stream === "bokmaal" ? term.term : "");
              const translationNn =
                term.translation_nn || (term.stream === "nynorsk" ? term.term : "");
              const translationRu = term.translation_ru || "";
              const response = await toggleUserLexeme({
                concept_key: key,
                glossary_term: term.id,
                text: term.term,
                translation_en: translationEn,
                translation_nb: translationNb,
                translation_nn: translationNn,
                translation_ru: translationRu,
                language: term.stream,
                level: term.level,
                kind: "word",
              });
              if (response.lexeme && response.is_favorite) {
                upsertLexeme(response.lexeme);
              }
            } catch (error) {
              logError(error);
            }
          }),
        );
      } catch (error) {
        logError(error);
      }
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, [
    auth?.is_authenticated,
    lexemesLoaded,
    lexemeSyncDone,
    stream,
    userLexemes,
    vocabFavorites,
  ]);

  const handleRefreshLexemes = async () => {
    if (!auth?.is_authenticated) return;
    setUserLexemesLoading(true);
    setLexemesLoaded(false);
    try {
      const data = await fetchAllUserLexemes();
      setUserLexemes(data);
    } catch (e) {
      logError(e);
    } finally {
      setUserLexemesLoading(false);
      setLexemesLoaded(true);
    }
  };

  const handleCreateLexeme = async (
    payload: Partial<UserLexeme> & { text?: string; translation_en?: string; translation_nb?: string; translation_nn?: string; translation_ru?: string },
  ) => {
    if (!auth?.is_authenticated) return null;
    const created = await createUserLexeme(payload);
    upsertLexeme(created);
    return created;
  };

  const handleUpdateLexeme = async (id: number, payload: Partial<UserLexeme>) => {
    if (!auth?.is_authenticated) return null;
    const updated = await updateUserLexeme(id, payload);
    upsertLexeme(updated, true);
    return updated;
  };

  const handleDeleteLexeme = async (id: number) => {
    if (!auth?.is_authenticated) return;
    const target = userLexemes.find((item) => item.id === id);
    await deleteUserLexeme(id);
    setUserLexemes((prev) => prev.filter((item) => item.id !== id));
    if (target?.concept_key) {
      const key = normalizeVocabId(target.concept_key);
      setVocabFavorites((prev) => prev.filter((value) => value !== key));
    }
  };

  const handleReviewLexeme = async (id: number, correct: boolean) => {
    if (!auth?.is_authenticated) return null;
    try {
      const updated = await reviewUserLexeme(id, correct);
      upsertLexeme(updated, true);
      return updated;
    } catch (error) {
      logError(error);
      return null;
    }
  };

  const handleExportLexemesCsv = async () => {
    if (!auth?.is_authenticated) {
      throw new Error("Authentication required");
    }
    return exportUserLexemesCsv();
  };

  const handleImportLexemesCsv = async (
    file: File,
    options?: { update?: boolean },
  ): Promise<UserLexemeImportResult> => {
    if (!auth?.is_authenticated) {
      throw new Error("Authentication required");
    }
    const result = await importUserLexemesCsv(file, options);
    await handleRefreshLexemes();
    return result;
  };

  const handleProfileSave = async () => {
    const newName = profile.name.trim();
    setProfileAuthError(null);
    setProfileSaveSuccess(false);
    try {
      const updated = await updateProfile({
        name: newName || undefined,
        first_name: profile.firstName.trim() || undefined,
        last_name: profile.lastName.trim() || undefined,
        middle_name: profile.middleName.trim() || undefined,
        date_of_birth: profile.dateOfBirth || undefined,
        learning_language: profile.learningLanguage.trim() || undefined,
        native_language: profile.nativeLanguage.trim() || undefined,
      });
      setAuth(updated);
      setProfile((prev) => ({
        ...prev,
        name: newName || prev.name || updated.display_name || prev.name,
        firstName: updated.first_name || prev.firstName,
        lastName: updated.last_name || prev.lastName,
        middleName: updated.middle_name || prev.middleName,
        dateOfBirth: updated.date_of_birth || prev.dateOfBirth,
        learningLanguage: updated.learning_language || prev.learningLanguage,
        nativeLanguage: updated.native_language || prev.nativeLanguage,
      }));
      setProfileSaveSuccess(true);
    } catch (e: any) {
      const message = extractAuthErrorMessage(e, t("auth.genericError"));
      setProfileAuthError(message);
    }
  };

  const handleRegister = async () => {
    if (!profileAuthForm.email || !profileAuthForm.password) {
      setProfileAuthError(t("auth.missingFields"));
      return;
    }
    setProfileAuthLoading(true);
    setProfileAuthError(null);
    try {
      const data = await registerProfile({
        email: profileAuthForm.email.trim(),
        password: profileAuthForm.password,
        name: profileAuthForm.name.trim(),
      });
      handleAuthSuccess(data, profileAuthForm.email.trim());
    } catch (e: any) {
      const message = extractAuthErrorMessage(e, t("auth.genericError"));
      setProfileAuthError(message);
    } finally {
      setProfileAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!profileAuthForm.email || !profileAuthForm.password) {
      setProfileAuthError(t("auth.missingFields"));
      return;
    }
    setProfileAuthLoading(true);
    setProfileAuthError(null);
    try {
      const data = await loginProfile({
        identifier: profileAuthForm.email.trim(),
        password: profileAuthForm.password,
      });
      handleAuthSuccess(data, profileAuthForm.email.trim());
    } catch (e: any) {
      const message = extractAuthErrorMessage(e, t("auth.genericError"));
      setProfileAuthError(message);
    } finally {
      setProfileAuthLoading(false);
    }
  };

  const renderAuthFields = () => {
    if (auth?.is_authenticated) {
      return (
        <p className="muted small">
          {t("auth.loggedInAs")}{" "}
          <strong>{auth.display_name || auth.username}</strong>
        </p>
      );
    }

    return (
      <>
        <p className="muted small">{t("auth.studentTitle")}</p>
        <div className="search-row">
          <input
            type="text"
            placeholder={
              authMode === "login"
                ? t("auth.identifierPlaceholder")
                : t("yourEmail")
            }
            value={profileAuthForm.email}
            onChange={(e) =>
              setProfileAuthForm((prev) => ({
                ...prev,
                email: e.target.value,
              }))
            }
          />
        </div>
        {authMode === "register" && (
          <div className="search-row">
            <input
              type="text"
              placeholder={t("yourName")}
              value={profileAuthForm.name}
              onChange={(e) =>
                setProfileAuthForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
          </div>
        )}
          <div className="search-row">
            <input
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              value={profileAuthForm.password}
              onChange={(e) =>
                setProfileAuthForm((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
            />
          </div>
          {profileAuthError && (
            <div className="alert small auth-error">{profileAuthError}</div>
          )}
          <div className="auth-actions">
            <button
              type="button"
              className="pill"
              disabled={profileAuthLoading}
              onClick={authMode === "login" ? handleLogin : handleRegister}
            >
              {authMode === "login" ? t("auth.login") : t("auth.register")}
            </button>
          </div>
          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setProfileAuthError(null);
              setAuthMode((prev) => (prev === "login" ? "register" : "login"));
            }}
          >
            {authMode === "login"
              ? t("auth.toRegister")
              : t("auth.toLogin")}
          </button>
          <button
            type="button"
            className="auth-forgot"
          onClick={() => {
            window.location.href =
              "mailto:support@norskkurs.no?subject=Norskkurs%20password%20reset";
          }}
        >
          {t("auth.forgotPassword")}
        </button>
      </>
    );
  };

  const toggleVocabFavorite = async (id: string, meta?: Partial<UserLexeme>) => {
    const normalized = normalizeVocabId(id);
    if (auth?.is_authenticated) {
      try {
        const response = await toggleUserLexeme({
          concept_key: normalized,
          text: meta?.text,
          translation_en: meta?.translation_en,
          translation_nb: meta?.translation_nb,
          translation_nn: meta?.translation_nn,
          translation_ru: meta?.translation_ru,
          language: meta?.language,
          level: meta?.level,
          kind: meta?.kind || "word",
          glossary_term: meta?.glossary_term ?? undefined,
        });
        if (response.lexeme) {
          setUserLexemes((prev) => {
            const others = prev.filter((lex) => lex.id !== response.lexeme!.id);
            return response.is_favorite ? [response.lexeme!, ...others] : others;
          });
        } else if (!response.is_favorite) {
          setUserLexemes((prev) =>
            prev.map((lex) =>
              lex.concept_key === normalized ? { ...lex, is_archived: true } : lex,
            ),
          );
        }
        setVocabFavorites((prev) => {
          const exists = prev.includes(normalized);
          if (response.is_favorite) {
            return exists ? prev : [...prev, normalized];
          }
          return prev.filter((value) => value !== normalized);
        });
        return;
      } catch (e) {
        logError(e);
      }
    }
    setVocabFavorites((prev) => {
      const exists = prev.includes(normalized);
      const next = exists ? prev.filter((value) => value !== normalized) : [...prev, normalized];
      return next;
    });
  };

  const toggleExpressionFavorite = (id: number) => {
    setExpressionFavorites((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((value) => value !== id) : [...prev, id];
      return next;
    });
  };

  const testProfile = useMemo(
    () => ({ name: profile.name, email: profile.email }),
    [profile.name, profile.email],
  );

  const setTestProfile = (
    update: React.SetStateAction<{ name: string; email: string }>,
  ) => {
    setProfile((prev) => {
      const current = { name: prev.name, email: prev.email };
      const next = typeof update === "function" ? update(current) : update;
      return { ...prev, ...next };
    });
  };


  const renderSectionContent = () => {
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
            onSaveProfile={handleProfileSave}
            vocabFavoritesCount={vocabFavorites.length}
            expressionFavoritesCount={expressionFavorites.length}
            onOpenVocabFavorites={() => {
              setActiveSection("myWords");
            }}
            onOpenExpressionsFavorites={() => {
              setExpressionView("favorites");
              setActiveSection("expressions");
            }}
            onOpenMyWords={() => setActiveSection("myWords")}
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
            onToggleVocabFavorite={toggleVocabFavorite}
            onOpenMyWords={() => {
              setGlossaryInitialView("favorites");
              setActiveSection("glossary");
            }}
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
            auth={auth}
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
            onChangeView={setExpressionView}
            onToggleFavorite={toggleExpressionFavorite}
            streamLabel={streamLabel}
          />
        );
      case "myWords":
        return (
          <MyWordsPage
            auth={auth}
            lexemes={userLexemes}
            loading={userLexemesLoading}
            onRefresh={handleRefreshLexemes}
            onAdd={handleCreateLexeme}
            onUpdate={handleUpdateLexeme}
            onDelete={handleDeleteLexeme}
            onToggleFavorite={toggleVocabFavorite}
            onReview={handleReviewLexeme}
            onExportCsv={handleExportLexemesCsv}
            onImportCsv={handleImportLexemesCsv}
          />
        );
      case "games":
        return (
          <GamesPage
            stream={stream}
            currentLevel={currentLevel}
            vocabFavorites={vocabFavorites}
            onToggleVocabFavorite={toggleVocabFavorite}
          />
        );
      case "glossary":
        return (
          <GlossaryPage
            stream={stream}
            currentLevel={currentLevel}
            vocabFavorites={vocabFavorites}
            isAuthenticated={auth?.is_authenticated}
            onToggleFavorite={toggleVocabFavorite}
            initialView={glossaryInitialView}
          />
        );
      case "contact":
        return <ContactPage />;
      default:
        return null;
    }
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
        changeLanguage={(l: string) => i18n.changeLanguage(l)}
        stream={stream}
        level={currentLevel}
        onChangeStream={handleStreamChange}
        onChangeLevel={handleLevelChange}
        onOpenAuthModal={() => {
          setProfileAuthError(null);
          setAuthMode("login");
          setIsAuthModalOpen(true);
        }}
      />

      <div className="mobile-nav-toggle">
        <button
          className="pill"
          onClick={() => setIsNavOpen((o) => !o)}
          aria-expanded={isNavOpen}
        >
          {"Menu \u2192 "}
          {navItems.find((n) => n.key === activeSection)?.label || "Menu"}
        </button>
      </div>

      <div className={`section-nav ${isNavOpen ? "is-open" : "is-closed"}`}>
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`pill ${activeSection === item.key ? "pill--active" : ""}`}
            onClick={() => {
              if (item.key === "glossary") {
                setGlossaryInitialView("all");
              }
              setActiveSection(item.key);
              setIsNavOpen(false);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isAuthModalOpen && (
        <div className="auth-modal">
          <div
            className="auth-dialog"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="auth-dialog-header">
              <h2>{t("auth.modalTitle")}</h2>
              <button
                type="button"
                className="auth-dialog-close"
                onClick={() => setIsAuthModalOpen(false)}
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
            <main className="panel">{renderSectionContent()}</main>
          </div>
        )}
      </React.Suspense>
      <Footer />
    </div>
  );
};

export default App;
