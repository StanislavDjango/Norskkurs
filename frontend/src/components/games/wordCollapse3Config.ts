export type WordCollapse3SpeedPreset = "verySlow" | "slow" | "normal" | "fast" | "turbo";

export const WORD_COLLAPSE3_MOBILE_BREAKPOINT = 768;

export const WORD_COLLAPSE3_GAME_SIZE = {
  desktop: {
    width: 1080,
    height: 690,
  },
  mobile: {
    width: 640,
    height: 900,
  },
} as const;

export const WORD_COLLAPSE3_SPEED_MULTIPLIERS: Record<WordCollapse3SpeedPreset, number> = {
  verySlow: 0.34,
  slow: 0.48,
  normal: 0.68,
  fast: 0.9,
  turbo: 1.08,
};

export const WORD_COLLAPSE3_BOARD_TUNING = {
  boardPaddingX: 36,
  boardPaddingBottom: 14,
  freezeDurationMs: 5000,
  diagnosticPlainBoard: true,
  roleColors: {
    left: 0x2ea9ff,
    right: 0xff9b2f,
  },
  roleAccents: {
    left: 0xe3f7ff,
    right: 0xffe6c8,
  },
  desktop: {
    boardPaddingTop: 54,
    laneGap: 12,
    colsPerSide: 5,
    cardHeight: 42,
    cardGapY: 4,
    waveSize: 4,
    waveDelayMs: 1600,
    fallSpeed: 210,
    laneInset: 20,
    columnGap: 6,
    laneStartOffset: 10,
  },
  mobile: {
    boardPaddingTop: 54,
    laneGap: 10,
    colsPerSide: 4,
    cardHeight: 44,
    cardGapY: 4,
    waveSize: 3,
    waveDelayMs: 1950,
    fallSpeed: 170,
    laneInset: 16,
    columnGap: 4,
    laneStartOffset: 8,
  },
} as const;

export const getWordCollapse3FontSize = (text: string, isMobile: boolean) => {
  if (text.length >= 26) return isMobile ? 11 : 11;
  if (text.length >= 18) return isMobile ? 12 : 12;
  return isMobile ? 13 : 13;
};
