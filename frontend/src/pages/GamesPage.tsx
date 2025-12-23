import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchExpressions, fetchGlossary, fetchVerbs } from "../api";
import FallingWordsGame from "../components/games/FallingWordsGame";
import CafeDialoguesGame from "../components/games/CafeDialoguesGame";
import FjordExpeditionGame from "../components/games/FjordExpeditionGame";
import MemoryPairsGame from "../components/games/MemoryPairsGame";
import SentenceScrambleGame from "../components/games/SentenceScrambleGame";
import WordCollapseGame from "../components/games/WordCollapseGame";
import WordTowerGame from "../components/games/WordTowerGame";
import type { Expression, GlossaryTerm, Level, Stream, VerbEntry } from "../types";

type Props = {
  stream: Stream;
  currentLevel: Level;
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

type GameId =
  | "fallingWords"
  | "cafeDialogues"
  | "fjordExpedition"
  | "sentenceScramble"
  | "wordTower"
  | "wordCollapse"
  | "memoryPairs";

const GamesPage: React.FC<Props> = ({
  stream,
  currentLevel,
  vocabFavorites,
  onToggleVocabFavorite,
}) => {
  const { t } = useTranslation();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [verbEntries, setVerbEntries] = useState<VerbEntry[]>([]);
  const [expressions, setExpressions] = useState<Expression[]>([]);
  const [activeGame, setActiveGame] = useState<GameId>("memoryPairs");

  useEffect(() => {
    fetchGlossary()
      .then(setTerms)
      .catch(() => setTerms([]));
  }, [stream, currentLevel]);

  useEffect(() => {
    fetchVerbs({ stream })
      .then(setVerbEntries)
      .catch(() => setVerbEntries([]));
  }, [stream, currentLevel]);

  useEffect(() => {
    fetchExpressions({ stream })
      .then(setExpressions)
      .catch(() => setExpressions([]));
  }, [stream]);

  const playableTerms = useMemo(() => {
    return terms.filter((term) => {
      const hasNb =
        stream === "bokmaal"
          ? Boolean(term.translation_nb || term.term)
          : Boolean(term.translation_nn || term.translation_nb || term.term);
      return hasNb && (term.translation_en || term.translation_ru);
    });
  }, [terms, stream]);

  return (
    <div className="card games-layout">
      <h2>{t("nav.games")}</h2>
      <p className="muted small">{t("games.description")}</p>

      <div className="games-tabs">
        <button
          type="button"
          className={`pill ${
            activeGame === "fallingWords" ? "pill--active" : ""
          }`}
          onClick={() => setActiveGame("fallingWords")}
        >
          {t("games.tabFallingWords")}
        </button>
        <button
          type="button"
          className={`pill ${
            activeGame === "cafeDialogues" ? "pill--active" : ""
          }`}
          onClick={() => setActiveGame("cafeDialogues")}
        >
          {t("games.tabCafeDialogues")}
        </button>
        <button
          type="button"
          className={`pill ${
            activeGame === "sentenceScramble" ? "pill--active" : ""
          }`}
          onClick={() => setActiveGame("sentenceScramble")}
        >
          {t("games.tabSentenceScramble")}
        </button>
        <button
          type="button"
          className={`pill ${
            activeGame === "fjordExpedition" ? "pill--active" : ""
          }`}
          onClick={() => setActiveGame("fjordExpedition")}
        >
          {t("games.tabFjordExpedition")}
        </button>
        <button
          type="button"
          className={`pill ${
            activeGame === "wordTower" ? "pill--active" : ""
          }`}
          onClick={() => setActiveGame("wordTower")}
        >
          {t("games.tabWordTower")}
        </button>
        <button
          type="button"
          className={`pill ${
            activeGame === "wordCollapse" ? "pill--active" : ""
          }`}
          onClick={() => setActiveGame("wordCollapse")}
        >
          WordCollaps
        </button>
        <button
          type="button"
          className={`pill ${
            activeGame === "memoryPairs" ? "pill--active" : ""
          }`}
          onClick={() => setActiveGame("memoryPairs")}
        >
          {t("games.tabMemory")}
        </button>
      </div>

      {activeGame === "fallingWords" && (
        <FallingWordsGame
          stream={stream}
          currentLevel={currentLevel}
          playableTerms={playableTerms}
          verbEntries={verbEntries}
        />
      )}

      {activeGame === "cafeDialogues" && (
        <CafeDialoguesGame
          stream={stream}
          currentLevel={currentLevel}
          expressions={expressions}
          verbEntries={verbEntries}
        />
      )}

      {activeGame === "sentenceScramble" && (
        <SentenceScrambleGame
          stream={stream}
          currentLevel={currentLevel}
          expressions={expressions}
          verbEntries={verbEntries}
        />
      )}

      {activeGame === "fjordExpedition" && (
        <FjordExpeditionGame
          stream={stream}
          currentLevel={currentLevel}
          playableTerms={playableTerms}
          verbEntries={verbEntries}
          vocabFavorites={vocabFavorites}
          onToggleVocabFavorite={onToggleVocabFavorite}
        />
      )}

      {activeGame === "wordTower" && (
        <WordTowerGame
          stream={stream}
          currentLevel={currentLevel}
          playableTerms={playableTerms}
          verbEntries={verbEntries}
        />
      )}

      {activeGame === "wordCollapse" && (
        <WordCollapseGame
          stream={stream}
          currentLevel={currentLevel}
          playableTerms={playableTerms}
          verbEntries={verbEntries}
        />
      )}

      {activeGame === "memoryPairs" && (
        <MemoryPairsGame
          stream={stream}
          currentLevel={currentLevel}
          terms={playableTerms}
          expressions={expressions}
        />
      )}
    </div>
  );
};

export default GamesPage;
