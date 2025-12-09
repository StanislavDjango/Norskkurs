import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchGlossary } from "../api";
import type { GlossaryTerm, Level, Stream } from "../types";

type Props = {
  stream: Stream;
  currentLevel: Level;
};

type FallingWord = {
  id: string;
  text: string;
  translationEn: string;
  translationRu: string;
  left: number;
  duration: number;
};

const GamesPage: React.FC<Props> = ({ stream, currentLevel }) => {
  const { t, i18n } = useTranslation();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [fallingWords, setFallingWords] = useState<FallingWord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedWord, setSelectedWord] = useState<FallingWord | null>(null);

  useEffect(() => {
    fetchGlossary({ stream, level: currentLevel })
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

  useEffect(() => {
    if (!isRunning) return;
    if (playableTerms.length === 0) return;

    const spawn = () => {
      const term =
        playableTerms[Math.floor(Math.random() * playableTerms.length)];
      const norwegian =
        stream === "bokmaal"
          ? term.translation_nb || term.term
          : stream === "nynorsk"
          ? term.translation_nn || term.translation_nb || term.term
          : term.term;

      if (!norwegian) {
        return;
      }

      const duration = 8 + Math.random() * 5;
      const left = 5 + Math.random() * 80;
      const id = `${term.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const word: FallingWord = {
        id,
        text: norwegian,
        translationEn: term.translation_en,
        translationRu: term.translation_ru,
        left,
        duration,
      };

      setFallingWords((prev) => [...prev, word]);

      window.setTimeout(() => {
        setFallingWords((prev) => prev.filter((item) => item.id !== id));
        setSelectedWord((prev) => (prev && prev.id === id ? null : prev));
      }, duration * 1000);
    };

    const interval = window.setInterval(spawn, 1200);

    return () => window.clearInterval(interval);
  }, [isRunning, playableTerms, stream]);

  const activeTranslation = useMemo(() => {
    if (!selectedWord) return "";
    const lang = i18n.language;
    if (lang.startsWith("ru")) {
      return selectedWord.translationRu || selectedWord.translationEn;
    }
    if (lang.startsWith("nb") || lang.startsWith("no")) {
      return selectedWord.translationEn || selectedWord.translationRu;
    }
    return selectedWord.translationEn || selectedWord.translationRu;
  }, [selectedWord, i18n.language]);

  return (
    <div className="card games-layout">
      <h2>{t("nav.games")}</h2>
      <p className="muted small">{t("games.description")}</p>

      <div className="falling-game">
        <div className="falling-game-header">
          <h3>{t("games.fallingTitle")}</h3>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setSelectedWord(null);
              setFallingWords([]);
              setIsRunning((prev) => !prev);
            }}
            disabled={playableTerms.length === 0}
          >
            {isRunning ? t("games.stop") : t("games.start")}
          </button>
        </div>
        {playableTerms.length === 0 && (
          <p className="muted small">{t("games.noWords")}</p>
        )}
        <div className="falling-game-area">
          {fallingWords.map((word) => (
            <button
              key={word.id}
              type="button"
              className="falling-word"
              style={{
                left: `${word.left}%`,
                animationDuration: `${word.duration}s`,
              }}
              onClick={() => setSelectedWord(word)}
            >
              {word.text}
            </button>
          ))}
        </div>
        {selectedWord && activeTranslation && (
          <div className="falling-translation">
            <span className="label">{t("games.translationLabel")}</span>
            <strong>{selectedWord.text}</strong>
            <span className="arrow">→</span>
            <span>{activeTranslation}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamesPage;
