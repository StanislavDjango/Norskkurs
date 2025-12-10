import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchGlossary } from "../api";
import type { GlossaryTerm, Level, Stream } from "../types";
import FallingWordsGame from "../components/games/FallingWordsGame";
import WordTowerGame from "../components/games/WordTowerGame";

import WordCollapseGame from "../components/games/WordCollapseGame";

type Props = {
  stream: Stream;
  currentLevel: Level;
};

type GameId = "fallingWords" | "wordTower" | "wordCollapse";

const GamesPage: React.FC<Props> = ({ stream, currentLevel }) => {
  const { t } = useTranslation();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [activeGame, setActiveGame] = useState<GameId>("wordCollapse");

  useEffect(() => {
    fetchGlossary()
      .then(setTerms)
      .catch(() => setTerms([]));
  }, [stream, currentLevel]);

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
    </div>
  );
};

export default GamesPage;
