import { useEffect, useState } from "react";

import {
  createUserLexeme,
  deleteUserLexeme,
  exportUserLexemesCsv,
  fetchGlossary,
  fetchUserLexemes,
  importUserLexemesCsv,
  reviewUserLexeme,
  toggleUserLexeme,
  updateUserLexeme,
} from "../api";
import type { Level, ProfileInfo, Stream, UserLexeme, UserLexemeImportResult } from "../types";
import { buildConceptKeyFromTerm, normalizeVocabId } from "../utils/lexemes";

type Params = {
  auth: ProfileInfo | null;
  stream: Stream;
  vocabFavorites: string[];
  setVocabFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  onError?: (error: unknown) => void;
};

export const useLexemes = ({
  auth,
  stream,
  vocabFavorites,
  setVocabFavorites,
  onError,
}: Params) => {
  const [userLexemes, setUserLexemes] = useState<UserLexeme[]>([]);
  const [userLexemesLoading, setUserLexemesLoading] = useState(false);
  const [lexemesLoaded, setLexemesLoaded] = useState(false);
  const [lexemeSyncDone, setLexemeSyncDone] = useState(false);

  const fetchAllUserLexemes = async (): Promise<UserLexeme[]> => {
    const results: UserLexeme[] = [];
    let page = 1;
    while (true) {
      const data = await fetchUserLexemes({ page, page_size: 200 });
      results.push(...data.results);
      if (!data.next) {
        break;
      }
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

  const upsertLexeme = (lexeme: UserLexeme, keepArchived = false) => {
    setUserLexemes((prev) => {
      const others = prev.filter((item) => item.id !== lexeme.id);
      return keepArchived
        ? [lexeme, ...others]
        : [lexeme, ...others].filter((item) => !item.is_archived);
    });
    if (!lexeme.is_archived && lexeme.concept_key) {
      const key = normalizeVocabId(lexeme.concept_key);
      setVocabFavorites((prev) => (prev.includes(key) ? prev : [...prev, key]));
      return;
    }
    if (lexeme.concept_key) {
      const key = normalizeVocabId(lexeme.concept_key);
      setVocabFavorites((prev) => prev.filter((value) => value !== key));
    }
  };

  const buildGlossaryIndex = (terms: Awaited<ReturnType<typeof fetchGlossary>>) => {
    const index = new Map<
      string,
      {
        any: (typeof terms)[number];
        byStream: Partial<Record<Stream, (typeof terms)[number]>>;
      }
    >();
    terms.forEach((term) => {
      const key = buildConceptKeyFromTerm(term);
      if (!key.replace(/\|/g, "").trim()) {
        return;
      }
      const entry = index.get(key) || { any: term, byStream: {} };
      if (!entry.byStream[term.stream]) {
        entry.byStream[term.stream] = term;
      }
      index.set(key, entry);
    });
    return index;
  };

  useEffect(() => {
    if (!auth?.is_authenticated || !lexemesLoaded || lexemeSyncDone) {
      return;
    }
    const serverFavs = userLexemes
      .filter(
        (lexeme) =>
          lexeme.source === "glossary" &&
          !lexeme.is_archived &&
          lexeme.concept_key,
      )
      .map((lexeme) => normalizeVocabId(lexeme.concept_key));
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
        if (cancelled) {
          return;
        }
        const index = buildGlossaryIndex(terms);
        await Promise.all(
          missing.map(async (key) => {
            const entry = index.get(key);
            const term = entry?.byStream[stream] || entry?.any;
            if (!term) {
              return;
            }
            try {
              const response = await toggleUserLexeme({
                concept_key: key,
                glossary_term: term.id,
                text: term.term,
                translation_en:
                  term.translation_en ||
                  (term.stream === "english" ? term.term : ""),
                translation_nb:
                  term.translation_nb ||
                  (term.stream === "bokmaal" ? term.term : ""),
                translation_nn:
                  term.translation_nn ||
                  (term.stream === "nynorsk" ? term.term : ""),
                translation_ru: term.translation_ru || "",
                language: term.stream,
                level: term.level,
                kind: "word",
              });
              if (response.lexeme && response.is_favorite) {
                upsertLexeme(response.lexeme);
              }
            } catch (error) {
              onError?.(error);
            }
          }),
        );
      } catch (error) {
        onError?.(error);
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
    onError,
    setVocabFavorites,
    stream,
    userLexemes,
    vocabFavorites,
  ]);

  const handleRefreshLexemes = async () => {
    if (!auth?.is_authenticated) {
      return;
    }
    setUserLexemesLoading(true);
    setLexemesLoaded(false);
    try {
      const data = await fetchAllUserLexemes();
      setUserLexemes(data);
    } catch (error) {
      onError?.(error);
    } finally {
      setUserLexemesLoading(false);
      setLexemesLoaded(true);
    }
  };

  const handleCreateLexeme = async (
    payload: Partial<UserLexeme> & {
      text?: string;
      translation_en?: string;
      translation_nb?: string;
      translation_nn?: string;
      translation_ru?: string;
    },
  ) => {
    if (!auth?.is_authenticated) {
      return null;
    }
    const created = await createUserLexeme(payload);
    upsertLexeme(created);
    return created;
  };

  const handleUpdateLexeme = async (
    id: number,
    payload: Partial<UserLexeme>,
  ) => {
    if (!auth?.is_authenticated) {
      return null;
    }
    const updated = await updateUserLexeme(id, payload);
    upsertLexeme(updated, true);
    return updated;
  };

  const handleDeleteLexeme = async (id: number) => {
    if (!auth?.is_authenticated) {
      return;
    }
    const target = userLexemes.find((item) => item.id === id);
    await deleteUserLexeme(id);
    setUserLexemes((prev) => prev.filter((item) => item.id !== id));
    if (target?.concept_key) {
      const key = normalizeVocabId(target.concept_key);
      setVocabFavorites((prev) => prev.filter((value) => value !== key));
    }
  };

  const handleReviewLexeme = async (id: number, correct: boolean) => {
    if (!auth?.is_authenticated) {
      return null;
    }
    try {
      const updated = await reviewUserLexeme(id, correct);
      upsertLexeme(updated, true);
      return updated;
    } catch (error) {
      onError?.(error);
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

  const toggleVocabFavorite = async (
    id: string,
    meta?: Partial<UserLexeme> & { level?: Level | "" | string },
  ) => {
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
            const others = prev.filter((lexeme) => lexeme.id !== response.lexeme!.id);
            return response.is_favorite ? [response.lexeme!, ...others] : others;
          });
        } else if (!response.is_favorite) {
          setUserLexemes((prev) =>
            prev.map((lexeme) =>
              lexeme.concept_key === normalized
                ? { ...lexeme, is_archived: true }
                : lexeme,
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
      } catch (error) {
        onError?.(error);
      }
    }
    setVocabFavorites((prev) => {
      const exists = prev.includes(normalized);
      return exists
        ? prev.filter((value) => value !== normalized)
        : [...prev, normalized];
    });
  };

  return {
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
  };
};
