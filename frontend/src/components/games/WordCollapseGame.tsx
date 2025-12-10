import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Application,
  Container,
  Graphics,
  Text,
} from "pixi.js";

import type { GlossaryTerm, Level, Stream } from "../../types";
import { getNorwegianForTerm, pickTranslationForTower } from "../../utils/terms";

type Props = {
  stream: Stream;
  currentLevel: Level;
  playableTerms: GlossaryTerm[];
};

type SpeedId = "slow" | "normal" | "fast";

type Pair = {
  id: string;
  termId: number;
  nor: string;
  tr: string;
};

type Block = {
  id: string;
  pairId: string;
  role: "nor" | "tr";
  termId: number;
  node: Container;
  vy: number;
  width: number;
  height: number;
  waveId: number;
  landed: boolean;
};

const MAX_MISTAKES = 12;

const SPEEDS: Record<
  SpeedId,
  { fall: number; spawnMs: number; labelKey: string }
> = {
  slow: { fall: 120, spawnMs: 1300, labelKey: "games.speedSlow" },
  normal: { fall: 160, spawnMs: 1000, labelKey: "games.speedNormal" },
  fast: { fall: 210, spawnMs: 800, labelKey: "games.speedFast" },
};

const MAX_TEXT_WIDTH = 14;

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const WordCollapseGame: React.FC<Props> = ({
  stream,
  playableTerms,
  currentLevel: _currentLevel,
}) => {
  const { t, i18n } = useTranslation();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const stageRef = useRef<Container | null>(null);
  const blocksRef = useRef<Map<string, Block>>(new Map());
  const pairQueueRef = useRef<Pair[]>([]);
  const spawnElapsedRef = useRef(0);
  const selectedRef = useRef<string | null>(null);
  const colsRef = useRef(6);
  const waveIdRef = useRef(0);
  const totalInWaveRef = useRef(0);
  const landedRef = useRef(0);
  const matchedRef = useRef(0);
  const acceptingRef = useRef(false);
  const [pairCount, setPairCount] = useState(8);
  const [speed, setSpeed] = useState<SpeedId>("normal");
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const runningRef = useRef(false);
  const gameOverRef = useRef(false);

  const availablePairs = useMemo<Pair[]>(() => {
    const pairs: Pair[] = [];
    for (const term of playableTerms) {
      const nor = getNorwegianForTerm(term, stream);
      const tr = pickTranslationForTower(term, i18n);
      if (!nor || !tr) continue;
      pairs.push({
        id: `pair-${term.id}`,
        termId: term.id,
        nor,
        tr,
      });
    }
    return pairs.slice(0, 40);
  }, [playableTerms, stream, i18n]);

  const resizeStage = () => {
    if (!canvasRef.current || !appRef.current) return;
    const width = canvasRef.current.clientWidth;
    const height = Math.max(
      520,
      Math.min(960, Math.floor(window.innerHeight * 0.72)),
    );
    appRef.current.renderer.resize(width, height);
    colsRef.current = width < 540 ? 5 : 7;
  };

  const clearBlocks = () => {
    blocksRef.current.forEach((block) => {
      stageRef.current?.removeChild(block.node);
      block.node.destroy({ children: true });
    });
    blocksRef.current.clear();
    selectedRef.current = null;
    landedRef.current = 0;
    matchedRef.current = 0;
    totalInWaveRef.current = 0;
    acceptingRef.current = false;
  };

  const stopGame = () => {
    setRunning(false);
    runningRef.current = false;
    setGameOver(false);
    gameOverRef.current = false;
  };

  const resetGame = () => {
    clearBlocks();
    setScore(0);
    setMistakes(0);
    setStreak(0);
    setGameOver(false);
    gameOverRef.current = false;
    spawnElapsedRef.current = 0;
    selectedRef.current = null;
  };

  const setupApp = async () => {
    if (!canvasRef.current) return;
    const app = new Application();
    await app.init({
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      powerPreference: "high-performance",
      resizeTo: canvasRef.current,
    });
    appRef.current = app;
    const stage = new Container();
    stageRef.current = stage;
    app.stage.addChild(stage);
    canvasRef.current.appendChild(app.canvas);
    resizeStage();

    app.ticker.add((ticker) => {
      if (!runningRef.current || gameOverRef.current) return;
      const dt = ticker.deltaMS / 1000;
      spawnElapsedRef.current += ticker.deltaMS;
      const { spawnMs } = SPEEDS[speed];

      if (
        spawnElapsedRef.current >= spawnMs &&
        pairQueueRef.current.length > 0 &&
        totalInWaveRef.current === 0
      ) {
        spawnElapsedRef.current = 0;
        startWave();
      }

      const height = app.renderer.height;

      blocksRef.current.forEach((block) => {
        if (block.landed) return;
        block.node.y += block.vy * dt;
        if (block.node.y >= height - block.height - 6) {
          block.node.y = height - block.height - 6;
          block.vy = 0;
          block.landed = true;
          landedRef.current += 1;
          if (landedRef.current >= totalInWaveRef.current) {
            acceptingRef.current = true;
          }
        }
      });
    });
  };

  const decorateBlock = (
    block: Container,
    text: string,
    color: number,
    width: number,
    height: number,
  ) => {
    const bg = new Graphics()
      .roundRect(0, 0, width, height, 12)
      .fill(0xffffff)
      .stroke({ color, width: 2 });
    block.addChild(bg);

    const label = new Text({
      text,
      style: {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 16,
        fontWeight: "600",
        fill: 0x1c2430,
        align: "center",
        wordWrap: true,
        wordWrapWidth: width - 16,
      },
    });
    label.x = 8;
    label.y = 12;
    block.addChild(label);
    return label;
  };

  const spawnWave = (wavePairs: Pair[], waveId: number) => {
    if (!stageRef.current || !appRef.current) return;
    const { fall } = SPEEDS[speed];
    const width = appRef.current.renderer.width;
    const padding = 16;
    const half = (width - padding * 3) / 2;
    const colsPerSide = colsRef.current / 2;
    const columnWidth = half / colsPerSide;
    const blockWidth = Math.max(100, columnWidth - 10);
    const blockHeight = 64;
    const leftCols: number[] = [];
    const rightCols: number[] = [];

    for (let i = 0; i < colsPerSide; i += 1) {
      leftCols.push(i);
      rightCols.push(i);
    }

    const popCol = (arr: number[]) => {
      if (arr.length === 0) return Math.floor(Math.random() * colsPerSide);
      const idx = Math.floor(Math.random() * arr.length);
      const col = arr[idx];
      arr.splice(idx, 1);
      return col;
    };

    wavePairs.forEach((pair) => {
      const chosenLeft = popCol(leftCols);
      const chosenRight = popCol(rightCols);
      const roles: ("nor" | "tr")[] = ["nor", "tr"];
      roles.forEach((role) => {
        const col = role === "nor" ? chosenLeft : chosenRight;
        const offsetX = role === "nor" ? 0 : half + padding;
        const x = padding + offsetX + col * columnWidth;
        const y = -blockHeight - Math.random() * 60;
        const block = new Container();
        block.x = x;
        block.y = y;
        block.eventMode = "static";
        block.cursor = "pointer";

        const text =
          role === "nor"
            ? truncate(pair.nor, MAX_TEXT_WIDTH)
            : truncate(pair.tr, MAX_TEXT_WIDTH);
        const label = decorateBlock(
          block,
          text,
          role === "nor" ? 0x2d7ff9 : 0x0fb999,
          blockWidth,
          blockHeight,
        );
        label.y = 14;

        const id = `${pair.id}-${role}-${waveId}-${Math.random()
          .toString(16)
          .slice(2)}`;
        const item: Block = {
          id,
          pairId: pair.id,
          role,
          termId: pair.termId,
          node: block,
          vy: fall,
          width: blockWidth,
          height: blockHeight,
          waveId,
          landed: false,
        };
        blocksRef.current.set(id, item);
        block.on("pointertap", () => handleSelect(id));
        stageRef.current?.addChild(block);
      });
    });
    totalInWaveRef.current = wavePairs.length * 2;
  };

  const removeBlock = (id: string, matched: boolean) => {
    const block = blocksRef.current.get(id);
    if (!block || !stageRef.current) return;
    const node = block.node;
    blocksRef.current.delete(id);
    if (matched) {
      node.alpha = 0.5;
      node.scale.set(0.8);
    }
    stageRef.current.removeChild(node);
    node.destroy({ children: true });
  };

  const handleSelect = (id: string) => {
    if (gameOver || !running) return;
    if (!acceptingRef.current) return;
    const current = blocksRef.current.get(id);
    if (!current) return;

    if (!selectedRef.current) {
      selectedRef.current = id;
      highlightBlock(id, true);
      return;
    }

    if (selectedRef.current === id) {
      highlightBlock(id, false);
      selectedRef.current = null;
      return;
    }

    const previous = blocksRef.current.get(selectedRef.current);
    highlightBlock(selectedRef.current, false);
    selectedRef.current = null;
    if (!previous) return;

    const isMatch =
      previous.pairId === current.pairId &&
      previous.role !== current.role;

    if (isMatch) {
      removeBlock(previous.id, true);
      removeBlock(current.id, true);
      setScore((prev) => prev + 1);
      matchedRef.current += 2;
      setStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
      if (matchedRef.current >= totalInWaveRef.current) {
        acceptingRef.current = false;
        setTimeout(() => {
          if (!runningRef.current || gameOverRef.current) return;
          clearBlocks();
          startWave();
        }, 350);
      }
    } else {
      setMistakes((prev) => {
        const next = prev + 1;
        if (next >= MAX_MISTAKES) {
          setGameOver(true);
          gameOverRef.current = true;
          setRunning(false);
          runningRef.current = false;
        }
        return next;
      });
      setStreak(0);
      flashBlock(current.id);
      flashBlock(previous.id);
      acceptingRef.current = false;
      setTimeout(() => {
        if (!runningRef.current || gameOverRef.current) return;
        clearBlocks();
        startWave();
      }, 500);
    }
  };

  const highlightBlock = (id: string, active: boolean) => {
    const block = blocksRef.current.get(id);
    if (!block) return;
    const outline = block.node.children[0] as Graphics | undefined;
    if (!outline) return;
    outline.stroke({ color: active ? 0xffb703 : 0xced6e0, width: 2 });
  };

  const flashBlock = (id: string) => {
    const block = blocksRef.current.get(id);
    if (!block) return;
    block.node.angle = 0;
    block.node.alpha = 1;
    block.node.tint = 0xff6b6b;
    setTimeout(() => {
      block.node.tint = 0xffffff;
    }, 180);
  };

  const handleStart = () => {
    if (availablePairs.length < 3) return;
    resetGame();
    spawnElapsedRef.current = 0;
    pairQueueRef.current = availablePairs
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(3, pairCount));
    setRunning(true);
    runningRef.current = true;
    setGameOver(false);
    gameOverRef.current = false;
    startWave();
  };

  const startWave = () => {
    if (pairQueueRef.current.length === 0 || !runningRef.current) return;
    waveIdRef.current += 1;
    landedRef.current = 0;
    matchedRef.current = 0;
    totalInWaveRef.current = 0;
    acceptingRef.current = false;
    spawnElapsedRef.current = 0;
    clearBlocks();
    const shuffled = [...pairQueueRef.current].sort(
      () => Math.random() - 0.5,
    );
    const wavePairs = shuffled.slice(0, Math.max(3, pairCount));
    spawnWave(wavePairs, waveIdRef.current);
  };

  useEffect(() => {
    setupApp();
    const onResize = () => resizeStage();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearBlocks();
      appRef.current?.destroy(true);
      appRef.current = null;
      stageRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!running) return;
    if (availablePairs.length < 3) {
      stopGame();
    } else {
      pairQueueRef.current = availablePairs
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.max(3, pairCount));
    }
  }, [availablePairs, running, pairCount]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  return (
    <div className="collapse-game">
      <div className="collapse-hero">
        <div>
          <p className="memory-eyebrow">{t("games.collapseEyebrow")}</p>
          <h3>{t("games.collapseTitle")}</h3>
          <p className="muted small">{t("games.collapseSubtitle")}</p>
        </div>
        <div className="collapse-actions">
          <button
            type="button"
            className="memory-start"
            onClick={handleStart}
            disabled={availablePairs.length < 3}
          >
            {gameOver ? t("games.collapseRestart") : t("games.collapseStart")}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              stopGame();
              resetGame();
            }}
          >
            {t("games.stop")}
          </button>
          {availablePairs.length < 3 && (
            <span className="muted small">
              {t("games.memoryNotEnough")}
            </span>
          )}
        </div>
      </div>

      <div className="collapse-controls">
        <label className="falling-speed-label">
          <span>{t("games.collapseSpeedLabel")}</span>
          <select
            value={speed}
            onChange={(e) => setSpeed(e.target.value as SpeedId)}
            disabled={running}
          >
            {Object.entries(SPEEDS).map(([id, config]) => (
              <option key={id} value={id}>
                {t(config.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="falling-speed-label">
          <span>{t("games.collapseDeckLabel")}</span>
          <input
            type="number"
            min={3}
            max={12}
            value={pairCount}
            onChange={(e) =>
              setPairCount(
                Math.min(12, Math.max(3, Number(e.target.value) || 3)),
              )
            }
            disabled={running}
            className="tower-batch-input"
          />
        </label>
        <div className="collapse-life">
          {t("games.towerLivesLabel")}{" "}
          {"❤️".repeat(Math.max(0, MAX_MISTAKES - mistakes))}
          {"🤍".repeat(Math.max(0, mistakes))}
        </div>
      </div>

      <div className="collapse-stats">
        <div className="collapse-stat">
          <span className="muted small">{t("games.collapsePairsLabel")}</span>
          <strong>{score}</strong>
        </div>
        <div className="collapse-stat">
          <span className="muted small">
            {t("games.collapseMistakesLabel")}
          </span>
          <strong>{mistakes}</strong>
        </div>
        <div className="collapse-stat">
          <span className="muted small">
            {t("games.collapseStreakLabel")}
          </span>
          <strong>{streak}</strong>
        </div>
        <div className="collapse-stat">
          <span className="muted small">
            {t("games.collapseBestLabel")}
          </span>
          <strong>{bestStreak}</strong>
        </div>
      </div>

      {gameOver && (
        <p className="alert small">{t("games.collapseGameOver")}</p>
      )}

      <div className="collapse-canvas" ref={canvasRef} />
    </div>
  );
};

export default WordCollapseGame;
