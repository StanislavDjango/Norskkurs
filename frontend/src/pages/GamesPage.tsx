import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchGlossary } from "../api";
import type { GlossaryTerm, Level, Stream } from "../types";

const getNorwegianForTerm = (term: GlossaryTerm, stream: Stream): string | null => {
  if (stream === "bokmaal") {
    return term.translation_nb || term.term;
  }
  if (stream === "nynorsk") {
    return term.translation_nn || term.translation_nb || term.term;
  }
  return term.term;
};

type Props = {
  stream: Stream;
  currentLevel: Level;
};

type GameId = "fallingWords" | "wordTower";

type GameSpeed = "verySlow" | "slow" | "normal" | "fast" | "turbo";
type TowerSpeed = GameSpeed;

type FallingWord = {
  id: string;
  text: string;
  translationEn: string;
  translationRu: string;
  left: number;
  duration: number;
};

type TowerPiece = {
  id: string;
  termId: number;
  role: "nor" | "tr";
  text: string;
  dropDuration: number;
  dropDelay: number;
  isSelected?: boolean;
  isPenalty?: boolean;
  isRemoving?: boolean;
};

const MAX_TOWER_PIECES = 40;

const GamesPage: React.FC<Props> = ({ stream, currentLevel }) => {
  const { t, i18n } = useTranslation();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [fallingWords, setFallingWords] = useState<FallingWord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedWord, setSelectedWord] = useState<FallingWord | null>(null);
  const [speed, setSpeed] = useState<GameSpeed>("normal");
  const [activeGame, setActiveGame] = useState<GameId>("fallingWords");
  const [towerPieces, setTowerPieces] = useState<TowerPiece[]>([]);
  const [towerRunning, setTowerRunning] = useState(false);
  const [towerSelectedId, setTowerSelectedId] = useState<string | null>(null);
  const [towerMatches, setTowerMatches] = useState(0);
  const [towerMistakes, setTowerMistakes] = useState(0);
  const [towerGotReward, setTowerGotReward] = useState(false);
  const [towerGameOver, setTowerGameOver] = useState(false);
  const [towerSpeed, setTowerSpeed] = useState<TowerSpeed>("slow");
  const [towerInitialBatch, setTowerInitialBatch] = useState<number>(10);

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

  useEffect(() => {
    if (activeGame !== "fallingWords") return;
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
  }, [isRunning, playableTerms, stream, speed, activeGame]);

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

  const pickTranslationForTower = (term: GlossaryTerm): string => {
    const lang = i18n.language;
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

  const spawnTowerBatch = (
    existing: TowerPiece[],
    count: number,
  ): [TowerPiece[], boolean] => {
    let next = [...existing];
    if (playableTerms.length === 0 || count <= 0) {
      return [next, next.length >= MAX_TOWER_PIECES];
    }

    for (let i = 0; i < count; i += 1) {
      if (next.length >= MAX_TOWER_PIECES) {
        return [next, true];
      }

      const counts: Record<
        number,
        { nor: boolean; tr: boolean; total: number }
      > = {};

      for (const p of next) {
        const info =
          counts[p.termId] || { nor: false, tr: false, total: 0 };
        if (p.role === "nor") info.nor = true;
        if (p.role === "tr") info.tr = true;
        info.total += 1;
        counts[p.termId] = info;
      }

      const openEntries = Object.entries(counts).filter(
        ([, info]) => info.nor !== info.tr && info.total < 4,
      );

      const shouldUseExisting =
        openEntries.length > 0 && Math.random() < 0.6;

      let chosenTerm: GlossaryTerm;
      let role: TowerPiece["role"];

      if (shouldUseExisting) {
        const [termIdStr, info] =
          openEntries[
            Math.floor(Math.random() * openEntries.length)
          ];
        const termId = Number(termIdStr);
        const fallback =
          playableTerms[Math.floor(Math.random() * playableTerms.length)];
        chosenTerm =
          playableTerms.find((t) => t.id === termId) || fallback;
        role = info.nor ? "tr" : "nor";
      } else {
        chosenTerm =
          playableTerms[Math.floor(Math.random() * playableTerms.length)];
        role = Math.random() < 0.5 ? "nor" : "tr";
      }

      const norwegian = getNorwegianForTerm(chosenTerm, stream);
      const translation = pickTranslationForTower(chosenTerm);
      if (!norwegian || !translation) {
        continue;
      }

      const text = role === "nor" ? norwegian : translation;

      let durationMin: number;
      let durationMax: number;
      switch (towerSpeed) {
        case "verySlow":
          durationMin = 6;
          durationMax = 8;
          break;
        case "slow":
          durationMin = 5;
          durationMax = 7;
          break;
        case "fast":
          durationMin = 3;
          durationMax = 4.2;
          break;
        case "turbo":
          durationMin = 2;
          durationMax = 3;
          break;
        default:
          durationMin = 4;
          durationMax = 5.5;
          break;
      }

      const dropDuration =
        durationMin + Math.random() * Math.max(durationMax - durationMin, 0.5);
      const dropDelay = 0;

      const piece: TowerPiece = {
        id: `tower-${chosenTerm.id}-${role}-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`,
        termId: chosenTerm.id,
        role,
        text,
        dropDuration,
        dropDelay,
      };

      next = [...next, piece];
    }

    return [next, next.length >= MAX_TOWER_PIECES];
  };

  useEffect(() => {
    if (activeGame !== "wordTower") return;
    if (!towerRunning || towerGameOver) return;
    if (playableTerms.length === 0) return;

    let intervalMs: number;
    switch (towerSpeed) {
      case "verySlow":
        intervalMs = 3200;
        break;
      case "slow":
        intervalMs = 2600;
        break;
      case "fast":
        intervalMs = 1800;
        break;
      case "turbo":
        intervalMs = 1400;
        break;
      default:
        intervalMs = 2200;
        break;
    }

    const batchSize = 6;

    const spawn = () => {
      let isFull = false;
      setTowerPieces((prev) => {
        const [next, full] = spawnTowerBatch(prev, batchSize);
        isFull = full;
        return next;
      });
      if (isFull) {
        setTowerGameOver(true);
        setTowerRunning(false);
      }
    };

    const interval = window.setInterval(spawn, intervalMs);
    return () => window.clearInterval(interval);
  }, [
    activeGame,
    towerRunning,
    towerGameOver,
    playableTerms,
    towerSpeed,
    spawnTowerBatch,
  ]);

  const handleTowerToggle = () => {
    if (towerRunning) {
      setTowerRunning(false);
      return;
    }
    if (playableTerms.length === 0) {
      return;
    }
    setTowerPieces([]);
    setTowerSelectedId(null);
    setTowerMatches(0);
    setTowerMistakes(0);
    setTowerGotReward(false);
    setTowerGameOver(false);
    const initialCount = Math.min(
      20,
      Math.max(3, Number.isFinite(towerInitialBatch) ? towerInitialBatch : 10),
    );
    const [firstBatch, full] = spawnTowerBatch([], initialCount);
    setTowerPieces(firstBatch);
    if (full || firstBatch.length === 0) {
      setTowerGameOver(full);
      setTowerRunning(false);
      return;
    }
    setTowerRunning(true);
  };

  const handleTowerPieceClick = (pieceId: string) => {
    if (towerGameOver) return;

    setTowerPieces((prev) => {
      const piece = prev.find((p) => p.id === pieceId);
      if (!piece) {
        return prev;
      }

      const currentSelected = towerSelectedId
        ? prev.find((p) => p.id === towerSelectedId)
        : undefined;

      // Первая часть пары
      if (!towerSelectedId || !currentSelected) {
        setTowerSelectedId(pieceId);
        return prev.map((p) => ({
          ...p,
          isSelected: p.id === pieceId,
        }));
      }

      // Снятие выбора с того же элемента
      if (towerSelectedId === pieceId) {
        setTowerSelectedId(null);
        return prev.map((p) => ({ ...p, isSelected: false }));
      }

      // Проверяем пару
      if (
        currentSelected.termId === piece.termId &&
        currentSelected.role !== piece.role
      ) {
        const idsToRemove = new Set([currentSelected.id, piece.id]);
        setTowerSelectedId(null);
        setTowerMatches((m) => {
          const next = m + 1;
          if (next >= 10 && !towerGotReward) {
            setTowerGotReward(true);
          }
          return next;
        });
        const withAnimation = prev.map((p) => {
          if (idsToRemove.has(p.id)) {
            return {
              ...p,
              isSelected: false,
              isPenalty: false,
              isRemoving: true,
            };
          }
          return p;
        });

        window.setTimeout(() => {
          setTowerPieces((later) =>
            later.filter((p) => !idsToRemove.has(p.id)),
          );
        }, 350);

        return withAnimation;
      }

      // Неправильная пара — обе выделяются как ошибка
      setTowerSelectedId(null);
      setTowerMistakes((m) => m + 1);
      return prev.map((p) => {
        if (p.id === currentSelected.id || p.id === piece.id) {
          return { ...p, isSelected: false, isPenalty: true };
        }
        return { ...p, isSelected: false };
      });
    });
  };

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
      </div>

      {activeGame === "fallingWords" && (
        <div className="falling-game">
        <div className="falling-game-header">
          <h3>{t("games.fallingTitle")}</h3>
          <div className="falling-game-controls">
            <label className="falling-speed-label">
              <span>{t("games.speedLabel")}</span>
              <select
                value={speed}
                onChange={(e) =>
                  setSpeed(e.target.value as GameSpeed)
                }
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
      )}

      {activeGame === "wordTower" && (
        <div className="tower-game">
          <div className="tower-header">
            <div className="tower-header-main">
              <h3>{t("games.towerTitle")}</h3>
              <div className="falling-game-controls">
                <label className="falling-speed-label">
                  <span>{t("games.speedLabel")}</span>
                  <select
                    value={towerSpeed}
                    onChange={(e) =>
                      setTowerSpeed(e.target.value as TowerSpeed)
                    }
                    disabled={towerRunning}
                  >
                    <option value="verySlow">
                      {t("games.speedVerySlow")}
                    </option>
                    <option value="slow">{t("games.speedSlow")}</option>
                    <option value="normal">
                      {t("games.speedNormal")}
                    </option>
                    <option value="fast">{t("games.speedFast")}</option>
                    <option value="turbo">{t("games.speedTurbo")}</option>
                  </select>
                </label>
                <label className="falling-speed-label">
                  <span>{t("games.towerBatchLabel")}</span>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={towerInitialBatch}
                    onChange={(e) =>
                      setTowerInitialBatch(
                        Math.min(
                          20,
                          Math.max(3, Number(e.target.value) || 3),
                        ),
                      )
                    }
                    disabled={towerRunning}
                    className="tower-batch-input"
                  />
                </label>
              </div>
            </div>
            <div className="tower-stats">
              <span className="muted small">
                {t("games.towerMatchesLabel")} {towerMatches}
              </span>
              <span className="muted small">
                {t("games.towerMistakesLabel")} {towerMistakes}
              </span>
              {towerGotReward && (
                <span className="tower-reward small">
                  {t("games.towerReward10")}
                </span>
              )}
            </div>
            <button
              type="button"
              className="ghost"
              onClick={handleTowerToggle}
              disabled={playableTerms.length === 0}
            >
              {towerRunning
                ? t("games.stop")
                : towerGameOver
                ? t("restart")
                : t("games.start")}
            </button>
          </div>
          {towerGameOver && (
            <p className="alert small">{t("games.towerGameOver")}</p>
          )}
          {playableTerms.length === 0 && !towerGameOver && !towerRunning && (
            <p className="muted small">{t("games.noWords")}</p>
          )}
          <div className="tower-area">
            {towerPieces.map((piece) => (
              <button
                key={piece.id}
                type="button"
                className={`tower-piece tower-piece--${piece.role} ${
                  piece.isSelected ? "tower-piece--selected" : ""
                } ${piece.isPenalty ? "tower-piece--penalty" : ""} ${
                  piece.isRemoving ? "tower-piece--removing" : ""
                }`}
                style={{
                  animationDuration: `${piece.dropDuration}s`,
                  animationDelay: `${piece.dropDelay}s`,
                }}
                onClick={() => handleTowerPieceClick(piece.id)}
              >
                {piece.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GamesPage;
