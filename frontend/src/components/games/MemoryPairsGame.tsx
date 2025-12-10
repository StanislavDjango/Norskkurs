import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  Expression,
  GlossaryTerm,
  Level,
  Stream,
} from "../../types";
import { getNorwegianForTerm } from "../../utils/terms";

type Props = {
  stream: Stream;
  currentLevel: Level;
  terms: GlossaryTerm[];
  expressions: Expression[];
};

type MemoryMode = "wordsA1" | "phrasesA2";

type MemoryCard = {
  id: string;
  pairId: string;
  face: "nor" | "tr";
  text: string;
  tone: "word" | "phrase";
  isMatched: boolean;
  isFlipped: boolean;
  isShaking?: boolean;
};

type MemoryPair = {
  id: string;
  nor: string;
  tr: string;
  tone: "word" | "phrase";
};

const shuffleArray = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const pickTermTranslation = (
  term: GlossaryTerm,
  lang: string,
): string | null => {
  if (lang.startsWith("ru")) {
    return (
      term.translation_ru ||
      term.translation_en ||
      term.translation_nb ||
      term.translation_nn ||
      term.term
    );
  }
  return (
    term.translation_en ||
    term.translation_ru ||
    term.translation_nb ||
    term.translation_nn ||
    term.term
  );
};

const pickExpressionTranslation = (
  expression: Expression,
  lang: string,
): string | null => {
  if (lang.startsWith("ru")) {
    return (
      expression.meaning_ru ||
      expression.meaning_en ||
      expression.meaning_nb ||
      expression.meaning_nn ||
      expression.phrase
    );
  }
  return (
    expression.meaning_en ||
    expression.meaning_ru ||
    expression.meaning_nb ||
    expression.meaning_nn ||
    expression.phrase
  );
};

const MemoryPairsGame: React.FC<Props> = ({
  stream,
  currentLevel,
  terms,
  expressions,
}) => {
  const { t, i18n } = useTranslation();

  const [mode, setMode] = useState<MemoryMode>(
    currentLevel === "A1" ? "wordsA1" : "phrasesA2",
  );
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matches, setMatches] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [targetPairs, setTargetPairs] = useState(0);

  const wordPairs = useMemo<MemoryPair[]>(() => {
    const lang = i18n.language;
    const filtered = terms.filter((term) => term.level === "A1");

    return filtered
      .map((term) => {
        const nor = getNorwegianForTerm(term, stream);
        const tr = pickTermTranslation(term, lang);
        if (!nor || !tr) return null;

        return {
          id: `term-${term.id}`,
          nor,
          tr,
          tone: "word" as const,
        };
      })
      .filter(Boolean) as MemoryPair[];
  }, [terms, stream, i18n.language]);

  const phrasePairs = useMemo<MemoryPair[]>(() => {
    const lang = i18n.language;

    return expressions
      .map((expression) => {
        const nor = expression.phrase;
        const tr = pickExpressionTranslation(expression, lang);
        if (!nor || !tr) return null;
        return {
          id: `expr-${expression.id}`,
          nor,
          tr,
          tone: "phrase" as const,
        };
      })
      .filter(Boolean) as MemoryPair[];
  }, [expressions, i18n.language]);

  const availablePairs =
    mode === "wordsA1" ? wordPairs : phrasePairs;

  const accuracy =
    attempts === 0 ? 0 : Math.round((matches / attempts) * 100);

  const handleShuffle = () => {
    if (availablePairs.length < 3) return;

    const chosenPairs = shuffleArray(availablePairs).slice(
      0,
      Math.min(10, availablePairs.length),
    );
    const deck = shuffleArray(
      chosenPairs.flatMap((pair) => [
        {
          id: `${pair.id}-nor`,
          pairId: pair.id,
          face: "nor" as const,
          text: pair.nor,
          tone: pair.tone,
          isMatched: false,
          isFlipped: false,
        },
        {
          id: `${pair.id}-tr`,
          pairId: pair.id,
          face: "tr" as const,
          text: pair.tr,
          tone: pair.tone,
          isMatched: false,
          isFlipped: false,
        },
      ]),
    );

    setCards(deck);
    setTargetPairs(chosenPairs.length);
    setMatches(0);
    setAttempts(0);
    setFlippedIds([]);
    setStarted(true);
    setLocked(false);
  };

  const handleFlip = (cardId: string) => {
    if (!started || locked) return;

    setCards((prev) => {
      const card = prev.find((c) => c.id === cardId);
      if (!card || card.isMatched || card.isFlipped) return prev;

      const updated = prev.map((c) =>
        c.id === cardId ? { ...c, isFlipped: true } : c,
      );
      const nextFlipped = [...flippedIds, cardId];
      setFlippedIds(nextFlipped);

      if (nextFlipped.length === 2) {
        setLocked(true);
        const [firstId, secondId] = nextFlipped;
        const first = updated.find((c) => c.id === firstId);
        const second = updated.find((c) => c.id === secondId);
        const isMatch =
          first &&
          second &&
          first.pairId === second.pairId &&
          first.face !== second.face;

        window.setTimeout(() => {
          setCards((current) =>
            current.map((c) => {
              if (nextFlipped.includes(c.id) && isMatch) {
                return { ...c, isMatched: true };
              }
              if (nextFlipped.includes(c.id) && !isMatch) {
                return { ...c, isFlipped: false, isShaking: true };
              }
              return c;
            }),
          );
          setFlippedIds([]);
          setLocked(false);
          setAttempts((prevAttempts) => prevAttempts + 1);
          if (isMatch) {
            setMatches((prevMatches) => prevMatches + 1);
          }
          if (!isMatch) {
            window.setTimeout(() => {
              setCards((current) =>
                current.map((c) =>
                  c.isShaking ? { ...c, isShaking: false } : c,
                ),
              );
            }, 500);
          }
        }, 550);
      }

      return updated;
    });
  };

  return (
    <div className="memory-game">
      <div className="memory-hero">
        <div className="memory-hero__text">
          <p className="memory-eyebrow">{t("games.memoryEyebrow")}</p>
          <h3>{t("games.memoryTitle")}</h3>
          <p className="muted small">{t("games.memorySubtitle")}</p>
        </div>
        <div className="memory-modes">
          <button
            type="button"
            className={`pill ${mode === "wordsA1" ? "pill--active" : ""}`}
            onClick={() => setMode("wordsA1")}
          >
            {t("games.memoryModeWords")}
          </button>
          <button
            type="button"
            className={`pill ${mode === "phrasesA2" ? "pill--active" : ""}`}
            onClick={() => setMode("phrasesA2")}
          >
            {t("games.memoryModePhrases")}
          </button>
        </div>
      </div>

      <div className="memory-toolbar">
        <div className="memory-stats">
          <span className="memory-stat">
            <span className="memory-stat__label">
              {t("games.memoryPairsLabel")}
            </span>
            <strong>
              {matches}/{targetPairs || availablePairs.length}
            </strong>
          </span>
          <span className="memory-stat">
            <span className="memory-stat__label">
              {t("games.memoryMovesLabel")}
            </span>
            <strong>{attempts}</strong>
          </span>
          <span className="memory-stat">
            <span className="memory-stat__label">
              {t("games.memoryAccuracyLabel")}
            </span>
            <strong>{accuracy}%</strong>
          </span>
        </div>
        <div className="memory-actions">
          <button
            type="button"
            className="memory-start"
            onClick={handleShuffle}
            disabled={availablePairs.length < 3}
          >
            {started ? t("games.memoryShuffle") : t("games.memoryStart")}
          </button>
          {availablePairs.length < 3 && (
            <span className="muted small">
              {t("games.memoryNotEnough")}
            </span>
          )}
        </div>
      </div>

      {!started && availablePairs.length >= 3 && (
        <p className="muted small">{t("games.memoryTapToStart")}</p>
      )}

      {started && matches === targetPairs && targetPairs > 0 && (
        <p className="alert small">{t("games.memoryFinished")}</p>
      )}

      <div className="memory-board">
        {cards.length === 0 ? (
          <div className="memory-empty muted small">
            {availablePairs.length < 3
              ? t("games.memoryNotEnough")
              : t("games.memoryHint")}
          </div>
        ) : (
          cards.map((card) => (
            <button
              type="button"
              key={card.id}
              className={`memory-card memory-card--${card.tone} ${
                card.isShaking ? "memory-card--shake" : ""
              } ${card.isMatched ? "memory-card--matched" : ""}`}
              onClick={() => handleFlip(card.id)}
              disabled={card.isMatched}
              aria-label={
                card.face === "nor"
                  ? t("games.memoryCardNor")
                  : t("games.memoryCardTr")
              }
            >
              <div className="memory-card__badge">
                {card.face === "nor" ? "NO" : "TR"}
              </div>
              <div className="memory-card__text">
                {card.isFlipped || card.isMatched ? card.text : "..."}
              </div>
              <div className="memory-card__tone">
                {card.tone === "phrase"
                  ? t("games.memoryTagPhrase")
                  : t("games.memoryTagWord")}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default MemoryPairsGame;
