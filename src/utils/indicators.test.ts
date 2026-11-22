import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAutoFibonacci,
  calculateOscillatorDivergences,
  calculateRSI,
  calculateStochRSI,
  calculateTradersRealityMain,
  calculateVuManChuMoneyFlow,
  calculateVuManChuWaveTrend,
} from './indicators';
import { autoFibParamsFromSensitivity } from './settings';
import type { Candle } from '../types/trading';

function makeSeries(count: number): Candle[] {
  const out: Candle[] = [];
  let price = 100;
  const baseTime = 1700000000;
  for (let i = 0; i < count; i++) {
    const wave = Math.sin(i * 0.25) * 3.5 + (i % 7 === 0 ? 4 : -1);
    const open = price;
    const close = Math.max(10, price + wave);
    const high = Math.max(open, close) + 1.5;
    const low = Math.min(open, close) - 1.5;
    out.push({
      time: baseTime + i * 3600,
      open,
      high,
      low,
      close,
      volume: 1000 + (i % 12 === 0 ? 2500 : i * 10),
    });
    price = close;
  }
  return out;
}

test('RSI stays bounded within [0, 100]', () => {
  const candles = makeSeries(80);
  const { rsi } = calculateRSI(candles.map((c) => c.close), 14, 14);
  const valid = rsi.filter((v): v is number => v !== null);
  assert.ok(valid.length > 50);
  for (const v of valid) {
    assert.ok(v >= 0 && v <= 100, `RSI out of bounds: ${v}`);
  }
});

test('Stoch RSI produces K and D bounded within [0, 100]', () => {
  const candles = makeSeries(100);
  const { k, d } = calculateStochRSI(candles.map((c) => c.close), 14, 14, 3, 3);
  const validK = k.filter((v): v is number => v !== null);
  const validD = d.filter((v): v is number => v !== null);
  assert.ok(validK.length > 40);
  assert.ok(validD.length > 40);
  for (const v of validK) {
    assert.ok(v >= 0 && v <= 100);
  }
});

test('VuManChu Cipher B WaveTrend, Money Flow, StochK, and RSI compute finite series', () => {
  const candles = makeSeries(120);
  const wt = calculateVuManChuWaveTrend(candles);
  const mfi = calculateVuManChuMoneyFlow(candles);
  assert.equal(wt.wt1.length, candles.length);
  assert.equal(wt.wt2.length, candles.length);
  assert.equal(wt.vwap.length, candles.length);
  assert.equal(wt.stochK.length, candles.length);
  assert.equal(wt.rsi.length, candles.length);
  assert.equal(mfi.length, candles.length);
  assert.ok(wt.wt1.slice(-10).every((v) => v !== null && Number.isFinite(v)));
  assert.ok(mfi.slice(-10).every((v) => v !== null && Number.isFinite(v)));
  assert.ok(wt.crossUpDots.some(Boolean) || wt.crossDownDots.some(Boolean));
});

test('Traders Reality Main outputs EMAs, PVSRA, ADR, Brinks, and Psy levels', () => {
  const candles = makeSeries(120);
  const tr = calculateTradersRealityMain(candles);
  assert.equal(tr.ema5.length, candles.length);
  assert.equal(tr.ema50High.length, candles.length);
  assert.equal(tr.ema50Low.length, candles.length);
  assert.equal(tr.pvsra.length, candles.length);
  assert.ok(tr.dailyOpen !== null);
  assert.ok(tr.adrHigh !== null && tr.adrLow !== null);
  assert.ok(tr.psyLevels.length > 0);
  assert.ok(tr.pvsra.some((v) => v === 'climax_up' || v === 'climax_down' || v === 'rising_up'));
});

test('Auto Fibonacci detects exact deep swing Low->High uptrend pivots and 0.618 level', () => {
  const candles: Candle[] = [];
  const baseTime = 1700000000;
  for (let i = 0; i < 200; i++) {
    let mid: number;
    if (i <= 40) mid = 130 - (i / 40) * 30;
    else if (i <= 160) mid = 100 + ((i - 40) / 120) * 100;
    else mid = 200 - ((i - 160) / 40) * 38;
    candles.push({
      time: baseTime + i * 900,
      open: mid - 0.5,
      high: i === 160 ? 205 : mid + 1,
      low: i === 40 ? 95 : mid - 1,
      close: mid + 0.5,
      volume: 1000,
    });
  }

  const fib = calculateAutoFibonacci(candles, {
    sensitivity: 40,
    pivotDepth: 8,
    lookbackBars: 240,
    reverse: false,
    showExtensions: true,
    showGoldenPocket: true,
  });

  assert.ok(fib !== null);
  assert.equal(fib.trend, 'up');
  assert.equal(fib.startPivot.index, 40);
  assert.equal(fib.startPivot.price, 95);
  assert.equal(fib.endPivot.index, 160);
  assert.equal(fib.endPivot.price, 205);

  const lvl618 = fib.levels.find((l) => l.ratio === 0.618);
  assert.ok(lvl618);
  assert.ok(Math.abs(lvl618.price - (205 - 110 * 0.618)) < 0.01);
});

test('Auto Fibonacci detects major downtrend High->Low pivots after an earlier low', () => {
  const candles: Candle[] = [];
  const baseTime = 1700000000;
  for (let i = 0; i < 220; i++) {
    let mid: number;
    if (i <= 60) mid = 140 + (i / 60) * 110;
    else if (i <= 180) mid = 250 - ((i - 60) / 120) * 130;
    else mid = 120 + ((i - 180) / 40) * 35;
    candles.push({
      time: baseTime + i * 900,
      open: mid,
      high: i === 60 ? 250 : mid + 1,
      low: i === 180 ? 115 : mid - 1,
      close: mid,
      volume: 1000,
    });
  }

  const fib = calculateAutoFibonacci(candles, {
    sensitivity: 40,
    pivotDepth: 8,
    lookbackBars: 240,
    reverse: false,
    showExtensions: false,
    showGoldenPocket: true,
  });

  assert.ok(fib !== null);
  assert.equal(fib.trend, 'down');
  assert.equal(fib.startPivot.index, 60);
  assert.equal(fib.startPivot.price, 250);
  assert.equal(fib.endPivot.index, 180);
  assert.equal(fib.endPivot.price, 115);
});

test('Sensitivity slider maps monotonically between Swing Trading and Fast Scalp look-back windows', () => {
  const swing = autoFibParamsFromSensitivity(15);
  const balanced = autoFibParamsFromSensitivity(40);
  const scalp = autoFibParamsFromSensitivity(85);

  assert.ok(swing.lookbackBars > balanced.lookbackBars);
  assert.ok(balanced.lookbackBars > scalp.lookbackBars);
  assert.ok(swing.pivotDepth > scalp.pivotDepth);
  assert.equal(autoFibParamsFromSensitivity(0).lookbackBars, 360);
  assert.equal(autoFibParamsFromSensitivity(100).lookbackBars, 40);
});

test('High sensitivity switches Auto Fib from macro swing to recent fast scalp pivots', () => {
  const candles: Candle[] = [];
  const baseTime = 1700000000;
  for (let i = 0; i < 260; i++) {
    let mid: number;
    if (i <= 40) mid = 100 + i * 2.5; // macro peak at 40 (200)
    else if (i <= 140) mid = 200 - (i - 40) * 1.1; // macro trough at 140 (90)
    else if (i <= 185) mid = 90 + (i - 140) * 0.65; // bounce to 119.25 (<50% of macro range)
    else if (i <= 215) mid = 119.25 - (i - 185) * 0.5; // scalp trough at 215 (~104.25)
    else if (i <= 240) mid = 104.25 + (i - 215) * 1.25; // scalp peak at 240 (~135.5)
    else mid = 135.5 - (i - 240) * 0.7;
    candles.push({
      time: baseTime + i * 300,
      open: mid,
      high: i === 40 ? 205 : i === 240 ? 137 : mid + 0.5,
      low: i === 140 ? 88 : i === 215 ? 102 : mid - 0.5,
      close: mid,
      volume: 1000,
    });
  }

  const swingCfg = autoFibParamsFromSensitivity(15);
  const scalpCfg = autoFibParamsFromSensitivity(85);

  const swingFib = calculateAutoFibonacci(candles, {
    ...swingCfg,
    reverse: false,
    showExtensions: false,
    showGoldenPocket: true,
  });
  const scalpFib = calculateAutoFibonacci(candles, {
    ...scalpCfg,
    reverse: false,
    showExtensions: false,
    showGoldenPocket: true,
  });

  assert.ok(swingFib !== null && scalpFib !== null);
  assert.equal(swingFib.startPivot.index, 40);
  assert.equal(swingFib.endPivot.index, 140);
  assert.equal(scalpFib.startPivot.index, 215);
  assert.equal(scalpFib.endPivot.index, 240);
});

test('Divergence detector identifies Regular Bullish, Regular Bearish, and Hidden Bullish divergences', () => {
  const baseTime = 1700000000;
  const candles: Candle[] = Array.from({ length: 60 }, (_, i) => ({
    time: baseTime + i * 900,
    open: 100,
    high: 102,
    low: 98,
    close: 100,
    volume: 1000,
  }));
  const osc: (number | null)[] = new Array(60).fill(50);

  // Regular Bullish: Price LL (90 at 10 -> 85 at 25), Osc HL (25 at 10 -> 35 at 25)
  candles[10].low = 90;
  osc[10] = 25;
  osc[9] = 30;
  osc[11] = 30;
  candles[25].low = 85;
  osc[25] = 35;
  osc[24] = 40;
  osc[26] = 40;

  // Regular Bearish: Price HH (110 at 35 -> 115 at 50), Osc LH (80 at 35 -> 70 at 50)
  candles[35].high = 110;
  osc[35] = 80;
  osc[34] = 75;
  osc[36] = 75;
  candles[50].high = 115;
  osc[50] = 70;
  osc[49] = 65;
  osc[51] = 65;

  const divs = calculateOscillatorDivergences(candles, osc, 'rsi', {
    pivotLeft: 3,
    pivotRight: 2,
    minLookbackBars: 5,
    maxLookbackBars: 40,
    includeHidden: true,
  });

  const bull = divs.find((d) => d.kind === 'bull' && d.startIndex === 10 && d.endIndex === 25);
  const bear = divs.find((d) => d.kind === 'bear' && d.startIndex === 35 && d.endIndex === 50);
  assert.ok(bull, 'Expected regular bullish divergence at 10 -> 25');
  assert.ok(bear, 'Expected regular bearish divergence at 35 -> 50');

  // Hidden Bullish check (Price HL 85 -> 88, Osc LL 35 -> 22)
  candles[42].low = 88;
  osc[42] = 22;
  osc[41] = 28;
  osc[43] = 28;
  const divsWithHidden = calculateOscillatorDivergences(candles, osc, 'wt', {
    pivotLeft: 3,
    pivotRight: 2,
    minLookbackBars: 5,
    maxLookbackBars: 40,
    includeHidden: true,
  });
  const hBull = divsWithHidden.find((d) => d.kind === 'hidden_bull' && d.endIndex === 42);
  assert.ok(hBull, 'Expected hidden bullish divergence at 25 -> 42');

  const divsNoHidden = calculateOscillatorDivergences(candles, osc, 'wt', {
    pivotLeft: 3,
    pivotRight: 2,
    minLookbackBars: 5,
    maxLookbackBars: 40,
    includeHidden: false,
  });
  assert.equal(
    divsNoHidden.some((d) => d.kind === 'hidden_bull'),
    false
  );
});
