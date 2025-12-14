import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { GlossaryTerm, Level, Stream, VerbEntry } from "../../types";

type Props = {
  stream: Stream;
  currentLevel: Level;
  playableTerms: GlossaryTerm[];
  verbEntries: VerbEntry[];
};

type GameStatus = "pre-game" | "running" | "paused" | "game-over";
type SpawnSpeed = 1500 | 2500 | 4000 | 6000 | 8000 | 10000 | 12000;
type OpenMode = "modal" | "fullscreen";
type LanguageOption = Stream | "russian";
type PlayableTerm = GlossaryTerm & { source: "glossary" | "verb" };

const BLOCK_HEIGHT = 48;
const INITIAL_GRACE_MS = 8000;
const RENDER_FPS = 30;
const MIN_BLOCK_WIDTH = 80;
const MAX_COLS = 10;

const PRIMARY_MUSIC_SRC = "/audio/4f13fc38b4572af.mp3";
const FALLBACK_MUSIC_SRC = "/audio/wordcollapse.mp3";

type Block = {
  id: string;
  termKey: string | null;
  role: "left" | "right" | "bonus";
  bonusType?: "freeze" | "bomb";
  text: string;
  col: number;
  y: number;
  isFalling: boolean;
  isMatched?: boolean;
  isWrong?: boolean;
};

type GameSize = {
  width: number;
  height: number;
  cols: number;
  blockWidth: number;
};

const partOptions = [
  { value: "verb", label: "parts.verb" },
  { value: "noun", label: "parts.noun" },
  { value: "adjective", label: "parts.adjective" },
  { value: "adverb", label: "parts.adverb" },
  { value: "pronoun", label: "parts.pronoun" },
  { value: "numeral", label: "parts.numeral" },
  { value: "preposition", label: "parts.preposition" },
  { value: "conjunction", label: "parts.conjunction" },
  { value: "interjection", label: "parts.interjection" },
];

const mapVerbEntryToPlayable = (entry: VerbEntry): PlayableTerm => ({
  id: entry.id,
  term: entry.infinitive,
  translation: entry.translation_en || entry.translation_nb || entry.translation_ru || "",
  translation_en: entry.translation_en,
  translation_ru: entry.translation_ru,
  translation_nb: entry.translation_nb,
  translation_nn: entry.translation_nb,
  explanation: "",
  stream: entry.stream,
  level: "A1",
  tags: [entry.part_of_speech, ...(entry.tags || [])],
  source: "verb",
});

const termKeyFor = (term: PlayableTerm) => `${term.source}:${term.id}`;

const normalizeForCompare = (value: string) => value.replace(/\\s+/g, " ").trim().toLowerCase();

const pickTextForLanguage = (term: GlossaryTerm, lang: LanguageOption, strict: boolean) => {
  if (lang === "bokmaal") return strict ? term.translation_nb || null : term.translation_nb || term.term;
  if (lang === "nynorsk") return strict ? term.translation_nn || null : term.translation_nn || term.translation_nb || term.term;
  if (lang === "russian") return strict ? term.translation_ru || null : term.translation_ru || term.translation_en || term.term;
  return strict ? term.translation_en || null : term.translation_en || term.term;
};

const defaultRightLanguageForUi = (uiLanguage: string): LanguageOption => {
  if (uiLanguage.startsWith("ru")) return "russian";
  if (uiLanguage.startsWith("nn")) return "nynorsk";
  if (uiLanguage.startsWith("nb") || uiLanguage.startsWith("no")) return "bokmaal";
  return "english";
};

const loadStoredBool = (key: string, fallback: boolean) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
};

const storeBool = (key: string, value: boolean) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
};

const isMobileViewport = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(max-width: 768px)")?.matches ?? window.innerWidth <= 768;
};

const WordCollapseGame: React.FC<Props> = ({ stream, playableTerms, verbEntries }) => {
  const { t, i18n } = useTranslation();

  const [status, setStatus] = useState<GameStatus>("pre-game");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openMode, setOpenMode] = useState<OpenMode>("modal");
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [preferFullscreen, setPreferFullscreen] = useState(() =>
    loadStoredBool("wordcollapse:preferFullscreen", true),
  );
  const [hintsEnabled, setHintsEnabled] = useState(() => loadStoredBool("wordcollapse:hintsEnabled", false));
  const [isMusicOn, setIsMusicOn] = useState(true);

  const [useGlossary, setUseGlossary] = useState(true);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [useIrregularOnly, setUseIrregularOnly] = useState(false);

  const [leftLanguage, setLeftLanguage] = useState<LanguageOption>(stream);
  const [rightLanguage, setRightLanguage] = useState<LanguageOption>(() => defaultRightLanguageForUi(i18n.language));
  const [swapSides, setSwapSides] = useState(false);
  const [requireTranslations, setRequireTranslations] = useState(true);

  const [maxLives, setMaxLives] = useState(5);
  const [lives, setLives] = useState(5);
  const [pairCount, setPairCount] = useState(3);
  const [spawnIntervalMs, setSpawnIntervalMs] = useState<SpawnSpeed>(6000);
  const [fallSpeedPxPerSec, setFallSpeedPxPerSec] = useState(90);

  const [score, setScore] = useState(0);
  const [incorrectScore, setIncorrectScore] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [showComboAnimation, setShowComboAnimation] = useState<number | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const [bombCharge, setBombCharge] = useState(0);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const blocksRef = useRef<Block[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);

  const gameStartedAtRef = useRef<number | null>(null);
  const spawnAccumulatorMsRef = useRef(0);
  const lastRenderAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modalWindowRef = useRef<HTMLDivElement>(null);
  const settingsWindowRef = useRef<HTMLDivElement>(null);
  const tutorialWindowRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const statusBeforeHowToRef = useRef<GameStatus>("pre-game");
  const gameWrapperRef = useRef<HTMLDivElement>(null);
  const [gameSize, setGameSize] = useState<GameSize>({
    width: 0,
    height: BLOCK_HEIGHT * 12,
    cols: 8,
    blockWidth: 120,
  });

  useEffect(() => {
    setLeftLanguage(stream);
  }, [stream]);

  useEffect(() => {
    storeBool("wordcollapse:preferFullscreen", preferFullscreen);
  }, [preferFullscreen]);

  useEffect(() => {
    storeBool("wordcollapse:hintsEnabled", hintsEnabled);
  }, [hintsEnabled]);

  const combinedTerms = useMemo<PlayableTerm[]>(() => {
    const selectedSet = new Set(selectedParts);
    const includeVerbs = selectedSet.size > 0;
    const irregularOnly = useIrregularOnly && selectedSet.has("verb");

    const verbsPool = includeVerbs
      ? verbEntries.filter((entry) => {
          const partOk = selectedSet.has(entry.part_of_speech);
          if (!partOk) return false;
          if (irregularOnly) {
            return (entry.tags || []).some((tag) => tag.toLowerCase() === "irregular");
          }
          return true;
        })
      : [];

    const verbLikeTerms = verbsPool.map(mapVerbEntryToPlayable);
    const glossaryPool = useGlossary
      ? playableTerms.map((term) => ({ ...term, source: "glossary" as const }))
      : [];

    return [...glossaryPool, ...verbLikeTerms];
  }, [playableTerms, selectedParts, useGlossary, useIrregularOnly, verbEntries]);

  const leftSideLanguage = swapSides ? rightLanguage : leftLanguage;
  const rightSideLanguage = swapSides ? leftLanguage : rightLanguage;

  const spawnPool = useMemo(() => {
    const pairs: Array<{ termKey: string; leftText: string; rightText: string }> = [];
    for (const term of combinedTerms) {
      const leftText = pickTextForLanguage(term, leftSideLanguage, requireTranslations);
      const rightText = pickTextForLanguage(term, rightSideLanguage, requireTranslations);
      if (!leftText || !rightText) continue;
      if (normalizeForCompare(leftText) === normalizeForCompare(rightText)) continue;
      pairs.push({ termKey: termKeyFor(term), leftText, rightText });
    }
    return pairs;
  }, [combinedTerms, leftSideLanguage, requireTranslations, rightSideLanguage]);

  const isFullscreen = openMode === "fullscreen";
  const selectedBlock = selectedBlockId ? blocks.find((b) => b.id === selectedBlockId) : undefined;
  const hintTermKey = hintsEnabled ? (selectedBlock?.termKey ?? null) : null;
  const hintRoleNeeded = hintsEnabled
    ? selectedBlock?.role === "left"
      ? "right"
      : selectedBlock?.role === "right"
        ? "left"
        : null
    : null;

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(PRIMARY_MUSIC_SRC);
      audio.onerror = () => {
        if (audio.src !== FALLBACK_MUSIC_SRC) {
          audio.src = FALLBACK_MUSIC_SRC;
          audio.load();
        }
      };
      audio.loop = true;
      audio.volume = 0.18;
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const startMusic = useCallback(() => {
    if (!isMusicOn) return;
    const audio = ensureAudio();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [ensureAudio, isMusicOn]);

  const stopMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  useLayoutEffect(() => {
    if (!isModalOpen) return;
    const updateSize = () => {
      if (!gameWrapperRef.current) return;
      const parentWidth = gameWrapperRef.current.offsetWidth;
      const parentHeight = gameWrapperRef.current.offsetHeight || window.innerHeight;
      const targetHeight = Math.min(parentHeight, window.innerHeight * 0.9);
      const minHeight = BLOCK_HEIGHT * 12;
      const height = Math.max(minHeight, targetHeight);

      let cols = Math.floor(parentWidth / MIN_BLOCK_WIDTH);
      if (cols > MAX_COLS) cols = MAX_COLS;
      if (cols < 4) cols = 4;
      if (cols % 2 !== 0) cols -= 1;

      const blockWidth = parentWidth / cols;
      setGameSize({ width: parentWidth, height, cols, blockWidth });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isModalOpen]);

  useEffect(() => {
    const shouldLock = isModalOpen || isSettingsOpen || isTutorialOpen;
    if (!shouldLock) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isModalOpen, isSettingsOpen, isTutorialOpen]);

  useEffect(() => {
    if (isSettingsOpen || isModalOpen || isTutorialOpen) {
      const active = document.activeElement;
      previousFocusRef.current = active instanceof HTMLElement ? active : null;
      requestAnimationFrame(() => {
        const target = isTutorialOpen
          ? tutorialWindowRef.current
          : isSettingsOpen
            ? settingsWindowRef.current
            : modalWindowRef.current;
        target?.focus();
      });
      return;
    }
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, [isModalOpen, isSettingsOpen, isTutorialOpen]);

  useEffect(() => {
    if (!isModalOpen || !isMusicOn) {
      stopMusic();
      return;
    }
    if (status === "running") startMusic();
  }, [isModalOpen, isMusicOn, startMusic, status, stopMusic]);

  useEffect(() => stopMusic, [stopMusic]);

  const commitBlocks = useCallback((next: Block[]) => {
    blocksRef.current = next;
    setBlocks(next);
  }, []);

  const collapseBlocks = useCallback(
    (currentBlocks: Block[]) => {
      const alive = currentBlocks.filter((b) => !b.isMatched);
      const byCol: Record<number, Block[]> = {};
      for (const block of alive) {
        if (!byCol[block.col]) byCol[block.col] = [];
        byCol[block.col].push(block);
      }

      const collapsed: Block[] = [];
      Object.values(byCol).forEach((list) => {
        const sorted = [...list].sort((a, b) => a.y - b.y);
        sorted.forEach((block, idx) => {
          const newY = gameSize.height - BLOCK_HEIGHT * (idx + 1);
          collapsed.push({
            ...block,
            y: newY,
            isFalling: false,
          });
        });
      });
      return collapsed;
    },
    [gameSize.height],
  );

  const resetGameState = useCallback(() => {
    setScore(0);
    setIncorrectScore(0);
    setSelectedBlockId(null);
    setComboCount(0);
    setShowComboAnimation(null);
    setIsFrozen(false);
    setBombCharge(0);
    setLives(maxLives);
    spawnAccumulatorMsRef.current = 0;
    lastRenderAtRef.current = 0;
    gameStartedAtRef.current = null;
    blocksRef.current = [];
    setBlocks([]);
  }, [maxLives]);

  const openSettings = (mode: OpenMode) => {
    setOpenMode(mode);
    setIsSettingsOpen(true);
  };

  const handleStart = () => {
    const mode: OpenMode = preferFullscreen && isMobileViewport() ? "fullscreen" : "modal";
    openSettings(mode);
  };

  const handleQuickStart = () => {
    const mode: OpenMode = preferFullscreen && isMobileViewport() ? "fullscreen" : "modal";
    setOpenMode(mode);
    if (spawnPool.length < Math.max(2, pairCount)) {
      setIsSettingsOpen(true);
      return;
    }
    beginGame();
  };

  const handleStartFullscreen = () => {
    openSettings("fullscreen");
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    if (openMode === "fullscreen") setOpenMode("modal");
  };

  const handleCloseModal = () => {
    setStatus("pre-game");
    stopMusic();
    resetGameState();
    setIsModalOpen(false);
    setOpenMode("modal");
    setIsTutorialOpen(false);
  };

  const beginGame = () => {
    if (spawnPool.length < Math.max(2, pairCount)) return;

    resetGameState();
    setIsSettingsOpen(false);
    setIsModalOpen(true);
    setIsTutorialOpen(false);
    setStatus("running");
    startMusic();

    gameStartedAtRef.current = performance.now();
    spawnAccumulatorMsRef.current = 0;
  };

  const handleRestart = () => {
    resetGameState();
    setIsModalOpen(true);
    setIsTutorialOpen(false);
    setStatus("running");
    startMusic();

    gameStartedAtRef.current = performance.now();
    spawnAccumulatorMsRef.current = 0;
  };

  const handleHowToPlay = () => {
    statusBeforeHowToRef.current = status;
    if (!isModalOpen && !isSettingsOpen) {
      setOpenMode(preferFullscreen && isMobileViewport() ? "fullscreen" : "modal");
    }
    setIsTutorialOpen(true);
    if (isModalOpen && status === "running") {
      setStatus("paused");
      stopMusic();
    }
  };

  const dismissTutorial = () => {
    setIsTutorialOpen(false);
    if (isModalOpen && statusBeforeHowToRef.current === "running") {
      setStatus("running");
      startMusic();
    }
  };

  const handleTogglePause = () => {
    if (!isModalOpen) return;
    if (status === "running") {
      setStatus("paused");
      stopMusic();
      return;
    }
    if (status === "paused") {
      setStatus("running");
      startMusic();
      if (!gameStartedAtRef.current) gameStartedAtRef.current = performance.now();
    }
  };

  const loseLife = useCallback(() => {
    setLives((prev) => {
      const next = Math.max(0, prev - 1);
      if (next <= 0) {
        setStatus("game-over");
        stopMusic();
      }
      return next;
    });
  }, [stopMusic]);

  const spawnBonus = useCallback(
    (bonusType: "freeze" | "bomb") => {
      if (gameSize.cols < 1) return false;
      const col = Math.floor(Math.random() * gameSize.cols);
      const existing = blocksRef.current;
      if (existing.some((b) => b.col === col && b.y < BLOCK_HEIGHT)) return false;

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
    if (spawnPool.length < pairCount || gameSize.cols < 4) return false;

    const halfCols = Math.max(2, Math.floor(gameSize.cols / 2));
    const shuffled = [...spawnPool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, pairCount);

    const existing = blocksRef.current;
    const newBlocks: Block[] = [];

    for (const item of selected) {
      const leftCol = Math.floor(Math.random() * halfCols);
      let rightCol = Math.floor(Math.random() * halfCols);
      if (halfCols > 1) {
        while (rightCol === leftCol) rightCol = Math.floor(Math.random() * halfCols);
      }

      const leftAbsCol = leftCol;
      const rightAbsCol = halfCols + rightCol;
      const leftY = -BLOCK_HEIGHT * (0.5 + Math.random() * pairCount * 1.5);
      const rightY = -BLOCK_HEIGHT * (0.5 + Math.random() * pairCount * 1.5);

      const blockedLeft = existing.some((b) => b.col === leftAbsCol && b.y < BLOCK_HEIGHT);
      const blockedRight = existing.some((b) => b.col === rightAbsCol && b.y < BLOCK_HEIGHT);
      if (blockedLeft || blockedRight) {
        loseLife();
        return false;
      }

      newBlocks.push({
        id: `wc-${Date.now()}-${Math.random()}-L`,
        termKey: item.termKey,
        role: "left",
        text: item.leftText,
        col: leftAbsCol,
        y: leftY,
        isFalling: true,
      });
      newBlocks.push({
        id: `wc-${Date.now()}-${Math.random()}-R`,
        termKey: item.termKey,
        role: "right",
        text: item.rightText,
        col: rightAbsCol,
        y: rightY,
        isFalling: true,
      });
    }

    commitBlocks([...existing, ...newBlocks]);
    return true;
  }, [commitBlocks, gameSize.cols, loseLife, pairCount, spawnPool]);

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
    spawnBonus("bomb");
    setBombCharge((c) => Math.max(0, c - 100));
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
        const landedByCol = new Map<number, number[]>();
        for (const block of prev) {
          if (block.isMatched) continue;
          if (block.isFalling) continue;
          const list = landedByCol.get(block.col) || [];
          list.push(block.y);
          landedByCol.set(block.col, list);
        }
        for (const [col, list] of landedByCol.entries()) {
          list.sort((a, b) => a - b);
          landedByCol.set(col, list);
        }

        const dy = (fallSpeedPxPerSec * dtMs) / 1000;
        let anyChanged = false;
        const next = prev.map((block) => {
          if (block.isMatched) return block;
          if (!block.isFalling) return block;

          let newY = block.y + dy;
          let stopY = gameSize.height - BLOCK_HEIGHT;
          const landed = landedByCol.get(block.col);
          if (landed && landed.length > 0) {
            for (const y of landed) {
              if (block.y < y && newY + BLOCK_HEIGHT >= y) {
                stopY = Math.min(stopY, y - BLOCK_HEIGHT);
              }
            }
          }

          if (newY + BLOCK_HEIGHT >= gameSize.height) {
            anyChanged = true;
            return { ...block, y: gameSize.height - BLOCK_HEIGHT, isFalling: false };
          }
          if (newY >= stopY) {
            anyChanged = true;
            return { ...block, y: stopY, isFalling: false };
          }

          if (newY !== block.y) anyChanged = true;
          return { ...block, y: newY };
        });

        if (anyChanged) blocksRef.current = next;

        const startedAt = gameStartedAtRef.current ?? now;
        const withinGrace = now - startedAt < INITIAL_GRACE_MS;
        if (!withinGrace) {
          spawnAccumulatorMsRef.current += dtMs;
          while (spawnAccumulatorMsRef.current >= spawnIntervalMs) {
            spawnAccumulatorMsRef.current -= spawnIntervalMs;
            const shouldSpawnBonus = Math.random() < 0.1;
            const spawned = shouldSpawnBonus ? spawnBonus("freeze") : spawnWave();
            if (!spawned) break;
          }
        }
      }

      if (now - lastRenderAtRef.current >= renderIntervalMs) {
        lastRenderAtRef.current = now;
        setBlocks(blocksRef.current.slice());
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
    spawnBonus,
    spawnIntervalMs,
    spawnWave,
    status,
  ]);

  const handleBlockClick = (blockId: string) => {
    if (status !== "running") return;
    const currentBlocks = blocksRef.current;
    const clickedBlock = currentBlocks.find((b) => b.id === blockId);
    if (!clickedBlock || clickedBlock.isMatched || clickedBlock.isFalling) return;

    if (clickedBlock.role === "bonus") {
      if (clickedBlock.bonusType === "freeze") {
        setIsFrozen(true);
        setScore((s) => s + 5);
        setTimeout(() => setIsFrozen(false), 6000);
        commitBlocks(currentBlocks.filter((b) => b.id !== blockId));
        setSelectedBlockId(null);
        return;
      }
      if (clickedBlock.bonusType === "bomb") {
        const playable = currentBlocks.filter((b) => !b.isMatched && b.termKey && b.role !== "bonus");
        const uniqueTerms = Array.from(new Set(playable.map((b) => b.termKey))).filter(Boolean) as string[];
        if (uniqueTerms.length === 0) {
          commitBlocks(currentBlocks.filter((b) => b.id !== blockId));
          return;
        }
        const removeCount = Math.max(1, Math.floor(uniqueTerms.length * 0.25));
        const shuffled = [...uniqueTerms].sort(() => 0.5 - Math.random());
        const targetTerms = new Set(shuffled.slice(0, removeCount));
        const filtered = currentBlocks.filter((b) => b.id !== blockId && (!b.termKey || !targetTerms.has(b.termKey)));
        commitBlocks(collapseBlocks(filtered));
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

    const selectedBlockNow = currentBlocks.find((b) => b.id === selectedBlockId);
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
        setTimeout(() => setShowComboAnimation(null), 1500);
        setBombCharge((charge) => Math.min(100, charge + 30));
      } else {
        setBombCharge((charge) => Math.min(100, charge + 10));
      }
      setScore((s) => s + basePoints + bonusPoints);

      commitBlocks(
        currentBlocks.map((b) => (b.id === selectedBlockId || b.id === clickedBlock.id ? { ...b, isMatched: true } : b)),
      );
      setTimeout(() => {
        commitBlocks(collapseBlocks(blocksRef.current.filter((b) => !b.isMatched)));
      }, 250);
      setSelectedBlockId(null);
      return;
    }

    setIncorrectScore((s) => s + 1);
    setComboCount(0);
    setShowComboAnimation(null);
    commitBlocks(
      currentBlocks.map((b) => (b.id === selectedBlockId || b.id === clickedBlock.id ? { ...b, isWrong: true } : b)),
    );
    setTimeout(() => {
      commitBlocks(blocksRef.current.map((b) => (b.isWrong ? { ...b, isWrong: false } : b)));
    }, 500);
    setSelectedBlockId(null);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isTutorialOpen) {
        event.preventDefault();
        dismissTutorial();
        return;
      }
      if (isSettingsOpen) {
        event.preventDefault();
        handleCloseSettings();
        return;
      }
      if (!isModalOpen) return;
      event.preventDefault();
      if (status === "game-over") {
        handleCloseModal();
        return;
      }
      handleTogglePause();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismissTutorial, handleCloseModal, handleCloseSettings, handleTogglePause, isModalOpen, isSettingsOpen, isTutorialOpen, status]);

  return (
    <div className="collapse-game">
      <div className="collapse-launcher">
        <div className="collapse-launcher-text">
          <h3>WordCollaps</h3>
          <p className="muted small">
            {t("games.wordCollapseHint", "Игра откроется во всплывающем окне — соединяйте левый и правый блок одной пары.")}
          </p>
        </div>
        <div className="game-buttons">
          <button className="start-btn" type="button" onClick={handleQuickStart} disabled={isModalOpen || isSettingsOpen || isTutorialOpen}>
            {t("games.start", "Старт")}
          </button>
          <button className="start-btn" type="button" onClick={handleStart} disabled={isModalOpen || isSettingsOpen}>
            {t("games.settings", "Настройки")}
          </button>
          <button className="ghost-btn" type="button" onClick={handleStartFullscreen} disabled={isModalOpen || isSettingsOpen}>
            {t("games.wordCollapseFullscreen", "На весь экран")}
          </button>
          <button className="ghost-btn" type="button" onClick={handleHowToPlay} disabled={isSettingsOpen}>
            {t("games.wordCollapseHowTo", "Как играть")}
          </button>
        </div>
      </div>
      {isModalOpen && (
        <div className={`collapse-game-modal ${isFullscreen ? "fullscreen" : ""}`} role="dialog" aria-modal="true">
          <div className="collapse-modal-backdrop" />
          <div className="collapse-modal-window" ref={modalWindowRef} tabIndex={-1}>
            <div className="collapse-game-header">
              <div className="collapse-modal-title">
                <h3>WordCollaps</h3>
                <div className="collapse-game-scores">
                  <span className="score lives">
                    {t("games.wordCollapseLivesLabel", "Жизни")}: {lives}/{maxLives}
                  </span>
                  <span className="score correct">
                    {t("correct", "Correct")}: {score}
                  </span>
                  <span className="score incorrect">
                    {t("incorrect", "Incorrect")}: {incorrectScore}
                  </span>
                  {comboCount > 1 && <span className="score combo-couter">Combo: x{comboCount}</span>}
                </div>
              </div>
              <div className="game-buttons">
                <button className="ghost-btn" type="button" onClick={() => setIsMusicOn((v) => !v)}>
                  {isMusicOn ? t("games.musicOn", "Музыка: вкл") : t("games.musicOff", "Музыка: выкл")}
                </button>
                {status === "running" && (
                  <button className="ghost-btn" type="button" onClick={handleTogglePause}>
                    {t("games.wordCollapsePause", "Пауза")}
                  </button>
                )}
                {status === "paused" && (
                  <button className="start-btn" type="button" onClick={handleTogglePause}>
                    {t("games.wordCollapseResume", "Продолжить")}
                  </button>
                )}
                {status === "game-over" && (
                  <button className="start-btn" type="button" onClick={handleRestart}>
                    {t("games.restart", "Сыграть ещё")}
                  </button>
                )}
                <button className="close-btn" type="button" onClick={handleCloseModal} aria-label={t("close", "Close")}>
                  ×
                </button>
              </div>
            </div>
            <div className="collapse-game-meta">
              <div className="bomb-meter" aria-label={t("games.wordCollapseBombMeter", "Заряд бомбы")}>
                <div className="bomb-meter__label">
                  <span>{t("games.wordCollapseBombLabel", "Бомба")}</span>
                  <span className="muted small">{bombCharge}%</span>
                </div>
                <div className="bomb-meter__bar">
                  <div className="bomb-meter__fill" style={{ width: `${bombCharge}%` }} />
                </div>
              </div>
              {hintsEnabled && (
                <div className="collapse-hint muted small">{t("games.wordCollapseEscHint", "Esc — пауза/продолжить.")}</div>
              )}
            </div>
            <div className="collapse-game-frame" ref={gameWrapperRef}>
              <div className="collapse-game-area" style={{ height: `${gameSize.height}px` }}>
                {isFrozen && <div className="frozen-overlay" />}
                {status === "paused" && !isTutorialOpen && (
                  <div className="pause-overlay">
                    <div className="pause-card">
                      <h4>{t("games.wordCollapsePausedTitle", "Пауза")}</h4>
                      <p className="muted small">{t("games.wordCollapsePausedHint", "Нажмите «Продолжить» или Esc.")}</p>
                      <button className="start-btn big" type="button" onClick={handleTogglePause}>
                        {t("games.wordCollapseResume", "Продолжить")}
                      </button>
                    </div>
                  </div>
                )}
                {status === "game-over" && (
                  <div className="pause-overlay">
                    <div className="pause-card">
                      <h4>{t("games.gameOver", "Game Over")}</h4>
                      <p className="muted small">
                        {t("games.finalScore", "Final Score")}: {score}
                      </p>
                      <p className="muted small">
                        {t("games.incorrectCount", "Mistakes")}: {incorrectScore}
                      </p>
                      <button className="start-btn big" type="button" onClick={handleRestart}>
                        {t("games.restart", "Сыграть ещё")}
                      </button>
                    </div>
                  </div>
                )}
                {showComboAnimation && <div className="combo-animation">COMBO x{showComboAnimation}!</div>}
                {blocks.map((block) => {
                  const isHint =
                    Boolean(hintTermKey) &&
                    Boolean(hintRoleNeeded) &&
                    !block.isFalling &&
                    block.role === hintRoleNeeded &&
                    block.termKey === hintTermKey;
                  const isDimmed =
                    Boolean(hintTermKey) &&
                    Boolean(hintRoleNeeded) &&
                    !block.isFalling &&
                    block.role !== "bonus" &&
                    block.id !== selectedBlockId &&
                    !isHint;
                  return (
                    <button
                      key={block.id}
                      type="button"
                      className={[
                        "collapse-block",
                        selectedBlockId === block.id ? "selected" : "",
                        block.isMatched ? "matched" : "",
                        block.isWrong ? "wrong" : "",
                        block.role,
                        block.bonusType || "",
                        isHint ? "hint" : "",
                        isDimmed ? "dimmed" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        width: `${gameSize.blockWidth}px`,
                        height: `${BLOCK_HEIGHT}px`,
                        transform: `translate3d(${block.col * gameSize.blockWidth}px, ${block.y}px, 0)`,
                      }}
                      onClick={() => handleBlockClick(block.id)}
                    >
                      {block.text}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {isTutorialOpen && (
        <div className={`collapse-game-modal ${isFullscreen ? "fullscreen" : ""}`} role="dialog" aria-modal="true">
          <div className="collapse-modal-backdrop" />
          <div className="collapse-modal-window settings-window" ref={tutorialWindowRef} tabIndex={-1}>
            <div className="settings-header">
              <div>
                <p className="eyebrow">{t("games.wordCollapseHowTo", "Как играть")}</p>
                <h3>{t("games.wordCollapseTutorialTitle", "Как играть")}</h3>
              </div>
              <button className="close-btn dark" type="button" onClick={dismissTutorial} aria-label={t("close", "Close")}>
                ×
              </button>
            </div>
            <div className="tutorial-content">
              <ol className="tutorial-steps">
                <li>{t("games.wordCollapseTutorialStep1", "Тапни любой блок слева (он подсветится).")}</li>
                <li>{t("games.wordCollapseTutorialStep2", "Тапни правильную пару справа — получишь очко.")}</li>
                <li>{t("games.wordCollapseTutorialStep3", "Комбо даёт бонусы и заряжает бомбу.")}</li>
                <li>{t("games.wordCollapseTutorialStep4", "Лишишься жизни, если волна не сможет появиться сверху.")}</li>
              </ol>
            </div>
            <div className="settings-actions">
              <button className="start-btn" type="button" onClick={dismissTutorial}>
                {t("games.wordCollapseGotIt", "Понятно")}
              </button>
            </div>
          </div>
        </div>
      )}
      {isSettingsOpen && (
        <div className={`collapse-game-modal ${isFullscreen ? "fullscreen" : ""}`} role="dialog" aria-modal="true">
          <div className="collapse-modal-backdrop" />
          <div className="collapse-modal-window settings-window" ref={settingsWindowRef} tabIndex={-1}>
            <div className="settings-header">
              <div>
                <p className="eyebrow">{t("games.settings", "Настройки")}</p>
                <h3>{t("games.settingsHint", "Выберите источники слов и сложность перед стартом.")}</h3>
              </div>
              <button className="close-btn dark" type="button" onClick={handleCloseSettings} aria-label={t("close", "Close")}>
                ×
              </button>
            </div>
            <div className="settings-grid">
              <div className="settings-card">
                <div className="settings-card__title">
                  <span className="eyebrow">{t("games.wordSources", "Выбор слов")}</span>
                  <span className="muted tiny">{t("games.sourceHint", "Можно выбрать сразу несколько источников")}</span>
                </div>
                <div className="settings-list">
                  <label className="checkbox-row">
                    <input type="checkbox" checked={useGlossary} onChange={(e) => setUseGlossary(e.target.checked)} />
                    <span>{t("games.sourceGlossary", "Глоссарий")}</span>
                  </label>
                  <div className="divider" />
                  <p className="muted tiny">{t("games.partsOfSpeech", "Части речи")}</p>
                  <div className="parts-grid">
                    {partOptions.map((opt) => (
                      <label key={opt.value} className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={selectedParts.includes(opt.value)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedParts((prev) => {
                              if (checked) return [...prev, opt.value];
                              return prev.filter((val) => val !== opt.value);
                            });
                          }}
                        />
                        <span>{t(opt.label)}</span>
                      </label>
                    ))}
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={useIrregularOnly}
                      onChange={(e) => setUseIrregularOnly(e.target.checked)}
                      disabled={!selectedParts.includes("verb")}
                    />
                    <span>{t("games.irregularOnly", "Только неправильные (глаголы)")}</span>
                  </label>
                </div>
              </div>
              <div className="settings-card">
                <div className="settings-card__title">
                  <span className="eyebrow">{t("games.wordCollapseLanguagesTitle", "Языки")}</span>
                  <span className="muted tiny">
                    {t("games.wordCollapseLanguagesHint", "Выберите языки слева и справа (можно поменять местами).")}
                  </span>
                </div>
                <div className="settings-list">
                  <label className="game-settings">
                    <span>{t("games.wordCollapseLeftLabel", "Слева")}</span>
                    <select value={leftLanguage} onChange={(e) => setLeftLanguage(e.target.value as LanguageOption)}>
                      <option value="bokmaal">{t("streamLabels.bokmaal")}</option>
                      <option value="nynorsk">{t("streamLabels.nynorsk")}</option>
                      <option value="english">{t("streamLabels.english")}</option>
                      <option value="russian">{t("streamLabels.russian", "Русский")}</option>
                    </select>
                  </label>
                  <label className="game-settings">
                    <span>{t("games.wordCollapseRightLabel", "Справа")}</span>
                    <select value={rightLanguage} onChange={(e) => setRightLanguage(e.target.value as LanguageOption)}>
                      <option value="bokmaal">{t("streamLabels.bokmaal")}</option>
                      <option value="nynorsk">{t("streamLabels.nynorsk")}</option>
                      <option value="english">{t("streamLabels.english")}</option>
                      <option value="russian">{t("streamLabels.russian", "Русский")}</option>
                    </select>
                  </label>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={swapSides} onChange={(e) => setSwapSides(e.target.checked)} />
                    <span>{t("games.wordCollapseSwapSides", "Поменять стороны местами")}</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={requireTranslations}
                      onChange={(e) => setRequireTranslations(e.target.checked)}
                    />
                    <span>{t("games.wordCollapseRequireTranslations", "Только слова с переводом на оба языка")}</span>
                  </label>
                </div>
              </div>
              <div className="settings-card">
                <div className="settings-card__title">
                  <span className="eyebrow">{t("games.difficulty", "Сложность")}</span>
                  <span className="muted tiny">{t("games.difficultyHint", "Подберите комфортный темп игры")}</span>
                </div>
                <div className="settings-list">
                  <label className="game-settings">
                    <span>{t("games.pairsLabel", "Pairs")}</span>
                    <select value={pairCount} onChange={(e) => setPairCount(Number(e.target.value))}>
                      {[...Array(9).keys()].map((i) => (
                        <option key={i + 2} value={i + 2}>
                          {i + 2}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="game-settings">
                    <span>{t("games.wordCollapseSpawnLabel", "Частота волн")}</span>
                    <select value={spawnIntervalMs} onChange={(e) => setSpawnIntervalMs(Number(e.target.value) as SpawnSpeed)}>
                      <option value={12000}>{t("games.speedSuperSlow", "Super Slow")}</option>
                      <option value={10000}>{t("games.speedVerySlow", "Very Slow")}</option>
                      <option value={8000}>{t("games.speedSlow", "Slow")}</option>
                      <option value={6000}>{t("games.speedNormal", "Normal")}</option>
                      <option value={4000}>{t("games.speedFast", "Fast")}</option>
                      <option value={2500}>{t("games.speedVeryFast", "Very Fast")}</option>
                      <option value={1500}>{t("games.speedHyper", "Hyper")}</option>
                    </select>
                  </label>
                  <label className="game-settings">
                    <span>{t("games.wordCollapseFallLabel", "Скорость падения")}</span>
                    <select value={fallSpeedPxPerSec} onChange={(e) => setFallSpeedPxPerSec(Number(e.target.value))}>
                      <option value={60}>{t("games.wordCollapseFallVerySlow", "Очень медленно")}</option>
                      <option value={90}>{t("games.wordCollapseFallSlow", "Медленно")}</option>
                      <option value={120}>{t("games.wordCollapseFallNormal", "Нормально")}</option>
                      <option value={150}>{t("games.wordCollapseFallFast", "Быстро")}</option>
                      <option value={180}>{t("games.wordCollapseFallVeryFast", "Очень быстро")}</option>
                    </select>
                  </label>
                  <label className="game-settings">
                    <span>{t("games.wordCollapseLivesLabel", "Жизни")}</span>
                    <select
                      value={maxLives}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setMaxLives(next);
                        setLives(next);
                      }}
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </label>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={preferFullscreen} onChange={(e) => setPreferFullscreen(e.target.checked)} />
                    <span>{t("games.wordCollapsePreferFullscreen", "По умолчанию фуллскрин на телефоне")}</span>
                  </label>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={hintsEnabled} onChange={(e) => setHintsEnabled(e.target.checked)} />
                    <span>{t("games.wordCollapseHintsEnabled", "Подсказки во время игры")}</span>
                  </label>
                  <p className="muted tiny">
                    {t("games.wordCollapsePoolCount", "Доступно слов: {{count}}", { count: spawnPool.length })}
                  </p>
                  {spawnPool.length < Math.max(2, pairCount) && (
                    <p className="settings-warning">
                      {t(
                        "games.wordCollapsePoolWarning",
                        "Слишком мало слов для выбранных настроек — включите глоссарий или снимите ограничения.",
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="settings-actions">
              <button
                className="start-btn big"
                type="button"
                onClick={beginGame}
                disabled={spawnPool.length < Math.max(2, pairCount)}
              >
                {t("games.start")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordCollapseGame;
