import type { Candle } from '../types/trading';

/**
 * Resamples fine-grained OHLCV candles into exact target interval buckets (in seconds).
 * Candles must be sorted ascending by `time` (Unix seconds).
 */
export function resampleCandles(candles: Candle[], targetIntervalSec: number): Candle[] {
  if (!candles.length || targetIntervalSec <= 0) {
    return [];
  }

  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const buckets = new Map<number, Candle>();

  for (const bar of sorted) {
    const bucketTime = Math.floor(bar.time / targetIntervalSec) * targetIntervalSec;
    const existing = buckets.get(bucketTime);
    if (!existing) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      });
    } else {
      if (bar.high > existing.high) existing.high = bar.high;
      if (bar.low < existing.low) existing.low = bar.low;
      existing.close = bar.close;
      existing.volume += bar.volume;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

export interface RawAggTrade {
  p: string; // price
  q: string; // qty
  T: number; // timestamp ms
}

/**
 * Converts Binance aggregate trades into OHLCV candles of `intervalSec` seconds.
 */
export function aggTradesToCandles(trades: RawAggTrade[], intervalSec: number): Candle[] {
  if (!trades.length || intervalSec <= 0) {
    return [];
  }

  const sorted = [...trades].sort((a, b) => a.T - b.T);
  const buckets = new Map<number, Candle>();

  for (const t of sorted) {
    const price = Number(t.p);
    const qty = Number(t.q);
    if (!Number.isFinite(price) || !Number.isFinite(qty)) continue;
    const timeSec = Math.floor(t.T / 1000);
    const bucketTime = Math.floor(timeSec / intervalSec) * intervalSec;

    const existing = buckets.get(bucketTime);
    if (!existing) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: qty,
      });
    } else {
      if (price > existing.high) existing.high = price;
      if (price < existing.low) existing.low = price;
      existing.close = price;
      existing.volume += qty;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

/**
 * Expands coarse 1m candles into deterministic 10s sub-candles only if live 10s trade history
 * has fewer bars than needed to fill the initial chart screen.
 */
export function expandMinuteCandlesTo10s(minuteCandles: Candle[]): Candle[] {
  if (!minuteCandles.length) return [];
  const out: Candle[] = [];
  for (const m of minuteCandles) {
    const subCount = 6;
    const range = Math.max(m.high - m.low, m.open * 0.0002);
    const stepVol = m.volume / subCount;
    const bullish = m.close >= m.open;
    const anchors = bullish
      ? [m.open, m.low + range * 0.25, m.low, m.low + range * 0.55, m.high, m.close]
      : [m.open, m.high - range * 0.2, m.high, m.high - range * 0.6, m.low, m.close];

    for (let i = 0; i < subCount; i++) {
      const o = i === 0 ? m.open : anchors[i - 1];
      const c = anchors[i];
      const hi = Math.min(m.high, Math.max(o, c) + range * 0.12);
      const lo = Math.max(m.low, Math.min(o, c) - range * 0.12);
      out.push({
        time: m.time + i * 10,
        open: o,
        high: Math.max(hi, o, c),
        low: Math.min(lo, o, c),
        close: c,
        volume: stepVol,
      });
    }
  }
  return out;
}
