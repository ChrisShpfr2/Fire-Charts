import test from 'node:test';
import assert from 'node:assert/strict';
import { aggTradesToCandles, resampleCandles } from './resample';
import type { Candle } from '../types/trading';

test('resampleCandles aggregates 1m bars into exact 6m and 7m OHLCV bars', () => {
  const base = 1700000000 - (1700000000 % 3600);
  const bars: Candle[] = [];
  for (let i = 0; i < 14; i++) {
    bars.push({
      time: base + i * 60,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 101 + i,
      volume: 10,
    });
  }

  const res6m = resampleCandles(bars, 360);
  assert.equal(res6m.length, 3); // 0-5m, 6-11m, 12-13m
  assert.equal(res6m[0].open, 100);
  assert.equal(res6m[0].high, 110); // 105 + 5
  assert.equal(res6m[0].low, 95);
  assert.equal(res6m[0].close, 106); // 101 + 5
  assert.equal(res6m[0].volume, 60);

  const res7m = resampleCandles(bars, 420);
  assert.ok(res7m.length >= 2);
  assert.equal(res7m.reduce((acc, c) => acc + c.volume, 0), 140);
});

test('aggTradesToCandles groups trades into 10s buckets accurately', () => {
  const trades = [
    { p: '130.10', q: '1.5', T: 1700000001000 },
    { p: '130.50', q: '2.0', T: 1700000005000 },
    { p: '129.90', q: '0.5', T: 1700000008000 },
    { p: '131.00', q: '3.0', T: 1700000012000 },
  ];

  const candles = aggTradesToCandles(trades, 10);
  assert.equal(candles.length, 2);
  assert.equal(candles[0].open, 130.1);
  assert.equal(candles[0].high, 130.5);
  assert.equal(candles[0].low, 129.9);
  assert.equal(candles[0].close, 129.9);
  assert.equal(candles[0].volume, 4.0);
  assert.equal(candles[1].open, 131.0);
});
