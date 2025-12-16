import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Expression, Level, Stream, VerbEntry } from "../../types";

type Props = {
  stream: Stream;
  currentLevel: Level;
  expressions: Expression[];
  verbEntries: VerbEntry[];
};

type GameStatus = "idle" | "running" | "over";
type Difficulty = "easy" | "normal" | "hard";
type RoundKind = "expression" | "verb";
type VerbTense = "present" | "past" | "perfect";

type Tile = {
  id: string;
  text: string;
  origin: "target" | "distractor";
};

type Round = {
  id: string;
  kind: RoundKind;
  promptTitle: string;
  promptBody: string;
  targetSentence: string;
  targetTokens: string[];
  tiles: Tile[];
  hintToken?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeSentence = (value: string) => {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[«"“”„']+|[»"“”„']+$/g, "")
    .replace(/[.?!…,:;]+$/g, "")
    .toLowerCase();
};

const tokenize = (value: string) => {
  return value
    .trim()
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean);
};

const pickUiLanguage = (lang: string): "ru" | "nb" | "en" => {
  if (lang.startsWith("ru")) return "ru";
  if (lang.startsWith("nb") || lang.startsWith("no") || lang.startsWith("nn")) return "nb";
  return "en";
};

const pickExpressionMeaning = (expr: Expression, uiLang: "ru" | "nb" | "en", stream: Stream) => {
  if (uiLang === "ru") return expr.meaning_ru || expr.meaning_en || expr.meaning_nb || "";
  if (uiLang === "nb") {
    if (stream === "nynorsk") {
      return expr.meaning_nn || expr.meaning_nb || expr.meaning_en || "";
    }
    return expr.meaning_nb || expr.meaning_en || expr.meaning_ru || "";
  }
  return expr.meaning_en || expr.meaning_nb || expr.meaning_ru || "";
};

const pickVerbTranslation = (entry: VerbEntry, uiLang: "ru" | "nb" | "en") => {
  if (uiLang === "ru") return entry.translation_ru || entry.translation_en || entry.translation_nb || "";
  if (uiLang === "nb") return entry.translation_nb || entry.translation_en || entry.translation_ru || "";
  return entry.translation_en || entry.translation_nb || entry.translation_ru || "";
};

const norwegianPronoun = (stream: Stream) => (stream === "nynorsk" ? "eg" : "jeg");

const buildVerbSentence = (stream: Stream, tense: VerbTense, form: string) => {
  const pronoun = norwegianPronoun(stream);
  const verb = (form || "").trim();
  if (tense === "past") {
    return `I går ${verb} ${pronoun}.`;
  }
  if (tense === "perfect") {
    return `${pronoun} har ${verb}.`;
  }
  return `Nå ${verb} ${pronoun}.`;
};

const getBaseDistractors = (stream: Stream) => {
  const pronoun = norwegianPronoun(stream);
  const otherPronoun = pronoun === "jeg" ? "eg" : "jeg";
  return [
    pronoun,
    otherPronoun,
    "du",
    "vi",
    "nå",
    "i",
    "går",
    "ikke",
    "og",
    "men",
    "på",
    "til",
    "med",
    "har",
    "er",
    "skal",
  ];
};

const unique = (values: string[]) => {
  const set = new Set<string>();
  values.forEach((v) => {
    const s = (v || "").trim();
    if (!s) return;
    set.add(s);
  });
  return Array.from(set);
};

const shuffle = <T,>(arr: T[]) => {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const SentenceScrambleGame: React.FC<Props> = ({ stream, expressions, verbEntries }) => {
  const { t, i18n } = useTranslation();
  const uiLang = useMemo(() => pickUiLanguage(i18n.language), [i18n.language]);

  const [status, setStatus] = useState<GameStatus>("idle");
  const [endReason, setEndReason] = useState<"won" | "lost" | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [includeExpressions, setIncludeExpressions] = useState(true);
  const [includeVerbs, setIncludeVerbs] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [lives, setLives] = useState(4);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);

  const [bank, setBank] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<Tile[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [lostCorrectSentence, setLostCorrectSentence] = useState<string | null>(null);

  const roundsCount = useMemo(() => (difficulty === "easy" ? 8 : difficulty === "hard" ? 12 : 10), [difficulty]);
  const distractorsCount = useMemo(() => (difficulty === "easy" ? 2 : difficulty === "hard" ? 7 : 4), [difficulty]);
  const maxLives = useMemo(() => (difficulty === "easy" ? 6 : difficulty === "hard" ? 3 : 4), [difficulty]);

  const usableExpressions = useMemo(() => {
    return expressions
      .filter((expr) => expr.phrase && expr.phrase.trim())
      .filter((expr) => pickExpressionMeaning(expr, uiLang, stream).trim().length > 0)
      .filter((expr) => tokenize(expr.phrase).length >= 2)
      .filter((expr) => tokenize(expr.phrase).length <= 7);
  }, [expressions, stream, uiLang]);

  const usableVerbs = useMemo(() => {
    return verbEntries
      .filter((entry) => entry.part_of_speech === "verb")
      .filter((entry) => entry.present && entry.past && entry.perfect)
      .filter((entry) => pickVerbTranslation(entry, uiLang).trim().length > 0);
  }, [uiLang, verbEntries]);

  const canStart = useMemo(() => {
    const anyExpr = includeExpressions && usableExpressions.length >= 3;
    const anyVerb = includeVerbs && usableVerbs.length >= 3;
    return anyExpr || anyVerb;
  }, [includeExpressions, includeVerbs, usableExpressions.length, usableVerbs.length]);

  const currentRound = rounds[roundIndex] || null;

  const initRoundState = useCallback((round: Round) => {
    setSelected([]);
    setBank(round.tiles);
    setHintUsed(false);
  }, []);

  const buildExpressionRound = useCallback((): Round | null => {
    if (!includeExpressions || usableExpressions.length < 3) return null;
    const correct = usableExpressions[Math.floor(Math.random() * usableExpressions.length)];
    const meaning = pickExpressionMeaning(correct, uiLang, stream).trim();
    const targetSentence = correct.phrase.trim();
    const targetTokens = tokenize(targetSentence);
    if (targetTokens.length < 2) return null;

    const distractorWords = unique([
      ...getBaseDistractors(stream),
      ...usableExpressions
        .slice(0, 20)
        .flatMap((expr) => tokenize(expr.phrase))
        .slice(0, 60),
    ])
      .filter((w) => !targetTokens.includes(w))
      .slice(0, 120);

    const extra = shuffle(distractorWords).slice(0, distractorsCount);
    const tiles = shuffle([
      ...targetTokens.map((text, idx) => ({ id: `t-${idx}-${Date.now()}-${Math.random()}`, text, origin: "target" as const })),
      ...extra.map((text, idx) => ({ id: `d-${idx}-${Date.now()}-${Math.random()}`, text, origin: "distractor" as const })),
    ]);

    return {
      id: `ss-expr-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: "expression",
      promptTitle: t("games.scramblePromptTitleExpression"),
      promptBody: t("games.scramblePromptSay", { meaning }),
      targetSentence,
      targetTokens,
      tiles,
      hintToken: targetTokens[0],
    };
  }, [distractorsCount, includeExpressions, stream, t, uiLang, usableExpressions]);

  const buildVerbRound = useCallback((): Round | null => {
    if (!includeVerbs || usableVerbs.length < 3) return null;
    const entry = usableVerbs[Math.floor(Math.random() * usableVerbs.length)];
    const verbTranslation = pickVerbTranslation(entry, uiLang).trim();
    const tense: VerbTense = Math.random() < 0.34 ? "past" : Math.random() < 0.5 ? "perfect" : "present";
    const form = tense === "past" ? entry.past : tense === "perfect" ? entry.perfect : entry.present;
    const targetSentence = buildVerbSentence(stream, tense, form);
    const targetTokens = tokenize(targetSentence);
    if (targetTokens.length < 3) return null;

    const tenseLabel =
      tense === "past"
        ? t("games.scrambleTensePast")
        : tense === "perfect"
          ? t("games.scrambleTensePerfect")
          : t("games.scrambleTensePresent");

    const distractorWords = unique([
      ...getBaseDistractors(stream),
      ...["i", "morgen", "ofte", "alltid", "aldri", "snart"],
      ...usableExpressions
        .slice(0, 20)
        .flatMap((expr) => tokenize(expr.phrase))
        .slice(0, 60),
    ])
      .filter((w) => !targetTokens.includes(w))
      .slice(0, 120);

    const extra = shuffle(distractorWords).slice(0, distractorsCount);
    const tiles = shuffle([
      ...targetTokens.map((text, idx) => ({ id: `t-${idx}-${Date.now()}-${Math.random()}`, text, origin: "target" as const })),
      ...extra.map((text, idx) => ({ id: `d-${idx}-${Date.now()}-${Math.random()}`, text, origin: "distractor" as const })),
    ]);

    return {
      id: `ss-verb-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: "verb",
      promptTitle: t("games.scramblePromptTitleVerb"),
      promptBody: t("games.scramblePromptVerb", { tense: tenseLabel, translation: verbTranslation }),
      targetSentence,
      targetTokens,
      tiles,
      hintToken: targetTokens[0],
    };
  }, [distractorsCount, includeVerbs, stream, t, uiLang, usableExpressions, usableVerbs]);

  const buildRounds = useCallback((): Round[] => {
    const next: Round[] = [];
    let guard = 0;
    while (next.length < roundsCount && guard < roundsCount * 40) {
      guard += 1;
      const wantVerb = includeVerbs && (!includeExpressions || Math.random() < 0.35);
      const round = wantVerb ? buildVerbRound() : buildExpressionRound();
      if (!round) continue;
      next.push(round);
    }
    return next;
  }, [buildExpressionRound, buildVerbRound, includeExpressions, includeVerbs, roundsCount]);

  const start = useCallback(() => {
    if (!canStart) return;
    const nextRounds = buildRounds();
    if (nextRounds.length === 0) return;

    setRounds(nextRounds);
    setRoundIndex(0);
    setLives(maxLives);
    setScore(0);
    setHits(0);
    setMisses(0);
    setFlash(null);
    setEndReason(null);
    setLostCorrectSentence(null);
    setIsSettingsOpen(false);
    setStatus("running");
    initRoundState(nextRounds[0]);
  }, [buildRounds, canStart, initRoundState, maxLives]);

  const exit = useCallback(() => {
    setStatus("idle");
    setRounds([]);
    setRoundIndex(0);
    setBank([]);
    setSelected([]);
    setFlash(null);
    setHintUsed(false);
    setDraggingId(null);
    setEndReason(null);
    setLostCorrectSentence(null);
  }, []);

  const clearSoon = useCallback(() => {
    window.setTimeout(() => setFlash(null), 220);
  }, []);

  const pickTile = useCallback(
    (tileId: string) => {
      if (status !== "running") return;
      setBank((prev) => {
        const idx = prev.findIndex((t) => t.id === tileId);
        if (idx === -1) return prev;
        const tile = prev[idx];
        setSelected((s) => [...s, tile]);
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
    },
    [status],
  );

  const unpickTile = useCallback(
    (tileId: string) => {
      if (status !== "running") return;
      setSelected((prev) => {
        const idx = prev.findIndex((t) => t.id === tileId);
        if (idx === -1) return prev;
        const tile = prev[idx];
        setBank((b) => [...b, tile]);
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
    },
    [status],
  );

  const reorderSelected = useCallback((fromId: string, toId: string | null) => {
    setSelected((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === fromId);
      if (fromIdx === -1) return prev;

      const next = [...prev];
      const [tile] = next.splice(fromIdx, 1);

      if (!toId) {
        next.push(tile);
        return next;
      }

      const toIdx = next.findIndex((t) => t.id === toId);
      if (toIdx === -1) {
        next.push(tile);
        return next;
      }
      next.splice(toIdx, 0, tile);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    if (status !== "running") return;
    setBank((b) => [...b, ...selected]);
    setSelected([]);
  }, [selected, status]);

  const useHint = useCallback(() => {
    if (status !== "running") return;
    if (hintUsed) return;
    if (!currentRound?.hintToken) return;
    setHintUsed(true);
  }, [currentRound?.hintToken, hintUsed, status]);

  const check = useCallback(() => {
    if (status !== "running") return;
    if (!currentRound) return;
    const attempt = normalizeSentence(selected.map((t) => t.text).join(" "));
    const correct = normalizeSentence(currentRound.targetSentence);
    if (!attempt) return;

    if (attempt === correct) {
      setFlash("hit");
      clearSoon();
      setHits((v) => v + 1);
      setScore((v) => v + 1);

      window.setTimeout(() => {
        setRoundIndex((idx) => {
          const nextIdx = idx + 1;
          const nextRound = rounds[nextIdx];
          if (!nextRound) {
            setEndReason("won");
            setStatus("over");
            return idx;
          }
          initRoundState(nextRound);
          return nextIdx;
        });
      }, 520);
      return;
    }

    setFlash("miss");
    clearSoon();
    setMisses((v) => v + 1);
    const willLose = lives <= 1;
    if (willLose) {
      setEndReason("lost");
      setLostCorrectSentence(currentRound.targetSentence);
    }
    setLives((prev) => {
      const next = Math.max(0, prev - 1);
      if (next <= 0) {
        window.setTimeout(() => setStatus("over"), 0);
      }
      return next;
    });
  }, [clearSoon, currentRound, initRoundState, lives, rounds, selected, status]);

  useEffect(() => {
    if (status !== "running") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exit();
      }
      if ((e.key === "Enter" || e.key === " ") && selected.length > 0) {
        e.preventDefault();
        check();
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        const last = selected[selected.length - 1];
        if (last) unpickTile(last.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [check, exit, selected, status, unpickTile]);

  const accuracyPct = useMemo(() => {
    const total = hits + misses;
    if (total === 0) return 0;
    return clamp(Math.round((hits / total) * 100), 0, 100);
  }, [hits, misses]);

  const hintToken = currentRound?.hintToken || null;

  const hintText = useMemo(() => {
    if (!hintToken) return "";
    if (!hintUsed) return t("games.scrambleHintToken", { token: hintToken });
    return t("games.scrambleHintUsedToken", { token: hintToken });
  }, [hintToken, hintUsed, t]);

  const notEnough = useMemo(() => {
    const needExpr = includeExpressions && usableExpressions.length < 3;
    const needVerbs = includeVerbs && usableVerbs.length < 3;
    if (!needExpr && !needVerbs) return null;
    return t("games.scrambleNotEnough", { expressions: usableExpressions.length, verbs: usableVerbs.length });
  }, [includeExpressions, includeVerbs, t, usableExpressions.length, usableVerbs.length]);

  const overTitle = useMemo(() => {
    if (endReason === "won") return t("games.scrambleFinishedTitle");
    return t("games.scrambleGameOver");
  }, [endReason, t]);

  return (
    <div className={`scramble-game ${flash ? `scramble-game--${flash}` : ""}`}>
      <div className="scramble-header">
        <div>
          <h3>{t("games.scrambleTitle")}</h3>
          <p className="muted small">{t("games.scrambleSubtitle")}</p>
        </div>

        <div className="falling-game-controls">
          <button type="button" className="ghost" onClick={() => setIsSettingsOpen((v) => !v)} disabled={status !== "idle"}>
            {t("games.settings", "Settings")}
          </button>

          <label className="falling-speed-label">
            <span>{t("games.scrambleDifficultyLabel")}</span>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} disabled={status !== "idle"}>
              <option value="easy">{t("games.scrambleDifficultyEasy")}</option>
              <option value="normal">{t("games.scrambleDifficultyNormal")}</option>
              <option value="hard">{t("games.scrambleDifficultyHard")}</option>
            </select>
          </label>

          {status === "idle" ? (
            <button type="button" className="ghost" onClick={start} disabled={!canStart}>
              {t("games.start")}
            </button>
          ) : (
            <button type="button" className="ghost" onClick={exit}>
              {t("games.stop")}
            </button>
          )}
        </div>
      </div>

      {notEnough && <p className="muted small">{notEnough}</p>}

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
                  <input type="checkbox" checked={includeExpressions} onChange={(e) => setIncludeExpressions(e.target.checked)} />
                  <span>{t("games.scrambleSourceExpressions")}</span>
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={includeVerbs} onChange={(e) => setIncludeVerbs(e.target.checked)} />
                  <span>{t("games.scrambleSourceVerbs")}</span>
                </label>
                <div className="divider" />
                <p className="muted tiny">
                  {t("games.scramblePoolCount", {
                    expressions: usableExpressions.length,
                    verbs: usableVerbs.length,
                  })}
                </p>
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
        <div className="falling-stat">
          <span className="label">{t("games.scrambleRoundLabel")}</span>
          <strong>
            {status === "idle" ? "—" : `${Math.min(roundIndex + 1, rounds.length)}/${rounds.length || roundsCount}`}
          </strong>
        </div>
      </div>

      {status !== "idle" && currentRound && (
        <div className="card scramble-panel">
          <div className="scramble-prompt">
            <div className="muted tiny">{currentRound.promptTitle}</div>
            <div className="scramble-prompt-body">{currentRound.promptBody}</div>
          </div>

          <div className="scramble-answer">
            <div className="muted tiny">{t("games.scrambleYourAnswer")}</div>
            <div
              className="scramble-selected"
              onDragOver={(e) => {
                if (status !== "running") return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                if (status !== "running") return;
                e.preventDefault();
                const dragged = (() => {
                  try {
                    return e.dataTransfer.getData("text/plain");
                  } catch {
                    return "";
                  }
                })();
                const fromId = dragged || draggingId;
                if (!fromId) return;
                reorderSelected(fromId, null);
                setDraggingId(null);
              }}
            >
              {selected.length === 0 ? (
                <div className="muted small">{t("games.scrambleTapTiles")}</div>
              ) : (
                selected.map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    className="scramble-tile scramble-tile--selected scramble-tile--draggable"
                    onClick={() => unpickTile(tile.id)}
                    draggable={status === "running"}
                    onDragStart={(e) => {
                      if (status !== "running") return;
                      setDraggingId(tile.id);
                      try {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", tile.id);
                      } catch {
                        // ignore
                      }
                    }}
                    onDragOver={(e) => {
                      if (status !== "running") return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      if (status !== "running") return;
                      e.preventDefault();
                      const dragged = (() => {
                        try {
                          return e.dataTransfer.getData("text/plain");
                        } catch {
                          return "";
                        }
                      })();
                      const fromId = dragged || draggingId;
                      if (!fromId || fromId === tile.id) return;
                      reorderSelected(fromId, tile.id);
                      setDraggingId(null);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    disabled={status !== "running"}
                  >
                    {tile.text}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="scramble-actions">
            <button type="button" className="ghost" onClick={clearSelection} disabled={status !== "running" || selected.length === 0}>
              {t("games.scrambleClear")}
            </button>
            <button type="button" className="ghost" onClick={useHint} disabled={status !== "running" || hintUsed || !hintToken}>
              {hintUsed ? t("games.scrambleHintUsed") : t("games.scrambleHint")}
            </button>
            <button type="button" className="ghost" onClick={check} disabled={status !== "running" || selected.length === 0}>
              {t("games.scrambleCheck")}
            </button>
          </div>

          {hintToken && <p className="muted tiny scramble-hint">{hintText}</p>}

          <div className="scramble-bank">
            {bank.map((tile) => (
              <button
                key={tile.id}
                type="button"
                className={`scramble-tile ${tile.origin === "distractor" ? "scramble-tile--distractor" : ""} ${
                  hintUsed && hintToken === tile.text ? "scramble-tile--hint" : ""
                }`}
                onClick={() => pickTile(tile.id)}
                disabled={status !== "running"}
                title={tile.origin === "distractor" ? t("games.scrambleDistractor") : undefined}
              >
                {tile.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {status === "over" && (
        <div className="card scramble-panel">
          <h4>{overTitle}</h4>
          <p className="muted small">
            {t("score")}: <strong>{score}</strong> · {t("correct")}: <strong>{hits}</strong> · {t("incorrect")}:{" "}
            <strong>{misses}</strong>
          </p>
          {endReason === "lost" && lostCorrectSentence && (
            <div className="scramble-correct">
              <div className="muted tiny">{t("games.scrambleCorrectLabel")}</div>
              <div className="scramble-correct-sentence">{lostCorrectSentence}</div>
            </div>
          )}
          <div className="inline-actions">
            <button type="button" className="ghost" onClick={start} disabled={!canStart}>
              {t("games.fallingRestart")}
            </button>
            <button type="button" className="ghost" onClick={exit}>
              {t("games.scrambleBack")}
            </button>
          </div>
          <p className="muted tiny">
            {t("games.scrambleKeyboardHint")}
          </p>
        </div>
      )}
    </div>
  );
};

export default SentenceScrambleGame;
