import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { GlossaryTerm, Level, Stream } from "../../types";
import { getNorwegianForTerm } from "../../utils/terms";

type Props = {
  stream: Stream;
  currentLevel: Level;
  playableTerms: GlossaryTerm[];
};

type GameSpeed = "verySlow" | "slow" | "normal" | "fast" | "turbo";

type FallingWord = {
  id: string;
  text: string;
  translationEn: string;
  translationRu: string;
  left: number;
  duration: number;
};

const FallingWordsGame: React.FC<Props> = ({ stream, playableTerms }) => {
  const { t, i18n } = useTranslation();
  const [fallingWords, setFallingWords] = useState<FallingWord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedWord, setSelectedWord] = useState<FallingWord | null>(null);
  const [speed, setSpeed] = useState<GameSpeed>("normal");

  useEffect(() => {
    if (!isRunning) return;
    if (playableTerms.length === 0) return;

    let baseDurationMin: number;
    let baseDurationMax: number;
    let spawnEveryMs: number;

    switch (speed) {
      case "verySlow":
        baseDurationMin = 7;
        baseDurationMax = 10;
        spawnEveryMs = 2600;
        break;
      case "slow":
        baseDurationMin = 5;
        baseDurationMax = 7;
        spawnEveryMs = 2200;
        break;
      case "fast":
        baseDurationMin = 2.5;
        baseDurationMax = 3.5;
        spawnEveryMs = 1200;
        break;
      case "turbo":
        baseDurationMin = 1.5;
        baseDurationMax = 2.5;
        spawnEveryMs = 900;
        break;
      default:
        baseDurationMin = 3.5;
        baseDurationMax = 5.5;
        spawnEveryMs = 1600;
        break;
    }

    const spawn = () => {
      const term =
        playableTerms[Math.floor(Math.random() * playableTerms.length)];
      const norwegian = getNorwegianForTerm(term, stream);

      if (!norwegian) {
        return;
      }

      const duration =
        baseDurationMin +
        Math.random() * Math.max(baseDurationMax - baseDurationMin, 0.5);
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
      }, (duration + 1.2) * 1000);
    };

    const interval = window.setInterval(spawn, spawnEveryMs);

    return () => window.clearInterval(interval);
  }, [isRunning, playableTerms, stream, speed]);

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
    <div className="falling-game">
      <div className="falling-game-header">
        <h3>{t("games.fallingTitle")}</h3>
        <div className="falling-game-controls">
          <label className="falling-speed-label">
            <span>{t("games.speedLabel")}</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(e.target.value as GameSpeed)}
              disabled={isRunning}
            >
              <option value="verySlow">{t("games.speedVerySlow")}</option>
              <option value="slow">{t("games.speedSlow")}</option>
              <option value="normal">{t("games.speedNormal")}</option>
              <option value="fast">{t("games.speedFast")}</option>
              <option value="turbo">{t("games.speedTurbo")}</option>
            </select>
          </label>
        </div>
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
          <div
            key={word.id}
            className="falling-word"
            style={{
              left: `${word.left}%`,
              animationDuration: `${word.duration}s`,
            }}
            onClick={() => setSelectedWord(word)}
          >
            {word.text}
          </div>
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
  );
};

export default FallingWordsGame;
