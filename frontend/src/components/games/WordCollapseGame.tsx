import React, { useCallback, useEffect, useState, useLayoutEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { GlossaryTerm, Level, Stream, VerbEntry } from "../../types";
import { getNorwegianForTerm, pickTranslationForTower } from "../../utils/terms";

// --- Types ---
type Props = {
  stream: Stream;
  currentLevel: Level;
  playableTerms: GlossaryTerm[];
  verbEntries: VerbEntry[];
};

type GameStatus = "pre-game" | "running" | "game-over";
type SpawnSpeed = 1500 | 2500 | 4000 | 6000 | 8000 | 10000 | 12000;

const BLOCK_HEIGHT = 40;
const GRAVITY = 2;
const PRIMARY_MUSIC_SRC = "/audio/4f13fc38b4572af.mp3";
const FALLBACK_MUSIC_SRC = "/audio/wordcollapse.mp3";

type Block = {
  id: string;
  termId: number; // Using -1 for bonus blocks
  role: "nor" | "tr" | "bonus";
  bonusType?: "freeze" | "bomb";
  text: string;
  x: number;
  y: number;
  vy: number;
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

// --- Main Component ---
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

const mapVerbEntryToGlossary = (entry: VerbEntry): GlossaryTerm => ({
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
});

const WordCollapseGame: React.FC<Props> = ({ stream, playableTerms, verbEntries }) => {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<GameStatus>("pre-game");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [useGlossary, setUseGlossary] = useState(true);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [useIrregularOnly, setUseIrregularOnly] = useState(false);
  const combinedTerms = useMemo<GlossaryTerm[]>(() => {
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

    const verbLikeGlossary = verbsPool.map(mapVerbEntryToGlossary);
    const glossaryPool = useGlossary ? playableTerms : [];
    return [...glossaryPool, ...verbLikeGlossary];
  }, [playableTerms, selectedParts, useGlossary, useIrregularOnly, verbEntries]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [incorrectScore, setIncorrectScore] = useState(0);
  const [isInitialPhase, setIsInitialPhase] = useState(true);
  const [comboCount, setComboCount] = useState(0);
  const [showComboAnimation, setShowComboAnimation] = useState<number | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const [bombCharge, setBombCharge] = useState(0);

  // --- Game Settings ---
  const [pairCount, setPairCount] = useState(3);
  const [spawnSpeed, setSpawnSpeed] = useState<SpawnSpeed>(6000);

  // --- Responsive Sizing ---
  const gameWrapperRef = useRef<HTMLDivElement>(null);
  const [gameSize, setGameSize] = useState<GameSize>({ width: 0, height: BLOCK_HEIGHT * 12, cols: 8, blockWidth: 120 });

  // --- Music ---
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useLayoutEffect(() => {
    if (!isModalOpen) return;
    const updateSize = () => {
      if (gameWrapperRef.current) {
        const parentWidth = gameWrapperRef.current.offsetWidth;
        const parentHeight = gameWrapperRef.current.offsetHeight || window.innerHeight;
        const targetHeight = Math.min(parentHeight, window.innerHeight * 0.9);
        const minHeight = BLOCK_HEIGHT * 12;
        const height = Math.max(minHeight, targetHeight);
        const minBlockWidth = 80;
        let cols = Math.floor(parentWidth / minBlockWidth);
        if (cols > 10) cols = 10;
        if (cols < 4) cols = 4;
        if (cols % 2 !== 0) cols -= 1;
        const blockWidth = parentWidth / cols;
        setGameSize({
          width: parentWidth,
          height,
          cols,
          blockWidth,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isModalOpen]);

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
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const gameBackground = useMemo(() => {
    if (score >= 30) {
      return "linear-gradient(90deg, rgba(13,27,42,0.9) 0%, rgba(27,38,59,0.9) 50%, rgba(22,50,64,0.9) 50%, rgba(34,68,74,0.9) 100%)";
    }
    if (score >= 20) {
      return "linear-gradient(90deg, rgba(74,14,78,0.9) 0%, rgba(140,26,106,0.9) 50%, rgba(216,49,91,0.85) 50%, rgba(238,120,138,0.85) 100%)";
    }
    if (score >= 10) {
      return "linear-gradient(90deg, rgba(207,235,255,0.9) 0%, rgba(181,219,255,0.9) 50%, rgba(221,248,237,0.9) 50%, rgba(198,243,224,0.9) 100%)";
    }
    return "linear-gradient(90deg, #e6f2ff 0%, #e6f2ff 50%, #e9fbf4 50%, #e9fbf4 100%)";
  }, [score]);

  const spawnBlockPairs = useCallback(() => {
    if (combinedTerms.length < pairCount || gameSize.cols < 2) return null;

    const newBlocks: Block[] = [];
    const shuffledTerms = [...combinedTerms].sort(() => 0.5 - Math.random());
    const selectedTerms = shuffledTerms.slice(0, pairCount);
    const colsPerSide = Math.max(2, Math.floor(gameSize.cols / 2));
    const halfWidth = gameSize.width / 2;

    for (const term of selectedTerms) {
        const norwegian = getNorwegianForTerm(term, stream);
        const translation = pickTranslationForTower(term, i18n);

        if (!norwegian || !translation) continue;

        const col1 = Math.floor(Math.random() * colsPerSide);
        let col2 = Math.floor(Math.random() * colsPerSide);
        if (colsPerSide > 1) {
          while (col2 === col1) {
            col2 = Math.floor(Math.random() * colsPerSide);
          }
        }

        const x1 = col1 * gameSize.blockWidth;
        const x2 = halfWidth + col2 * gameSize.blockWidth;
        const y1 = -BLOCK_HEIGHT * (Math.random() * pairCount * 1.5);
        const y2 = -BLOCK_HEIGHT * (Math.random() * pairCount * 1.5);

        newBlocks.push({ id: `block-${term.id}-nor-${Date.now()}-${Math.random()}`, termId: term.id, role: 'nor', text: norwegian, x: x1, y: y1, vy: 0, isFalling: true });
        newBlocks.push({ id: `block-${term.id}-tr-${Date.now()}-${Math.random()}`, termId: term.id, role: 'tr', text: translation, x: x2, y: y2, vy: 0, isFalling: true });
    }
    return newBlocks;
  }, [combinedTerms, stream, i18n, pairCount, gameSize]);

  const spawnBonusBlock = useCallback(() => {
    if (gameSize.cols < 1) return null;
    const col = Math.floor(Math.random() * gameSize.cols);
    const x = col * gameSize.blockWidth;
    const y = -BLOCK_HEIGHT;

    const bonusType = "freeze";
    const text = "❄️";

    const newBlock: Block = {
        id: `bonus-${bonusType}-${Date.now()}`,
        termId: -1,
        role: 'bonus',
        bonusType: bonusType,
        text: text,
        x: x,
        y: y,
        vy: 0,
        isFalling: true
    };
    return newBlock;
  }, [gameSize]);

  const spawnBombBlock = useCallback(() => {
    if (gameSize.cols < 1) return null;
    const col = Math.floor(Math.random() * gameSize.cols);
    const x = col * gameSize.blockWidth;
    const y = -BLOCK_HEIGHT;
    const newBlock: Block = {
      id: `bomb-${Date.now()}`,
      termId: -1,
      role: "bonus",
      bonusType: "bomb",
      text: "💣",
      x,
      y,
      vy: 0,
      isFalling: true,
    };
    return newBlock;
  }, [gameSize]);

  useEffect(() => {
    if (status !== "running" || isFrozen) return;
    const gameLoop = setInterval(() => {
      setBlocks((prevBlocks) =>
        prevBlocks.filter(b => !b.isMatched).map((b) => {
          if (!b.isFalling) return b;
          let newY = b.y + b.vy;
          let newVy = b.vy + GRAVITY;
          if (newY + BLOCK_HEIGHT >= gameSize.height) {
            newY = gameSize.height - BLOCK_HEIGHT;
            return { ...b, y: newY, vy: 0, isFalling: false };
          }
          for (const other of prevBlocks) {
            if (b.id === other.id || other.isMatched) continue;
            if (!other.isFalling && b.x < other.x + gameSize.blockWidth && b.x + gameSize.blockWidth > other.x && newY + BLOCK_HEIGHT >= other.y && newY < other.y + BLOCK_HEIGHT) {
              newY = other.y - BLOCK_HEIGHT;
              return { ...b, y: newY, vy: 0, isFalling: false };
            }
          }
          return { ...b, y: newY, vy: newVy };
        })
      );
    }, 50);
    return () => clearInterval(gameLoop);
  }, [status, gameSize, isFrozen]);

  useEffect(() => {
    if (status !== 'running' || isFrozen) return;
    if (isInitialPhase) {
      const timer = setTimeout(() => setIsInitialPhase(false), 8000);
      return () => clearTimeout(timer);
    }
    const spawnInterval = setInterval(() => {
      setBlocks((prevBlocks) => {
        const shouldSpawnBonus = Math.random() < 0.1;

        if (shouldSpawnBonus) {
            const newBonusBlock = spawnBonusBlock();
            if (!newBonusBlock) return prevBlocks;
             if (prevBlocks.some((b) => b.x === newBonusBlock.x && b.y < BLOCK_HEIGHT)) {
                return prevBlocks;
            }
            return [...prevBlocks, newBonusBlock];
        } else {
            const newBlockPairs = spawnBlockPairs();
            if (!newBlockPairs) return prevBlocks;
            for (const block of newBlockPairs) {
              if (prevBlocks.some((b) => b.x === block.x && b.y < BLOCK_HEIGHT)) {
                setStatus("game-over");
                return prevBlocks;
              }
            }
            return [...prevBlocks, ...newBlockPairs];
        }
      });
    }, spawnSpeed);
    return () => clearInterval(spawnInterval);
  }, [status, isInitialPhase, isFrozen, spawnBlockPairs, spawnBonusBlock, spawnSpeed]);

  const handleBlockClick = (blockId: string) => {
    if (status !== 'running' || blocks.find(b => b.id === blockId)?.isMatched) return;

    const clickedBlock = blocks.find((b) => b.id === blockId);
    if (!clickedBlock || clickedBlock.isFalling) return;

    if (clickedBlock.role === 'bonus') {
        if (clickedBlock.bonusType === 'freeze') {
            setIsFrozen(true);
            setScore(s => s + 5);
            setTimeout(() => setIsFrozen(false), 6000);
            setBlocks(prev => prev.filter(b => b.id !== blockId));
            setSelectedBlockId(null);
            return;
        }
        if (clickedBlock.bonusType === 'bomb') {
            setBlocks(prev => {
              const playable = prev.filter(b => !b.isMatched && b.termId > 0 && b.role !== 'bonus');
              const uniqueTerms = Array.from(new Set(playable.map(b => b.termId)));
              if (uniqueTerms.length === 0) {
                return prev.filter(b => b.id !== blockId);
              }
              const removeCount = Math.max(1, Math.floor(uniqueTerms.length * 0.25));
              const shuffled = [...uniqueTerms].sort(() => 0.5 - Math.random());
              const targetTerms = new Set(shuffled.slice(0, removeCount));
              return prev.filter(b => b.id !== blockId && !targetTerms.has(b.termId));
            });
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
    const selectedBlock = blocks.find((b) => b.id === selectedBlockId);
    if (!selectedBlock) {
      setSelectedBlockId(blockId);
      return;
    }
    if (selectedBlock.role === clickedBlock.role) {
      setSelectedBlockId(blockId);
      return;
    }

    if (selectedBlock.termId === clickedBlock.termId && selectedBlock.role !== clickedBlock.role) {
      const newCombo = comboCount + 1;
      setComboCount(newCombo);
      let basePoints = 1;
      let bonusPoints = 0;
      if (newCombo >= 3) {
          bonusPoints = newCombo;
          setShowComboAnimation(newCombo);
          setTimeout(() => setShowComboAnimation(null), 1500);
          setBombCharge((charge) => Math.min(100, charge + 30));
      }
      if (newCombo < 3) {
        setBombCharge((charge) => Math.min(100, charge + 10));
      }
      setScore((s) => s + basePoints + bonusPoints);

      setBlocks((prev) => prev.map((b) => (b.id === selectedBlockId || b.id === clickedBlock.id ? { ...b, isMatched: true } : b)));
      setTimeout(() => {
        setBlocks(prev => {
            const remaining = prev.filter(b => !b.isMatched);
            return remaining.map(b => {
                const isSupported = remaining.some(other => other.id !== b.id && b.x < other.x + gameSize.blockWidth && b.x + gameSize.blockWidth > other.x && b.y + BLOCK_HEIGHT === other.y) || (b.y + BLOCK_HEIGHT >= gameSize.height);
                return { ...b, isFalling: !isSupported };
            });
        });
      }, 5000);
      setSelectedBlockId(null);
    } else {
      setIncorrectScore(s => s + 1);
      setComboCount(0);
      setShowComboAnimation(null);
      setBlocks(prev => prev.map(b => (b.id === selectedBlockId || b.id === clickedBlock.id ? { ...b, isWrong: true } : b)));
      setTimeout(() => setBlocks(prev => prev.map(b => ({ ...b, isWrong: false }))), 500);
      setSelectedBlockId(null);
    }
  };

  const resetGameState = useCallback(() => {
    setScore(0);
    setIncorrectScore(0);
    setSelectedBlockId(null);
    setComboCount(0);
    setShowComboAnimation(null);
    setBlocks([]);
    setIsInitialPhase(true);
    setIsFrozen(false);
    setBombCharge(0);
  }, []);

  const handleStart = () => {
    setIsSettingsOpen(true);
  };

  const beginGame = () => {
    resetGameState();
    setIsSettingsOpen(false);
    setIsModalOpen(true);
    setPendingStart(true);
    setStatus("running");
    startMusic();
  };

  const handleStop = () => {
    setStatus("pre-game");
    setPendingStart(false);
    resetGameState();
    stopMusic();
  };

  const handleCloseModal = () => {
    handleStop();
    setIsModalOpen(false);
  };

  const speedOptions: { value: SpawnSpeed; label: string }[] = [
    { value: 12000, label: t('games.speedSuperSlow', 'Super Slow') },
    { value: 10000, label: t('games.speedVerySlow', 'Very Slow') },
    { value: 8000, label: t('games.speedSlow', 'Slow') },
    { value: 6000, label: t('games.speedNormal', 'Normal') },
    { value: 4000, label: t('games.speedFast', 'Fast') },
    { value: 2500, label: t('games.speedVeryFast', 'Very Fast') },
    { value: 1500, label: t('games.speedHyper', 'Hyper') },
  ];

  const settingsControls = (extraClass?: string) => (
    <div className={`game-settings ${extraClass || ""}`}>
      <label> {t('games.pairsLabel', 'Pairs')}:
        <select value={pairCount} onChange={e => setPairCount(Number(e.target.value))}>
          {[...Array(9).keys()].map(i => <option key={i+2} value={i+2}>{i+2}</option>)}
        </select>
      </label>
      <label> {t('games.speedLabel', 'Speed')}:
        <select value={spawnSpeed} onChange={e => setSpawnSpeed(Number(e.target.value) as SpawnSpeed)}>
          {speedOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </label>
    </div>
  );

  useEffect(() => {
    if (!isModalOpen || !pendingStart) return;
    if (!gameWrapperRef.current || gameSize.width === 0 || gameSize.height === 0) return;
    const initialBlocks = spawnBlockPairs();
    setBlocks(initialBlocks || []);
    setPendingStart(false);
  }, [gameSize.width, gameSize.height, isModalOpen, pendingStart, spawnBlockPairs]);

  useEffect(() => {
    if (!isModalOpen || !isMusicOn) {
      stopMusic();
      return;
    }
    if (status === "running") {
      startMusic();
    }
  }, [isModalOpen, isMusicOn, startMusic, status, stopMusic]);

  useEffect(() => stopMusic, [stopMusic]);

  useEffect(() => {
    if (status !== "running") return;
    if (bombCharge < 100) return;
    const newBomb = spawnBombBlock();
    if (!newBomb) return;
    setBlocks(prev => {
      if (prev.some((b) => b.x === newBomb.x && b.y < BLOCK_HEIGHT)) {
        return prev;
      }
      return [...prev, newBomb];
    });
    setBombCharge((c) => Math.max(0, c - 100));
  }, [bombCharge, spawnBombBlock, status]);

  return (
    <div className="collapse-game">
      <div className="collapse-launcher">
        <div className="collapse-launcher-text">
          <h3>WordCollaps</h3>
          <p className="muted small">{t('games.wordCollapseHint', 'Игра откроется во всплывающем окне — соединяйте норвежские и переводные блоки.')}</p>
        </div>
        <div className="game-buttons">
            <button className="start-btn" onClick={handleStart} disabled={isModalOpen || isSettingsOpen}>{t("games.settings", "Настройки")}</button>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="collapse-game-modal" role="dialog" aria-modal="true">
          <div className="collapse-modal-backdrop" />
          <div className="collapse-modal-window settings-window">
            <div className="settings-header">
              <div>
                <p className="eyebrow">{t("games.settings", "Настройки")}</p>
                <h3>{t("games.settingsHint", "Выберите источники слов и сложность перед стартом.")}</h3>
              </div>
              <button className="close-btn dark" onClick={beginGame} aria-label={t('games.start', 'Start')}>×</button>
            </div>
            <div className="settings-grid">
              <div className="settings-card">
                <div className="settings-card__title">
                  <span className="eyebrow">{t("games.wordSources", "Выбор слов")}</span>
                  <span className="muted tiny">{t("games.sourceHint", "Можно выбрать сразу несколько источников")}</span>
                </div>
                <div className="settings-list">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={useGlossary}
                      onChange={(e) => setUseGlossary(e.target.checked)}
                    />
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
                        <span>{t(opt.label, opt.value)}</span>
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
                  <span className="eyebrow">{t("games.difficulty", "Сложность")}</span>
                  <span className="muted tiny">{t("games.difficultyHint", "Подберите комфортный темп игры")}</span>
                </div>
                <div className="settings-list compact">
                  {settingsControls("modal-settings")}
                </div>
                <div className="settings-actions">
                  <button className="start-btn big" onClick={beginGame}>{t("games.start")}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="collapse-game-modal" role="dialog" aria-modal="true">
          <div className="collapse-modal-backdrop" />
          <div className="collapse-modal-window">
            <div className="collapse-game-header">
              <div className="collapse-modal-title">
                <h3>WordCollaps</h3>
                <div className="collapse-game-scores">
                    <span className="score correct">{t("games.correct", "Correct")}: {score}</span>
                    <span className="score incorrect">{t("games.incorrect", "Incorrect")}: {incorrectScore}</span>
                    {comboCount > 1 && <span className="score combo-couter">Combo: x{comboCount}</span>}
                </div>
              </div>
              <div className="game-buttons">
                  <button className="ghost-btn" onClick={() => setIsMusicOn((v) => !v)}>
                    {isMusicOn ? t('games.musicOn', 'Музыка: вкл') : t('games.musicOff', 'Музыка: выкл')}
                  </button>
                  {status !== "running" && <button className="start-btn" onClick={handleStart}>{status === 'game-over' ? t('restart') : t("games.start")}</button>}
                  {status === "running" && <button className="stop-btn" onClick={handleStop}>{t("games.stop")}</button>}
                  <button className="close-btn" onClick={handleCloseModal} aria-label={t('close', 'Close')}>×</button>
              </div>
            </div>

            {status === 'game-over' && <div className="game-over-message">
                <h4>{t('games.gameOver', "Game Over")}</h4>
                <p>{t('games.finalScore', "Final Score")}: {score}</p>
                <p>{t('games.incorrectCount', "Mistakes")}: {incorrectScore}</p>
            </div>}

            {status !== "running" && settingsControls("modal-settings")}

            <div className="collapse-game-frame" ref={gameWrapperRef}>
              <div className="collapse-game-area" style={{ width: gameSize.width ? `${gameSize.width}px` : "100%", height: `${gameSize.height}px`, background: gameBackground, transition: 'background 2s linear' }}>
                {isFrozen && <div className="frozen-overlay" />}
                {showComboAnimation && (
                    <div className="combo-animation">
                        COMBO x{showComboAnimation}!
                    </div>
                )}
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className={`collapse-block ${selectedBlockId === block.id ? "selected" : ""} ${block.isMatched ? "matched" : ""} ${block.isWrong ? "wrong" : ""} ${block.role} ${block.bonusType || ''}`}
                    style={{ left: `${block.x}px`, top: `${block.y}px`, width: `${gameSize.blockWidth}px`, height: `${BLOCK_HEIGHT}px` }}
                    onClick={() => handleBlockClick(block.id)}
                  >
                    {block.text}
                    <i></i><i></i><i></i><i></i><i></i><i></i>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
       <style>{`
        :root {
          --game-bg: #f0f4f8; --block-bg-nor: #ffffff; --block-border-nor: #c2d1e0; --block-bg-tr: #e6f7ff; --block-border-tr: #91d5ff; --selected-bg: #e8fff0; --selected-border: #34d399; --selected-color: #065f46; --wrong-bg: #ffe5e5; --wrong-border: #f87171; --correct-color: #52c41a; --incorrect-color: #f5222d; --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
        }
        .collapse-game { font-family: var(--font-family); }
        .collapse-launcher { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
        .collapse-launcher-text { display: flex; flex-direction: column; gap: 0.25rem; }
        .collapse-game-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
        .collapse-game-scores { display: flex; gap: 1rem; font-weight: 500; order: 1; width: 100%; flex-wrap: wrap; }
        .game-settings { display: flex; gap: 1rem; align-items: center; order: 2; flex-grow: 1; flex-wrap: wrap; }
        .game-settings.modal-settings { padding: 0.5rem 0 1rem; }
        .game-buttons { order: 3; display: flex; gap: 0.5rem; align-items: center; }
        .source-select { position: relative; }
        .source-select > button { min-width: 140px; }
        .settings-window { color: #0f172a; }
        .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.2rem; margin-top: 1rem; align-items: start; }
        .settings-card {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1rem;
          background: linear-gradient(155deg, #ffffff 0%, #f8fafc 100%);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 10px 35px rgba(15, 23, 42, 0.08);
        }
        .settings-card.difficulty { background: linear-gradient(170deg, #ffffff 0%, #f0f4ff 100%); }
        .settings-card__title { display: flex; flex-direction: column; gap: 0.15rem; }
        .settings-list { display: grid; gap: 0.5rem; }
        .settings-list.compact .game-settings { padding: 0; gap: 0.6rem; }
        .settings-actions { display: flex; justify-content: flex-end; margin-top: auto; }
        .settings-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        .settings-header .eyebrow { color: #3b82f6; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; margin: 0; }
        .settings-header h3 { margin: 0.1rem 0 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
        .eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: #64748b; }
        .muted.tiny { font-size: 0.85rem; color: #475569; }
        .game-settings.modal-settings { padding: 0; gap: 0.6rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        .settings-window .checkbox-row span { color: #0f172a; }
        .settings-window .muted.small { color: #475569; }
        .settings-window .divider { background: #e2e8f0; margin: 0.35rem 0; }
        .settings-window .parts-grid { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
        .settings-window .close-btn.dark { background: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0; width: 42px; height: 42px; position: static; box-shadow: none; }
        .settings-window .game-settings label { flex-direction: column; align-items: flex-start; color: #0f172a; }
        .settings-window select { width: 100%; padding: 0.55rem 0.65rem; border-radius: 12px; border: 1px solid #d7dce3; background: #ffffff; color: #0f172a; }
        .settings-window select option { color: #0f172a; }
        .settings-card.difficulty .settings-list { gap: 0.75rem; }
        .collapse-modal-window.settings-window { height: auto; max-height: 92vh; overflow-y: auto; }
        .start-btn.big { min-width: 160px; }
        .checkbox-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.65rem; border-radius: 12px; border: 1px solid transparent; transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease; }
        .checkbox-row:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); transform: translateY(-1px); }
        .checkbox-row input { width: 18px; height: 18px; accent-color: #5bd5ff; }
        .checkbox-row span { font-weight: 600; letter-spacing: 0.01em; }
        .score.correct { color: var(--correct-color); }
        .score.incorrect { color: var(--incorrect-color); }
        .score.combo-couter { color: #ff7a45; font-weight: bold; }
        .game-settings label { display: flex; align-items: center; gap: 0.5rem; }
        .game-buttons button { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .start-btn { background-color: #1890ff; color: white; }
        .stop-btn { background-color: #ff4d4f; color: white; }
        .ghost-btn { background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a; }
        .close-btn { background: #0f172a; color: #fff; border: none; border-radius: 50%; width: 36px; height: 36px; font-size: 20px; cursor: pointer; position: absolute; top: 10px; right: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; }
        .collapse-game-modal { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .collapse-modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); }
        .collapse-modal-window { position: relative; background: #ffffff; border-radius: 16px; padding: 1.25rem; max-width: 1100px; width: 96vw; max-height: 95vh; height: 92vh; box-shadow: 0 20px 60px rgba(0,0,0,0.2); z-index: 1; display: flex; flex-direction: column; overflow: hidden; }
        .collapse-modal-window.settings-window {
          max-width: 960px;
          width: min(94vw, 980px);
          padding: 1.75rem;
          height: auto;
          max-height: 90vh;
          overflow-y: auto;
          background: linear-gradient(135deg, #f8fbff 0%, #f1f5f9 60%, #eef2ff 100%);
          color: #0f172a;
          border-radius: 22px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
        }
        .collapse-modal-title h3 { margin: 0; }
        .collapse-game-frame { width: 100%; margin-top: 0.5rem; flex: 1; min-height: 65vh; max-height: calc(95vh - 160px); }
        .game-over-message { text-align: center; padding: 2rem; background-color: #fff1f0; border: 1px solid var(--incorrect-color); border-radius: 8px; margin-top: 1rem; }
        .collapse-game-area {
          position: relative; border: 1px solid #d9d9d9; overflow: hidden; margin-top: 1rem; border-radius: 8px;
        }
        .combo-animation {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          font-size: 4rem;
          font-weight: 900;
          color: #ff9f1c;
          text-shadow: 3px 3px 0px #e71d36;
          -webkit-text-stroke: 1px #272727;
          animation: combo-pop 1.5s ease-out forwards;
          z-index: 100;
        }
        .frozen-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(173, 216, 230, 0.5);
          z-index: 50;
          pointer-events: none;
          animation: pulse-freeze 2s infinite;
        }
        .collapse-block {
          position: absolute; display: flex; align-items: center; justify-content: center; font-size: 14px; text-align: center; padding: 2px; box-sizing: border-box; cursor: pointer; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: top 0.1s linear, left 0.1s linear, background-color 0.2s, border-color 0.2s; animation: fall-in 0.3s ease-out;
        }
        .collapse-block.bonus.freeze { background-color: #a0e9ff; border: 2px solid #74d9ff; font-size: 24px; }
        .collapse-block.bonus.bomb { background-color: #ffe0b3; border: 2px solid #ff9900; font-size: 22px; }
        .collapse-block i { position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; border-radius: 50%; opacity: 0; }
        .collapse-block.nor { background-color: var(--block-bg-nor); border: 2px solid var(--block-border-nor); }
        .collapse-block.tr { background-color: var(--block-bg-tr); border: 2px solid var(--block-border-tr); }
        .collapse-block.nor.matched i { background: var(--block-border-nor); }
        .collapse-block.tr.matched i { background: var(--block-border-tr); }
        .collapse-block.selected { border-color: var(--selected-border); background-color: var(--selected-bg); color: var(--selected-color); }
        .collapse-block.matched { background: transparent !important; border-color: transparent !important; color: transparent !important; box-shadow: none !important; }
        .collapse-block.matched i:nth-child(1) { animation: shatter-1 5s forwards; }
        .collapse-block.matched i:nth-child(2) { animation: shatter-2 5s forwards; }
        .collapse-block.matched i:nth-child(3) { animation: shatter-3 5s forwards; }
        .collapse-block.matched i:nth-child(4) { animation: shatter-4 5s forwards; }
        .collapse-block.matched i:nth-child(5) { animation: shatter-5 5s forwards; }
        .collapse-block.matched i:nth-child(6) { animation: shatter-6 5s forwards; }
        .collapse-block.wrong { animation: wrong-match-shake 0.4s; background-color: var(--wrong-bg); border-color: var(--wrong-border); }

        @media (max-width: 768px) {
            .collapse-game-header { flex-direction: column; align-items: stretch; gap: 0.75rem; }
            .collapse-game-scores { order: 1; }
            .game-settings { order: 2; flex-direction: column; align-items: stretch; width: 100%; }
            .game-settings label { display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem; padding: 0.25rem 0; }
            .game-settings select { min-width: 100%; padding: 0.5rem; }
            .game-buttons { order: 3; display: flex; justify-content: center; margin-top: 0.75rem; }
            .collapse-modal-window { padding: 1rem; width: 96vw; height: 90vh; }
            .collapse-modal-window.settings-window { width: calc(100% - 1.2rem); max-height: 92vh; padding: 1.2rem; border-radius: 18px; }
            .settings-header { flex-direction: column; align-items: flex-start; gap: 0.4rem; }
            .settings-grid { grid-template-columns: 1fr; }
            .settings-card { padding: 0.9rem; }
            .parts-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
            .start-btn.big { width: 100%; }
            .collapse-block { font-size: 12px; }
        }

        @keyframes fall-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes wrong-match-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 50% { transform: translateX(5px); } 75% { transform: translateX(-5px); } }
        @keyframes combo-pop {
          0% { transform: translate(-50%, -50%) scale(0.5) rotate(-15deg); opacity: 0; }
          40% { transform: translate(-50%, -50%) scale(1.2) rotate(5deg); opacity: 1; }
          60% { transform: translate(-50%, -50%) scale(1.1) rotate(-2deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2) rotate(10deg); opacity: 0; }
        }
        @keyframes pulse-freeze {
            0% { opacity: 0.5; }
            50% { opacity: 0.8; }
            100% { opacity: 0.5; }
        }
        @keyframes shatter-1 { 0% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-100px, -50px) scale(0); } }
        @keyframes shatter-2 { 0% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(100px, -80px) scale(0); } }
        @keyframes shatter-3 { 0% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-60px, 80px) scale(0); } }
        @keyframes shatter-4 { 0% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(40px, 100px) scale(0); } }
        @keyframes shatter-5 { 0% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-120px, 10px) scale(0); } }
        @keyframes shatter-6 { 0% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(120px, -20px) scale(0); } }
      `}</style>
    </div>
  );
};

export default WordCollapseGame;
