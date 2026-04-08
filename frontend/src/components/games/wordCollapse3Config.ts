export type WordCollapse3SpeedPreset = "reading" | "ultraSlow" | "verySlow" | "slow" | "normal" | "fast" | "turbo";
export type WordCollapse3MobileSizePreset = "standard" | "large";

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
  reading: 0.08,
  ultraSlow: 0.14,
  verySlow: 0.22,
  slow: 0.36,
  normal: 0.56,
  fast: 0.9,
  turbo: 1.08,
};

const WORD_COLLAPSE3_MOBILE_TUNING = {
  standard: {
    boardPaddingX: 12,
    boardPaddingBottom: 10,
    boardPaddingTop: 48,
    laneGap: 4,
    colsPerSide: 3,
    cardHeight: 48,
    cardGapY: 3,
    waveSize: 3,
    waveDelayMs: 1950,
    fallSpeed: 170,
    laneInset: 2,
    columnGap: 1,
    laneStartOffset: 1,
  },
  large: {
    boardPaddingX: 8,
    boardPaddingBottom: 10,
    boardPaddingTop: 48,
    laneGap: 4,
    colsPerSide: 2,
    cardHeight: 54,
    cardGapY: 4,
    waveSize: 3,
    waveDelayMs: 1950,
    fallSpeed: 170,
    laneInset: 0,
    columnGap: 2,
    laneStartOffset: 0,
  },
} as const;

export const getWordCollapse3MobileTuning = (preset: WordCollapse3MobileSizePreset) =>
  WORD_COLLAPSE3_MOBILE_TUNING[preset];

export const WORD_COLLAPSE3_BOARD_TUNING = {
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
    boardPaddingX: 36,
    boardPaddingBottom: 14,
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
  mobile: WORD_COLLAPSE3_MOBILE_TUNING.standard,
} as const;

export const getWordCollapse3FontSize = (
  text: string,
  isMobile: boolean,
  mobileSizePreset: WordCollapse3MobileSizePreset = "standard",
) => {
  if (!isMobile) {
    if (text.length >= 26) return 11;
    if (text.length >= 18) return 12;
    return 13;
  }

  if (mobileSizePreset === "large") {
    if (text.length >= 26) return 13;
    if (text.length >= 18) return 15;
    return 17;
  }

  if (text.length >= 26) return 12;
  if (text.length >= 18) return 13;
  return 15;
};
