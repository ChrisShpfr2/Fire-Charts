import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalSymbolKey,
  getGridGeometry,
  propagateIndicatorsToGroup,
  propagateZoomToGroup,
} from './sync';
import type { ChartWindowConfig, LayoutCount } from '../types/trading';

test('getGridGeometry covers all window counts 1 to 12', () => {
  for (let i = 1; i <= 12; i++) {
    const geom = getGridGeometry(i as LayoutCount);
    assert.ok(geom.cols * geom.rows >= i, `Grid ${geom.cols}x${geom.rows} too small for ${i}`);
  }
});

test('canonicalSymbolKey matches NVDA, NVDAUSDT, and NVDAUSDT.P', () => {
  assert.equal(canonicalSymbolKey('NVDA'), 'NVDA');
  assert.equal(canonicalSymbolKey('NVDAUSDT.P'), 'NVDA');
  assert.equal(canonicalSymbolKey('TQQQUSDT.P'), 'TQQQ');
});

test('propagateIndicatorsToGroup syncs indicators only within same group with syncIndicators enabled', () => {
  const windows: ChartWindowConfig[] = [
    {
      id: 'w1',
      index: 0,
      symbol: 'BTCUSDT',
      assetType: 'crypto',
      timeframe: '15m',
      indicators: ['volume'],
      sync: { group: 'A', syncIndicators: true, syncCrosshair: true, syncZoom: true },
      zoomBars: 90,
    },
    {
      id: 'w2',
      index: 1,
      symbol: 'ETHUSDT',
      assetType: 'crypto',
      timeframe: '1h',
      indicators: ['volume'],
      sync: { group: 'A', syncIndicators: true, syncCrosshair: true, syncZoom: true },
      zoomBars: 90,
    },
    {
      id: 'w3',
      index: 2,
      symbol: 'NVDA',
      assetType: 'stock',
      timeframe: '15m',
      indicators: ['volume'],
      sync: { group: 'A', syncIndicators: false, syncCrosshair: true, syncZoom: false },
      zoomBars: 90,
    },
  ];

  const updated = propagateIndicatorsToGroup(windows, 'w1', [
    'traders_reality_main',
    'auto_fib',
    'vumanchu_wavetrend',
    'vumanchu_moneyflow',
  ]);
  assert.deepEqual(updated[0].indicators, [
    'traders_reality_main',
    'auto_fib',
    'vumanchu_wavetrend',
    'vumanchu_moneyflow',
  ]);
  assert.deepEqual(updated[1].indicators, [
    'traders_reality_main',
    'auto_fib',
    'vumanchu_wavetrend',
    'vumanchu_moneyflow',
  ]);
  assert.deepEqual(updated[2].indicators, ['volume']);
});

test('propagateZoomToGroup syncs zoomBars across windows with syncZoom enabled', () => {
  const windows: ChartWindowConfig[] = [
    {
      id: 'w1',
      index: 0,
      symbol: 'BTCUSDT',
      assetType: 'crypto',
      timeframe: '15m',
      indicators: [],
      sync: { group: 'B', syncIndicators: false, syncCrosshair: true, syncZoom: true },
      zoomBars: 90,
    },
    {
      id: 'w2',
      index: 1,
      symbol: 'ETHUSDT',
      assetType: 'crypto',
      timeframe: '15m',
      indicators: [],
      sync: { group: 'B', syncIndicators: false, syncCrosshair: true, syncZoom: true },
      zoomBars: 90,
    },
    {
      id: 'w3',
      index: 2,
      symbol: 'SOLUSDT',
      assetType: 'crypto',
      timeframe: '15m',
      indicators: [],
      sync: { group: 'B', syncIndicators: false, syncCrosshair: true, syncZoom: false },
      zoomBars: 90,
    },
  ];

  const zoomed = propagateZoomToGroup(windows, 'w1', 50);
  assert.equal(zoomed[0].zoomBars, 50);
  assert.equal(zoomed[1].zoomBars, 50);
  assert.equal(zoomed[2].zoomBars, 90);
});
