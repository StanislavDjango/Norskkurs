import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { GlossaryTerm, Level, Stream, VerbEntry } from "../../types";

type Props = {
  stream: Stream;
  currentLevel: Level;
  playableTerms: GlossaryTerm[];
  verbEntries: VerbEntry[];
  storagePrefix: string;
  titleKey: string;
  allowClickWhileFalling: boolean;
};

type GameStatus = "pre-game" | "running" | "paused" | "game-over";
type SpawnSpeed = 1500 | 2500 | 4000 | 6000 | 8000 | 10000 | 12000;
type OpenMode = "modal" | "fullscreen";
type LanguageOption = Stream | "russian";
type PlayableTerm = GlossaryTerm & { source: "glossary" | "verb" };
type EndReason = "lives" | "exhausted";
type SpawnPair = { termKey: string; leftText: string; rightText: string };

const BLOCK_HEIGHT = 48;
const INITIAL_GRACE_MS = 8000;
const RENDER_FPS = 30;
const MIN_BLOCK_WIDTH = 80;
const MAX_COLS = 10;
const SETTLE_SPEED_MULTIPLIER = 1.6;

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
  targetY?: number;
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

const loadStoredNumber = (key: string, fallback: number) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const storeNumber = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
};

const loadStoredString = (key: string, fallback: string) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ?? fallback;
  } catch {
    return fallback;
  }
};

const storeString = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

const loadStoredStringArray = (key: string, fallback: string[]) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map((value) => String(value)).filter(Boolean);
  } catch {
    return fallback;
  }
};

const storeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const randomInt = (max: number) => Math.floor(Math.random() * max);

const shuffleInPlace = <T,>(items: T[]) => {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

const sampleWithoutReplacement = <T,>(items: T[], count: number) => {
  if (count >= items.length) return [...items];
  const copy = [...items];
  for (let i = 0; i < count; i += 1) {
    const j = i + randomInt(copy.length - i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
};

const languageOptions = ["bokmaal", "nynorsk", "english", "russian"] as const;
const spawnSpeedOptions: SpawnSpeed[] = [1500, 2500, 4000, 6000, 8000, 10000, 12000];
const allowedLives = [3, 5, 10, 20] as const;
const fallSpeedOptions = [60, 90, 120, 150, 180] as const;

const isLanguageOption = (value: string): value is LanguageOption =>
  (languageOptions as readonly string[]).includes(value);

const isSpawnSpeed = (value: number): value is SpawnSpeed => spawnSpeedOptions.includes(value as SpawnSpeed);

const isAllowedLives = (value: number): value is (typeof allowedLives)[number] =>
  (allowedLives as readonly number[]).includes(value);

const isFallSpeed = (value: number): value is (typeof fallSpeedOptions)[number] =>
  (fallSpeedOptions as readonly number[]).includes(value);

const clampInt = (value: number, min: number, max: number) => {
  const rounded = Math.round(value);
  return Math.min(max, Math.max(min, rounded));
};

const isMobileViewport = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(max-width: 768px)")?.matches ?? window.innerWidth <= 768;
};

const WordCollapseBaseGame: React.FC<Props> = ({
  stream,
  currentLevel,
  playableTerms,
  verbEntries,
  storagePrefix,
  titleKey,
  allowClickWhileFalling,
}) => {
  const { t, i18n } = useTranslation();

  const [status, setStatus] = useState<GameStatus>("pre-game");
  const [endReason, setEndReason] = useState<EndReason | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openMode, setOpenMode] = useState<OpenMode>("modal");
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [preferFullscreen, setPreferFullscreen] = useState(() =>
    loadStoredBool(`${storagePrefix}:preferFullscreen`, true),
  );
  const [hintsEnabled, setHintsEnabled] = useState(() =>
    loadStoredBool(`${storagePrefix}:hintsEnabled`, false),
  );
  const [isMusicOn, setIsMusicOn] = useState(() =>
    loadStoredBool(`${storagePrefix}:musicOn`, true),
  );
  const [uniqueOnly, setUniqueOnly] = useState(() =>
    loadStoredBool(`${storagePrefix}:uniqueOnly`, false),
  );

  const [useGlossary, setUseGlossary] = useState(() =>
    loadStoredBool(`${storagePrefix}:useGlossary`, true),
  );
  const [selectedParts, setSelectedParts] = useState<string[]>(() =>
    loadStoredStringArray(`${storagePrefix}:selectedParts`, []),
  );
  const [useIrregularOnly, setUseIrregularOnly] = useState(() =>
    loadStoredBool(`${storagePrefix}:useIrregularOnly`, false),
  );

  const [leftLanguage, setLeftLanguage] = useState<LanguageOption>(() => {
    const stored = loadStoredString(`${storagePrefix}:leftLanguage`, stream);
    return isLanguageOption(stored) ? stored : stream;
  });
  const [rightLanguage, setRightLanguage] = useState<LanguageOption>(() => {
    const fallback = defaultRightLanguageForUi(i18n.language);
    const stored = loadStoredString(`${storagePrefix}:rightLanguage`, fallback);
    return isLanguageOption(stored) ? stored : fallback;
  });
  const [swapSides, setSwapSides] = useState(() =>
    loadStoredBool(`${storagePrefix}:swapSides`, false),
  );
  const [requireTranslations, setRequireTranslations] = useState(() =>
    loadStoredBool(`${storagePrefix}:requireTranslations`, true),
  );

  const [maxLives, setMaxLives] = useState<number>(() => {
    const stored = clampInt(loadStoredNumber(`${storagePrefix}:maxLives`, 5), 3, 20);
    return isAllowedLives(stored) ? stored : 5;
  });
  const [lives, setLives] = useState<number>(() => {
    const stored = clampInt(loadStoredNumber(`${storagePrefix}:maxLives`, 5), 3, 20);
    return isAllowedLives(stored) ? stored : 5;
  });
  const [pairCount, setPairCount] = useState(() =>
    clampInt(loadStoredNumber(`${storagePrefix}:pairCount`, 3), 2, 10),
  );
  const [spawnIntervalMs, setSpawnIntervalMs] = useState<SpawnSpeed>(() => {
    const stored = loadStoredNumber(`${storagePrefix}:spawnIntervalMs`, 6000);
    return isSpawnSpeed(stored) ? stored : 6000;
  });
  const [fallSpeedPxPerSec, setFallSpeedPxPerSec] = useState<number>(() => {
    const stored = loadStoredNumber(`${storagePrefix}:fallSpeedPxPerSec`, 90);
    return isFallSpeed(stored) ? stored : 90;
  });

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
  const endReasonRef = useRef<EndReason | null>(null);
  const uniqueOnlyRef = useRef(false);
  const spawnQueueRef = useRef<SpawnPair[]>([]);
  const spawnCursorRef = useRef(0);
  const freezeTimeoutRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<number | null>(null);
  const matchedCleanupTimeoutRef = useRef<number | null>(null);
  const wrongResetTimeoutRef = useRef<number | null>(null);
  const freezeUntilRef = useRef(0);
  const previousStreamRef = useRef<Stream>(stream);

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

  const storageKey = useCallback(
    (suffix: string) => `${storagePrefix}:${suffix}`,
    [storagePrefix],
  );

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

  useEffect(() => {
    setLeftLanguage((prev) => {
      const prevStream = previousStreamRef.current;
      previousStreamRef.current = stream;
      if (prev === prevStream) return stream;
      return prev;
    });
  }, [stream]);

  useEffect(() => {
    storeBool(storageKey("preferFullscreen"), preferFullscreen);
  }, [preferFullscreen, storageKey]);

  useEffect(() => {
    storeBool(storageKey("hintsEnabled"), hintsEnabled);
  }, [hintsEnabled, storageKey]);

  useEffect(() => {
    storeBool(storageKey("musicOn"), isMusicOn);
  }, [isMusicOn, storageKey]);

  useEffect(() => {
    storeBool(storageKey("uniqueOnly"), uniqueOnly);
    uniqueOnlyRef.current = uniqueOnly;
  }, [storageKey, uniqueOnly]);

  useEffect(() => {
    storeBool(storageKey("useGlossary"), useGlossary);
  }, [storageKey, useGlossary]);

  useEffect(() => {
    storeJson(storageKey("selectedParts"), selectedParts);
  }, [selectedParts, storageKey]);

  useEffect(() => {
    storeBool(storageKey("useIrregularOnly"), useIrregularOnly);
  }, [storageKey, useIrregularOnly]);

  useEffect(() => {
    storeString(storageKey("leftLanguage"), leftLanguage);
  }, [leftLanguage, storageKey]);

  useEffect(() => {
    storeString(storageKey("rightLanguage"), rightLanguage);
  }, [rightLanguage, storageKey]);

  useEffect(() => {
    storeBool(storageKey("swapSides"), swapSides);
  }, [storageKey, swapSides]);

  useEffect(() => {
    storeBool(storageKey("requireTranslations"), requireTranslations);
  }, [requireTranslations, storageKey]);

  useEffect(() => {
    storeNumber(storageKey("maxLives"), maxLives);
  }, [maxLives, storageKey]);

  useEffect(() => {
    storeNumber(storageKey("pairCount"), pairCount);
  }, [pairCount, storageKey]);

  useEffect(() => {
    storeNumber(storageKey("spawnIntervalMs"), spawnIntervalMs);
  }, [spawnIntervalMs, storageKey]);

  useEffect(() => {
    storeNumber(storageKey("fallSpeedPxPerSec"), fallSpeedPxPerSec);
  }, [fallSpeedPxPerSec, storageKey]);

  useEffect(() => {
    endReasonRef.current = endReason;
  }, [endReason]);

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
      ? playableTerms
          .filter((term) => term.level === currentLevel)
          .map((term) => ({ ...term, source: "glossary" as const }))
      : [];

    return [...glossaryPool, ...verbLikeTerms];
  }, [currentLevel, playableTerms, selectedParts, useGlossary, useIrregularOnly, verbEntries]);

  const leftSideLanguage = swapSides ? rightLanguage : leftLanguage;
  const rightSideLanguage = swapSides ? leftLanguage : rightLanguage;

  const spawnPool = useMemo(() => {
    const pairs: SpawnPair[] = [];
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
  const minRequiredPairs = uniqueOnly ? 1 : Math.max(2, pairCount);
  const canStart = spawnPool.length >= minRequiredPairs;
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

  useEffect(
    () => () => {
      clearPendingTimeouts();
    },
    [clearPendingTimeouts],
  );

  const commitBlocks = useCallback((next: Block[]) => {
    blocksRef.current = next;
    setBlocks(next);
  }, []);

  const settleColumns = useCallback(
    (currentBlocks: Block[]) => {
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
            block.isFalling || block.targetY !== undefined || Math.abs(block.y - desiredY) > 0.5 || block.y < desiredY;

          if (needsMove) {
            next.push({ ...block, isFalling: true, targetY: desiredY });
            return;
          }

          next.push({ ...block, y: desiredY, isFalling: false, targetY: undefined });
        });
      }
      return next;
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
    blocksRef.current = [];
    setBlocks([]);
  }, [clearPendingTimeouts, maxLives]);

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
    if (!canStart) {
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
    if (!canStart) return;

    resetGameState();
    setIsSettingsOpen(false);
    setIsModalOpen(true);
    setIsTutorialOpen(false);
    setStatus("running");
    startMusic();

    uniqueOnlyRef.current = uniqueOnly;
    spawnQueueRef.current = uniqueOnly ? shuffleInPlace([...spawnPool]) : [];
    spawnCursorRef.current = 0;

    gameStartedAtRef.current = performance.now();
    spawnAccumulatorMsRef.current = 0;
  };

  const handleRestart = () => {
    resetGameState();
    setIsModalOpen(true);
    setIsTutorialOpen(false);
    setStatus("running");
    startMusic();

    uniqueOnlyRef.current = uniqueOnly;
    spawnQueueRef.current = uniqueOnly ? shuffleInPlace([...spawnPool]) : [];
    spawnCursorRef.current = 0;

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
        endReasonRef.current = "lives";
        setEndReason("lives");
        setStatus("game-over");
        stopMusic();
      }
      return next;
    });
  }, [stopMusic]);

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
    const isInitialWave = existing.length === 0;
    const spawnSpread = isInitialWave || isMobileViewport() ? 1.6 : Math.max(2.8, waveSize * 1.35);
    const spawnBase = isInitialWave || isMobileViewport() ? 0.15 : 0.5;

    const leftCandidates = Array.from({ length: halfCols }, (_, idx) => idx).filter((col) => !blockedCols.has(col));
    const rightCandidates = Array.from({ length: halfCols }, (_, idx) => halfCols + idx).filter(
      (col) => !blockedCols.has(col),
    );
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
      const bandStart = bandStartByCol.get(col) ?? spawnBase + Math.random() * spawnSpread;
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
    if (uniqueOnlyRef.current) spawnCursorRef.current = cursorStart + selected.length;
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
        const byCol = new Map<number, Block[]>();
        for (const block of prev) {
          if (block.isMatched) continue;
          const list = byCol.get(block.col) || [];
          list.push(block);
          byCol.set(block.col, list);
        }

        const updates = new Map<string, Block>();
        for (const columnBlocks of byCol.values()) {
          const sorted = [...columnBlocks].sort((a, b) => b.y - a.y);
          let ceilingY = gameSize.height - BLOCK_HEIGHT;

          for (const block of sorted) {
            if (!block.isFalling) {
              updates.set(block.id, block);
              ceilingY = block.y - BLOCK_HEIGHT;
              continue;
            }

            const speedPxPerSec =
              block.targetY !== undefined ? fallSpeedPxPerSec * SETTLE_SPEED_MULTIPLIER : fallSpeedPxPerSec;
            const dyBlock = (speedPxPerSec * dtMs) / 1000;
            let stopY = ceilingY;
            if (block.targetY !== undefined) stopY = Math.min(stopY, block.targetY);

            const movedY = Math.min(block.y + dyBlock, stopY);
            if (movedY >= stopY) {
              updates.set(block.id, { ...block, y: stopY, isFalling: false, targetY: undefined });
              ceilingY = stopY - BLOCK_HEIGHT;
              continue;
            }

            if (movedY !== block.y) {
              updates.set(block.id, { ...block, y: movedY });
              ceilingY = movedY - BLOCK_HEIGHT;
              continue;
            }

            updates.set(block.id, block);
            ceilingY = block.y - BLOCK_HEIGHT;
          }
        }

        const next = prev.map((block) => updates.get(block.id) ?? block);
        const anyChanged = next.some((block, idx) => block !== prev[idx]);
        if (anyChanged) blocksRef.current = next;

        const startedAt = gameStartedAtRef.current ?? now;
        const withinGrace = now - startedAt < INITIAL_GRACE_MS;
        if (!withinGrace) {
          spawnAccumulatorMsRef.current += dtMs;
          while (spawnAccumulatorMsRef.current >= spawnIntervalMs) {
            spawnAccumulatorMsRef.current -= spawnIntervalMs;
            const shouldSpawnBonus = Math.random() < 0.1;
            const spawned = shouldSpawnBonus ? spawnBonus("freeze") || spawnWave() : spawnWave();
            if (!spawned) break;
          }
        }

        if (uniqueOnlyRef.current && spawnCursorRef.current >= spawnQueueRef.current.length) {
          const hasActiveBlocks = blocksRef.current.some((block) => !block.isMatched);
          if (!hasActiveBlocks && endReasonRef.current === null) {
            endReasonRef.current = "exhausted";
            setEndReason("exhausted");
            setStatus("game-over");
            stopMusic();
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
    stopMusic,
    status,
  ]);

  const handleBlockClick = (blockId: string) => {
    if (status !== "running") return;
    const currentBlocks = blocksRef.current;
    const clickedBlock = currentBlocks.find((b) => b.id === blockId);
    if (
      !clickedBlock ||
      clickedBlock.isMatched ||
      (!allowClickWhileFalling && clickedBlock.isFalling)
    )
      return;

    if (clickedBlock.role === "bonus") {
      if (clickedBlock.bonusType === "freeze") {
        applyFreeze(6000);
        setScore((s) => s + 5);
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
        const shuffled = shuffleInPlace([...uniqueTerms]);
        const targetTerms = new Set(shuffled.slice(0, removeCount));
        const filtered = currentBlocks.filter((b) => b.id !== blockId && (!b.termKey || !targetTerms.has(b.termKey)));
        commitBlocks(settleColumns(filtered));
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
        currentBlocks.map((b) => (b.id === selectedBlockId || b.id === clickedBlock.id ? { ...b, isMatched: true } : b)),
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
      currentBlocks.map((b) => (b.id === selectedBlockId || b.id === clickedBlock.id ? { ...b, isWrong: true } : b)),
    );
    wrongResetTimeoutRef.current = window.setTimeout(() => {
      commitBlocks(blocksRef.current.map((b) => (b.isWrong ? { ...b, isWrong: false } : b)));
      wrongResetTimeoutRef.current = null;
    }, 500);
    setSelectedBlockId(null);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeDialog = isTutorialOpen
        ? tutorialWindowRef.current
        : isSettingsOpen
          ? settingsWindowRef.current
          : isModalOpen
            ? modalWindowRef.current
            : null;

      if (event.key === "Tab" && activeDialog) {
        const focusable = Array.from(
          activeDialog.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getAttribute("aria-hidden") !== "true");
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;
          if (!(active instanceof HTMLElement) || !activeDialog.contains(active)) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
            return;
          }
          if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
            return;
          }
          if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
            return;
          }
        }
        return;
      }

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
          <h3>{t(titleKey)}</h3>
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
                <h3>{t(titleKey)}</h3>
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
                  {uniqueOnly && spawnQueueRef.current.length > 0 && (
                    <span className="score unique-progress">
                      {t("games.wordCollapseUniqueProgress", "Уникальные: {{used}}/{{total}}", {
                        used: Math.min(spawnCursorRef.current, spawnQueueRef.current.length),
                        total: spawnQueueRef.current.length,
                      })}
                    </span>
                  )}
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
                      <h4>
                        {endReason === "exhausted"
                          ? t("games.wordCollapseCompletedTitle", "Слова закончились!")
                          : t("games.gameOver", "Game Over")}
                      </h4>
                      {endReason === "exhausted" && (
                        <p className="muted small">
                          {t("games.wordCollapseCompletedHint", "Вы прошли все доступные слова без повторов.")}
                        </p>
                      )}
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
                  <label className="checkbox-row">
                    <input type="checkbox" checked={uniqueOnly} onChange={(e) => setUniqueOnly(e.target.checked)} />
                    <span>{t("games.wordCollapseUniqueOnly", "Уникальные слова (без повторов)")}</span>
                  </label>
                  <p className="muted tiny">
                    {t("games.wordCollapsePoolCount", "Доступно слов: {{count}}", { count: spawnPool.length })}
                  </p>
                  {!canStart && (
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
                disabled={!canStart}
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

export default WordCollapseBaseGame;
