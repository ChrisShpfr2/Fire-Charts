import assert from 'node:assert/strict';
import test from 'node:test';
import type { Candle, ChartWindowConfig } from '../types/trading';
import { DEFAULT_SETTINGS } from './settings';
import {
  aggregateDivergenceBannerItems,
  computeWindowDivergences,
  formatDivergenceKindLabel,
  isBullishDivergence,
  type WindowDivergenceSignal,
} from './divergenceBanner';

function makeWindow(id: string, index: number, enabled = true): ChartWindowConfig {
  return {
    id,
    index,
    symbol: index === 0 ? 'BTCUSDT' : 'NVDA',
    assetType: index === 0 ? 'crypto' : 'stock',
    timeframe: '15m',
    indicators: enabled ? ['divergences', 'rsi'] : ['rsi'],
    zoomBars: 100,
    sync: { group: 'none', syncIndicators: true, syncZoom: true, syncCrosshair: true },
  };
}

test('computeWindowDivergences returns empty when disabled or too few candles', () => {
  const shortCandles: Candle[] = Array.from({ length: 10 }, (_, i) => ({
    time: 1000 + i * 60,
    open: 100,
    high: 102,
    low: 99,
    close: 101,
    volume: 100,
  }));

  const disabled = computeWindowDivergences({
    windowId: 'w1',
    windowIndex: 0,
    symbol: 'BTCUSDT',
    timeframe: '15m',
    candles: shortCandles,
    enabled: false,
    settings: DEFAULT_SETTINGS,
  });
  assert.equal(disabled.length, 0);

  const tooShort = computeWindowDivergences({
    windowId: 'w1',
    windowIndex: 0,
    symbol: 'BTCUSDT',
    timeframe: '15m',
    candles: shortCandles,
    enabled: true,
    settings: DEFAULT_SETTINGS,
  });
  assert.equal(tooShort.length, 0);
});

test('aggregateDivergenceBannerItems filters by visible windows, enabled indicator, and bull/bear filter', () => {
  const win1 = makeWindow('w1', 0, true);
  const win2 = makeWindow('w2', 1, false);
  const win3 = makeWindow('w3', 2, true);

  const signalsByWindow: Record<string, WindowDivergenceSignal[]> = {
    w1: [
      {
        id: 'w1-wt-bull-10-20',
        windowId: 'w1',
        windowIndex: 0,
        symbol: 'BTCUSDT',
        timeframe: '15m',
        source: 'wt',
        kind: 'bull',
        barsAgo: 5,
        price: 91200,
        endTime: 1000,
        startOsc: -52,
        endOsc: -34,
      },
      {
        id: 'w1-rsi-bear-12-22',
        windowId: 'w1',
        windowIndex: 0,
        symbol: 'BTCUSDT',
        timeframe: '15m',
        source: 'rsi',
        kind: 'bear',
        barsAgo: 2,
        price: 92400,
        endTime: 1100,
        startOsc: 74,
        endOsc: 68,
      },
    ],
    w2: [
      {
        id: 'w2-wt-bull-1-5',
        windowId: 'w2',
        windowIndex: 1,
        symbol: 'NVDA',
        timeframe: '15m',
        source: 'wt',
        kind: 'bull',
        barsAgo: 1,
        price: 135,
        endTime: 1200,
        startOsc: -40,
        endOsc: -22,
      },
    ],
    w3: [
      {
        id: 'w3-wt-hbear-8-18',
        windowId: 'w3',
        windowIndex: 2,
        symbol: 'ETHUSDT',
        timeframe: '1h',
        source: 'wt',
        kind: 'hidden_bear',
        barsAgo: 3,
        price: 3410,
        endTime: 1300,
        startOsc: 40,
        endOsc: 54,
      },
    ],
  };

  // Only w1 & w2 are visible (w3 hidden, w2 has divergences disabled)
  const allVisible = aggregateDivergenceBannerItems(signalsByWindow, [win1, win2], 'all');
  assert.equal(allVisible.length, 2);
  assert.equal(allVisible[0].id, 'w1-rsi-bear-12-22'); // 2 barsAgo sorts before 5 barsAgo
  assert.equal(allVisible[1].id, 'w1-wt-bull-10-20');

  // With win3 visible too, bull filter keeps only bullish
  const bullOnly = aggregateDivergenceBannerItems(signalsByWindow, [win1, win2, win3], 'bull');
  assert.deepEqual(
    bullOnly.map((d) => d.id),
    ['w1-wt-bull-10-20']
  );

  // Bear filter includes regular bear and hidden bear
  const bearOnly = aggregateDivergenceBannerItems(signalsByWindow, [win1, win2, win3], 'bear');
  assert.deepEqual(
    bearOnly.map((d) => d.id),
    ['w1-rsi-bear-12-22', 'w3-wt-hbear-8-18']
  );
  assert.equal(isBullishDivergence('hidden_bull'), true);
  assert.equal(isBullishDivergence('hidden_bear'), false);
  assert.equal(formatDivergenceKindLabel('hidden_bull'), 'H.BULL');
});
