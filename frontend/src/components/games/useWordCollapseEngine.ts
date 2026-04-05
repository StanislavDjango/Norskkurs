import { useCallback, useEffect, useRef, useState } from "react";

import {
  isMobileViewport,
  randomInt,
  sampleWithoutReplacement,
  shuffleInPlace,
} from "./wordCollapseShared";
import type { SpawnPair } from "./wordCollapseShared";

export type GameStatus = "pre-game" | "running" | "paused" | "game-over";
export type EndReason = "lives" | "exhausted";

const BLOCK_HEIGHT = 48;
const INITIAL_GRACE_MS = 8000;
const RENDER_FPS = 60;
const SETTLE_SPEED_MULTIPLIER = 1.6;

export type Block = {
  id: string;
  termKey: string | null;
  role: "left" | "right" | "bonus";
  bonusType?: "freeze" | "bomb";
  text: string;
  col: number;
  y: number;
  targetY?: number;
  isFalling: boolean;
  isMatched?: boolean;
  isWrong?: boolean;
};

export type GameSize = {
  width: number;
  height: number;
  cols: number;
  blockWidth: number;
};

type Params = {
  gameSize: GameSize;
  spawnPool: SpawnPair[];
  pairCount: number;
  uniqueOnly: boolean;
  maxLives: number;
  fallSpeedPxPerSec: number;
  spawnIntervalMs: number;
  isModalOpen: boolean;
  isTutorialOpen: boolean;
  status: GameStatus;
  allowClickWhileFalling: boolean;
  onGameOver: (reason: EndReason) => void;
};

export const useWordCollapseEngine = ({
  gameSize,
  spawnPool,
  pairCount,
  uniqueOnly,
  maxLives,
  fallSpeedPxPerSec,
  spawnIntervalMs,
  isModalOpen,
  isTutorialOpen,
  status,
  allowClickWhileFalling,
  onGameOver,
}: Params) => {
  const [endReason, setEndReason] = useState<EndReason | null>(null);
  const [score, setScore] = useState(0);
  const [incorrectScore, setIncorrectScore] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [showComboAnimation, setShowComboAnimation] = useState<number | null>(
    null,
  );
  const [isFrozen, setIsFrozen] = useState(false);
  const [bombCharge, setBombCharge] = useState(0);
  const [lives, setLives] = useState(maxLives);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);

  const blocksRef = useRef<Block[]>([]);
  const blockIndexRef = useRef<Map<string, Block>>(new Map());
  const blocksDirtyRef = useRef(true);
  const gameStartedAtRef = useRef<number | null>(null);
  const spawnAccumulatorMsRef = useRef(0);
  const lastRenderAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const endReasonRef = useRef<EndReason | null>(null);
  const uniqueOnlyRef = useRef(false);
  const spawnQueueRef = useRef<SpawnPair[]>([]);
  const spawnCursorRef = useRef(0);
  const freezeTimeoutRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<number | null>(null);
  const matchedCleanupTimeoutRef = useRef<number | null>(null);
  const wrongResetTimeoutRef = useRef<number | null>(null);
  const freezeUntilRef = useRef(0);

  const clearPendingTimeouts = useCallback(() => {
    if (freezeTimeoutRef.current) {
      window.clearTimeout(freezeTimeoutRef.current);
      freezeTimeoutRef.current = null;
    }
    if (comboTimeoutRef.current) {
      window.clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    if (matchedCleanupTimeoutRef.current) {
      window.clearTimeout(matchedCleanupTimeoutRef.current);
      matchedCleanupTimeoutRef.current = null;
    }
    if (wrongResetTimeoutRef.current) {
      window.clearTimeout(wrongResetTimeoutRef.current);
      wrongResetTimeoutRef.current = null;
    }
  }, []);

  const syncBlocksRef = useCallback((next: Block[]) => {
    blocksRef.current = next;
    blockIndexRef.current = new Map(next.map((block) => [block.id, block]));
    blocksDirtyRef.current = true;
  }, []);

  const commitBlocks = useCallback((next: Block[]) => {
    syncBlocksRef(next);
  }, [syncBlocksRef]);

  const settleColumns = useCallback(
    (currentBlocks: Block[], options?: { snap?: boolean }) => {
      const snap = options?.snap ?? false;
      const byCol = new Map<number, Block[]>();
      for (const block of currentBlocks) {
        const entry = byCol.get(block.col) ?? [];
        entry.push(block);
        byCol.set(block.col, entry);
      }

      const next: Block[] = [];
      for (const entry of byCol.values()) {
        const sorted = [...entry].sort((a, b) => b.y - a.y);
        sorted.forEach((block, idx) => {
          const desiredY = gameSize.height - BLOCK_HEIGHT * (idx + 1);
          const needsMove =
            block.isFalling ||
            block.targetY !== undefined ||
            Math.abs(block.y - desiredY) > 0.5 ||
            block.y < desiredY;

          if (snap) {
            next.push({
              ...block,
              y: desiredY,
              isFalling: false,
              targetY: undefined,
            });
            return;
          }

          if (needsMove) {
            next.push({ ...block, isFalling: true, targetY: desiredY });
            return;
          }

          next.push({
            ...block,
            y: desiredY,
            isFalling: false,
            targetY: undefined,
          });
        });
      }
      return next;
    },
    [gameSize.height],
  );

  const loseLife = useCallback(() => {
    setLives((prev) => {
      const next = Math.max(0, prev - 1);
      if (next <= 0) {
        endReasonRef.current = "lives";
        setEndReason("lives");
        onGameOver("lives");
      }
      return next;
    });
  }, [onGameOver]);

  const applyFreeze = useCallback((durationMs: number) => {
    const now = Date.now();
    const nextUntil = Math.max(freezeUntilRef.current, now) + durationMs;
    freezeUntilRef.current = nextUntil;
    setIsFrozen(true);
    if (freezeTimeoutRef.current) {
      window.clearTimeout(freezeTimeoutRef.current);
      freezeTimeoutRef.current = null;
    }
    freezeTimeoutRef.current = window.setTimeout(() => {
      freezeUntilRef.current = 0;
      freezeTimeoutRef.current = null;
      setIsFrozen(false);
    }, Math.max(0, nextUntil - now));
  }, []);

  const spawnBonus = useCallback(
    (bonusType: "freeze" | "bomb") => {
      if (gameSize.cols < 1) return false;
      const existing = blocksRef.current;
      const blockedCols = new Set<number>();
      for (const block of existing) {
        if (block.isMatched) continue;
        if (block.y < BLOCK_HEIGHT) blockedCols.add(block.col);
      }
      const candidates = Array.from({ length: gameSize.cols }, (_, idx) => idx);
      shuffleInPlace(candidates);
      const col = candidates.find((candidate) => !blockedCols.has(candidate));
      if (col === undefined) return false;

      const text = bonusType === "freeze" ? "❄️" : "💣";
      commitBlocks([
        ...existing,
        {
          id: `wc-bonus-${bonusType}-${Date.now()}-${Math.random()}`,
          termKey: null,
          role: "bonus",
          bonusType,
          text,
          col,
          y: -BLOCK_HEIGHT,
          isFalling: true,
        },
      ]);
      return true;
    },
    [commitBlocks, gameSize.cols],
  );

  const spawnWave = useCallback(() => {
    if (spawnPool.length < 1 || gameSize.cols < 4) return false;

    const existing = blocksRef.current;
    const blockedCols = new Set<number>();
    for (const block of existing) {
      if (block.isMatched) continue;
      if (block.y < BLOCK_HEIGHT) blockedCols.add(block.col);
    }

    const halfCols = Math.max(2, Math.floor(gameSize.cols / 2));
    const remainingCount = uniqueOnlyRef.current
      ? Math.max(0, spawnQueueRef.current.length - spawnCursorRef.current)
      : spawnPool.length;
    const waveSize = Math.min(pairCount, remainingCount);
    if (waveSize < 1) return false;

    const cursorStart = spawnCursorRef.current;
    const selected = uniqueOnlyRef.current
      ? spawnQueueRef.current.slice(cursorStart, cursorStart + waveSize)
      : sampleWithoutReplacement(spawnPool, waveSize);
    if (selected.length < 1) return false;

    const newBlocks: Block[] = [];
    const spawnStamp = Date.now();
    let spawnIndex = 0;
    const isInitialWave = existing.length === 0;
    const spawnSpread =
      isInitialWave || isMobileViewport()
        ? 1.6
        : Math.max(2.8, waveSize * 1.35);
    const spawnBase = isInitialWave || isMobileViewport() ? 0.15 : 0.5;

    const leftCandidates = Array.from({ length: halfCols }, (_, idx) => idx)
      .filter((col) => !blockedCols.has(col));
    const rightCandidates = Array.from(
      { length: halfCols },
      (_, idx) => halfCols + idx,
    ).filter((col) => !blockedCols.has(col));
    if (leftCandidates.length === 0 || rightCandidates.length === 0) {
      loseLife();
      return false;
    }

    const usedLeftCols = new Set<number>();
    const usedRightCols = new Set<number>();
    const bandStartByCol = new Map<number, number>();
    const spawnedByCol = new Map<number, number>();

    const pickColumn = (available: number[], used: Set<number>) => {
      const unused = available.filter((col) => !used.has(col));
      const pool = unused.length > 0 ? unused : available;
      if (pool.length === 0) return null;
      const col = pool[randomInt(pool.length)];
      used.add(col);
      return col;
    };

    const spawnYForCol = (col: number) => {
      const count = spawnedByCol.get(col) ?? 0;
      const bandStart =
        bandStartByCol.get(col) ?? spawnBase + Math.random() * spawnSpread;
      bandStartByCol.set(col, bandStart);
      spawnedByCol.set(col, count + 1);
      return -BLOCK_HEIGHT * (bandStart + count * 1.15);
    };

    for (const item of selected) {
      const leftAbsCol = pickColumn(leftCandidates, usedLeftCols);
      const rightAbsCol = pickColumn(rightCandidates, usedRightCols);
      if (leftAbsCol === null || rightAbsCol === null) {
        loseLife();
        return false;
      }

      const leftY = spawnYForCol(leftAbsCol);
      const rightY = spawnYForCol(rightAbsCol);
      const pairKey = `${spawnStamp}-${spawnIndex}`;
      spawnIndex += 1;

      newBlocks.push({
        id: `wc-${pairKey}-L`,
        termKey: item.termKey,
        role: "left",
        text: item.leftText,
        col: leftAbsCol,
        y: leftY,
        isFalling: true,
      });
      newBlocks.push({
        id: `wc-${pairKey}-R`,
        termKey: item.termKey,
        role: "right",
        text: item.rightText,
        col: rightAbsCol,
        y: rightY,
        isFalling: true,
      });
    }

    commitBlocks([...existing, ...newBlocks]);
    if (uniqueOnlyRef.current) {
      spawnCursorRef.current = cursorStart + selected.length;
    }
    return true;
  }, [commitBlocks, gameSize.cols, loseLife, pairCount, spawnPool]);

  useEffect(() => {
    endReasonRef.current = endReason;
  }, [endReason]);

  useEffect(
    () => () => {
      clearPendingTimeouts();
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    },
    [clearPendingTimeouts],
  );

  useEffect(() => {
    if (!isModalOpen) return;
    if (status !== "running") return;
    if (gameSize.width === 0) return;
    if (blocksRef.current.length > 0) return;
    spawnWave();
  }, [gameSize.width, isModalOpen, spawnWave, status]);

  useEffect(() => {
    if (status !== "running") return;
    if (bombCharge < 100) return;
    const spawned = spawnBonus("bomb");
    if (spawned) setBombCharge((c) => Math.max(0, c - 100));
  }, [bombCharge, spawnBonus, status]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (!gameStartedAtRef.current) return;

    const renderIntervalMs = 1000 / RENDER_FPS;
    let lastAt = performance.now();

    const tick = (now: number) => {
      const dtMs = Math.min(50, Math.max(0, now - lastAt));
      lastAt = now;

      const shouldSimulate = status === "running" && !isFrozen && !isTutorialOpen;
      if (shouldSimulate && gameSize.width > 0) {
        const prev = blocksRef.current;
        const byCol = new Map<number, Array<{ block: Block; index: number }>>();
        for (let index = 0; index < prev.length; index += 1) {
          const block = prev[index];
          if (block.isMatched) continue;
          const list = byCol.get(block.col) ?? [];
          list.push({ block, index });
          byCol.set(block.col, list);
        }

        let next = prev;
        let anyChanged = false;
        for (const columnBlocks of byCol.values()) {
          columnBlocks.sort((a, b) => b.block.y - a.block.y);
          let ceilingY = gameSize.height - BLOCK_HEIGHT;

          for (const entry of columnBlocks) {
            const { block, index } = entry;
            if (!block.isFalling) {
              ceilingY = block.y - BLOCK_HEIGHT;
              continue;
            }

            const speedPxPerSec =
              block.targetY !== undefined
                ? fallSpeedPxPerSec * SETTLE_SPEED_MULTIPLIER
                : fallSpeedPxPerSec;
            const dyBlock = (speedPxPerSec * dtMs) / 1000;
            let stopY = ceilingY;
            if (block.targetY !== undefined) {
              stopY = Math.min(stopY, block.targetY);
            }

            const movedY = Math.min(block.y + dyBlock, stopY);
            if (movedY >= stopY) {
              if (!anyChanged) {
                next = prev.slice();
                anyChanged = true;
              }
              next[index] = {
                ...block,
                y: stopY,
                isFalling: false,
                targetY: undefined,
              };
              ceilingY = stopY - BLOCK_HEIGHT;
              continue;
            }

            if (movedY !== block.y) {
              if (!anyChanged) {
                next = prev.slice();
                anyChanged = true;
              }
              next[index] = { ...block, y: movedY };
              ceilingY = movedY - BLOCK_HEIGHT;
              continue;
            }

            ceilingY = block.y - BLOCK_HEIGHT;
          }
        }
        if (anyChanged) syncBlocksRef(next);

        const startedAt = gameStartedAtRef.current ?? now;
        const withinGrace = now - startedAt < INITIAL_GRACE_MS;
        if (!withinGrace) {
          spawnAccumulatorMsRef.current += dtMs;
          while (spawnAccumulatorMsRef.current >= spawnIntervalMs) {
            spawnAccumulatorMsRef.current -= spawnIntervalMs;
            const shouldSpawnBonus = Math.random() < 0.1;
            const spawned = shouldSpawnBonus
              ? spawnBonus("freeze") || spawnWave()
              : spawnWave();
            if (!spawned) break;
          }
        }

        if (
          uniqueOnlyRef.current &&
          spawnCursorRef.current >= spawnQueueRef.current.length
        ) {
          const hasActiveBlocks = blocksRef.current.some((block) => !block.isMatched);
          if (!hasActiveBlocks && endReasonRef.current === null) {
            endReasonRef.current = "exhausted";
            setEndReason("exhausted");
            onGameOver("exhausted");
          }
        }
      }

      if (blocksDirtyRef.current && now - lastRenderAtRef.current >= renderIntervalMs) {
        lastRenderAtRef.current = now;
        blocksDirtyRef.current = false;
        setBlocks(blocksRef.current.slice());
      }

      const keepRunning =
        status === "running" ||
        blocksDirtyRef.current ||
        isTutorialOpen ||
        isFrozen;
      if (!keepRunning) {
        rafRef.current = null;
        return;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [
    fallSpeedPxPerSec,
    gameSize.height,
    gameSize.width,
    isFrozen,
    isModalOpen,
    isTutorialOpen,
    onGameOver,
    spawnBonus,
    spawnIntervalMs,
    spawnWave,
    status,
  ]);

  const resetGameState = useCallback(() => {
    setScore(0);
    setIncorrectScore(0);
    setSelectedBlockId(null);
    setComboCount(0);
    setShowComboAnimation(null);
    setIsFrozen(false);
    freezeUntilRef.current = 0;
    clearPendingTimeouts();
    setBombCharge(0);
    setLives(maxLives);
    setEndReason(null);
    endReasonRef.current = null;
    spawnQueueRef.current = [];
    spawnCursorRef.current = 0;
    spawnAccumulatorMsRef.current = 0;
    lastRenderAtRef.current = 0;
    gameStartedAtRef.current = null;
    syncBlocksRef([]);
    setBlocks([]);
    blocksDirtyRef.current = false;
  }, [clearPendingTimeouts, maxLives, syncBlocksRef]);

  const startRound = useCallback(() => {
    resetGameState();
    uniqueOnlyRef.current = uniqueOnly;
    spawnQueueRef.current = uniqueOnly ? shuffleInPlace([...spawnPool]) : [];
    spawnCursorRef.current = 0;
    gameStartedAtRef.current = performance.now();
    spawnAccumulatorMsRef.current = 0;
  }, [resetGameState, spawnPool, uniqueOnly]);

  const handleBlockClick = useCallback(
    (blockId: string) => {
      if (status !== "running") return;
      const currentBlocks = blocksRef.current;
      const clickedBlock = blockIndexRef.current.get(blockId);
      if (
        !clickedBlock ||
        clickedBlock.isMatched ||
        (!allowClickWhileFalling && clickedBlock.isFalling)
      ) {
        return;
      }

      if (clickedBlock.role === "bonus") {
        if (clickedBlock.bonusType === "freeze") {
          applyFreeze(6000);
          setScore((s) => s + 5);
          commitBlocks(currentBlocks.filter((b) => b.id !== blockId));
          setSelectedBlockId(null);
          return;
        }
        if (clickedBlock.bonusType === "bomb") {
          const playable = currentBlocks.filter(
            (b) => !b.isMatched && b.termKey && b.role !== "bonus",
          );
          const uniqueTerms = Array.from(new Set(playable.map((b) => b.termKey)))
            .filter(Boolean) as string[];
          if (uniqueTerms.length === 0) {
            commitBlocks(currentBlocks.filter((b) => b.id !== blockId));
            return;
          }
          const removeCount = Math.max(1, Math.floor(uniqueTerms.length * 0.25));
          const shuffled = shuffleInPlace([...uniqueTerms]);
          const targetTerms = new Set(shuffled.slice(0, removeCount));
          const filtered = currentBlocks.filter(
            (b) => b.id !== blockId && (!b.termKey || !targetTerms.has(b.termKey)),
          );
          commitBlocks(settleColumns(filtered, { snap: true }));
          setSelectedBlockId(null);
          setComboCount(0);
          return;
        }
      }

      if (!selectedBlockId) {
        setSelectedBlockId(blockId);
        return;
      }

      if (selectedBlockId === blockId) {
        setSelectedBlockId(null);
        return;
      }

      const selectedBlockNow = blockIndexRef.current.get(selectedBlockId);
      if (!selectedBlockNow) {
        setSelectedBlockId(blockId);
        return;
      }

      if (selectedBlockNow.role === clickedBlock.role) {
        setSelectedBlockId(blockId);
        return;
      }

      if (selectedBlockNow.termKey && selectedBlockNow.termKey === clickedBlock.termKey) {
        const newCombo = comboCount + 1;
        setComboCount(newCombo);
        const basePoints = 1;
        let bonusPoints = 0;
        if (newCombo >= 3) {
          bonusPoints = newCombo;
          setShowComboAnimation(newCombo);
          comboTimeoutRef.current = window.setTimeout(() => {
            setShowComboAnimation(null);
            comboTimeoutRef.current = null;
          }, 1500);
          setBombCharge((charge) => Math.min(100, charge + 30));
        } else {
          setBombCharge((charge) => Math.min(100, charge + 10));
        }
        setScore((s) => s + basePoints + bonusPoints);

        commitBlocks(
          currentBlocks.map((b) =>
            b.id === selectedBlockId || b.id === clickedBlock.id
              ? { ...b, isMatched: true }
              : b,
          ),
        );
        matchedCleanupTimeoutRef.current = window.setTimeout(() => {
          commitBlocks(settleColumns(blocksRef.current.filter((b) => !b.isMatched)));
          matchedCleanupTimeoutRef.current = null;
        }, 250);
        setSelectedBlockId(null);
        return;
      }

      setIncorrectScore((s) => s + 1);
      setComboCount(0);
      setShowComboAnimation(null);
      commitBlocks(
        currentBlocks.map((b) =>
          b.id === selectedBlockId || b.id === clickedBlock.id
            ? { ...b, isWrong: true }
            : b,
        ),
      );
      wrongResetTimeoutRef.current = window.setTimeout(() => {
        commitBlocks(
          blocksRef.current.map((b) => (b.isWrong ? { ...b, isWrong: false } : b)),
        );
        wrongResetTimeoutRef.current = null;
      }, 500);
      setSelectedBlockId(null);
    },
    [
      allowClickWhileFalling,
      applyFreeze,
      comboCount,
      commitBlocks,
      settleColumns,
      status,
      selectedBlockId,
    ],
  );

  return {
    blocks,
    bombCharge,
    comboCount,
    endReason,
    handleBlockClick,
    incorrectScore,
    isFrozen,
    lives,
    resetGameState,
    score,
    selectedBlockId,
    setLives,
    showComboAnimation,
    startRound,
    uniqueProgress: {
      total: spawnQueueRef.current.length,
      used: Math.min(spawnCursorRef.current, spawnQueueRef.current.length),
    },
  };
};
