import React, { useCallback, useEffect, useState, useLayoutEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { GlossaryTerm, Level, Stream } from "../../types";
import { getNorwegianForTerm, pickTranslationForTower } from "../../utils/terms";

// --- Types ---
type Props = {
  stream: Stream;
  currentLevel: Level;
  playableTerms: GlossaryTerm[];
};

type GameStatus = "pre-game" | "running" | "game-over";
type SpawnSpeed = 1500 | 2500 | 4000 | 6000 | 8000 | 10000 | 12000;

const BLOCK_HEIGHT = 40;
const GRAVITY = 2;

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
const WordCollapseGame: React.FC<Props> = ({ stream, playableTerms }) => {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<GameStatus>("pre-game");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [incorrectScore, setIncorrectScore] = useState(0);
  const [isInitialPhase, setIsInitialPhase] = useState(true);
  const [comboCount, setComboCount] = useState(0);
  const [showComboAnimation, setShowComboAnimation] = useState<number | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);

  // --- Game Settings ---
  const [pairCount, setPairCount] = useState(3);
  const [spawnSpeed, setSpawnSpeed] = useState<SpawnSpeed>(6000);

  // --- Responsive Sizing ---
  const gameWrapperRef = useRef<HTMLDivElement>(null);
  const [gameSize, setGameSize] = useState<GameSize>({ width: 0, height: 0, cols: 8, blockWidth: 120 });

  useLayoutEffect(() => {
    const updateSize = () => {
      if (gameWrapperRef.current) {
        const parentWidth = gameWrapperRef.current.offsetWidth;
        const minBlockWidth = 80;
        let cols = Math.floor(parentWidth / minBlockWidth);
        if (cols > 10) cols = 10;
        if (cols < 4) cols = 4;
        const blockWidth = parentWidth / cols;
        setGameSize({
          width: parentWidth,
          height: 12 * BLOCK_HEIGHT,
          cols: cols,
          blockWidth: blockWidth,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const gameBackground = useMemo(() => {
    if (score >= 30) {
      return 'linear-gradient(to bottom, #0d1b2a, #1b263b)'; // Night
    }
    if (score >= 20) {
        return 'linear-gradient(to bottom, #4a0e4e, #8c1a6a, #d8315b)'; // Sunset
    }
    if (score >= 10) {
        return 'linear-gradient(to bottom, #87ceeb, #add8e6)'; // Noon
    }
    return 'linear-gradient(to bottom, #e6f7ff, #f0f4f8)'; // Morning
  }, [score]);

  const spawnBlockPairs = useCallback(() => {
    if (playableTerms.length < pairCount || gameSize.cols < 2) return null;

    const newBlocks: Block[] = [];
    const shuffledTerms = [...playableTerms].sort(() => 0.5 - Math.random());
    const selectedTerms = shuffledTerms.slice(0, pairCount);

    for (const term of selectedTerms) {
        const norwegian = getNorwegianForTerm(term, stream);
        const translation = pickTranslationForTower(term, i18n);

        if (!norwegian || !translation) continue;

        const col1 = Math.floor(Math.random() * gameSize.cols);
        let col2 = Math.floor(Math.random() * gameSize.cols);
        if(gameSize.cols > 1) {
            while (col2 === col1) {
                col2 = Math.floor(Math.random() * gameSize.cols);
            }
        }

        const x1 = col1 * gameSize.blockWidth;
        const x2 = col2 * gameSize.blockWidth;
        const y1 = -BLOCK_HEIGHT * (Math.random() * pairCount * 1.5);
        const y2 = -BLOCK_HEIGHT * (Math.random() * pairCount * 1.5);

        newBlocks.push({ id: `block-${term.id}-nor-${Date.now()}-${Math.random()}`, termId: term.id, role: 'nor', text: norwegian, x: x1, y: y1, vy: 0, isFalling: true });
        newBlocks.push({ id: `block-${term.id}-tr-${Date.now()}-${Math.random()}`, termId: term.id, role: 'tr', text: translation, x: x2, y: y2, vy: 0, isFalling: true });
    }
    return newBlocks;
  }, [playableTerms, stream, i18n, pairCount, gameSize]);

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
            setTimeout(() => setIsFrozen(false), 3000);
        }
        setBlocks(prev => prev.filter(b => b.id !== blockId));
        setSelectedBlockId(null);
        return;
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

    if (selectedBlock.termId === clickedBlock.termId && selectedBlock.role !== clickedBlock.role) {
      const newCombo = comboCount + 1;
      setComboCount(newCombo);
      let basePoints = 1;
      let bonusPoints = 0;
      if (newCombo >= 3) {
          bonusPoints = newCombo;
          setShowComboAnimation(newCombo);
          setTimeout(() => setShowComboAnimation(null), 1500);
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

  const handleStart = () => {
    setScore(0); setIncorrectScore(0); setSelectedBlockId(null); setComboCount(0);
    const initialBlocks = spawnBlockPairs();
    setBlocks(initialBlocks || []);
    setIsInitialPhase(true);
    setStatus("running");
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

  return (
    <div className="collapse-game" ref={gameWrapperRef}>
      <div className="collapse-game-header">
        <h3>WordCollaps</h3>
        <div className="collapse-game-scores">
            <span className="score correct">{t("games.correct", "Correct")}: {score}</span>
            <span className="score incorrect">{t("games.incorrect", "Incorrect")}: {incorrectScore}</span>
            {comboCount > 1 && <span className="score combo-couter">Combo: x{comboCount}</span>}
        </div>
        {status !== "running" && (
            <div className="game-settings">
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
        )}
        <div className="game-buttons">
            {status !== "running" && <button className="start-btn" onClick={handleStart}>{status === 'game-over' ? t('restart') : t("games.start")}</button>}
            {status === "running" && <button className="stop-btn" onClick={() => setStatus("pre-game")}>{t("games.stop")}</button>}
        </div>
      </div>

      {status === 'game-over' && <div className="game-over-message">
          <h4>{t('games.gameOver', "Game Over")}</h4>
          <p>{t('games.finalScore', "Final Score")}: {score}</p>
          <p>{t('games.incorrectCount', "Mistakes")}: {incorrectScore}</p>
      </div>}

      {gameSize.width > 0 && <div className="collapse-game-area" style={{ width: `${gameSize.width}px`, height: `${gameSize.height}px`, background: gameBackground, transition: 'background 2s linear' }}>
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
      </div>}
       <style>{`
        :root {
          --game-bg: #f0f4f8; --block-bg-nor: #ffffff; --block-border-nor: #c2d1e0; --block-bg-tr: #e6f7ff; --block-border-tr: #91d5ff; --selected-bg: #fffbe6; --selected-border: #ffd666; --correct-color: #52c41a; --incorrect-color: #f5222d; --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
        }
        .collapse-game { font-family: var(--font-family); }
        .collapse-game-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
        .collapse-game-scores { display: flex; gap: 1rem; font-weight: 500; order: 1; width: 100%; }
        .game-settings { display: flex; gap: 1rem; align-items: center; order: 2; flex-grow: 1; }
        .game-buttons { order: 3; }
        .score.correct { color: var(--correct-color); }
        .score.incorrect { color: var(--incorrect-color); }
        .score.combo-couter { color: #ff7a45; font-weight: bold; }
        .game-settings label { display: flex; align-items: center; gap: 0.5rem; }
        .game-buttons button { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .start-btn { background-color: #1890ff; color: white; }
        .stop-btn { background-color: #ff4d4f; color: white; }
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
        .collapse-block.bonus.freeze {
          background-color: #a0e9ff;
          border: 2px solid #74d9ff;
          font-size: 24px;
        }
        .collapse-block i { position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; border-radius: 50%; opacity: 0; }
        .collapse-block.nor { background-color: var(--block-bg-nor); border: 2px solid var(--block-border-nor); }
        .collapse-block.tr { background-color: var(--block-bg-tr); border: 2px solid var(--block-border-tr); }
        .collapse-block.nor.matched i { background: var(--block-border-nor); }
        .collapse-block.tr.matched i { background: var(--block-border-tr); }
        .collapse-block.selected { border-color: var(--selected-border); background-color: var(--selected-bg); }
        .collapse-block.matched { background: transparent !important; border-color: transparent !important; color: transparent !important; box-shadow: none !important; }
        .collapse-block.matched i:nth-child(1) { animation: shatter-1 5s forwards; }
        .collapse-block.matched i:nth-child(2) { animation: shatter-2 5s forwards; }
        .collapse-block.matched i:nth-child(3) { animation: shatter-3 5s forwards; }
        .collapse-block.matched i:nth-child(4) { animation: shatter-4 5s forwards; }
        .collapse-block.matched i:nth-child(5) { animation: shatter-5 5s forwards; }
        .collapse-block.matched i:nth-child(6) { animation: shatter-6 5s forwards; }
        .collapse-block.wrong { animation: wrong-match-shake 0.4s; }

        @media (max-width: 768px) {
            .collapse-game-header { flex-direction: column; align-items: stretch; }
            .collapse-game-scores { order: 1; }
            .game-settings { order: 2; flex-direction: column; align-items: stretch; width: 100%; }
            .game-settings label { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; }
            .game-settings select { min-width: 150px; padding: 4px; }
            .game-buttons { order: 3; display: flex; justify-content: center; margin-top: 1rem; }
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
