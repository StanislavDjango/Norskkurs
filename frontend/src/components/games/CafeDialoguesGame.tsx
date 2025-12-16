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
type StepKind = "expression" | "verb";

type TranscriptLine = {
  speaker: "npc" | "you";
  text: string;
  subtext?: string;
};

type ChoiceStep = {
  id: string;
  kind: StepKind;
  prompt: string;
  options: string[];
  correct: string;
  meaningHint?: string;
  verbTense?: "present" | "past" | "perfect";
  verbTranslationHint?: string;
  revealed?: "hit" | "miss";
};

type Scene = {
  id: string;
  locationId: "cafe";
  steps: ChoiceStep[];
  transcriptSeed: TranscriptLine[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const pickUiLanguage = (lang: string): "ru" | "nb" | "en" => {
  if (lang.startsWith("ru")) return "ru";
  if (lang.startsWith("nb") || lang.startsWith("no") || lang.startsWith("nn")) return "nb";
  return "en";
};

const pickExpressionMeaning = (
  expr: Expression,
  uiLang: "ru" | "nb" | "en",
  stream: Stream,
) => {
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

const uniqueShuffle = (values: string[]) => {
  const set = new Set<string>();
  values.forEach((v) => {
    const trimmed = (v || "").trim();
    if (!trimmed) return;
    set.add(trimmed);
  });
  const arr = Array.from(set);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const makeCafeNpcSeed = (stream: Stream): TranscriptLine[] => {
  const npc = (text: string) => ({ speaker: "npc" as const, text });
  if (stream === "nynorsk") {
    return [npc("Hei! Kva kan eg hjelpe deg med?")];
  }
  return [npc("Hei! Hva kan jeg hjelpe deg med?")];
};

const buildVerbSentence = (stream: Stream, tense: "present" | "past" | "perfect", choice: string) => {
  const word = (choice || "").trim();
  if (tense === "past") {
    return stream === "nynorsk" ? `I går ${word} eg.` : `I går ${word} jeg.`;
  }
  if (tense === "perfect") {
    return stream === "nynorsk" ? `Eg har ${word}.` : `Jeg har ${word}.`;
  }
  return stream === "nynorsk" ? `No ${word} eg.` : `Nå ${word} jeg.`;
};

const cafeNpcForNextStep = (nextStep: ChoiceStep, stream: Stream): TranscriptLine => {
  const npc = (text: string) => ({ speaker: "npc" as const, text });
  if (nextStep.kind === "verb") {
    const tense = nextStep.verbTense || "present";
    if (tense === "past") {
      return stream === "nynorsk" ? npc("Og i går?") : npc("Og i går?");
    }
    if (tense === "perfect") {
      return stream === "nynorsk" ? npc("Har du alt gjort det?") : npc("Har du allerede gjort det?");
    }
    return stream === "nynorsk" ? npc("Kva gjer du no?") : npc("Hva gjør du nå?");
  }
  const fillers =
    stream === "nynorsk"
      ? ["Klart det.", "Supert.", "Ok!"]
      : ["Klart det.", "Supert.", "Ok!"];
  return npc(fillers[Math.floor(Math.random() * fillers.length)]);
};

const CafeDialoguesGame: React.FC<Props> = ({ stream, expressions, verbEntries }) => {
  const { t, i18n } = useTranslation();
  const uiLang = useMemo(() => pickUiLanguage(i18n.language), [i18n.language]);

  const [status, setStatus] = useState<GameStatus>("idle");
  const [scene, setScene] = useState<Scene | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [locked, setLocked] = useState(false);

  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [sceneCount, setSceneCount] = useState(0);

  const usableExpressions = useMemo(() => {
    return expressions
      .filter((expr) => expr.phrase && expr.phrase.trim())
      .filter((expr) => pickExpressionMeaning(expr, uiLang, stream).trim().length > 0);
  }, [expressions, stream, uiLang]);

  const usableVerbs = useMemo(() => {
    return verbEntries
      .filter((entry) => entry.part_of_speech === "verb")
      .filter((entry) => entry.infinitive && entry.present && entry.past && entry.perfect)
      .filter((entry) => pickVerbTranslation(entry, uiLang).trim().length > 0);
  }, [uiLang, verbEntries]);

  const canStart = usableExpressions.length >= 3 && usableVerbs.length >= 2;

  const makeExpressionStep = useCallback((): ChoiceStep | null => {
    if (usableExpressions.length < 3) return null;
    const correct = usableExpressions[Math.floor(Math.random() * usableExpressions.length)];
    const meaning = pickExpressionMeaning(correct, uiLang, stream).trim();
    const distractors: Expression[] = [];
    let guard = 0;
    while (distractors.length < 2 && guard < 80) {
      guard += 1;
      const candidate = usableExpressions[Math.floor(Math.random() * usableExpressions.length)];
      if (candidate.id === correct.id) continue;
      if (distractors.some((e) => e.id === candidate.id)) continue;
      distractors.push(candidate);
    }
    const options = uniqueShuffle([correct.phrase, ...distractors.map((d) => d.phrase)]).slice(0, 3);
    if (options.length < 3) return null;
    return {
      id: `cd-expr-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: "expression",
      prompt: t("games.cafePromptSay", { meaning }),
      options,
      correct: correct.phrase,
      meaningHint: meaning,
    };
  }, [stream, t, uiLang, usableExpressions]);

  const makeVerbStep = useCallback((): ChoiceStep | null => {
    if (usableVerbs.length === 0) return null;
    const entry = usableVerbs[Math.floor(Math.random() * usableVerbs.length)];
    const tense: "present" | "past" | "perfect" =
      Math.random() < 0.34 ? "past" : Math.random() < 0.5 ? "perfect" : "present";

    const correct =
      tense === "past" ? entry.past : tense === "perfect" ? entry.perfect : entry.present;
    const options = uniqueShuffle([entry.present, entry.past, entry.perfect, entry.infinitive]).slice(0, 4);
    if (options.length < 3) return null;

    const translation = pickVerbTranslation(entry, uiLang).trim();
    const prompt = t("games.cafePromptVerb", {
      translation,
      tense:
        tense === "past"
          ? t("games.cafeTensePast")
          : tense === "perfect"
            ? t("games.cafeTensePerfect")
            : t("games.cafeTensePresent"),
    });

    return {
      id: `cd-verb-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: "verb",
      prompt,
      options,
      correct,
      verbTense: tense,
      verbTranslationHint: translation,
    };
  }, [t, uiLang, usableVerbs]);

  const buildScene = useCallback((): Scene | null => {
    const expr1 = makeExpressionStep();
    const expr2 = makeExpressionStep();
    const verb = makeVerbStep();
    if (!expr1 || !expr2 || !verb) return null;

    const id = `cd-scene-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return {
      id,
      locationId: "cafe",
      transcriptSeed: makeCafeNpcSeed(stream),
      steps: [expr1, expr2, verb],
    };
  }, [makeExpressionStep, makeVerbStep, stream]);

  const begin = useCallback(() => {
    if (!canStart) return;
    const next = buildScene();
    if (!next) return;

    setScene(next);
    setStepIndex(0);
    setTranscript(next.transcriptSeed);
    setLocked(false);
    setStatus("running");
  }, [buildScene, canStart]);

  const exitToIdle = useCallback(() => {
    setStatus("idle");
    setScene(null);
    setStepIndex(0);
    setTranscript([]);
    setLocked(false);
  }, []);

  const currentStep = scene?.steps[stepIndex] || null;

  const onPick = useCallback(
    (value: string) => {
      if (status !== "running") return;
      if (!scene || !currentStep) return;
      if (locked) return;
      setLocked(true);

      const isCorrect = value.trim().toLowerCase() === currentStep.correct.trim().toLowerCase();
      if (isCorrect) {
        setHits((v) => v + 1);
        setScore((v) => v + 1);
      } else {
        setMisses((v) => v + 1);
      }

      const revealed: ChoiceStep = { ...currentStep, revealed: isCorrect ? "hit" : "miss" };
      const nextSteps = [...scene.steps];
      nextSteps[stepIndex] = revealed;
      setScene({ ...scene, steps: nextSteps });

      if (currentStep.kind === "expression") {
        const line: TranscriptLine = {
          speaker: "you",
          text: value,
          subtext: currentStep.meaningHint ? `“${currentStep.meaningHint}”` : undefined,
        };
        setTranscript((prev) => [...prev, line]);
      } else {
        const tense = currentStep.verbTense || "present";
        const sentence = buildVerbSentence(stream, tense, value);
        setTranscript((prev) => [
          ...prev,
          {
            speaker: "you",
            text: sentence,
            subtext: currentStep.verbTranslationHint ? `(${currentStep.verbTranslationHint})` : undefined,
          },
        ]);
      }

      window.setTimeout(() => {
        setLocked(false);
        setStepIndex((idx) => {
          const nextIdx = idx + 1;
          const nextStep = scene.steps[nextIdx];
          if (!nextStep) {
            setSceneCount((c) => c + 1);
            setStatus("over");
            return idx;
          }
          setTranscript((prev) => [...prev, cafeNpcForNextStep(nextStep, stream)]);
          return nextIdx;
        });
      }, 520);
    },
    [currentStep, locked, scene, status, stepIndex, stream, t],
  );

  useEffect(() => {
    if (status === "idle") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exitToIdle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitToIdle, status]);

  const accuracyPct = useMemo(() => {
    const total = hits + misses;
    if (total === 0) return 0;
    return clamp(Math.round((hits / total) * 100), 0, 100);
  }, [hits, misses]);

  return (
    <div className="dialogues-game">
      <div className="dialogues-header">
        <div>
          <h3>{t("games.cafeTitle")}</h3>
          <p className="muted small">{t("games.cafeSubtitle")}</p>
        </div>

        <div className="falling-game-controls">
          {status === "idle" ? (
            <button type="button" className="ghost" onClick={begin} disabled={!canStart}>
              {t("games.cafeStart")}
            </button>
          ) : (
            <button type="button" className="ghost" onClick={exitToIdle}>
              {t("games.cafeExit")}
            </button>
          )}
        </div>
      </div>

      {!canStart && (
        <p className="muted small">
          {t("games.cafeNotEnough", { expressions: usableExpressions.length, verbs: usableVerbs.length })}
        </p>
      )}

      <div className="falling-game-stats dialogues-stats">
        <div className="falling-stat">
          <span className="label">{t("score")}</span>
          <strong>{score}</strong>
        </div>
        <div className="falling-stat">
          <span className="label">{t("correct")}</span>
          <strong>{hits}</strong>
        </div>
        <div className="falling-stat">
          <span className="label">{t("incorrect")}</span>
          <strong>{misses}</strong>
        </div>
        <div className="falling-stat">
          <span className="label">{t("games.fallingAccuracyLabel")}</span>
          <strong>{accuracyPct}%</strong>
        </div>
      </div>

      {status !== "idle" && (
        <div className="card dialogues-panel">
          <div className="dialogues-meta muted tiny">
            {t("games.cafeLocation")} · {t("games.cafeScenes", { count: sceneCount })}
          </div>

          <div className="dialogues-transcript" aria-label={t("games.cafeTranscriptAria")}>
            {transcript.map((line, idx) => (
              <div key={`${idx}-${line.speaker}`} className={`dialogues-line dialogues-line--${line.speaker}`}>
                <div className="dialogues-bubble">
                  <div className="dialogues-text">{line.text}</div>
                  {line.subtext && <div className="dialogues-subtext muted tiny">{line.subtext}</div>}
                </div>
              </div>
            ))}
          </div>

          {status === "running" && currentStep && (
            <>
              <p className="muted small dialogues-prompt">{currentStep.prompt}</p>
              <div className="dialogues-options">
                {currentStep.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`dialogues-option ${
                      currentStep.revealed && opt === currentStep.correct ? "dialogues-option--correct" : ""
                    } ${
                      currentStep.revealed && opt !== currentStep.correct ? "dialogues-option--other" : ""
                    }`}
                    onClick={() => onPick(opt)}
                    disabled={locked}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <p className="muted tiny dialogues-hint">{t("games.cafeHintEsc")}</p>
            </>
          )}

          {status === "over" && (
            <div className="dialogues-over">
              <h4>{t("games.cafeOverTitle")}</h4>
              <p className="muted small">{t("games.cafeOverSummary", { scoreDelta: scene?.steps.length || 0 })}</p>
              <div className="inline-actions">
                <button type="button" className="ghost" onClick={begin} disabled={!canStart}>
                  {t("games.cafeNextScene")}
                </button>
                <button type="button" className="ghost" onClick={exitToIdle}>
                  {t("games.cafeExit")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CafeDialoguesGame;
