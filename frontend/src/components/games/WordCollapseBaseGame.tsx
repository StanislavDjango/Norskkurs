import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import type { GlossaryTerm, Level, Stream, VerbEntry } from "../../types";
import {
  clampInt,
  defaultRightLanguageForUi,
  isAllowedLives,
  isFallSpeed,
  isLanguageOption,
  isMobileViewport,
  isSpawnSpeed,
  mapVerbEntryToPlayable,
  normalizeForCompare,
  partOptions,
  pickTextForLanguage,
  termKeyFor,
} from "./wordCollapseShared";
import type { LanguageOption, PlayableTerm, SpawnPair, SpawnSpeed } from "./wordCollapseShared";
import { useWordCollapseEngine } from "./useWordCollapseEngine";
import type { GameSize } from "./useWordCollapseEngine";
import {
  loadStoredBool,
  loadStoredNumber,
  loadStoredString,
  loadStoredStringArray,
  storeBool,
  storeJson,
  storeNumber,
  storeString,
} from "./wordCollapseStorage";

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
type OpenMode = "modal" | "fullscreen";

const BLOCK_HEIGHT = 48;
const MIN_BLOCK_WIDTH = 80;
const MAX_COLS = 10;

const PRIMARY_MUSIC_SRC = "/audio/4f13fc38b4572af.mp3";
const FALLBACK_MUSIC_SRC = "/audio/wordcollapse.mp3";

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
  const handleGameOver = useCallback(() => {
    setStatus("game-over");
    stopMusic();
  }, [stopMusic]);

  const {
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
    uniqueProgress,
  } = useWordCollapseEngine({
    allowClickWhileFalling,
    fallSpeedPxPerSec,
    gameSize,
    isModalOpen,
    isTutorialOpen,
    maxLives,
    onGameOver: handleGameOver,
    pairCount,
    spawnIntervalMs,
    spawnPool,
    status,
    uniqueOnly,
  });

  const selectedBlock = selectedBlockId ? blocks.find((b) => b.id === selectedBlockId) : undefined;
  const hintTermKey = hintsEnabled ? (selectedBlock?.termKey ?? null) : null;
  const hintRoleNeeded = hintsEnabled
    ? selectedBlock?.role === "left"
      ? "right"
      : selectedBlock?.role === "right"
        ? "left"
        : null
    : null;

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

    setIsSettingsOpen(false);
    setIsModalOpen(true);
    setIsTutorialOpen(false);
    setStatus("running");
    startRound();
    startMusic();
  };

  const handleRestart = () => {
    setIsModalOpen(true);
    setIsTutorialOpen(false);
    setStatus("running");
    startRound();
    startMusic();
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
    }
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

  const modalOverlays =
    isModalOpen || isTutorialOpen || isSettingsOpen ? (
      <>
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
                    {uniqueOnly && uniqueProgress.total > 0 && (
                      <span className="score unique-progress">
                        {t("games.wordCollapseUniqueProgress", "Уникальные: {{used}}/{{total}}", {
                          used: uniqueProgress.used,
                          total: uniqueProgress.total,
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
                <button className="start-btn big" type="button" onClick={beginGame} disabled={!canStart}>
                  {t("games.start")}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    ) : null;

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
      {typeof document !== "undefined" ? createPortal(modalOverlays, document.body) : null}
    </div>
  );
};

export default WordCollapseBaseGame;
