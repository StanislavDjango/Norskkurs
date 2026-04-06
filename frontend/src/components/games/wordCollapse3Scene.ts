import Phaser from "phaser";

import { sampleWithoutReplacement } from "./wordCollapseShared";
import type { SpawnPair } from "./wordCollapseShared";

type LaneRole = "left" | "right";
type SceneStatus = "idle" | "running" | "paused" | "game-over";
type BonusType = "bomb" | "freeze";

export type WordCollapse3Hud = {
  status: SceneStatus;
  lives: number;
  score: number;
  incorrect: number;
  combo: number;
  bombCharge: number;
  isFrozen: boolean;
  leftLabel: string;
  rightLabel: string;
  canUseBomb: boolean;
  poolSize: number;
};

export type WordCollapse3SceneConfig = {
  spawnPool: SpawnPair[];
  leftLabel: string;
  rightLabel: string;
  laneOriginalLabel: string;
  laneTranslationLabel: string;
  isMobile: boolean;
  speedMultiplier: number;
  maxLives: number;
  onHudChange: (hud: WordCollapse3Hud) => void;
};

type CardState = {
  id: string;
  termKey: string;
  role: LaneRole;
  text: string;
  column: number;
  y: number;
  targetY?: number;
  isFalling: boolean;
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Graphics;
  panel: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  selected: boolean;
  wrong: boolean;
};

type BonusState = {
  id: string;
  type: BonusType;
  x: number;
  y: number;
  speed: number;
  trailAccumulator: number;
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Graphics;
  panel: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
};

const DESKTOP_BOARD_WIDTH = 1080;
const DESKTOP_BOARD_HEIGHT = 690;
const MOBILE_BOARD_WIDTH = 640;
const MOBILE_BOARD_HEIGHT = 900;
const BOARD_PADDING_X = 36;
const BOARD_PADDING_BOTTOM = 14;
const DESKTOP_BOARD_PADDING_TOP = 54;
const MOBILE_BOARD_PADDING_TOP = 54;
const DESKTOP_LANE_GAP = 12;
const MOBILE_LANE_GAP = 10;
const DESKTOP_COLS_PER_SIDE = 5;
const MOBILE_COLS_PER_SIDE = 4;
const DESKTOP_CARD_HEIGHT = 42;
const MOBILE_CARD_HEIGHT = 44;
const DESKTOP_CARD_GAP_Y = 4;
const MOBILE_CARD_GAP_Y = 4;
const DESKTOP_WAVE_SIZE = 4;
const MOBILE_WAVE_SIZE = 3;
const DESKTOP_WAVE_DELAY_MS = 1600;
const MOBILE_WAVE_DELAY_MS = 1950;
const DESKTOP_FALL_SPEED = 210;
const MOBILE_FALL_SPEED = 170;
const FREEZE_DURATION_MS = 5000;
const DIAGNOSTIC_PLAIN_BOARD = true;
const ROLE_COLORS = {
  left: 0x2ea9ff,
  right: 0xff9b2f,
};

const ROLE_ACCENTS = {
  left: 0xe3f7ff,
  right: 0xffe6c8,
};

const getFontSize = (text: string, isMobile: boolean) => {
  if (text.length >= 26) return isMobile ? 11 : 11;
  if (text.length >= 18) return isMobile ? 12 : 12;
  return isMobile ? 13 : 13;
};

export class WordCollapse3Scene extends Phaser.Scene {
  private readonly sceneConfig: WordCollapse3SceneConfig;
  private readonly cardById = new Map<string, CardState>();
  private readonly bonusById = new Map<string, BonusState>();
  private readonly columns: { left: string[][]; right: string[][] };

  private boardFrame?: Phaser.GameObjects.Graphics;
  private freezeOverlay?: Phaser.GameObjects.Graphics;
  private selectedCardId: string | null = null;
  private spawnAccumulatorMs = 0;
  private idCounter = 0;
  private freezeUntil = 0;
  private hud: WordCollapse3Hud;

  constructor(config: WordCollapse3SceneConfig) {
    super("wordcollapse3-scene");
    this.sceneConfig = config;
    this.columns = {
      left: Array.from({ length: this.colsPerSide }, () => [] as string[]),
      right: Array.from({ length: this.colsPerSide }, () => [] as string[]),
    };
    this.hud = {
      status: "idle",
      lives: config.maxLives,
      score: 0,
      incorrect: 0,
      combo: 0,
      bombCharge: 0,
      isFrozen: false,
      leftLabel: config.leftLabel,
      rightLabel: config.rightLabel,
      canUseBomb: false,
      poolSize: config.spawnPool.length,
    };
  }

  private get boardWidth() {
    return this.sceneConfig.isMobile ? MOBILE_BOARD_WIDTH : DESKTOP_BOARD_WIDTH;
  }

  private get boardHeight() {
    return this.sceneConfig.isMobile ? MOBILE_BOARD_HEIGHT : DESKTOP_BOARD_HEIGHT;
  }

  private get boardPaddingTop() {
    return this.sceneConfig.isMobile ? MOBILE_BOARD_PADDING_TOP : DESKTOP_BOARD_PADDING_TOP;
  }

  private get laneGap() {
    return this.sceneConfig.isMobile ? MOBILE_LANE_GAP : DESKTOP_LANE_GAP;
  }

  private get colsPerSide() {
    return this.sceneConfig.isMobile ? MOBILE_COLS_PER_SIDE : DESKTOP_COLS_PER_SIDE;
  }

  private get cardHeight() {
    return this.sceneConfig.isMobile ? MOBILE_CARD_HEIGHT : DESKTOP_CARD_HEIGHT;
  }

  private get cardGapY() {
    return this.sceneConfig.isMobile ? MOBILE_CARD_GAP_Y : DESKTOP_CARD_GAP_Y;
  }

  private get waveSize() {
    return this.sceneConfig.isMobile ? MOBILE_WAVE_SIZE : DESKTOP_WAVE_SIZE;
  }

  private get waveDelayMs() {
    const base = this.sceneConfig.isMobile ? MOBILE_WAVE_DELAY_MS : DESKTOP_WAVE_DELAY_MS;
    return base / this.sceneConfig.speedMultiplier;
  }

  private get fallSpeedPxPerSec() {
    const base = this.sceneConfig.isMobile ? MOBILE_FALL_SPEED : DESKTOP_FALL_SPEED;
    return base * this.sceneConfig.speedMultiplier;
  }

  preload() {
    // Intentionally empty: the board art now uses pure scene graphics.
    // This avoids Canvas renderer masking artifacts on some devices/browsers.
  }

  create() {
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
    this.drawBoard();
    this.sceneConfig.onHudChange(this.hud);
    this.time.delayedCall(0, () => {
      if (this.hud.status === "idle") this.startRound();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  update(_time: number, delta: number) {
    if (this.hud.status !== "running") return;
    this.updateFreezeState();
    if (this.hud.isFrozen) return;
    this.updateBonuses(delta);
    this.spawnAccumulatorMs += delta;
    while (this.spawnAccumulatorMs >= this.waveDelayMs) {
      this.spawnAccumulatorMs -= this.waveDelayMs;
      this.spawnWave();
    }
    this.updateFallingCards(delta);
  }

  startRound() {
    this.clearRound();
    this.spawnAccumulatorMs = 0;
    this.hud = {
      ...this.hud,
      status: "running",
      lives: this.sceneConfig.maxLives,
      score: 0,
      incorrect: 0,
      combo: 0,
      bombCharge: 0,
      isFrozen: false,
      canUseBomb: false,
    };
    this.freezeUntil = 0;
    this.updateFreezeOverlay();
    this.emitHud();
    this.spawnWave();
  }

  restartRound() {
    this.startRound();
  }

  togglePause() {
    if (this.hud.status === "running") {
      this.hud = { ...this.hud, status: "paused" };
      this.tweens.pauseAll();
      this.emitHud();
      return;
    }

    if (this.hud.status === "paused") {
      this.hud = { ...this.hud, status: "running" };
      this.tweens.resumeAll();
      this.emitHud();
    }
  }

  triggerBomb() {
    if (!this.hud.canUseBomb || this.hud.status !== "running") return;
    this.activateBombPower();
  }

  destroyScene() {
    this.teardown();
  }

  setSpeedMultiplier(nextMultiplier: number) {
    this.sceneConfig.speedMultiplier = Phaser.Math.Clamp(nextMultiplier, 0.25, 2);
  }

  private emitHud() {
    this.sceneConfig.onHudChange(this.hud);
  }

  private teardown() {
    this.tweens.killAll();
    this.clearRound();
  }

  private clearRound() {
    this.selectedCardId = null;
    this.spawnAccumulatorMs = 0;
    this.cardById.forEach((card) => card.container.destroy());
    this.bonusById.forEach((bonus) => bonus.container.destroy());
    this.cardById.clear();
    this.bonusById.clear();
    this.columns.left.forEach((column) => column.splice(0, column.length));
    this.columns.right.forEach((column) => column.splice(0, column.length));
  }

  private drawBoard() {
    this.boardFrame?.destroy();
    const g = this.add.graphics();
    this.boardFrame = g;

    g.fillStyle(0x02050b, 0.2);
    g.fillRect(0, 0, this.boardWidth, this.boardHeight);

    const laneWidth = this.getLaneWidth();
    const boardTop = this.boardPaddingTop;
    const boardHeight = this.boardHeight - this.boardPaddingTop - BOARD_PADDING_BOTTOM;
    const centerX = this.boardWidth / 2;
    const leftX = BOARD_PADDING_X;
    const rightX = centerX + this.laneGap / 2;
    const boardBottom = boardTop + boardHeight;

    if (DIAGNOSTIC_PLAIN_BOARD) {
      g.fillStyle(0x05070d, 0.46);
      g.fillRect(leftX, boardTop, laneWidth, boardHeight);
      g.fillStyle(0x100804, 0.46);
      g.fillRect(rightX, boardTop, laneWidth, boardHeight);

      g.fillStyle(0x000000, 0.16);
      g.fillRect(leftX, boardTop, laneWidth, 72);
      g.fillRect(rightX, boardTop, laneWidth, 72);

      g.lineStyle(1, ROLE_COLORS.left, 0.18);
      g.beginPath();
      g.moveTo(leftX + laneWidth, boardTop);
      g.lineTo(leftX + laneWidth, boardBottom);
      g.strokePath();
      g.lineStyle(1, ROLE_COLORS.right, 0.18);
      g.beginPath();
      g.moveTo(rightX, boardTop);
      g.lineTo(rightX, boardBottom);
      g.strokePath();

      g.fillStyle(0xffffff, 0.08);
      g.fillRect(centerX, boardTop, 1, boardHeight);

      this.freezeOverlay?.destroy();
      const freezeOverlay = this.add.graphics();
      freezeOverlay.fillStyle(0x1b3654, 0.22);
      freezeOverlay.fillRect(0, 0, this.boardWidth, this.boardHeight);
      freezeOverlay.setDepth(40);
      freezeOverlay.setVisible(false);
      this.freezeOverlay = freezeOverlay;
      return;
    }

    g.fillStyle(0x081120, 0.98);
    g.fillRoundedRect(leftX, boardTop, laneWidth, boardHeight, 22);
    g.fillStyle(0x241005, 0.98);
    g.fillRoundedRect(rightX, boardTop, laneWidth, boardHeight, 22);
    g.fillStyle(0x050c16, 1);
    g.fillRoundedRect(leftX + 4, boardTop + 72, laneWidth - 8, boardHeight - 76, 20);
    g.fillStyle(0x170903, 1);
    g.fillRoundedRect(rightX + 4, boardTop + 72, laneWidth - 8, boardHeight - 76, 20);
    g.fillStyle(0x02060d, 0.98);
    g.fillRoundedRect(centerX - 118, boardTop + 32, 236, boardHeight - 36, 999);
    this.drawLaneShard(g, leftX, boardTop, laneWidth, boardHeight, "left");
    this.drawLaneShard(g, rightX, boardTop, laneWidth, boardHeight, "right");
    this.drawLaneGlow(g, leftX, boardTop, laneWidth, boardHeight, 0x58bfff, "left");
    this.drawLaneGlow(g, rightX, boardTop, laneWidth, boardHeight, 0xffa34f, "right");
    this.drawRift(g, centerX, boardTop, boardBottom);

    g.lineStyle(2, 0xe7f2ff, 0.14);
    g.strokeRoundedRect(1, 1, this.boardWidth - 2, this.boardHeight - 2, 28);
    g.lineStyle(2, 0xffffff, 0.16);
    g.strokeRoundedRect(leftX, boardTop, laneWidth, boardHeight, 22);
    g.strokeRoundedRect(rightX, boardTop, laneWidth, boardHeight, 22);

    this.freezeOverlay?.destroy();
    const freezeOverlay = this.add.graphics();
    freezeOverlay.fillStyle(0xb8ecff, 0.1);
    freezeOverlay.fillRoundedRect(0, 0, this.boardWidth, this.boardHeight, 28);
    freezeOverlay.setDepth(40);
    freezeOverlay.setVisible(false);
    this.freezeOverlay = freezeOverlay;
  }

  private drawLaneShard(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    side: "left" | "right",
  ) {
    const fill = side === "left" ? 0x3e94ea : 0xff8a2d;
    const stroke = side === "left" ? 0x7ddcff : 0xffc27c;
    const topInset = 84;
    const bottomInset = 84;

    g.fillStyle(fill, 0.12);
    g.lineStyle(2, stroke, 0.18);
    g.beginPath();
    if (side === "left") {
      g.moveTo(x + 6, y + topInset);
      g.lineTo(x + width * 0.48, y + topInset);
      g.lineTo(x + width * 0.2, y + height * 0.5);
      g.lineTo(x + width * 0.48, y + height - bottomInset);
      g.lineTo(x + 6, y + height - bottomInset);
    } else {
      g.moveTo(x + width - 6, y + topInset);
      g.lineTo(x + width * 0.52, y + topInset);
      g.lineTo(x + width * 0.8, y + height * 0.5);
      g.lineTo(x + width * 0.52, y + height - bottomInset);
      g.lineTo(x + width - 6, y + height - bottomInset);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  private drawLaneGlow(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    glowColor: number,
    side: "left" | "right",
  ) {
    const orbX = side === "left" ? x + width * 0.16 : x + width * 0.84;
    const orbY = y + height * 0.22;
    g.fillStyle(glowColor, 0.05);
    g.fillCircle(orbX, orbY, this.sceneConfig.isMobile ? 92 : 128);
    g.fillStyle(glowColor, 0.03);
    g.fillCircle(orbX + (side === "left" ? 40 : -40), orbY + 44, this.sceneConfig.isMobile ? 130 : 176);
    g.fillStyle(0xffffff, 0.04);
    g.fillRoundedRect(x + 10, y + 10, width - 20, 22, 999);
  }

  private drawRift(
    g: Phaser.GameObjects.Graphics,
    centerX: number,
    boardTop: number,
    boardBottom: number,
  ) {
    const midY = (boardTop + boardBottom) / 2;
    g.fillStyle(0xffffff, 0.68);
    g.fillRoundedRect(centerX - 2, boardTop + 10, 4, boardBottom - boardTop - 20, 999);
    g.fillStyle(0x9fe0ff, 0.14);
    g.fillRoundedRect(centerX - 7, boardTop + 20, 14, boardBottom - boardTop - 40, 999);
    g.fillStyle(0xffcb8f, 0.1);
    g.fillRoundedRect(centerX - 12, boardTop + 42, 24, boardBottom - boardTop - 84, 999);

    g.lineStyle(3, 0xffffff, 0.58);
    g.beginPath();
    g.moveTo(centerX, boardTop + 18);
    g.lineTo(centerX - 10, midY - 76);
    g.lineTo(centerX + 18, midY - 8);
    g.lineTo(centerX - 12, midY + 44);
    g.lineTo(centerX + 8, boardBottom - 22);
    g.strokePath();
  }

  private spawnWave() {
    if (this.sceneConfig.spawnPool.length < 2 || this.hud.status !== "running") return;

    const activeTerms = new Set(Array.from(this.cardById.values()).map((card) => card.termKey));
    const filteredPool = this.sceneConfig.spawnPool.filter((pair) => !activeTerms.has(pair.termKey));
    const available = filteredPool.length >= this.waveSize ? filteredPool : this.sceneConfig.spawnPool;
    const selected = sampleWithoutReplacement(available, Math.min(this.waveSize, available.length));

    for (const pair of selected) {
      const leftColumn = Phaser.Math.Between(0, this.colsPerSide - 1);
      const rightColumn = Phaser.Math.Between(0, this.colsPerSide - 1);
      const okLeft = this.createCard(pair, "left", leftColumn);
      const okRight = this.createCard(pair, "right", rightColumn);
      if (!okLeft || !okRight) return;
    }

    this.maybeSpawnBonus();
  }

  private maybeSpawnBonus() {
    if (this.bonusById.size > 0) return;
    const roll = Math.random();
    if (roll < 0.1) {
      this.spawnBonus("freeze");
      return;
    }
    if (roll < 0.2) {
      this.spawnBonus("bomb");
    }
  }

  private spawnBonus(type: BonusType) {
    const size = this.sceneConfig.isMobile ? 42 : 46;
    const minX = BOARD_PADDING_X + 20;
    const maxX = this.boardWidth - BOARD_PADDING_X - 20;
    const x = Phaser.Math.Between(minX, maxX);
    const y = this.boardPaddingTop - size;
    const shadow = this.add.graphics();
    const panel = this.add.graphics();
    const label = this.add.text(0, 0, type === "bomb" ? "💣" : "❄", {
      color: "#ffffff",
      fontFamily: "Inter, sans-serif",
      fontSize: this.sceneConfig.isMobile ? "24px" : "26px",
      fontStyle: "700",
    });
    label.setOrigin(0.5);

    const container = this.add.container(x, y, [shadow, panel, label]);
    container.setSize(size, size);
    container.setInteractive({ useHandCursor: true });
    container.setDepth(60);

    const bonus: BonusState = {
      id: `wc3-bonus-${type}-${this.idCounter}`,
      type,
      x,
      y,
      speed: this.fallSpeedPxPerSec * (type === "freeze" ? 0.82 : 0.9),
      trailAccumulator: 0,
      container,
      shadow,
      panel,
      label,
    };
    this.idCounter += 1;

    container.on("pointerdown", () => this.activateBonus(bonus.id));
    this.bonusById.set(bonus.id, bonus);
    this.renderBonus(bonus);
    container.setScale(0.5);
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: container,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private activateBonus(bonusId: string) {
    if (this.hud.status !== "running") return;
    const bonus = this.bonusById.get(bonusId);
    if (!bonus) return;
    if (bonus.type === "bomb") {
      this.activateBombPower();
    } else {
      this.activateFreezePower();
    }
    this.removeBonus(bonus);
  }

  private activateBombPower() {
    const activeTerms = Array.from(
      new Set(Array.from(this.cardById.values()).map((card) => card.termKey)),
    );
    if (activeTerms.length === 0) {
      this.hud = { ...this.hud, bombCharge: 0, canUseBomb: false };
      this.emitHud();
      return;
    }

    const removeCount = Math.max(1, Math.floor(activeTerms.length * 0.25));
    const selected = new Set(sampleWithoutReplacement(activeTerms, removeCount));
    Array.from(this.cardById.values())
      .filter((card) => selected.has(card.termKey))
      .forEach((card) => this.explodeCard(card));

    this.clearSelected();
    this.hud = { ...this.hud, bombCharge: 0, canUseBomb: false, combo: 0 };
    this.emitHud();
    this.collapseAllColumns();
    this.drawBombBurst(this.boardWidth / 2, this.boardHeight / 2);
    this.spawnSparkles(this.boardWidth / 2, this.boardPaddingTop + 60, 0xffcf5a);
  }

  private activateFreezePower() {
    const now = this.time.now;
    this.freezeUntil = Math.max(this.freezeUntil, now) + FREEZE_DURATION_MS;
    this.clearSelected();
    this.hud = { ...this.hud, isFrozen: true };
    this.emitHud();
    this.updateFreezeOverlay();
    this.drawFreezeBurst(this.boardWidth / 2, this.boardHeight / 2);
    this.popScore(this.boardWidth / 2, this.boardPaddingTop + 34, "+Freeze");
  }

  private removeBonus(bonus: BonusState) {
    this.bonusById.delete(bonus.id);
    bonus.container.disableInteractive();
    this.tweens.killTweensOf(bonus.container);
    this.tweens.add({
      targets: bonus.container,
      alpha: 0,
      scaleX: 0.7,
      scaleY: 0.7,
      duration: 180,
      onComplete: () => bonus.container.destroy(),
    });
  }

  private createCard(pair: SpawnPair, role: LaneRole, column: number) {
    const columnIds = this.columns[role][column];
    const targetY = this.getCardY(columnIds.length);
    const topLimit = this.boardPaddingTop + 10;
    if (targetY - this.cardHeight / 2 <= topLimit) {
      this.loseLife();
      return false;
    }

    const cardWidth = this.getCardWidth();
    const x = this.getCardX(role, column);
    const startY = this.boardPaddingTop - this.cardHeight - Phaser.Math.Between(10, 70);
    const text = role === "left" ? pair.leftText : pair.rightText;
    const fontSize = getFontSize(text, this.sceneConfig.isMobile);

    const shadow = this.add.graphics();
    const panel = this.add.graphics();
    const label = this.add.text(0, 0, text, {
      align: "center",
      color: "#f8fafc",
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      fontSize: `${fontSize}px`,
      fontStyle: "800",
      stroke: role === "left" ? "#06203a" : "#2a1204",
      strokeThickness: 2,
      wordWrap: { width: cardWidth - 12, useAdvancedWrap: true },
    });
    label.setOrigin(0.5);
    label.setPadding(4, 1, 4, 1);
    label.setLineSpacing(-3);
    (label as Phaser.GameObjects.Text & { setResolution?: (value: number) => Phaser.GameObjects.Text }).setResolution?.(2);

    const container = this.add.container(x, startY, [shadow, panel, label]);
    container.setSize(cardWidth, this.cardHeight);
    container.setInteractive({ useHandCursor: true });
    container.setDepth(30);

    const id = `wc3-${role}-${this.idCounter}`;
    this.idCounter += 1;
    const card: CardState = {
      id,
      termKey: pair.termKey,
      role,
      text,
      column,
      y: startY,
      targetY,
      isFalling: true,
      container,
      shadow,
      panel,
      label,
      selected: false,
      wrong: false,
    };

    container.on("pointerdown", () => this.handleCardClick(card.id));
    this.cardById.set(card.id, card);
    columnIds.push(card.id);
    this.renderCard(card);
    return true;
  }

  private handleCardClick(cardId: string) {
    if (this.hud.status !== "running") return;
    const card = this.cardById.get(cardId);
    if (!card) return;

    if (!this.selectedCardId) {
      this.setSelected(card);
      return;
    }

    if (this.selectedCardId === cardId) {
      this.clearSelected();
      return;
    }

    const selected = this.cardById.get(this.selectedCardId);
    if (!selected) {
      this.setSelected(card);
      return;
    }

    if (selected.role === card.role) {
      this.setSelected(card);
      return;
    }

    if (selected.termKey === card.termKey) {
      this.resolveMatch(selected, card);
      return;
    }

    this.resolveMistake(selected, card);
  }

  private setSelected(card: CardState) {
    this.clearSelected();
    card.selected = true;
    this.selectedCardId = card.id;
    this.renderCard(card);
  }

  private clearSelected() {
    if (!this.selectedCardId) return;
    const current = this.cardById.get(this.selectedCardId);
    if (current) {
      current.selected = false;
      this.renderCard(current);
    }
    this.selectedCardId = null;
  }

  private resolveMatch(a: CardState, b: CardState) {
    this.clearSelected();
    const combo = this.hud.combo + 1;
    const bonus = combo >= 3 ? combo : 0;
    const nextBombCharge = Math.min(100, this.hud.bombCharge + (combo >= 3 ? 28 : 16));
    const hasBombBonus = Array.from(this.bonusById.values()).some((bonusItem) => bonusItem.type === "bomb");
    const shouldSpawnBombBonus = nextBombCharge >= 100 && !hasBombBonus;
    const bombCharge = shouldSpawnBombBonus ? 0 : nextBombCharge;
    this.hud = {
      ...this.hud,
      score: this.hud.score + 1 + bonus,
      combo,
      bombCharge,
      canUseBomb: bombCharge >= 100,
    };
    this.emitHud();
    if (shouldSpawnBombBonus) this.spawnBonus("bomb");

    a.container.disableInteractive();
    b.container.disableInteractive();
    this.drawMatchFlash(a.container.x, a.container.y, b.container.x, b.container.y);
    this.popScore((a.container.x + b.container.x) / 2, Math.min(a.container.y, b.container.y) - 18, `+${1 + bonus}`);
    this.tweens.add({
      targets: [a.container, b.container],
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 110,
      yoyo: true,
      ease: "Quad.easeOut",
    });
    this.time.delayedCall(95, () => {
      if (this.cardById.has(a.id)) this.removeCard(a);
      if (this.cardById.has(b.id)) this.removeCard(b);
    });
  }

  private resolveMistake(a: CardState, b: CardState) {
    this.hud = { ...this.hud, incorrect: this.hud.incorrect + 1, combo: 0 };
    this.emitHud();
    a.wrong = true;
    b.wrong = true;
    this.renderCard(a);
    this.renderCard(b);
    this.clearSelected();
    this.tweens.add({
      targets: [a.container, b.container],
      x: "+=6",
      duration: 48,
      yoyo: true,
      repeat: 3,
      ease: "Sine.easeInOut",
    });
    this.cameras.main.shake(100, 0.0016);
    this.time.delayedCall(260, () => {
      if (this.cardById.has(a.id)) {
        a.wrong = false;
        this.renderCard(a);
      }
      if (this.cardById.has(b.id)) {
        b.wrong = false;
        this.renderCard(b);
      }
    });
  }

  private removeCard(card: CardState) {
    this.cardById.delete(card.id);
    const columnIds = this.columns[card.role][card.column];
    const index = columnIds.indexOf(card.id);
    if (index >= 0) columnIds.splice(index, 1);
    this.tweens.add({
      targets: card.container,
      alpha: 0,
      scaleX: 0.88,
      scaleY: 0.88,
      duration: 150,
      onComplete: () => card.container.destroy(),
    });
    this.collapseColumn(card.role, card.column);
  }

  private explodeCard(card: CardState) {
    this.spawnSparkles(card.container.x, card.container.y, card.role === "left" ? ROLE_COLORS.left : ROLE_COLORS.right);
    this.removeCard(card);
  }

  private collapseColumn(role: LaneRole, column: number) {
    const ids = this.columns[role][column];
    const sortedCards = ids
      .map((id) => this.cardById.get(id))
      .filter(Boolean)
      .sort((a, b) => b!.y - a!.y) as CardState[];

    sortedCards.forEach((card, index) => {
      ids[index] = card.id;
      card.column = column;
      card.targetY = this.getCardY(index);
      card.isFalling = true;
    });

    ids.length = sortedCards.length;
  }

  private collapseAllColumns() {
    for (const role of ["left", "right"] as const) {
      for (let column = 0; column < this.colsPerSide; column += 1) {
        this.collapseColumn(role, column);
      }
    }
  }

  private updateFallingCards(delta: number) {
    const frameDelta = Math.min(delta, 34);
    const dy = (this.fallSpeedPxPerSec * frameDelta) / 1000;
    const columnStep = this.cardHeight + this.cardGapY;

    for (const role of ["left", "right"] as const) {
      for (let column = 0; column < this.colsPerSide; column += 1) {
        const cards = this.columns[role][column]
          .map((id) => this.cardById.get(id))
          .filter(Boolean)
          .sort((a, b) => b!.y - a!.y) as CardState[];

        let ceiling = this.getCardY(0);
        cards.forEach((card) => {
          const stopY = card.targetY !== undefined ? Math.min(ceiling, card.targetY) : ceiling;
          if (!card.isFalling && Math.abs(card.y - stopY) < 0.5) {
            card.y = stopY;
          card.container.y = Math.round(stopY);
          ceiling = stopY - columnStep;
          return;
        }

          const distance = stopY - card.y;
          const easedStep = Math.max(dy * 0.94, distance * 0.12);
          const nextY = Math.min(card.y + easedStep, stopY);
          card.y = nextY;
          card.container.y = Math.round(nextY);
          if (nextY >= stopY - 0.5) {
            card.y = stopY;
            card.container.y = Math.round(stopY);
            card.targetY = undefined;
            card.isFalling = false;
          } else {
            card.isFalling = true;
          }
          ceiling = card.y - columnStep;
        });
      }
    }
  }

  private updateBonuses(delta: number) {
    const dyMultiplier = Math.min(delta, 34) / 1000;
    const boardBottom = this.boardHeight - BOARD_PADDING_BOTTOM - 12;
    Array.from(this.bonusById.values()).forEach((bonus) => {
      const nextY = bonus.y + bonus.speed * dyMultiplier;
      bonus.y = nextY;
      bonus.container.y = Math.round(nextY);
      bonus.trailAccumulator += delta;
      if (bonus.trailAccumulator >= 56) {
        bonus.trailAccumulator = 0;
        this.spawnBonusTrail(bonus);
      }
      if (nextY >= boardBottom) {
        this.removeBonus(bonus);
      }
    });
  }

  private updateFreezeState() {
    const frozen = this.freezeUntil > this.time.now;
    if (frozen === this.hud.isFrozen) return;
    this.hud = { ...this.hud, isFrozen: frozen };
    this.emitHud();
    this.updateFreezeOverlay();
  }

  private updateFreezeOverlay() {
    if (!this.freezeOverlay) return;
    this.freezeOverlay.setVisible(this.hud.isFrozen);
    this.freezeOverlay.setAlpha(this.hud.isFrozen ? 0.8 : 0);
  }

  private renderBonus(bonus: BonusState) {
    const size = this.sceneConfig.isMobile ? 42 : 46;
    const fill = bonus.type === "bomb" ? 0xffbc4a : 0x68c8ff;
    const accent = bonus.type === "bomb" ? 0xffefc0 : 0xdff7ff;

    bonus.shadow.clear();
    bonus.shadow.fillStyle(0x030712, 0.22);
    bonus.shadow.fillCircle(0, 5, size / 2);

    bonus.panel.clear();
    bonus.panel.fillStyle(fill, 0.98);
    bonus.panel.fillCircle(0, 0, size / 2);
    bonus.panel.lineStyle(3, accent, 0.95);
    bonus.panel.strokeCircle(0, 0, size / 2 - 1.5);
  }

  private spawnBonusTrail(bonus: BonusState) {
    const color = bonus.type === "bomb" ? 0xffd27a : 0xb9ecff;
    const trail = this.add.circle(
      bonus.container.x,
      bonus.container.y + (bonus.type === "bomb" ? 14 : 10),
      bonus.type === "bomb" ? 6 : 5,
      color,
      0.2,
    );
    trail.setDepth(50);
    this.tweens.add({
      targets: trail,
      y: trail.y + 18,
      alpha: 0,
      scale: 0.25,
      duration: 240,
      ease: "Quad.easeOut",
      onComplete: () => trail.destroy(),
    });
  }

  private drawBombBurst(x: number, y: number) {
    const ring = this.add.circle(x, y, 42, 0xffc14d, 0.12);
    ring.setDepth(55);
    this.tweens.add({
      targets: ring,
      scale: 4.8,
      alpha: 0,
      duration: 320,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    for (let i = 0; i < 10; i += 1) {
      const shard = this.add.rectangle(x, y, 10, 3, 0xffd27a, 0.95);
      shard.setDepth(56);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(48, 110);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        angle: Phaser.Math.Between(120, 320),
        alpha: 0,
        scaleX: 0.4,
        scaleY: 0.4,
        duration: 360,
        ease: "Quad.easeOut",
        onComplete: () => shard.destroy(),
      });
    }
  }

  private drawFreezeBurst(x: number, y: number) {
    const ring = this.add.circle(x, y, 38, 0x9fd6ff, 0.15);
    ring.setDepth(55);
    this.tweens.add({
      targets: ring,
      scale: 5.2,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    for (let i = 0; i < 8; i += 1) {
      const flake = this.add.star(x, y, 6, 4, 8, 0xdff7ff, 0.92);
      flake.setDepth(56);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(36, 96);
      this.tweens.add({
        targets: flake,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        angle: Phaser.Math.Between(-80, 80),
        scale: 0.35,
        duration: 420,
        ease: "Quad.easeOut",
        onComplete: () => flake.destroy(),
      });
    }
  }

  private drawMatchFlash(x1: number, y1: number, x2: number, y2: number) {
    const g = this.add.graphics();
    g.setDepth(45);
    g.lineStyle(8, 0xffefaa, 0.95);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    g.lineStyle(3, 0xffffff, 0.88);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 180,
      onComplete: () => g.destroy(),
    });
    this.spawnSparkles((x1 + x2) / 2, (y1 + y2) / 2, 0xfacc15);
  }

  private spawnSparkles(x: number, y: number, color: number) {
    for (let i = 0; i < 8; i += 1) {
      const dot = this.add.circle(x, y, Phaser.Math.Between(3, 6), color, 0.9);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(24, 62);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.3,
        duration: 360,
        ease: "Quad.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
  }

  private popScore(x: number, y: number, text: string) {
    const pop = this.add.text(x, y, text, {
      color: "#ffe58f",
      fontFamily: "Inter, sans-serif",
      fontSize: "26px",
      fontStyle: "700",
      stroke: "#0f172a",
      strokeThickness: 3,
    });
    pop.setOrigin(0.5);
    this.tweens.add({
      targets: pop,
      y: y - 34,
      alpha: 0,
      duration: 650,
      ease: "Cubic.easeOut",
      onComplete: () => pop.destroy(),
    });
  }

  private loseLife() {
    const lives = Math.max(0, this.hud.lives - 1);
    this.hud = { ...this.hud, lives, combo: 0 };
    this.emitHud();
    this.cameras.main.shake(110, 0.0012);
    if (lives <= 0) this.endRound();
  }

  private endRound() {
    this.hud = { ...this.hud, status: "game-over" };
    this.emitHud();
  }

  private renderCard(card: CardState) {
    const cardWidth = this.getCardWidth();
    const isLeft = card.role === "left";
    const base = isLeft ? ROLE_COLORS.left : ROLE_COLORS.right;
    const accent = isLeft ? ROLE_ACCENTS.left : ROLE_ACCENTS.right;
    const fill = card.wrong ? 0x8f4a4a : card.selected ? (isLeft ? 0x7ddcff : 0xffbf78) : base;
    const shadowAlpha = card.selected ? 0.42 : card.wrong ? 0.3 : 0.24;
    const glowColor = card.wrong ? 0xffd1d1 : accent;
    const radius = 8;

    card.shadow.clear();
    card.shadow.fillStyle(0x030712, shadowAlpha);
    card.shadow.fillRoundedRect(-cardWidth / 2, -this.cardHeight / 2 + 3, cardWidth, this.cardHeight, radius);
    card.shadow.fillStyle(base, card.selected ? 0.24 : 0.14);
    card.shadow.fillRoundedRect(-cardWidth / 2 + 1, -this.cardHeight / 2 + 1, cardWidth - 2, this.cardHeight, radius);

    card.panel.clear();
    card.panel.fillStyle(fill, 0.98);
    card.panel.fillRoundedRect(-cardWidth / 2, -this.cardHeight / 2, cardWidth, this.cardHeight, radius);
    card.panel.fillStyle(0xffffff, isLeft ? 0.12 : 0.1);
    card.panel.fillRoundedRect(-cardWidth / 2 + 6, -this.cardHeight / 2 + 5, cardWidth - 12, 8, 6);
    card.panel.lineStyle(card.selected ? 3 : 1.5, card.selected ? 0xffffff : glowColor, card.selected ? 1 : 0.92);
    card.panel.strokeRoundedRect(-cardWidth / 2, -this.cardHeight / 2, cardWidth, this.cardHeight, radius);
    if (card.selected) {
      card.panel.lineStyle(1, base, 0.85);
      card.panel.strokeRoundedRect(-cardWidth / 2 + 3, -this.cardHeight / 2 + 3, cardWidth - 6, this.cardHeight - 6, radius - 2);
    }

    card.label.setColor(card.wrong ? "#fff7f7" : "#f8fafc");
    card.label.setStroke(
      card.wrong ? "#4c0d0d" : isLeft ? "#06203a" : "#2a1204",
      card.selected ? 2.5 : 2,
    );
    card.container.setScale(card.selected ? 1.01 : card.wrong ? 1.005 : 1);
  }

  private getLaneWidth() {
    return (this.boardWidth - BOARD_PADDING_X * 2 - this.laneGap) / 2;
  }

  private getCardWidth() {
    const laneInset = this.sceneConfig.isMobile ? 16 : 20;
    const columnGap = this.sceneConfig.isMobile ? 4 : 6;
    const laneInner = this.getLaneWidth() - laneInset;
    return (laneInner - (this.colsPerSide - 1) * columnGap) / this.colsPerSide;
  }

  private getCardX(role: LaneRole, column: number) {
    const cardWidth = this.getCardWidth();
    const columnGap = this.sceneConfig.isMobile ? 4 : 6;
    const laneStart =
      role === "left"
        ? BOARD_PADDING_X + (this.sceneConfig.isMobile ? 8 : 10)
        : this.boardWidth / 2 + this.laneGap / 2 + (this.sceneConfig.isMobile ? 8 : 10);
    return laneStart + cardWidth / 2 + column * (cardWidth + columnGap);
  }

  private getCardY(stackIndex: number) {
    return this.boardHeight - BOARD_PADDING_BOTTOM - this.cardHeight / 2 - stackIndex * (this.cardHeight + this.cardGapY);
  }
}
