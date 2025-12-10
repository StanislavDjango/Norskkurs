import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchExpressions, fetchGlossary } from "../api";
import FallingWordsGame from "../components/games/FallingWordsGame";
import MemoryPairsGame from "../components/games/MemoryPairsGame";
import WordCollapseGame from "../components/games/WordCollapseGame";
import WordTowerGame from "../components/games/WordTowerGame";
import type { Expression, GlossaryTerm, Level, Stream } from "../types";

type Props = {
  stream: Stream;
  currentLevel: Level;
};

type GameId = "fallingWords" | "wordTower" | "wordCollapse" | "memoryPairs";

const GamesPage: React.FC<Props> = ({ stream, currentLevel }) => {
  const { t } = useTranslation();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [expressions, setExpressions] = useState<Expression[]>([]);
  const [activeGame, setActiveGame] = useState<GameId>("memoryPairs");

  useEffect(() => {
    fetchGlossary()
      .then(setTerms)
      .catch(() => setTerms([]));
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
        />
      )}

      {activeGame === "wordTower" && (
        <WordTowerGame
          stream={stream}
          currentLevel={currentLevel}
          playableTerms={playableTerms}
        />
      )}

      {activeGame === "wordCollapse" && (
        <WordCollapseGame
          stream={stream}
          currentLevel={currentLevel}
          playableTerms={playableTerms}
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
