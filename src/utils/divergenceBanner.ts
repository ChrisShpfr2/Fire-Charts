import type {
  Candle,
  ChartWindowConfig,
  TerminalSettings,
  Timeframe,
} from '../types/trading';
import {
  calculateOscillatorDivergences,
  calculateRSI,
  calculateVuManChuWaveTrend,
  type DivergenceKind,
  type DivergenceSource,
} from './indicators';

export interface WindowDivergenceSignal {
  id: string;
  windowId: string;
  windowIndex: number;
  symbol: string;
  timeframe: Timeframe;
  source: DivergenceSource;
  kind: DivergenceKind;
  barsAgo: number;
  price: number;
  endTime: number;
  startOsc: number;
  endOsc: number;
}

export type DivergenceBannerFilter = 'all' | 'bull' | 'bear';

export function isBullishDivergence(kind: DivergenceKind): boolean {
  return kind === 'bull' || kind === 'hidden_bull';
}

export function formatDivergenceKindLabel(kind: DivergenceKind): string {
  switch (kind) {
    case 'bull':
      return 'BULL';
    case 'bear':
      return 'BEAR';
    case 'hidden_bull':
      return 'H.BULL';
    case 'hidden_bear':
      return 'H.BEAR';
  }
}

export function computeWindowDivergences(params: {
  windowId: string;
  windowIndex: number;
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  enabled: boolean;
  settings: TerminalSettings;
}): WindowDivergenceSignal[] {
  const { windowId, windowIndex, symbol, timeframe, candles, enabled, settings } = params;
  if (!enabled || candles.length < 15) return [];

  const divOpts = {
    pivotLeft: settings.divergences.pivotLeft,
    pivotRight: settings.divergences.pivotRight,
    maxLookbackBars: settings.divergences.maxLookbackBars,
    includeHidden: settings.divergences.showHidden,
  };

  const signals: WindowDivergenceSignal[] = [];

  if (settings.divergences.showWtDivergences) {
    const wt = calculateVuManChuWaveTrend(
      candles,
      settings.vumanchu.wtChannelLen,
      settings.vumanchu.wtAverageLen,
      settings.vumanchu.wtMALen,
      settings.vumanchu.obLevel1,
      settings.vumanchu.obLevel2,
      settings.vumanchu.osLevel1,
      settings.oscillators.rsiLen,
      settings.oscillators.stochLen,
      settings.oscillators.stochKSmooth,
      settings.oscillators.stochDSmooth
    );
    const wtDivs = calculateOscillatorDivergences(candles, wt.wt2, 'wt', divOpts);
    for (const d of wtDivs) {
      signals.push({
        id: `${windowId}-wt-${d.kind}-${d.startIndex}-${d.endIndex}`,
        windowId,
        windowIndex,
        symbol,
        timeframe,
        source: 'wt',
        kind: d.kind,
        barsAgo: Math.max(0, candles.length - 1 - d.endIndex),
        price: d.endPrice,
        endTime: d.endTime,
        startOsc: d.startOsc,
        endOsc: d.endOsc,
      });
    }
  }

  if (settings.divergences.showRsiDivergences) {
    const closes = candles.map((c) => c.close);
    const rsi = calculateRSI(
      closes,
      settings.oscillators.rsiLen,
      settings.oscillators.rsiMaLen
    );
    const rsiDivs = calculateOscillatorDivergences(candles, rsi.rsi, 'rsi', divOpts);
    for (const d of rsiDivs) {
      signals.push({
        id: `${windowId}-rsi-${d.kind}-${d.startIndex}-${d.endIndex}`,
        windowId,
        windowIndex,
        symbol,
        timeframe,
        source: 'rsi',
        kind: d.kind,
        barsAgo: Math.max(0, candles.length - 1 - d.endIndex),
        price: d.endPrice,
        endTime: d.endTime,
        startOsc: d.startOsc,
        endOsc: d.endOsc,
      });
    }
  }

  signals.sort((a, b) => a.barsAgo - b.barsAgo || (a.source === 'wt' ? -1 : 1));
  return signals;
}

export function aggregateDivergenceBannerItems(
  signalsByWindow: Record<string, WindowDivergenceSignal[]>,
  visibleWindows: ChartWindowConfig[],
  filter: DivergenceBannerFilter = 'all',
  limit = 24
): WindowDivergenceSignal[] {
  const combined: WindowDivergenceSignal[] = [];
  const seen = new Set<string>();

  for (const win of visibleWindows) {
    if (!win.indicators.includes('divergences')) continue;
    const list = signalsByWindow[win.id] ?? [];
    for (const item of list) {
      if (filter === 'bull' && !isBullishDivergence(item.kind)) continue;
      if (filter === 'bear' && isBullishDivergence(item.kind)) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      combined.push(item);
    }
  }

  combined.sort(
    (a, b) =>
      a.barsAgo - b.barsAgo ||
      a.windowIndex - b.windowIndex ||
      (a.source === b.source ? 0 : a.source === 'wt' ? -1 : 1)
  );

  return combined.slice(0, Math.max(1, limit));
}

export function buildDivergenceSignature(signals: WindowDivergenceSignal[]): string {
  return signals
    .map((s) => `${s.id}:${s.barsAgo}:${s.symbol}:${s.timeframe}`)
    .join('|');
}
