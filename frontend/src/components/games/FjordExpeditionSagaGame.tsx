import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { GlossaryTerm, Level, Stream, VerbEntry } from "../../types";
import { getNorwegianForTerm, pickTranslationForTower } from "../../utils/terms";

type Props = {
  stream: Stream;
  currentLevel: Level;
  playableTerms: GlossaryTerm[];
  verbEntries: VerbEntry[];
  vocabFavorites: string[];
  onToggleVocabFavorite: (
    id: string,
    meta?: {
      text?: string;
      translation_en?: string;
      translation_nb?: string;
      translation_nn?: string;
      translation_ru?: string;
      language?: Stream;
      level?: Level;
    },
  ) => void;
};

type GameDifficulty = "verySlow" | "slow" | "normal" | "fast" | "turbo";
type ExpeditionStatus = "idle" | "running" | "camp" | "over";

type ExpeditionQuestion = {
  id: string;
  term: GlossaryTerm;
  vocabId: string;
  prompt: string;
  correct: string;
  options: string[];
};

const shuffle = <T,>(arr: T[]) => {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const partOptions = [
  { value: "verb", label: "parts.verb" },
  { value: "noun", label: "parts.noun" },
  { value: "adjective", label: "parts.adjective" },
  { value: "adverb", label: "parts.adverb" },
  { value: "pronoun", label: "parts.pronoun" },
  { value: "numeral", label: "parts.numeral" },
  { value: "preposition", label: "parts.preposition" },
  { value: "conjunction", label: "parts.conjunction" },
  { value: "interjection", label: "parts.interjection" },
];

const mapVerbEntryToGlossary = (entry: VerbEntry): GlossaryTerm => ({
  id: entry.id,
  term: entry.infinitive,
  translation: entry.translation_en || entry.translation_nb || entry.translation_ru || "",
  translation_en: entry.translation_en,
  translation_ru: entry.translation_ru,
  translation_nb: entry.translation_nb,
  translation_nn: entry.translation_nb,
  explanation: "",
  stream: entry.stream,
  level: "A1",
  tags: [entry.part_of_speech, ...(entry.tags || [])],
});

const buildVocabIdFromTerm = (term: GlossaryTerm): string => {
  const conceptEn = term.translation_en || (term.stream === "english" ? term.term : "");
  const conceptNb = term.translation_nb || (term.stream === "bokmaal" ? term.term : "");
  const conceptNn = term.translation_nn || (term.stream === "nynorsk" ? term.term : "");
  const conceptRu = term.translation_ru || "";
  return `${(conceptEn || "").toLowerCase()}|${(conceptNb || "").toLowerCase().trim()}|${(conceptNn || "")
    .toLowerCase()
    .trim()}|${(conceptRu || "").toLowerCase().trim()}`;
};

const DEFAULT_LIVES = 20;

const FjordExpeditionSagaGame: React.FC<Props> = ({
  stream,
  playableTerms,
  verbEntries,
  vocabFavorites,
  onToggleVocabFavorite,
}) => {
  const { t, i18n } = useTranslation();

  const [status, setStatus] = useState<ExpeditionStatus>("idle");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("slow");
  const [wordPool, setWordPool] = useState<"all" | "favorites">("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [useGlossary, setUseGlossary] = useState(true);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [useIrregularOnly, setUseIrregularOnly] = useState(false);
  const [journeyLength, setJourneyLength] = useState(5);

  const [campIndex, setCampIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<ExpeditionQuestion[]>([]);

  const [lives, setLives] = useState(DEFAULT_LIVES);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);

  const [campHits, setCampHits] = useState(0);
  const [campMisses, setCampMisses] = useState(0);

  const [answerResult, setAnswerResult] = useState<"hit" | "miss" | null>(null);
  const [locked, setLocked] = useState(false);

  const baseStops = useMemo(
    () => [
      t("games.expeditionSagaStop1"),
      t("games.expeditionSagaStop2"),
      t("games.expeditionSagaStop3"),
      t("games.expeditionSagaStop4"),
      t("games.expeditionSagaStop5"),
    ],
    [t],
  );
  const stops = useMemo(() => {
    return buildStopLabels(baseStops, journeyLength, (index) =>
      t("games.expeditionSagaStopGeneric", { index }),
    );
  }, [baseStops, journeyLength, t]);
  const sagaChapters = useMemo(
    () => [
      t("games.expeditionSagaChapter1"),
      t("games.expeditionSagaChapter2"),
      t("games.expeditionSagaChapter3"),
      t("games.expeditionSagaChapter4"),
      t("games.expeditionSagaChapter5"),
    ],
    [t],
  );
  const storyLine = useMemo(() => {
    if (status === "over") return t("games.expeditionSagaOutro");
    if (status === "idle") return t("games.expeditionSagaIntro");
    if (campIndex < sagaChapters.length) {
      return sagaChapters[campIndex] || "";
    }
    return t("games.expeditionSagaChapterExtra", {
      current: campIndex + 1,
      total: journeyLength,
    });
  }, [campIndex, journeyLength, sagaChapters, status, t]);

  const optionsCount = useMemo(() => {
    return difficulty === "verySlow" ? 3 : difficulty === "turbo" ? 5 : 4;
  }, [difficulty]);

  const questionsPerCamp = useMemo(() => {
    return difficulty === "verySlow" ? 4 : difficulty === "fast" || difficulty === "turbo" ? 6 : 5;
  }, [difficulty]);

  const maxCamps = stops.length;

  const startingLives = useMemo(() => {
    return difficulty === "verySlow" ? 24 : difficulty === "slow" ? 20 : difficulty === "fast" ? 16 : difficulty === "turbo" ? 14 : 18;
  }, [difficulty]);

  const campRestBonus = useMemo(() => (difficulty === "turbo" ? 1 : 2), [difficulty]);

  const combinedTerms = useMemo<GlossaryTerm[]>(() => {
    const selectedSet = new Set(selectedParts);
    const includeVerbs = selectedSet.size > 0;
    const irregularOnly = useIrregularOnly && selectedSet.has("verb");

    const verbsPool = includeVerbs
      ? verbEntries.filter((entry) => {
          const partOk = selectedSet.has(entry.part_of_speech);
          if (!partOk) return false;
          if (irregularOnly) {
            return (entry.tags || []).some((tag) => tag.toLowerCase() === "irregular");
          }
          return true;
        })
      : [];

    const verbLikeGlossary = verbsPool.map(mapVerbEntryToGlossary);
    const glossaryPool = useGlossary ? playableTerms : [];
    return [...glossaryPool, ...verbLikeGlossary];
  }, [playableTerms, selectedParts, useGlossary, useIrregularOnly, verbEntries]);

  const filteredTerms = useMemo(() => {
    const sourcePool = combinedTerms.filter((term) => {
      const prompt = getNorwegianForTerm(term, stream) || "";
      if (!prompt.trim()) return false;
      const correct = pickTranslationForTower(term, i18n).trim();
      if (!correct) return false;
      return true;
    });

    if (wordPool !== "favorites") return sourcePool;
    if (vocabFavorites.length === 0) return [];
    const set = new Set(vocabFavorites);
    return sourcePool.filter((term) => set.has(buildVocabIdFromTerm(term)));
  }, [combinedTerms, i18n, stream, vocabFavorites, wordPool]);

  const canStart = filteredTerms.length > 0;

  const buildOneQuestion = useCallback(
    (pool: GlossaryTerm[], usedPrompt: Set<string>) => {
      const attempts = 60;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const term = pool[Math.floor(Math.random() * pool.length)];
        const prompt = getNorwegianForTerm(term, stream) || "";
        const correct = pickTranslationForTower(term, i18n).trim();
        if (!prompt.trim() || !correct) continue;
        const key = `${prompt.toLowerCase().trim()}|${correct.toLowerCase().trim()}`;
        if (usedPrompt.has(key)) continue;

        const optionsSet = new Set<string>([correct]);
        let distractorAttempts = 0;
        while (optionsSet.size < optionsCount && distractorAttempts < 120) {
          distractorAttempts += 1;
          const other = pool[Math.floor(Math.random() * pool.length)];
          const otherTr = pickTranslationForTower(other, i18n).trim();
          if (!otherTr) continue;
          if (otherTr.toLowerCase() === correct.toLowerCase()) continue;
          optionsSet.add(otherTr);
        }

        if (optionsSet.size < Math.min(3, optionsCount)) continue;

        usedPrompt.add(key);

        const vocabId = buildVocabIdFromTerm(term);
        const id = `fj-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        return {
          id,
          term,
          vocabId,
          prompt,
          correct,
          options: shuffle(Array.from(optionsSet)),
        } satisfies ExpeditionQuestion;
      }
      return null;
    },
    [i18n, optionsCount, stream],
  );

  const buildCamp = useCallback(
    (pool: GlossaryTerm[]) => {
      const usedPrompt = new Set<string>();
      const next: ExpeditionQuestion[] = [];
      let guard = 0;
      while (next.length < questionsPerCamp && guard < questionsPerCamp * 10) {
        guard += 1;
        const q = buildOneQuestion(pool, usedPrompt);
        if (!q) break;
        next.push(q);
      }
      return next;
    },
    [buildOneQuestion, questionsPerCamp],
  );

  const currentQuestion = questions[questionIndex] || null;
  const currentIsFavorite = useMemo(() => {
    if (!currentQuestion) return false;
    return vocabFavorites.includes(currentQuestion.vocabId);
  }, [currentQuestion, vocabFavorites]);

  const accuracyPct = useMemo(() => {
    const total = hits + misses;
    if (total === 0) return 0;
    return clamp(Math.round((hits / total) * 100), 0, 100);
  }, [hits, misses]);

  const startExpedition = useCallback(() => {
    if (!canStart) return;

    setIsSettingsOpen(false);
    setCampIndex(0);
    setQuestionIndex(0);
    setScore(0);
    setHits(0);
    setMisses(0);
    setCampHits(0);
    setCampMisses(0);
    setAnswerResult(null);
    setLocked(false);
    setLives(startingLives);

    const firstCamp = buildCamp(filteredTerms);
    if (firstCamp.length === 0) {
      setQuestions([]);
      setStatus("idle");
      return;
    }
    setQuestions(firstCamp);
    setStatus("running");
  }, [buildCamp, canStart, filteredTerms, startingLives]);

  const onPickOption = useCallback(
    (value: string) => {
      if (status !== "running") return;
      if (locked) return;
      if (!currentQuestion) return;
      setLocked(true);

      const isCorrect = value.trim().toLowerCase() === currentQuestion.correct.trim().toLowerCase();
      if (isCorrect) {
        setAnswerResult("hit");
        setHits((v) => v + 1);
        setCampHits((v) => v + 1);
        setScore((v) => v + 1);
      } else {
        setAnswerResult("miss");
        setMisses((v) => v + 1);
        setCampMisses((v) => v + 1);
        setLives((prev) => Math.max(0, prev - 1));
      }

      window.setTimeout(() => {
        setAnswerResult(null);
        setLocked(false);

        setQuestionIndex((idx) => {
          const nextIdx = idx + 1;
          if (nextIdx < questions.length) {
            return nextIdx;
          }
          setStatus("camp");
          return idx;
        });
      }, 520);
    },
    [currentQuestion, locked, questions.length, status],
  );

  useEffect(() => {
    if (status !== "running") return;
    if (lives > 0) return;
    setStatus("over");
  }, [lives, status]);

  const continueToNextCamp = useCallback(() => {
    if (campIndex >= maxCamps - 1) {
      setStatus("over");
      return;
    }

    setCampIndex((v) => v + 1);
    setQuestionIndex(0);
    setCampHits(0);
    setCampMisses(0);
    setAnswerResult(null);
    setLocked(false);
    setLives((prev) => Math.min(startingLives, prev + campRestBonus));

    const nextCamp = buildCamp(filteredTerms);
    if (nextCamp.length === 0) {
      setQuestions([]);
      setStatus("over");
      return;
    }
    setQuestions(nextCamp);
    setStatus("running");
  }, [buildCamp, campIndex, campRestBonus, filteredTerms, maxCamps, startingLives]);

  const restart = useCallback(() => {
    setStatus("idle");
    setQuestions([]);
    setCampIndex(0);
    setQuestionIndex(0);
    setAnswerResult(null);
    setLocked(false);
    setIsSettingsOpen(false);
  }, []);

  return (
    <div className="expedition-game">
      <div className="expedition-header">
        <div>
          <h3>{t("games.expeditionSagaTitle")}</h3>
          <p className="muted small">
            {status === "idle"
              ? t("games.expeditionSagaSubtitle")
              : t("games.expeditionSagaSubtitleRunning")}
          </p>
          {storyLine && <p className="muted small">{storyLine}</p>}
        </div>

        <div className="falling-game-controls">
          <label className="falling-speed-label">
            <span>{t("games.speedLabel")}</span>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as GameDifficulty)} disabled={status !== "idle"}>
              <option value="verySlow">{t("games.speedVerySlow")}</option>
              <option value="slow">{t("games.speedSlow")}</option>
              <option value="normal">{t("games.speedNormal")}</option>
              <option value="fast">{t("games.speedFast")}</option>
              <option value="turbo">{t("games.speedTurbo")}</option>
            </select>
          </label>

          <button
            type="button"
            className="ghost"
            onClick={() => setIsSettingsOpen((v) => !v)}
            disabled={status !== "idle"}
          >
            {t("games.settings", "Settings")}
          </button>

          <div className="expedition-pool">
            <button
              type="button"
              className={`pill ${wordPool === "all" ? "pill--active" : ""}`}
              onClick={() => setWordPool("all")}
              disabled={status !== "idle"}
            >
              {t("vocabTabs.all")}
            </button>
            <button
              type="button"
              className={`pill ${wordPool === "favorites" ? "pill--active" : ""} ${
                vocabFavorites.length === 0 ? "pill--disabled" : ""
              }`}
              onClick={() => setWordPool("favorites")}
              disabled={status !== "idle" || vocabFavorites.length === 0}
              title={vocabFavorites.length === 0 ? t("games.expeditionNoFavorites") : undefined}
            >
              {t("vocabTabs.favorites")}
            </button>
          </div>

          {status === "idle" && (
            <button type="button" className="ghost" onClick={startExpedition} disabled={!canStart}>
              {t("games.expeditionStart")}
            </button>
          )}

          {status !== "idle" && (
            <button type="button" className="ghost" onClick={restart}>
              {t("games.expeditionExit")}
            </button>
          )}
        </div>
      </div>

      {!canStart && status === "idle" && <p className="muted small">{t("games.noWords")}</p>}

      {isSettingsOpen && status === "idle" && (
        <div className="falling-settings">
          <p className="muted small">{t("games.settingsHint", "Выберите источники слов и сложность перед стартом.")}</p>

          <div className="falling-settings-grid">
            <div className="falling-settings-card">
              <div className="falling-settings-card__title">
                <span className="eyebrow">{t("games.wordSources", "Выбор слов")}</span>
                <span className="muted tiny">{t("games.sourceHint", "Можно включить сразу несколько источников.")}</span>
              </div>
              <div className="falling-settings-list">
                <label className="checkbox-row">
                  <span>{t("games.expeditionLengthLabel")}</span>
                  <select
                    value={journeyLength}
                    onChange={(e) => setJourneyLength(Number(e.target.value))}
                  >
                    {[5, 10, 15, 20, 25, 30].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="divider" />
                <label className="checkbox-row">
                  <input type="checkbox" checked={useGlossary} onChange={(e) => setUseGlossary(e.target.checked)} />
                  <span>{t("games.sourceGlossary", "Глоссарий")}</span>
                </label>
                <div className="divider" />
                <p className="muted tiny">{t("games.partsOfSpeech", "Части речи")}</p>
                <div className="parts-grid">
                  {partOptions.map((opt) => (
                    <label key={opt.value} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={selectedParts.includes(opt.value)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedParts((prev) => {
                            if (checked) return [...prev, opt.value];
                            return prev.filter((val) => val !== opt.value);
                          });
                        }}
                      />
                      <span>{t(opt.label, opt.value)}</span>
                    </label>
                  ))}
                </div>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={useIrregularOnly}
                    onChange={(e) => setUseIrregularOnly(e.target.checked)}
                    disabled={!selectedParts.includes("verb")}
                  />
                  <span>{t("games.irregularOnly", "Только неправильные (глаголы)")}</span>
                </label>
                <div className="divider" />
                <p className="muted tiny">{t("games.wordCollapsePoolCount", { count: filteredTerms.length })}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="expedition-map" aria-hidden="true">
        {stops.map((label, idx) => {
          const state = idx < campIndex ? "done" : idx === campIndex ? "active" : "todo";
          return (
            <div key={label} className={`expedition-stop expedition-stop--${state}`}>
              <div className="expedition-dot">{idx + 1}</div>
              <div className="expedition-stop-label">{label}</div>
            </div>
          );
        })}
      </div>

      <div className="falling-game-stats expedition-stats">
        <div className="falling-stat">
          <span className="label">{t("score")}</span>
          <strong>{score}</strong>
        </div>
        <div className="falling-stat">
          <span className="label">{t("games.fallingLivesLabel")}</span>
          <strong>{lives}</strong>
        </div>
        <div className="falling-stat">
          <span className="label">{t("games.fallingAccuracyLabel")}</span>
          <strong>{accuracyPct}%</strong>
        </div>
      </div>

      {status === "running" && currentQuestion && (
        <div className={`card expedition-panel ${answerResult ? `expedition-panel--${answerResult}` : ""}`}>
          <div className="expedition-panel-header">
            <div className="muted tiny">
              {t("games.expeditionCampLabel", { current: campIndex + 1, total: maxCamps })} ·{" "}
              {t("games.expeditionQuestionLabel", {
                current: questionIndex + 1,
                total: questions.length || questionsPerCamp,
              })}
            </div>
            <button
              type="button"
              className={`vocab-bookmark ${currentIsFavorite ? "active" : ""}`}
              onClick={() =>
                onToggleVocabFavorite(currentQuestion.vocabId, {
                  text: currentQuestion.term.term,
                  translation_en: currentQuestion.term.translation_en,
                  translation_nb: currentQuestion.term.translation_nb,
                  translation_nn: currentQuestion.term.translation_nn,
                  translation_ru: currentQuestion.term.translation_ru,
                  language: currentQuestion.term.stream,
                  level: currentQuestion.term.level,
                })
              }
              aria-label={currentIsFavorite ? t("removeFavorite") : t("addFavorite")}
              disabled={locked}
              title={t("games.expeditionBookmarkHint")}
            >
              ★
            </button>
          </div>

          <div className="expedition-prompt">{currentQuestion.prompt}</div>

          <div className="expedition-options">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt}
                type="button"
                className="expedition-option"
                onClick={() => onPickOption(opt)}
                disabled={locked}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="expedition-footer muted tiny">
            {t("games.expeditionHint", {
              action: t("games.expeditionHintAction"),
              rest: campRestBonus,
            })}
          </div>
        </div>
      )}

      {status === "camp" && (
        <div className="card expedition-camp">
          <h4>{t("games.expeditionCampTitle", { name: stops[campIndex] || "" })}</h4>
          <p className="muted small">
            {t("games.expeditionCampSummary", {
              correct: campHits,
              incorrect: campMisses,
              rest: campRestBonus,
            })}
          </p>
          <div className="inline-actions">
            <button type="button" className="ghost" onClick={continueToNextCamp}>
              {campIndex >= maxCamps - 1 ? t("games.expeditionFinish") : t("games.expeditionContinue")}
            </button>
          </div>
        </div>
      )}

      {status === "over" && (
        <div className="card expedition-camp">
          <h4>{t("games.expeditionOverTitle")}</h4>
          <p className="muted small">
            {t("games.expeditionOverSummary", { score, correct: hits, incorrect: misses, camps: campIndex + 1 })}
          </p>
          <div className="inline-actions">
            <button type="button" className="ghost" onClick={startExpedition} disabled={!canStart}>
              {t("games.expeditionPlayAgain")}
            </button>
            <button type="button" className="ghost" onClick={restart}>
              {t("games.expeditionBack")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FjordExpeditionSagaGame;

function buildStopLabels(
  baseStops: string[],
  length: number,
  fallback: (index: number) => string,
): string[] {
  const total = Math.max(1, length);
  return Array.from({ length: total }, (_, idx) => baseStops[idx] || fallback(idx + 1));
}
