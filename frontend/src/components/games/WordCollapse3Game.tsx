import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { GlossaryTerm, Level, Stream, VerbEntry } from "../../types";
import {
  isAllowedLives,
  isLanguageOption,
  defaultRightLanguageForUi,
  mapVerbEntryToPlayable,
  normalizeForCompare,
  partOptions,
  pickTextForLanguage,
  termKeyFor,
} from "./wordCollapseShared";
import type { LanguageOption, PlayableTerm, SpawnPair } from "./wordCollapseShared";
import {
  WORD_COLLAPSE3_GAME_SIZE,
  WORD_COLLAPSE3_MOBILE_BREAKPOINT,
  WORD_COLLAPSE3_SPEED_MULTIPLIERS,
} from "./wordCollapse3Config";
import type { WordCollapse3SpeedPreset } from "./wordCollapse3Config";
import type { WordCollapse3Hud, WordCollapse3Scene } from "./wordCollapse3Scene";
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
};

const FALLBACK_HUD: WordCollapse3Hud = {
  status: "idle",
  lives: 5,
  score: 0,
  incorrect: 0,
  combo: 0,
  bombCharge: 0,
  isFrozen: false,
  leftLabel: "",
  rightLabel: "",
  canUseBomb: false,
  poolSize: 0,
};

const ensureDifferentRightLanguage = (leftLanguage: Stream, uiLanguage: string): LanguageOption => {
  const preferred = defaultRightLanguageForUi(uiLanguage);
  if (preferred !== leftLanguage) return preferred;
  return preferred === "english" ? "russian" : "english";
};

const STORAGE_PREFIX = "wordcollapse3";
const storageKey = (suffix: string) => `${STORAGE_PREFIX}:${suffix}`;
const languageOptionToLabelKey = (language: LanguageOption) => `streamLabels.${language}`;

const WordCollapse3Game: React.FC<Props> = ({ stream, currentLevel, playableTerms, verbEntries }) => {
  const { t, i18n } = useTranslation();
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean, noReturn?: boolean) => void } | null>(null);
  const sceneRef = useRef<WordCollapse3Scene | null>(null);
  const [hud, setHud] = useState<WordCollapse3Hud>(FALLBACK_HUD);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= WORD_COLLAPSE3_MOBILE_BREAKPOINT : false,
  );
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [speedPreset, setSpeedPreset] = useState<WordCollapse3SpeedPreset>(
    () => (loadStoredString(storageKey("speedPreset"), "verySlow") as WordCollapse3SpeedPreset),
  );
  const [useGlossary, setUseGlossary] = useState(() =>
    loadStoredBool(storageKey("useGlossary"), true),
  );
  const [selectedParts, setSelectedParts] = useState<string[]>(() =>
    loadStoredStringArray(storageKey("selectedParts"), []),
  );
  const [useIrregularOnly, setUseIrregularOnly] = useState(() =>
    loadStoredBool(storageKey("useIrregularOnly"), false),
  );
  const [leftLanguage, setLeftLanguage] = useState<LanguageOption>(() => {
    const stored = loadStoredString(storageKey("leftLanguage"), stream);
    return isLanguageOption(stored) ? stored : stream;
  });
  const [rightLanguage, setRightLanguage] = useState<LanguageOption>(() => {
    const fallback = ensureDifferentRightLanguage(stream, i18n.language);
    const stored = loadStoredString(storageKey("rightLanguage"), fallback);
    return isLanguageOption(stored) ? stored : fallback;
  });
  const [swapSides, setSwapSides] = useState(() =>
    loadStoredBool(storageKey("swapSides"), false),
  );
  const [requireTranslations, setRequireTranslations] = useState(() =>
    loadStoredBool(storageKey("requireTranslations"), true),
  );
  const [maxLives, setMaxLives] = useState<number>(() => {
    const stored = loadStoredNumber(storageKey("maxLives"), 5);
    return isAllowedLives(stored) ? stored : 5;
  });

  useEffect(() => {
    storeString(storageKey("speedPreset"), speedPreset);
  }, [speedPreset]);

  useEffect(() => {
    storeBool(storageKey("useGlossary"), useGlossary);
  }, [useGlossary]);

  useEffect(() => {
    storeJson(storageKey("selectedParts"), selectedParts);
  }, [selectedParts]);

  useEffect(() => {
    storeBool(storageKey("useIrregularOnly"), useIrregularOnly);
  }, [useIrregularOnly]);

  useEffect(() => {
    storeString(storageKey("leftLanguage"), leftLanguage);
  }, [leftLanguage]);

  useEffect(() => {
    storeString(storageKey("rightLanguage"), rightLanguage);
  }, [rightLanguage]);

  useEffect(() => {
    storeBool(storageKey("swapSides"), swapSides);
  }, [swapSides]);

  useEffect(() => {
    storeBool(storageKey("requireTranslations"), requireTranslations);
  }, [requireTranslations]);

  useEffect(() => {
    storeNumber(storageKey("maxLives"), maxLives);
  }, [maxLives]);

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

    const glossaryPool = useGlossary
      ? playableTerms
          .filter((term) => term.level === currentLevel)
          .map((term) => ({ ...term, source: "glossary" as const }))
      : [];

    return [...glossaryPool, ...verbsPool.map(mapVerbEntryToPlayable)];
  }, [currentLevel, playableTerms, selectedParts, useGlossary, useIrregularOnly, verbEntries]);

  const leftSideLanguage = swapSides ? rightLanguage : leftLanguage;
  const rightSideLanguage = swapSides ? leftLanguage : rightLanguage;

  const spawnPool = useMemo<SpawnPair[]>(() => {
    const strictPairs = combinedTerms.flatMap((term) => {
      const leftText = pickTextForLanguage(term, leftSideLanguage, requireTranslations);
      const rightText = pickTextForLanguage(term, rightSideLanguage, requireTranslations);
      if (!leftText || !rightText) return [];
      if (normalizeForCompare(leftText) === normalizeForCompare(rightText)) return [];
      return [{ termKey: termKeyFor(term), leftText, rightText }];
    });

    if (strictPairs.length >= 12 || requireTranslations) return strictPairs;

    return combinedTerms.flatMap((term) => {
      const leftText = pickTextForLanguage(term, leftSideLanguage, false);
      const rightText = pickTextForLanguage(term, rightSideLanguage, false);
      if (!leftText || !rightText) return [];
      if (normalizeForCompare(leftText) === normalizeForCompare(rightText)) return [];
      return [{ termKey: termKeyFor(term), leftText, rightText }];
    });
  }, [combinedTerms, leftSideLanguage, requireTranslations, rightSideLanguage]);

  const leftLabel = t(languageOptionToLabelKey(leftSideLanguage));
  const rightLabel = t(languageOptionToLabelKey(rightSideLanguage));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewport = () => {
      const mobile = window.innerWidth <= WORD_COLLAPSE3_MOBILE_BREAKPOINT;
      setIsMobile(mobile);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    if (spawnPool.length < 2) {
      setHud((prev) => ({ ...prev, poolSize: spawnPool.length, leftLabel, rightLabel }));
      return;
    }

    let cancelled = false;

    const init = async () => {
      const [{ default: Phaser }, { WordCollapse3Scene }] = await Promise.all([
        import("phaser"),
        import("./wordCollapse3Scene"),
      ]);
      if (cancelled || !mountRef.current) return;

      mountRef.current.innerHTML = "";
      const scene = new WordCollapse3Scene({
        spawnPool,
        leftLabel,
        rightLabel,
        isMobile,
        speedMultiplier: WORD_COLLAPSE3_SPEED_MULTIPLIERS[speedPreset],
        maxLives,
        onHudChange: (nextHud) => {
          setHud(nextHud);
        },
      });
      sceneRef.current = scene;

      const game = new Phaser.Game({
        type: Phaser.WEBGL,
        parent: mountRef.current,
        width: isMobile ? WORD_COLLAPSE3_GAME_SIZE.mobile.width : WORD_COLLAPSE3_GAME_SIZE.desktop.width,
        height: isMobile ? WORD_COLLAPSE3_GAME_SIZE.mobile.height : WORD_COLLAPSE3_GAME_SIZE.desktop.height,
        backgroundColor: "#000000",
        transparent: true,
        antialias: true,
        pixelArt: false,
        roundPixels: false,
        clearBeforeRender: true,
        fps: {
          target: 60,
          forceSetTimeOut: false,
          smoothStep: true,
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: isMobile ? WORD_COLLAPSE3_GAME_SIZE.mobile.width : WORD_COLLAPSE3_GAME_SIZE.desktop.width,
          height: isMobile ? WORD_COLLAPSE3_GAME_SIZE.mobile.height : WORD_COLLAPSE3_GAME_SIZE.desktop.height,
        },
        scene: [scene],
      });

      gameRef.current = game;
    };

    init().catch(() => {
      setHud((prev) => ({ ...prev, poolSize: 0, leftLabel, rightLabel, status: "game-over" }));
    });

    return () => {
      cancelled = true;
      sceneRef.current?.destroyScene();
      sceneRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, [isMobile, leftLabel, maxLives, rightLabel, spawnPool]);

  useEffect(() => {
    sceneRef.current?.setSpeedMultiplier(WORD_COLLAPSE3_SPEED_MULTIPLIERS[speedPreset]);
  }, [speedPreset]);

  const handleRestart = () => {
    sceneRef.current?.restartRound();
  };

  const handlePause = () => {
    sceneRef.current?.togglePause();
  };

  const handleBomb = () => {
    sceneRef.current?.triggerBomb();
  };

  const statusLabel =
    hud.status === "paused"
      ? t("games.wordCollapseResume", "Resume")
      : hud.status === "game-over"
        ? t("games.gameOver", "Game Over")
        : hud.status === "running"
          ? t("games.wordCollapse3Running", "Running")
          : t("games.start", "Start");

  return (
    <div className={`phaser-collapse-shell ${isMobile ? "is-mobile" : ""}`}>
      <div className="phaser-collapse-hero">
        <div className="phaser-collapse-copy">
          <h3>{t("games.tabWordCollapse3", "WordCollaps 3")}</h3>
          <p className="muted small">{t("games.wordCollapse3Subtitle", "Canvas-powered matching with smoother motion, cleaner visuals, and stronger feedback.")}</p>
        </div>
        <div className="phaser-collapse-actions">
          <button className="start-btn" type="button" onClick={handleRestart} disabled={spawnPool.length < 2}>
            {t("games.restart", "Сыграть ещё")}
          </button>
          <button
            className="ghost-btn"
            type="button"
            onClick={handlePause}
            disabled={hud.status === "idle" || hud.status === "game-over"}
          >
            {hud.status === "paused" ? t("games.wordCollapseResume", "Resume") : t("games.wordCollapsePause", "Pause")}
          </button>
          <button className="ghost-btn" type="button" onClick={handleBomb} disabled={!hud.canUseBomb}>
            {t("games.wordCollapseBombLabel", "Bomb")}
          </button>
        </div>
      </div>

      <details
        className="phaser-collapse-settings"
        open={settingsExpanded}
        onToggle={(event) => setSettingsExpanded((event.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>
          <span>{t("games.settings", "Settings")}</span>
          <span className="muted tiny">{t("games.settingsHint", "Choose word sources and difficulty before you start.")}</span>
        </summary>
        <div className="falling-settings-grid">
          <div className="falling-settings-card">
            <div className="falling-settings-card__title">
              <span className="eyebrow">{t("games.wordSources", "Выбор слов")}</span>
              <span className="muted tiny">{t("games.sourceHint", "Можно выбрать сразу несколько источников")}</span>
            </div>
            <div className="falling-settings-list">
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

          <div className="falling-settings-card">
            <div className="falling-settings-card__title">
              <span className="eyebrow">{t("games.wordCollapseLanguagesTitle", "Языки")}</span>
              <span className="muted tiny">
                {t("games.wordCollapseLanguagesHint", "Выберите языки слева и справа (можно поменять местами).")}
              </span>
            </div>
            <div className="falling-settings-list">
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

          <div className="falling-settings-card">
            <div className="falling-settings-card__title">
              <span className="eyebrow">{t("games.difficulty", "Сложность")}</span>
              <span className="muted tiny">{t("games.difficultyHint", "Подберите комфортный темп игры")}</span>
            </div>
            <div className="falling-settings-list">
              <label className="game-settings">
                <span>{t("games.speedLabel", "Speed")}</span>
                <select value={speedPreset} onChange={(e) => setSpeedPreset(e.target.value as WordCollapse3SpeedPreset)}>
                  <option value="verySlow">{t("games.speedVerySlow", "Very slow")}</option>
                  <option value="slow">{t("games.speedSlow", "Slow")}</option>
                  <option value="normal">{t("games.speedNormal", "Normal")}</option>
                  <option value="fast">{t("games.speedFast", "Fast")}</option>
                  <option value="turbo">{t("games.speedTurbo", "Turbo")}</option>
                </select>
              </label>
              <label className="game-settings">
                <span>{t("games.wordCollapseLivesLabel", "Lives")}</span>
                <select value={maxLives} onChange={(e) => setMaxLives(Number(e.target.value))}>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </label>
              <p className="muted tiny">
                {t("games.wordCollapsePoolCount", "Words available: {{count}}", { count: spawnPool.length })}
              </p>
              {spawnPool.length < 2 && (
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
      </details>

      <div className="phaser-collapse-stats">
        <span className="score lives">
          {t("games.wordCollapseLivesLabel", "Lives")}: {hud.lives}
        </span>
        <span className="score correct">
          {t("correct", "Correct")}: {hud.score}
        </span>
        <span className="score incorrect">
          {t("incorrect", "Incorrect")}: {hud.incorrect}
        </span>
        <span className="score combo">Combo: x{Math.max(1, hud.combo)}</span>
        <span className={`score bomb ${hud.canUseBomb ? "ready" : ""}`}>
          {t("games.wordCollapseBombLabel", "Bomb")}: {hud.bombCharge}%
        </span>
        {hud.isFrozen && (
          <span className="score freeze">
            {t("games.wordCollapseFreezeLabel", "Freeze")}
          </span>
        )}
        <span className="score status">{statusLabel}</span>
      </div>

      <div className="phaser-collapse-legend" aria-hidden="true">
        <div className="phaser-collapse-lane phaser-collapse-lane--left">
          <span className="phaser-collapse-lane__eyebrow">{t("games.wordCollapseLaneOriginal", "Original")}</span>
          <strong>{leftLabel}</strong>
        </div>
        <div className="phaser-collapse-lane phaser-collapse-lane--right">
          <span className="phaser-collapse-lane__eyebrow">{t("games.wordCollapseLaneTranslation", "Translation")}</span>
          <strong>{rightLabel}</strong>
        </div>
      </div>

      {spawnPool.length < 2 ? (
        <p className="settings-warning">
          {t(
            "games.wordCollapsePoolWarning",
            "Слишком мало слов для выбранных настроек — включите глоссарий или снимите ограничения.",
          )}
        </p>
      ) : (
        <div className="phaser-collapse-stage-wrap">
          <div className="phaser-collapse-stage" ref={mountRef} />
        </div>
      )}

      <p className="muted tiny phaser-collapse-footer">
        {t(
          "games.wordCollapse3Hint",
          "WordCollaps 3 uses the same course vocabulary and matching idea, but renders the game on Phaser for smoother 2D motion.",
        )}
      </p>
    </div>
  );
};

export default WordCollapse3Game;
