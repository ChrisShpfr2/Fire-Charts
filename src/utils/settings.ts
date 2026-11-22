import type { TerminalSettings } from '../types/trading';

export function autoFibParamsFromSensitivity(sensitivity: number): {
  sensitivity: number;
  lookbackBars: number;
  pivotDepth: number;
} {
  const s = Math.max(0, Math.min(100, Math.round(sensitivity)));
  const lookbackBars = Math.max(
    40,
    Math.min(360, Math.round((360 - (s / 100) * 320) / 5) * 5)
  );
  const pivotDepth = Math.max(2, Math.min(16, Math.round(12 - (s / 100) * 10)));
  return { sensitivity: s, lookbackBars, pivotDepth };
}

export function getSensitivityLabel(sensitivity: number): {
  mode: string;
  colorClass: string;
} {
  if (sensitivity >= 70) {
    return { mode: 'Fast Scalp Pivots', colorClass: 'text-[#8EE53F]' };
  }
  if (sensitivity >= 35) {
    return { mode: 'Intraday Balanced', colorClass: 'text-sky-300' };
  }
  return { mode: 'Swing Trading Levels', colorClass: 'text-amber-300' };
}

export const DEFAULT_SETTINGS: TerminalSettings = {
  candles: {
    upColor: '#8EE53F', // Kiwi Green
    downColor: '#7C8594', // Slate Grey
    showGrid: true,
    crosshairDashed: true,
    defaultZoomBars: 90,
  },
  autoFib: {
    sensitivity: 40,
    pivotDepth: 8,
    lookbackBars: 230,
    reverse: false,
    showExtensions: true,
    showGoldenPocket: true,
  },
  vumanchu: {
    wtChannelLen: 9,
    wtAverageLen: 12,
    wtMALen: 3,
    obLevel1: 60,
    obLevel2: 80,
    osLevel1: -60,
    osLevel2: -80,
    rsiMFIPeriod: 60,
    rsiMFIMultiplier: 150,
    rsiMFIPosY: 2.5,
    showWTWaves: true,
    showWTVwap: true,
    showMoneyFlow: true,
    showSignalDots: true,
    showBottomRibbon: true,
    showStochInPane: true,
    showRsiInPane: true,
  },
  tradersReality: {
    ema5Len: 5,
    ema13Len: 13,
    ema50Len: 50,
    ema200Len: 200,
    ema800Len: 800,
    showEmas: true,
    showEma50Cloud: true,
    pvsraMode: 'outline',
    pvsraClimaxMult: 2.0,
    pvsraRisingMult: 1.5,
    showVectorZones: true,
    showSessions: true,
    showBrinksBox: true,
    showDailyOpen: true,
    showPrevDayHL: true,
    showAdr: true,
    showPsyLevels: true,
  },
  oscillators: {
    rsiLen: 14,
    rsiMaLen: 14,
    stochRsiLen: 14,
    stochLen: 14,
    stochKSmooth: 3,
    stochDSmooth: 3,
    bbPeriod: 20,
    bbMult: 2,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    atrPeriod: 14,
  },
  divergences: {
    showWtDivergences: true,
    showRsiDivergences: true,
    showHidden: true,
    showOnPriceChart: false,
    pivotLeft: 5,
    pivotRight: 3,
    maxLookbackBars: 60,
  },
  display: {
    showTickerBanner: true,
    tickerSpeedSec: 48,
    showNewsBar: true,
    newsRotateSec: 8,
  },
  alerts: {
    showTriggeredLines: true,
    soundEnabled: false,
  },
};

export function mergeTerminalSettings(
  partial?: Partial<TerminalSettings> | null
): TerminalSettings {
  if (!partial) return DEFAULT_SETTINGS;
  return {
    candles: { ...DEFAULT_SETTINGS.candles, ...(partial.candles ?? {}) },
    autoFib: { ...DEFAULT_SETTINGS.autoFib, ...(partial.autoFib ?? {}) },
    vumanchu: { ...DEFAULT_SETTINGS.vumanchu, ...(partial.vumanchu ?? {}) },
    tradersReality: { ...DEFAULT_SETTINGS.tradersReality, ...(partial.tradersReality ?? {}) },
    oscillators: { ...DEFAULT_SETTINGS.oscillators, ...(partial.oscillators ?? {}) },
    divergences: { ...DEFAULT_SETTINGS.divergences, ...(partial.divergences ?? {}) },
    display: { ...DEFAULT_SETTINGS.display, ...(partial.display ?? {}) },
    alerts: { ...DEFAULT_SETTINGS.alerts, ...(partial.alerts ?? {}) },
  };
}
