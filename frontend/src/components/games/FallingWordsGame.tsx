import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { GlossaryTerm, Level, Stream, VerbEntry } from "../../types";

type Props = {
  stream: Stream;
  currentLevel: Level;
  playableTerms: GlossaryTerm[];
  verbEntries: VerbEntry[];
};

type GameDifficulty = "verySlow" | "slow" | "normal" | "fast" | "turbo";
type GameStatus = "idle" | "running" | "paused" | "over";
type TranslationLanguage = Stream | "russian";

type FallingCard = {
  id: string;
  prompt: string;
  reveal: string;
  displayText: string;
  matchNorm: string[];
  isCaught: boolean;
  leftPct: number;
  yPx: number;
  speedPxPerSec: number;
};

const CARD_HEIGHT_PX = 44;
const MAX_UNCAUGHT = 7;
const MAX_TOTAL = 12;
const START_LIVES = 20;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeGuess = (value: string) => {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[«"“”„']+|[»"“”„']+$/g, "")
    .replace(/[.?!…,:;]+$/g, "")
    .toLowerCase();
};

const foldNorwegianChars = (value: string) => {
  return value.replace(/å/g, "aa").replace(/ø/g, "o").replace(/æ/g, "ae");
};

const buildPromptMatchers = (prompt: string) => {
  const norm = normalizeGuess(prompt);
  const folded = foldNorwegianChars(norm);
  const values = [norm, folded].filter(Boolean);
  return Array.from(new Set(values));
};

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

const pickTextForStream = (term: GlossaryTerm, selectedStream: TranslationLanguage) => {
  if (selectedStream === "bokmaal") {
    return term.translation_nb || term.term;
  }
  if (selectedStream === "nynorsk") {
    return term.translation_nn || term.translation_nb || term.term;
  }
  if (selectedStream === "russian") {
    return term.translation_ru || term.translation_en || term.term;
  }
  return term.translation_en || term.term;
};

const FallingWordsGame: React.FC<Props> = ({ stream, playableTerms, verbEntries }) => {
  const { t } = useTranslation();

  const [status, setStatus] = useState<GameStatus>("idle");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("slow");
  const [fallingStream, setFallingStream] = useState<Stream>(stream);
  const [translationStream, setTranslationStream] = useState<TranslationLanguage>(
    stream === "english" ? "bokmaal" : "english",
  );
  const [useGlossary, setUseGlossary] = useState(true);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [useIrregularOnly, setUseIrregularOnly] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [cards, setCards] = useState<FallingCard[]>([]);
  const [typed, setTyped] = useState("");

  const [lives, setLives] = useState(START_LIVES);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);

  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);

  const areaRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const cardsRef = useRef<FallingCard[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const spawnTimeoutRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  const statusRef = useRef<GameStatus>(status);
  const difficultyRef = useRef<GameDifficulty>(difficulty);
  const fallingStreamRef = useRef<Stream>(fallingStream);
  const translationStreamRef = useRef<TranslationLanguage>(translationStream);

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

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);
  useEffect(() => {
    fallingStreamRef.current = fallingStream;
  }, [fallingStream]);
  useEffect(() => {
    translationStreamRef.current = translationStream;
  }, [translationStream]);

  const clearFlashSoon = useCallback(() => {
    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => setFlash(null), 220);
  }, []);

  const stopLoops = useCallback(() => {
    if (spawnTimeoutRef.current) {
      window.clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = null;
    }
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
  }, []);

  const endRun = useCallback(() => {
    stopLoops();
    setStatus("over");
  }, [stopLoops]);

  const resetRun = useCallback(() => {
    setScore(0);
    setHits(0);
    setMisses(0);
    setLives(START_LIVES);
    setTyped("");
    setFlash(null);
    cardsRef.current = [];
    setCards([]);
  }, []);

  const calcSpawnMs = useCallback(() => {
    const base =
      difficultyRef.current === "verySlow"
        ? 6500
        : difficultyRef.current === "slow"
          ? 5200
          : difficultyRef.current === "fast"
            ? 2500
            : difficultyRef.current === "turbo"
              ? 1900
              : 3800;
    return base + Math.floor(Math.random() * 350);
  }, []);

  const calcSpeedPxPerSec = useCallback(() => {
    const base =
      difficultyRef.current === "verySlow"
        ? 22
        : difficultyRef.current === "slow"
          ? 32
          : difficultyRef.current === "fast"
            ? 62
            : difficultyRef.current === "turbo"
              ? 82
              : 44;
    return clamp(base * (0.93 + Math.random() * 0.14), 18, 140);
  }, []);

  const spawnOne = useCallback(() => {
    if (statusRef.current !== "running") return;
    if (combinedTerms.length === 0) return;

    const uncaughtCount = cardsRef.current.filter((card) => !card.isCaught).length;
    if (uncaughtCount >= MAX_UNCAUGHT) return;
    if (cardsRef.current.length >= MAX_TOTAL) return;

    const term = combinedTerms[Math.floor(Math.random() * combinedTerms.length)];
    const prompt = pickTextForStream(term, fallingStreamRef.current);
    const reveal = pickTextForStream(term, translationStreamRef.current);
    if (!prompt.trim() || !reveal.trim()) return;

    const id = `fw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const leftPct = 10 + Math.random() * 80;
    const yPx = -CARD_HEIGHT_PX - Math.random() * CARD_HEIGHT_PX * 3.2;
    const speedPxPerSec = calcSpeedPxPerSec();

    const card: FallingCard = {
      id,
      prompt,
      reveal,
      displayText: prompt,
      matchNorm: buildPromptMatchers(prompt),
      isCaught: false,
      leftPct,
      yPx,
      speedPxPerSec,
    };

    cardsRef.current = [...cardsRef.current, card];
    setCards(cardsRef.current);
  }, [calcSpeedPxPerSec, combinedTerms]);

  const scheduleSpawn = useCallback(() => {
    if (spawnTimeoutRef.current) {
      window.clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = null;
    }

    const tick = () => {
      if (statusRef.current !== "running") return;
      spawnOne();
      scheduleSpawn();
    };

    spawnTimeoutRef.current = window.setTimeout(tick, calcSpawnMs());
  }, [calcSpawnMs, spawnOne]);

  const tickFalling = useCallback(
    (ts: number) => {
      if (statusRef.current !== "running") return;
      const last = lastTsRef.current ?? ts;
      const dt = Math.min((ts - last) / 1000, 0.05);
      lastTsRef.current = ts;

      const areaHeight = areaRef.current?.clientHeight ?? 320;
      const next: FallingCard[] = [];
      let missedThisFrame = 0;

      for (const card of cardsRef.current) {
        const yPx = card.yPx + card.speedPxPerSec * dt;
        if (yPx >= areaHeight - CARD_HEIGHT_PX) {
          if (!card.isCaught) missedThisFrame += 1;
          continue;
        }
        next.push({ ...card, yPx });
      }

      if (missedThisFrame > 0) {
        setFlash("miss");
        clearFlashSoon();
        setMisses((prev) => prev + missedThisFrame);
        setTyped("");
        setLives((prev) => {
          const updated = prev - missedThisFrame;
          if (updated <= 0) {
            window.setTimeout(endRun, 0);
            return 0;
          }
          return updated;
        });
      }

      cardsRef.current = next;
      setCards(next);

      rafRef.current = window.requestAnimationFrame(tickFalling);
    },
    [clearFlashSoon, endRun],
  );

  useEffect(() => {
    if (status === "running") {
      inputRef.current?.focus();
      stopLoops();
      scheduleSpawn();
      rafRef.current = window.requestAnimationFrame(tickFalling);
      return;
    }
    stopLoops();
  }, [scheduleSpawn, status, stopLoops, tickFalling]);

  useEffect(() => {
    return () => {
      stopLoops();
      if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    };
  }, [stopLoops]);

  const typedNorm = useMemo(() => normalizeGuess(typed), [typed]);
  const typedNormLoose = useMemo(() => foldNorwegianChars(typedNorm), [typedNorm]);

  useEffect(() => {
    if (status !== "running") return;
    if (!typedNormLoose) return;

    const ordered = [...cardsRef.current].sort((a, b) => b.yPx - a.yPx);
    const match = ordered.find((card) => !card.isCaught && card.matchNorm.some((a) => a === typedNormLoose));
    if (!match) return;

    const updated = cardsRef.current.map((card) => {
      if (card.id !== match.id) return card;
      return { ...card, isCaught: true, displayText: card.reveal };
    });

    cardsRef.current = updated;
    setCards(updated);
    setTyped("");

    setFlash("hit");
    clearFlashSoon();
    setHits((prev) => prev + 1);
    setScore((prev) => prev + 1);
  }, [clearFlashSoon, status, typedNormLoose]);

  const targetId = useMemo(() => {
    if (!typedNormLoose) return null;
    const ordered = [...cards].sort((a, b) => b.yPx - a.yPx);
    for (const card of ordered) {
      if (!card.isCaught && card.matchNorm.some((answer) => answer.startsWith(typedNormLoose))) {
        return card.id;
      }
    }
    return null;
  }, [cards, typedNormLoose]);

  const accuracyPct = useMemo(() => {
    const total = hits + misses;
    if (total === 0) return 0;
    return clamp(Math.round((hits / total) * 100), 0, 100);
  }, [hits, misses]);

  const topLine = useMemo(() => {
    if (status === "over") return t("games.fallingGameOver");
    if (status === "paused") return t("games.fallingPaused");
    return t("games.fallingSubtitle");
  }, [status, t]);

  const primaryButtonLabel = useMemo(() => {
    if (status === "idle" || status === "over") return t("games.start");
    if (status === "paused") return t("games.fallingResume");
    return t("games.fallingPause");
  }, [status, t]);

  const onPrimaryAction = useCallback(() => {
    if (combinedTerms.length === 0) return;
    if (status === "idle" || status === "over") {
      resetRun();
      setStatus("running");
      return;
    }
    if (status === "paused") {
      setStatus("running");
      return;
    }
    setStatus("paused");
  }, [combinedTerms.length, resetRun, status]);

  const onRestart = useCallback(() => {
    if (combinedTerms.length === 0) return;
    resetRun();
    setStatus("running");
  }, [combinedTerms.length, resetRun]);

  const showOverlay = status === "paused" || status === "over" || status === "idle";

  const hint = useMemo(() => {
    return t("games.fallingHintTypeWhatFalls", {
      falls: t(`streamLabels.${fallingStream}`),
      turnsInto: t(`streamLabels.${translationStream}`),
    });
  }, [fallingStream, t, translationStream]);

  return (
    <div className={`falling-game falling-game--v2 ${flash ? `falling-game--${flash}` : ""}`}>
      <div className="falling-game-header">
        <div className="falling-game-title">
          <h3>{t("games.fallingTitle")}</h3>
          <p className="muted small">{topLine}</p>
        </div>

        <div className="falling-game-controls">
          <button type="button" className="ghost" onClick={() => setIsSettingsOpen((v) => !v)} disabled={status !== "idle"}>
            {t("games.settings", "Settings")}
          </button>

          <label className="falling-speed-label">
            <span>{t("games.speedLabel")}</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as GameDifficulty)}
              disabled={status !== "idle"}
            >
              <option value="verySlow">{t("games.speedVerySlow")}</option>
              <option value="slow">{t("games.speedSlow")}</option>
              <option value="normal">{t("games.speedNormal")}</option>
              <option value="fast">{t("games.speedFast")}</option>
              <option value="turbo">{t("games.speedTurbo")}</option>
            </select>
          </label>

          <button type="button" className="ghost" onClick={onPrimaryAction} disabled={combinedTerms.length === 0}>
            {primaryButtonLabel}
          </button>

          <button
            type="button"
            className="ghost"
            onClick={onRestart}
            disabled={playableTerms.length === 0 || status === "idle"}
          >
            {t("games.fallingRestart")}
          </button>
        </div>
      </div>

      {combinedTerms.length === 0 && <p className="muted small">{t("games.noWords")}</p>}

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
              </div>
            </div>

            <div className="falling-settings-card">
              <div className="falling-settings-card__title">
                <span className="eyebrow">{t("games.fallingLanguagesTitle", "Языки")}</span>
                <span className="muted tiny">{t("games.fallingLanguagesHint", "Выберите, что падает и во что превращается после поимки.")}</span>
              </div>

              <div className="falling-settings-list compact">
                <label className="falling-speed-label">
                  <span>{t("games.fallingFallsStreamLabel", "Падает")}</span>
                  <select value={fallingStream} onChange={(e) => setFallingStream(e.target.value as Stream)}>
                    <option value="bokmaal">{t("streamLabels.bokmaal")}</option>
                    <option value="nynorsk">{t("streamLabels.nynorsk")}</option>
                    <option value="english">{t("streamLabels.english")}</option>
                  </select>
                </label>
                <label className="falling-speed-label">
                  <span>{t("games.fallingTranslateToStreamLabel", "Перевод")}</span>
                  <select
                    value={translationStream}
                    onChange={(e) => setTranslationStream(e.target.value as TranslationLanguage)}
                  >
                    <option value="bokmaal">{t("streamLabels.bokmaal")}</option>
                    <option value="nynorsk">{t("streamLabels.nynorsk")}</option>
                    <option value="english">{t("streamLabels.english")}</option>
                    <option value="russian">{t("streamLabels.russian")}</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="falling-game-stats">
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

      <div ref={areaRef} className="falling-game-area falling-game-area--v2" aria-label={t("games.fallingAriaArea")}>
        {cards.map((card) => (
          <div
            key={card.id}
            className={`falling-word falling-word--v2 ${card.isCaught ? "falling-word--caught" : ""} ${
              targetId === card.id ? "falling-word--target" : ""
            }`}
            style={{
              left: `${card.leftPct}%`,
              transform: `translate3d(-50%, ${card.yPx}px, 0)`,
            }}
            title={hint}
          >
            {card.displayText}
          </div>
        ))}

        {showOverlay && (
          <div className="falling-overlay" aria-live="polite">
            {status === "idle" && (
              <div className="falling-overlay-card">
                <p className="muted small">{hint}</p>
                <p className="muted small">{t("games.fallingHowTo")}</p>
              </div>
            )}
            {status === "paused" && (
              <div className="falling-overlay-card">
                <p className="muted small">{t("games.fallingPausedHint")}</p>
              </div>
            )}
            {status === "over" && (
              <div className="falling-overlay-card">
                <h4>{t("games.fallingGameOver")}</h4>
                <p className="muted small">
                  {t("score")}: <strong>{score}</strong> · {t("correct")}: <strong>{hits}</strong> · {t("incorrect")}:{" "}
                  <strong>{misses}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        <div className="falling-ground" aria-hidden="true" />
      </div>

      <div className="falling-input-row">
        <label className="falling-input-label">
          <span className="label">{t("games.fallingTypeLabel")}</span>
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setTyped("");
              }
            }}
            placeholder={t("games.fallingPlaceholderType")}
            disabled={status !== "running"}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
        </label>

        <button type="button" className="ghost" onClick={() => setTyped("")} disabled={status !== "running" || typed.length === 0}>
          {t("games.fallingClear")}
        </button>
      </div>

      <p className="muted small falling-hint">{t("games.fallingAcceptsHint")}</p>
    </div>
  );
};

export default FallingWordsGame;
