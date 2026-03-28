import { useEffect, useState } from "react";

import {
  fetchProfile,
  loginProfile,
  logoutProfile,
  registerProfile,
  updateProfile,
  updateStreamLevel,
} from "../api";
import { mergeExpressionFavorites, mergeProfileDraftFromInfo, mergeVocabFavorites, initialProfileDraft } from "../app/profile";
import type { AuthFormState } from "../app/types";
import { extractAuthErrorMessage } from "../components/AuthFields";
import type { Level, ProfileInfo, Stream } from "../types";
import { normalizeVocabId } from "../utils/lexemes";

type Translate = (key: string, options?: Record<string, unknown>) => string;

const isStream = (value: string): value is Stream =>
  value === "bokmaal" || value === "nynorsk" || value === "english";

const isLevel = (value: string): value is Level =>
  value === "A1" || value === "A2" || value === "B1" || value === "B2";

export const useAuthProfile = (t: Translate) => {
  const [profile, setProfile] = useState(initialProfileDraft);
  const [auth, setAuth] = useState<ProfileInfo | null>(null);
  const [studentEmail, setStudentEmail] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const [stream, setStream] = useState<Stream>(() => {
    const stored = localStorage.getItem("norskkurs_stream");
    return stored && isStream(stored) ? stored : "bokmaal";
  });
  const [currentLevel, setCurrentLevel] = useState<Level>(() => {
    const stored = localStorage.getItem("norskkurs_level");
    return stored && isLevel(stored) ? stored : "A1";
  });
  const [expressionFavorites, setExpressionFavorites] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("norskkurs_expression_favs");
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value));
    } catch {
      return [];
    }
  });
  const [expressionView, setExpressionView] = useState<"all" | "favorites">(
    "all",
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [profileAuthForm, setProfileAuthForm] = useState<AuthFormState>({
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
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
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
        setVocabFavorites((prev) => mergeVocabFavorites(prev, data.vocab_favorites));
        setExpressionFavorites((prev) =>
          mergeExpressionFavorites(prev, data.expression_favorites),
        );
        setProfile((prev) => mergeProfileDraftFromInfo(prev, data));
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
      // keep favorites locally if sync fails
    }
  };

  useEffect(() => {
    if (!auth?.is_authenticated) {
      return;
    }
    void syncFavorites(vocabFavorites, expressionFavorites);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.is_authenticated, vocabFavorites, expressionFavorites]);

  const persistStreamLevel = (payload: { stream?: Stream; level?: Level }) => {
    const emailForProfile = studentEmail || profile.email || auth?.username || "";
    if (!emailForProfile) {
      return;
    }
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

  const handleAuthSuccess = (profileInfo: ProfileInfo, email: string) => {
    setAuth(profileInfo);
    setIsTeacher(profileInfo.is_teacher);
    setVocabFavorites((prev) =>
      mergeVocabFavorites(prev, profileInfo.vocab_favorites),
    );
    setExpressionFavorites((prev) =>
      mergeExpressionFavorites(prev, profileInfo.expression_favorites),
    );
    setProfile((prev) => mergeProfileDraftFromInfo(prev, profileInfo));
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

  const handleLogout = async () => {
    try {
      await logoutProfile();
      setAuth(null);
      setIsTeacher(false);
    } catch {
      // keep current UI state if logout request fails
    }
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
      setProfile((prev) => mergeProfileDraftFromInfo(prev, updated));
      setProfileSaveSuccess(true);
    } catch (error: unknown) {
      setProfileAuthError(
        extractAuthErrorMessage(error, t("auth.genericError")),
      );
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
    } catch (error: unknown) {
      setProfileAuthError(
        extractAuthErrorMessage(error, t("auth.genericError")),
      );
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
    } catch (error: unknown) {
      setProfileAuthError(
        extractAuthErrorMessage(error, t("auth.genericError")),
      );
    } finally {
      setProfileAuthLoading(false);
    }
  };

  return {
    profile,
    setProfile,
    auth,
    setAuth,
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
  };
};
