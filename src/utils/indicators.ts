import type { Candle, IndicatorDefinition, TerminalSettings } from '../types/trading';
import { DEFAULT_SETTINGS } from './settings';

export const INDICATOR_CATALOG: IndicatorDefinition[] = [
  {
    id: 'traders_reality_main',
    name: 'Traders Reality Main (Pine Script)',
    shortName: 'TR Main',
    category: 'Pine Suite',
    pane: 'main',
    description:
      'Authentic PVSRA climax/rising volume vectors, unrecovered vector zones, 5/13/50/200/800 EMAs, 50 EMA High-Low cloud, ADR High/Low, Brinks Box, Sessions, Daily Open, PDH/PDL & Psy Levels.',
    paramsLabel: 'EMA 5/13/50/200/800 · PVSRA · ADR · Brinks',
  },
  {
    id: 'auto_fib',
    name: 'Auto Fibonacci Retracement (Deep Pivot)',
    shortName: 'Auto Fib',
    category: 'Pine Suite',
    pane: 'main',
    description:
      'Automatically detects confirmed macro ZigZag Swing High & Swing Low pivots across deep candle history and plots 0.236, 0.382, 0.5, 0.618–0.65 Golden Pocket, 0.786, and 1.272/1.618 extensions.',
    paramsLabel: 'Depth 8 · Lookback 240 · Golden Pocket',
  },
  {
    id: 'divergences',
    name: 'RSI & WaveTrend Divergences',
    shortName: 'RSI/WT Div',
    category: 'Pine Suite',
    pane: 'main',
    description:
      'Detects Regular & Hidden Bullish/Bearish divergences on both RSI (14) and VuManChu WaveTrend (WT2), displaying live alert blocks in the bottom Divergence Banner (keeping charts clean).',
    paramsLabel: 'RSI + WT2 · Banner Blocks',
  },
  {
    id: 'vumanchu_wavetrend',
    name: 'VuManChu WaveTrend (Cipher B)',
    shortName: 'VMC WT',
    category: 'Pine Suite',
    pane: 'vumanchu',
    description:
      'VuManChu Cipher B WaveTrend two-tone blue oscillator (WT1, WT2, silver wtVwap wave), Stoch/RSI overlay, OB/OS lines (±60/±80), and crossover dots.',
    paramsLabel: 'chLen 9 · avgLen 12 · maLen 3',
  },
  {
    id: 'vumanchu_moneyflow',
    name: 'VuManChu Money Flow (Cipher B MFI)',
    shortName: 'VMC MFI',
    category: 'Pine Suite',
    pane: 'vumanchu',
    description:
      'VuManChu Cipher B f_rsimfi green/red institutional liquidity cloud with bottom green/red trend ribbon.',
    paramsLabel: 'period 60 · mult 150 · yPos 2.5',
  },
  {
    id: 'stoch_rsi',
    name: 'Stochastic RSI (Separate Pane)',
    shortName: 'Stoch RSI',
    category: 'Momentum',
    pane: 'stoch_rsi',
    description:
      'Stochastic oscillator applied to RSI values (%K fast and %D signal) with 20/80 oversold and overbought zones.',
    paramsLabel: '14 · 14 · 3 · 3',
  },
  {
    id: 'rsi',
    name: 'Relative Strength Index (Separate Pane)',
    shortName: 'RSI',
    category: 'Momentum',
    pane: 'rsi',
    description:
      'Wilder smoothed RSI momentum oscillator with 14-period moving average and 30/70 thresholds.',
    paramsLabel: '14 · Wilder RMA · MA 14',
  },
  {
    id: 'ema_ribbon',
    name: 'EMA Ribbon (9 / 21 / 50 / 200)',
    shortName: 'EMA 9/21/50/200',
    category: 'Trend',
    pane: 'main',
    description: 'Four exponential moving averages for multi-horizon trend alignment.',
    paramsLabel: '9 · 21 · 50 · 200',
  },
  {
    id: 'bollinger_bands',
    name: 'Bollinger Bands',
    shortName: 'BB (20,2)',
    category: 'Volatility',
    pane: 'main',
    description: '20-period SMA basis with ±2 standard deviation upper and lower volatility bands.',
    paramsLabel: '20 · 2.0σ',
  },
  {
    id: 'vwap',
    name: 'Session VWAP',
    shortName: 'VWAP',
    category: 'Volume',
    pane: 'main',
    description: 'Daily reset Volume Weighted Average Price institutional fair-value anchor.',
    paramsLabel: 'Daily Session',
  },
  {
    id: 'macd',
    name: 'MACD',
    shortName: 'MACD',
    category: 'Momentum',
    pane: 'macd',
    description: 'Moving Average Convergence Divergence with signal line and momentum histogram.',
    paramsLabel: '12 · 26 · 9',
  },
  {
    id: 'volume',
    name: 'Volume Histogram',
    shortName: 'Vol',
    category: 'Volume',
    pane: 'main',
    description: 'Base volume histogram colored Kiwi Green on up bars and Slate Grey on down bars.',
    paramsLabel: '20 MA overlay',
  },
  {
    id: 'atr',
    name: 'Average True Range (ATR)',
    shortName: 'ATR',
    category: 'Volatility',
    pane: 'atr',
    description: 'Wilder Average True Range measuring absolute price volatility per bar.',
    paramsLabel: '14',
  },
];

export function calculateSMA(values: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  let count = 0;
  const queue: (number | null)[] = [];

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    queue.push(v);
    if (v !== null && Number.isFinite(v)) {
      sum += v;
      count++;
    }
    if (queue.length > period) {
      const removed = queue.shift() ?? null;
      if (removed !== null && Number.isFinite(removed)) {
        sum -= removed;
        count--;
      }
    }
    if (queue.length === period && count === period) {
      out[i] = sum / period;
    }
  }
  return out;
}

export function calculateEMA(values: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length === 0) return out;

  const k = 2 / (period + 1);
  let ema: number | null = null;
  let seedSum = 0;
  let seedCount = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null || !Number.isFinite(v)) {
      out[i] = ema;
      continue;
    }

    if (ema === null) {
      seedSum += v;
      seedCount++;
      if (seedCount === period) {
        ema = seedSum / period;
        out[i] = ema;
      } else {
        out[i] = seedSum / seedCount;
      }
    } else {
      ema = v * k + ema * (1 - k);
      out[i] = ema;
    }
  }
  return out;
}

export function calculateRMA(values: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length === 0) return out;

  const alpha = 1 / period;
  let rma: number | null = null;
  let sum = 0;
  let count = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null || !Number.isFinite(v)) continue;
    if (rma === null) {
      sum += v;
      count++;
      if (count === period) {
        rma = sum / period;
        out[i] = rma;
      }
    } else {
      rma = alpha * v + (1 - alpha) * rma;
      out[i] = rma;
    }
  }
  return out;
}

export interface RSIResult {
  rsi: (number | null)[];
  ma: (number | null)[];
}

export function calculateRSI(closes: number[], period = 14, maPeriod = 14): RSIResult {
  const n = closes.length;
  const gains: (number | null)[] = new Array(n).fill(null);
  const losses: (number | null)[] = new Array(n).fill(null);

  for (let i = 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    gains[i] = diff > 0 ? diff : 0;
    losses[i] = diff < 0 ? -diff : 0;
  }

  const avgGain = calculateRMA(gains, period);
  const avgLoss = calculateRMA(losses, period);

  const rsi: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const g = avgGain[i];
    const l = avgLoss[i];
    if (g === null || l === null) continue;
    if (l === 0) {
      rsi[i] = g === 0 ? 50 : 100;
    } else {
      const rs = g / l;
      rsi[i] = Math.max(0, Math.min(100, 100 - 100 / (1 + rs)));
    }
  }

  const ma = calculateSMA(rsi, maPeriod);
  return { rsi, ma };
}

export interface StochRSIResult {
  k: (number | null)[];
  d: (number | null)[];
}

export function calculateStochRSI(
  closes: number[],
  rsiLen = 14,
  stochLen = 14,
  kSmooth = 3,
  dSmooth = 3
): StochRSIResult {
  const { rsi } = calculateRSI(closes, rsiLen, 1);
  const rawStoch: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = 0; i < rsi.length; i++) {
    if (rsi[i] === null) continue;
    let lowest = Infinity;
    let highest = -Infinity;
    let validCount = 0;

    for (let j = Math.max(0, i - stochLen + 1); j <= i; j++) {
      const v = rsi[j];
      if (v !== null) {
        if (v < lowest) lowest = v;
        if (v > highest) highest = v;
        validCount++;
      }
    }

    if (validCount >= Math.min(stochLen, 4)) {
      const span = highest - lowest;
      const val = span === 0 ? 50 : ((rsi[i]! - lowest) / span) * 100;
      rawStoch[i] = Math.max(0, Math.min(100, val));
    }
  }

  const k = calculateSMA(rawStoch, kSmooth).map((v) =>
    v === null ? null : Math.max(0, Math.min(100, v))
  );
  const d = calculateSMA(k, dSmooth).map((v) =>
    v === null ? null : Math.max(0, Math.min(100, v))
  );
  return { k, d };
}

export interface VuManChuWaveTrendResult {
  wt1: (number | null)[];
  wt2: (number | null)[];
  vwap: (number | null)[];
  buySignals: boolean[]; // Large green dot (cross up in oversold)
  sellSignals: boolean[]; // Large red dot (cross down in overbought)
  crossUpDots: boolean[]; // Small green dot on all cross ups
  crossDownDots: boolean[]; // Small red dot on all cross downs
  topOverboughtDots: boolean[]; // Small dark-red dots at +104 when wt2 >= obLevel2
  stochK: (number | null)[];
  stochD: (number | null)[];
  rsi: (number | null)[];
}

/**
 * Authentic VuManChu Cipher B + Divergences WaveTrend oscillator.
 * Pine formula:
 *   ap = hlc3
 *   esa = ema(ap, wtChannelLen)
 *   de = ema(abs(ap - esa), wtChannelLen)
 *   ci = (ap - esa) / (0.015 * de)
 *   wt1 = ema(ci, wtAverageLen)
 *   wt2 = sma(wt1, wtMALen)
 *   wtVwap = wt1 - wt2
 */
export function calculateVuManChuWaveTrend(
  candles: Candle[],
  chLen = 9,
  avgLen = 12,
  maLen = 3,
  obLevel1 = 60,
  obLevel2 = 80,
  osLevel1 = -60,
  rsiLen = 14,
  stochLen = 14,
  stochKLen = 3,
  stochDLen = 3
): VuManChuWaveTrendResult {
  const n = candles.length;
  const ap = candles.map((c) => (c.high + c.low + c.close) / 3);
  const esa = calculateEMA(ap, chLen);

  const absDiff = ap.map((v, i) => (esa[i] !== null ? Math.abs(v - esa[i]!) : null));
  const de = calculateEMA(absDiff, chLen);

  const ci: (number | null)[] = ap.map((v, i) => {
    if (esa[i] === null || de[i] === null || de[i] === 0) return 0;
    return (v - esa[i]!) / (0.015 * de[i]!);
  });

  const wt1 = calculateEMA(ci, avgLen);
  const wt2 = calculateSMA(wt1, maLen);
  const vwap = wt1.map((v, i) => (v !== null && wt2[i] !== null ? v - wt2[i]! : null));

  const buySignals: boolean[] = new Array(n).fill(false);
  const sellSignals: boolean[] = new Array(n).fill(false);
  const crossUpDots: boolean[] = new Array(n).fill(false);
  const crossDownDots: boolean[] = new Array(n).fill(false);
  const topOverboughtDots: boolean[] = new Array(n).fill(false);

  for (let i = 1; i < n; i++) {
    const prev1 = wt1[i - 1];
    const prev2 = wt2[i - 1];
    const cur1 = wt1[i];
    const cur2 = wt2[i];
    if (prev1 === null || prev2 === null || cur1 === null || cur2 === null) continue;

    const crossedUp = prev1 <= prev2 && cur1 > cur2;
    const crossedDown = prev1 >= prev2 && cur1 < cur2;

    if (crossedUp) {
      crossUpDots[i] = true;
      if (cur2 <= osLevel1 || cur2 <= -53) {
        buySignals[i] = true;
      }
    }
    if (crossedDown) {
      crossDownDots[i] = true;
      if (cur2 >= obLevel1 || cur2 >= 53) {
        sellSignals[i] = true;
      }
    }
    if (cur2 >= obLevel2 && crossedDown) {
      topOverboughtDots[i] = true;
    }
  }

  const closes = candles.map((c) => c.close);
  const stoch = calculateStochRSI(closes, rsiLen, stochLen, stochKLen, stochDLen);
  const { rsi } = calculateRSI(closes, rsiLen, 1);

  return {
    wt1,
    wt2,
    vwap,
    buySignals,
    sellSignals,
    crossUpDots,
    crossDownDots,
    topOverboughtDots,
    stochK: stoch.k,
    stochD: stoch.d,
    rsi,
  };
}

/**
 * Authentic VuManChu Cipher B Money Flow (f_rsimfi).
 * Pine formula:
 *   f_rsimfi(_period, _multiplier, _tf) =>
 *     sma(((close - open) / (high - low)) * _multiplier, _period) - rsiMFIPosY
 */
export function calculateVuManChuMoneyFlow(
  candles: Candle[],
  period = 60,
  multiplier = 150,
  yPos = 2.5
): (number | null)[] {
  const raw = candles.map((c) => {
    const range = c.high - c.low;
    if (range <= 0) return 0;
    return ((c.close - c.open) / range) * multiplier;
  });

  const out: (number | null)[] = new Array(candles.length).fill(null);
  let sum = 0;
  for (let i = 0; i < raw.length; i++) {
    sum += raw[i];
    if (i >= period) {
      sum -= raw[i - period];
      out[i] = sum / period - yPos;
    } else {
      // Smooth early bars so the full chart shows continuous liquidity flow
      out[i] = sum / (i + 1) - yPos;
    }
  }
  return out;
}

export type PvsraColor = 'none' | 'climax_up' | 'climax_down' | 'rising_up' | 'rising_down';

export interface SessionSpan {
  name: 'Asia' | 'London' | 'NY' | 'Brinks';
  startIdx: number;
  endIdx: number;
  high: number;
  low: number;
  color: string;
}

export interface VectorZone {
  startIdx: number;
  endIdx: number;
  high: number;
  low: number;
  direction: 'up' | 'down';
  kind: 'climax' | 'rising';
}

export interface TradersRealityResult {
  ema5: (number | null)[];
  ema13: (number | null)[];
  ema50: (number | null)[];
  ema50High: (number | null)[];
  ema50Low: (number | null)[];
  ema200: (number | null)[];
  ema800: (number | null)[];
  pvsra: PvsraColor[];
  vectorZones: VectorZone[];
  dailyOpen: number | null;
  prevDayHigh: number | null;
  prevDayLow: number | null;
  adrHigh: number | null;
  adrLow: number | null;
  psyLevels: number[];
  sessions: SessionSpan[];
  brinksBoxes: SessionSpan[];
}

/**
 * Traders Reality Main (Infernco / Traders Reality) Pine Script logic:
 * - PVSRA: av = sma(volume[1], 10), value2 = volume*(high-low), hivalue2 = highest(value2[1], 10)
 * - Unrecovered Vector Candle Zones (imbalance zones until price sweeps through)
 * - 5 / 13 / 50 (with High-Low cloud) / 200 / 800 EMA stack
 * - Daily Open, Prev Day High/Low, ADR High/Low, Psychological 00/50 levels
 * - Asian (00-08), London (07-16), NY (13-21) Sessions + Brinks Boxes (08-09 & 14-15 UTC)
 */
export function calculateTradersRealityMain(
  candles: Candle[],
  cfg: TerminalSettings['tradersReality'] = DEFAULT_SETTINGS.tradersReality
): TradersRealityResult {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const ema5 = calculateEMA(closes, cfg.ema5Len);
  const ema13 = calculateEMA(closes, cfg.ema13Len);
  const ema50 = calculateEMA(closes, cfg.ema50Len);
  const ema50High = calculateEMA(highs, cfg.ema50Len);
  const ema50Low = calculateEMA(lows, cfg.ema50Len);
  const ema200 = calculateEMA(closes, cfg.ema200Len);
  const ema800 = calculateEMA(closes, cfg.ema800Len);

  // Exact PVSRA Vector calculation (previous 10-bar volume & value2)
  const pvsra: PvsraColor[] = new Array(candles.length).fill('none');
  for (let i = 0; i < candles.length; i++) {
    const start = Math.max(0, i - 10);
    let volSum = 0;
    let count = 0;
    let maxVal = 0;
    for (let j = start; j < i; j++) {
      volSum += candles[j].volume;
      count++;
      const spreadVal = candles[j].volume * (candles[j].high - candles[j].low);
      if (spreadVal > maxVal) maxVal = spreadVal;
    }
    const avgVol = count > 0 ? volSum / count : candles[i].volume;
    const curSpreadVal = candles[i].volume * (candles[i].high - candles[i].low);
    const isUp = candles[i].close >= candles[i].open;

    if (
      avgVol > 0 &&
      (candles[i].volume >= cfg.pvsraClimaxMult * avgVol || (count >= 5 && curSpreadVal >= maxVal))
    ) {
      pvsra[i] = isUp ? 'climax_up' : 'climax_down';
    } else if (avgVol > 0 && candles[i].volume >= cfg.pvsraRisingMult * avgVol) {
      pvsra[i] = isUp ? 'rising_up' : 'rising_down';
    }
  }

  // Unrecovered Vector Candle Zones (price imbalance zones)
  const vectorZones: VectorZone[] = [];
  for (let i = 0; i < candles.length - 1; i++) {
    const pv = pvsra[i];
    if (pv === 'none') continue;
    const bodyHi = Math.max(candles[i].open, candles[i].close);
    const bodyLo = Math.min(candles[i].open, candles[i].close);
    if (bodyHi <= bodyLo) continue;

    const isBull = pv === 'climax_up' || pv === 'rising_up';
    let recovered = false;
    let endIdx = candles.length - 1;
    for (let j = i + 1; j < candles.length; j++) {
      if (isBull && candles[j].low <= bodyLo) {
        recovered = true;
        endIdx = j;
        break;
      }
      if (!isBull && candles[j].high >= bodyHi) {
        recovered = true;
        endIdx = j;
        break;
      }
    }
    if (!recovered) {
      vectorZones.push({
        startIdx: i,
        endIdx,
        high: bodyHi,
        low: bodyLo,
        direction: isBull ? 'up' : 'down',
        kind: pv === 'climax_up' || pv === 'climax_down' ? 'climax' : 'rising',
      });
    }
  }

  // Daily buckets for Daily Open, Previous Day High/Low, and ADR
  let dailyOpen: number | null = null;
  let prevDayHigh: number | null = null;
  let prevDayLow: number | null = null;
  let adrHigh: number | null = null;
  let adrLow: number | null = null;

  if (candles.length > 0) {
    const dayMap = new Map<number, { open: number; high: number; low: number }>();
    for (const c of candles) {
      const day = Math.floor(c.time / 86400);
      const ex = dayMap.get(day);
      if (!ex) {
        dayMap.set(day, { open: c.open, high: c.high, low: c.low });
      } else {
        if (c.high > ex.high) ex.high = c.high;
        if (c.low < ex.low) ex.low = c.low;
      }
    }
    const days = Array.from(dayMap.entries()).sort((a, b) => a[0] - b[0]);
    const today = days[days.length - 1]?.[1];
    if (today) {
      dailyOpen = today.open;
    }
    if (days.length >= 2) {
      const prev = days[days.length - 2][1];
      prevDayHigh = prev.high;
      prevDayLow = prev.low;
    }

    // ADR over prior completed days (or available days)
    const completed = days.length > 1 ? days.slice(0, -1) : days;
    const recent = completed.slice(-14);
    if (recent.length > 0 && today) {
      const avgRange =
        recent.reduce((acc, [, d]) => acc + (d.high - d.low), 0) / recent.length;
      if (avgRange > 0) {
        adrHigh = today.low + avgRange;
        adrLow = today.high - avgRange;
      }
    }
  }

  // Psychological Levels near current price
  const psyLevels: number[] = [];
  if (candles.length > 0) {
    const lastPrice = candles[candles.length - 1].close;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(lastPrice, 1e-6))));
    const step = lastPrice > 10000 ? 1000 : lastPrice > 1000 ? 100 : lastPrice > 100 ? 5 : mag * 0.5;
    const base = Math.floor(lastPrice / step) * step;
    for (let k = -1; k <= 1; k++) {
      const lvl = Number((base + k * step).toFixed(6));
      if (lvl > 0) psyLevels.push(lvl);
    }
  }

  const buildBoxes = (
    defs: Array<{ name: SessionSpan['name']; startH: number; endH: number; color: string }>
  ): SessionSpan[] => {
    const out: SessionSpan[] = [];
    for (const def of defs) {
      let activeStart: number | null = null;
      let activeDay: number | null = null;
      let hi = -Infinity;
      let lo = Infinity;

      for (let i = 0; i < candles.length; i++) {
        const d = new Date(candles[i].time * 1000);
        const hr = d.getUTCHours();
        const day = Math.floor(candles[i].time / 86400);
        const inSession = hr >= def.startH && hr < def.endH;

        if (inSession) {
          if (activeStart === null || activeDay !== day) {
            if (activeStart !== null && i - 1 >= activeStart) {
              out.push({
                name: def.name,
                startIdx: activeStart,
                endIdx: i - 1,
                high: hi,
                low: lo,
                color: def.color,
              });
            }
            activeStart = i;
            activeDay = day;
            hi = candles[i].high;
            lo = candles[i].low;
          } else {
            if (candles[i].high > hi) hi = candles[i].high;
            if (candles[i].low < lo) lo = candles[i].low;
          }
        } else if (activeStart !== null) {
          out.push({
            name: def.name,
            startIdx: activeStart,
            endIdx: i - 1,
            high: hi,
            low: lo,
            color: def.color,
          });
          activeStart = null;
          activeDay = null;
        }
      }

      if (activeStart !== null && candles.length - 1 >= activeStart) {
        out.push({
          name: def.name,
          startIdx: activeStart,
          endIdx: candles.length - 1,
          high: hi,
          low: lo,
          color: def.color,
        });
      }
    }
    return out.slice(-12);
  };

  const sessions = buildBoxes([
    { name: 'Asia', startH: 0, endH: 8, color: 'rgba(56, 189, 248, 0.08)' },
    { name: 'London', startH: 7, endH: 16, color: 'rgba(168, 85, 247, 0.08)' },
    { name: 'NY', startH: 13, endH: 21, color: 'rgba(250, 204, 21, 0.08)' },
  ]);

  const brinksBoxes = buildBoxes([
    { name: 'Brinks', startH: 8, endH: 9, color: 'rgba(251, 146, 60, 0.14)' },
    { name: 'Brinks', startH: 14, endH: 15, color: 'rgba(251, 146, 60, 0.14)' },
  ]);

  return {
    ema5,
    ema13,
    ema50,
    ema50High,
    ema50Low,
    ema200,
    ema800,
    pvsra,
    vectorZones: vectorZones.slice(-10),
    dailyOpen,
    prevDayHigh,
    prevDayLow,
    adrHigh,
    adrLow,
    psyLevels,
    sessions,
    brinksBoxes,
  };
}

export interface BollingerResult {
  basis: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

export function calculateBollingerBands(
  closes: number[],
  period = 20,
  mult = 2
): BollingerResult {
  const basis = calculateSMA(closes, period);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const mean = basis[i];
    if (mean === null) continue;
    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - mean;
      sqSum += diff * diff;
    }
    const std = Math.sqrt(sqSum / period);
    upper[i] = mean + mult * std;
    lower[i] = mean - mult * std;
  }

  return { basis, upper, lower };
}

export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function calculateMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signalLen = 9
): MACDResult {
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);
  const macd = closes.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null ? emaFast[i]! - emaSlow[i]! : null
  );
  const signal = calculateEMA(macd, signalLen);
  const histogram = macd.map((v, i) =>
    v !== null && signal[i] !== null ? v - signal[i]! : null
  );
  return { macd, signal, histogram };
}

export function calculateVWAP(candles: Candle[]): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  let cumPV = 0;
  let cumV = 0;
  let curDay = -1;

  for (let i = 0; i < candles.length; i++) {
    const day = Math.floor(candles[i].time / 86400);
    if (day !== curDay) {
      curDay = day;
      cumPV = 0;
      cumV = 0;
    }
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const vol = Math.max(candles[i].volume, 0.0001);
    cumPV += tp * vol;
    cumV += vol;
    out[i] = cumPV / cumV;
  }
  return out;
}

export function calculateATR(candles: Candle[], period = 14): (number | null)[] {
  const tr: (number | null)[] = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    );
  });
  return calculateRMA(tr, period);
}

export interface FibPivot {
  index: number;
  time: number;
  price: number;
  type: 'high' | 'low';
}

export interface FibLevel {
  ratio: number;
  label: string;
  price: number;
  color: string;
  isGolden?: boolean;
  isExtension?: boolean;
}

export interface AutoFibResult {
  startPivot: FibPivot;
  endPivot: FibPivot;
  trend: 'up' | 'down';
  levels: FibLevel[];
  goldenPocketTop: number;
  goldenPocketBottom: number;
}

/**
 * TradingView-style Automatic Fibonacci Retracement using confirmed symmetric
 * Pivot High / Pivot Low detection + alternating ZigZag filtering over a deep lookback.
 */
export function calculateAutoFibonacci(
  candles: Candle[],
  cfg: TerminalSettings['autoFib'] = DEFAULT_SETTINGS.autoFib
): AutoFibResult | null {
  if (candles.length < 15) return null;

  const lookback = Math.max(30, Math.min(candles.length, cfg.lookbackBars));
  const startIdx = candles.length - lookback;
  const depth = Math.max(2, Math.min(cfg.pivotDepth, Math.floor(lookback / 6)));

  const rawPivots: FibPivot[] = [];
  for (let i = startIdx + depth; i <= candles.length - 1 - depth; i++) {
    let isHigh = true;
    let isLow = true;
    const h = candles[i].high;
    const l = candles[i].low;

    for (let j = i - depth; j <= i + depth; j++) {
      if (j === i) continue;
      if (j < i) {
        if (candles[j].high > h) isHigh = false;
        if (candles[j].low < l) isLow = false;
      } else {
        if (candles[j].high >= h) isHigh = false;
        if (candles[j].low <= l) isLow = false;
      }
      if (!isHigh && !isLow) break;
    }

    if (isHigh) {
      rawPivots.push({ index: i, time: candles[i].time, price: h, type: 'high' });
    }
    if (isLow) {
      rawPivots.push({ index: i, time: candles[i].time, price: l, type: 'low' });
    }
  }

  // Alternating ZigZag filter
  const zigzag: FibPivot[] = [];
  for (const p of rawPivots) {
    const prev = zigzag[zigzag.length - 1];
    if (!prev) {
      zigzag.push(p);
    } else if (prev.type === p.type) {
      if (p.type === 'high' && p.price > prev.price) {
        zigzag[zigzag.length - 1] = p;
      } else if (p.type === 'low' && p.price < prev.price) {
        zigzag[zigzag.length - 1] = p;
      }
    } else {
      zigzag.push(p);
    }
  }

  // Global extremes inside lookback (also capturing unconfirmed edge breakouts)
  let absHigh: FibPivot = {
    index: startIdx,
    time: candles[startIdx].time,
    price: candles[startIdx].high,
    type: 'high',
  };
  let absLow: FibPivot = {
    index: startIdx,
    time: candles[startIdx].time,
    price: candles[startIdx].low,
    type: 'low',
  };
  for (let i = startIdx + 1; i < candles.length; i++) {
    if (candles[i].high >= absHigh.price) {
      absHigh = { index: i, time: candles[i].time, price: candles[i].high, type: 'high' };
    }
    if (candles[i].low <= absLow.price) {
      absLow = { index: i, time: candles[i].time, price: candles[i].low, type: 'low' };
    }
  }

  // Prefer confirmed ZigZag extreme if within 0.25% of global extreme
  const confirmedHighs = zigzag.filter((p) => p.type === 'high');
  const confirmedLows = zigzag.filter((p) => p.type === 'low');
  if (confirmedHighs.length > 0) {
    const bestConfirmedH = confirmedHighs.reduce((a, b) => (b.price > a.price ? b : a));
    if (bestConfirmedH.price >= absHigh.price * 0.9975) {
      absHigh = bestConfirmedH;
    }
  }
  if (confirmedLows.length > 0) {
    const bestConfirmedL = confirmedLows.reduce((a, b) => (b.price < a.price ? b : a));
    if (bestConfirmedL.price <= absLow.price * 1.0025) {
      absLow = bestConfirmedL;
    }
  }

  const totalSpan = absHigh.price - absLow.price;
  if (totalSpan <= 0) return null;

  const isScalpMode = (cfg.sensitivity ?? 40) >= 65 || lookback <= 115;

  // Check if a major counter-swing occurred after the latest extreme,
  // or in Fast Scalp mode prioritize the most recent confirmed ZigZag impulse leg.
  let startPivot: FibPivot = absHigh.index > absLow.index ? absLow : absHigh;
  let endPivot: FibPivot = absHigh.index > absLow.index ? absHigh : absLow;

  let usedScalpLeg = false;
  if (isScalpMode && zigzag.length >= 2) {
    const legStart = zigzag[zigzag.length - 2];
    let legEnd = zigzag[zigzag.length - 1];
    // Extend legEnd if price pushed further in the same direction after confirmation
    for (let i = legEnd.index + 1; i < candles.length; i++) {
      if (legEnd.type === 'high' && candles[i].high > legEnd.price) {
        legEnd = { index: i, time: candles[i].time, price: candles[i].high, type: 'high' };
      } else if (legEnd.type === 'low' && candles[i].low < legEnd.price) {
        legEnd = { index: i, time: candles[i].time, price: candles[i].low, type: 'low' };
      }
    }
    if (Math.abs(legEnd.price - legStart.price) >= totalSpan * 0.25) {
      startPivot = legStart;
      endPivot = legEnd;
      usedScalpLeg = true;
    }
  }

  if (!usedScalpLeg) {
    const laterIdx = Math.max(absHigh.index, absLow.index);
    if (laterIdx < candles.length - depth) {
      if (laterIdx === absLow.index) {
        // Price bottomed at absLow; check for major rally high after absLow
        let postHigh = candles[laterIdx].high;
        let postHighIdx = laterIdx;
        for (let i = laterIdx + 1; i < candles.length; i++) {
          if (candles[i].high >= postHigh) {
            postHigh = candles[i].high;
            postHighIdx = i;
          }
        }
        const confirmedPost = confirmedHighs.filter((h) => h.index > laterIdx);
        const bestPost =
          confirmedPost.length > 0
            ? confirmedPost.reduce((a, b) => (b.price > a.price ? b : a))
            : { index: postHighIdx, time: candles[postHighIdx].time, price: postHigh, type: 'high' as const };
        if (bestPost.price - absLow.price >= totalSpan * 0.5 && bestPost.index > absLow.index) {
          startPivot = absLow;
          endPivot = bestPost;
        }
      } else {
        // Price topped at absHigh; check for major selloff low after absHigh
        let postLow = candles[laterIdx].low;
        let postLowIdx = laterIdx;
        for (let i = laterIdx + 1; i < candles.length; i++) {
          if (candles[i].low <= postLow) {
            postLow = candles[i].low;
            postLowIdx = i;
          }
        }
        const confirmedPost = confirmedLows.filter((l) => l.index > laterIdx);
        const bestPost =
          confirmedPost.length > 0
            ? confirmedPost.reduce((a, b) => (b.price < a.price ? b : a))
            : { index: postLowIdx, time: candles[postLowIdx].time, price: postLow, type: 'low' as const };
        if (absHigh.price - bestPost.price >= totalSpan * 0.5 && bestPost.index > absHigh.index) {
          startPivot = absHigh;
          endPivot = bestPost;
        }
      }
    }
  }

  const trend: 'up' | 'down' = endPivot.price >= startPivot.price ? 'up' : 'down';
  const highP = Math.max(startPivot.price, endPivot.price);
  const lowP = Math.min(startPivot.price, endPivot.price);
  const legSpan = highP - lowP;
  if (legSpan <= 0) return null;

  // In TV Auto Fib (reverse = false):
  // Uptrend (Low -> High): 0 at High, 1 at Low (measures retracement down from High)
  // Downtrend (High -> Low): 0 at Low, 1 at High (measures bounce up from Low)
  const priceForRatio = (ratio: number): number => {
    const r = cfg.reverse ? 1 - ratio : ratio;
    return trend === 'up' ? highP - legSpan * r : lowP + legSpan * r;
  };

  const baseDefs: Array<{ ratio: number; label: string; color: string; isGolden?: boolean }> = [
    { ratio: 0, label: '0', color: '#94A3B8' },
    { ratio: 0.236, label: '0.236', color: '#F87171' },
    { ratio: 0.382, label: '0.382', color: '#FB923C' },
    { ratio: 0.5, label: '0.5', color: '#8EE53F' },
    { ratio: 0.618, label: '0.618', color: '#FACC15', isGolden: true },
    { ratio: 0.65, label: '0.65', color: '#F59E0B', isGolden: true },
    { ratio: 0.786, label: '0.786', color: '#38BDF8' },
    { ratio: 1, label: '1', color: '#94A3B8' },
  ];

  const levels: FibLevel[] = baseDefs.map((d) => ({
    ratio: d.ratio,
    label: d.label,
    price: priceForRatio(d.ratio),
    color: d.color,
    isGolden: d.isGolden,
  }));

  if (cfg.showExtensions) {
    const ext1272 = trend === 'up' ? highP + legSpan * 0.272 : lowP - legSpan * 0.272;
    const ext1618 = trend === 'up' ? highP + legSpan * 0.618 : lowP - legSpan * 0.618;
    levels.push(
      {
        ratio: 1.272,
        label: '1.272 Ext',
        price: ext1272,
        color: '#C084FC',
        isExtension: true,
      },
      {
        ratio: 1.618,
        label: '1.618 Ext',
        price: ext1618,
        color: '#E879F9',
        isExtension: true,
      }
    );
  }

  const p618 = priceForRatio(0.618);
  const p65 = priceForRatio(0.65);

  return {
    startPivot,
    endPivot,
    trend,
    levels,
    goldenPocketTop: Math.max(p618, p65),
    goldenPocketBottom: Math.min(p618, p65),
  };
}

export type DivergenceSource = 'rsi' | 'wt';
export type DivergenceKind = 'bull' | 'bear' | 'hidden_bull' | 'hidden_bear';

export interface OscillatorDivergence {
  source: DivergenceSource;
  kind: DivergenceKind;
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  startOsc: number;
  endOsc: number;
  startPrice: number;
  endPrice: number;
}

export interface DivergenceOptions {
  pivotLeft?: number;
  pivotRight?: number;
  minLookbackBars?: number;
  maxLookbackBars?: number;
  includeHidden?: boolean;
}

/**
 * TradingView-style Oscillator Divergence engine (for RSI and VuManChu WaveTrend WT2):
 * Confirms local oscillator pivot highs & lows (pivotLeft / pivotRight), then checks the
 * previous pivot(s) within [minLookbackBars, maxLookbackBars] against price Highs/Lows:
 *  - Regular Bullish: Price Lower Low + Oscillator Higher Low
 *  - Regular Bearish: Price Higher High + Oscillator Lower High
 *  - Hidden Bullish:  Price Higher Low + Oscillator Lower Low
 *  - Hidden Bearish:  Price Lower High + Oscillator Higher High
 */
export function calculateOscillatorDivergences(
  candles: Candle[],
  osc: (number | null)[],
  source: DivergenceSource,
  opts: DivergenceOptions = {}
): OscillatorDivergence[] {
  const n = Math.min(candles.length, osc.length);
  if (n < 15) return [];

  const lbL = Math.max(2, opts.pivotLeft ?? 5);
  const lbR = Math.max(1, opts.pivotRight ?? 3);
  const minGap = Math.max(3, opts.minLookbackBars ?? 5);
  const maxGap = Math.max(minGap + 5, opts.maxLookbackBars ?? 60);
  const includeHidden = opts.includeHidden ?? true;

  const pivotLows: number[] = [];
  const pivotHighs: number[] = [];

  for (let i = lbL; i <= n - 1 - lbR; i++) {
    const val = osc[i];
    if (val === null || !Number.isFinite(val)) continue;

    let isLow = true;
    let isHigh = true;
    for (let j = i - lbL; j <= i + lbR; j++) {
      if (j === i) continue;
      const other = osc[j];
      if (other === null || !Number.isFinite(other)) {
        isLow = false;
        isHigh = false;
        break;
      }
      if (other <= val) isLow = false;
      if (other >= val) isHigh = false;
      if (!isLow && !isHigh) break;
    }

    if (isLow) pivotLows.push(i);
    if (isHigh) pivotHighs.push(i);
  }

  const out: OscillatorDivergence[] = [];
  const minOscDelta = source === 'rsi' ? 3.0 : 6.0;
  const minCooldownBars = 8;

  // Bullish (Regular & Hidden) on Pivot Lows
  let lastBullEnd = -999;
  for (let k = 1; k < pivotLows.length; k++) {
    const cur = pivotLows[k];
    if (cur - lastBullEnd < minCooldownBars) continue;
    const curOsc = osc[cur]!;
    const curPrice = candles[cur].low;

    const minM = Math.max(0, k - 3);
    for (let m = k - 1; m >= minM; m--) {
      const prev = pivotLows[m];
      const gap = cur - prev;
      if (gap < minGap) continue;
      if (gap > maxGap) break;

      const prevOsc = osc[prev]!;
      const prevPrice = candles[prev].low;
      if (Math.abs(curOsc - prevOsc) < minOscDelta) continue;

      if (curPrice < prevPrice && curOsc > prevOsc) {
        out.push({
          source,
          kind: 'bull',
          startIndex: prev,
          endIndex: cur,
          startTime: candles[prev].time,
          endTime: candles[cur].time,
          startOsc: prevOsc,
          endOsc: curOsc,
          startPrice: prevPrice,
          endPrice: curPrice,
        });
        lastBullEnd = cur;
        break;
      }

      // Only check immediate consecutive pivot for hidden divergences to prevent chop spam
      if (includeHidden && m === k - 1 && curPrice > prevPrice && curOsc < prevOsc) {
        out.push({
          source,
          kind: 'hidden_bull',
          startIndex: prev,
          endIndex: cur,
          startTime: candles[prev].time,
          endTime: candles[cur].time,
          startOsc: prevOsc,
          endOsc: curOsc,
          startPrice: prevPrice,
          endPrice: curPrice,
        });
        lastBullEnd = cur;
        break;
      }
    }
  }

  // Bearish (Regular & Hidden) on Pivot Highs
  let lastBearEnd = -999;
  for (let k = 1; k < pivotHighs.length; k++) {
    const cur = pivotHighs[k];
    if (cur - lastBearEnd < minCooldownBars) continue;
    const curOsc = osc[cur]!;
    const curPrice = candles[cur].high;

    const minM = Math.max(0, k - 3);
    for (let m = k - 1; m >= minM; m--) {
      const prev = pivotHighs[m];
      const gap = cur - prev;
      if (gap < minGap) continue;
      if (gap > maxGap) break;

      const prevOsc = osc[prev]!;
      const prevPrice = candles[prev].high;
      if (Math.abs(curOsc - prevOsc) < minOscDelta) continue;

      if (curPrice > prevPrice && curOsc < prevOsc) {
        out.push({
          source,
          kind: 'bear',
          startIndex: prev,
          endIndex: cur,
          startTime: candles[prev].time,
          endTime: candles[cur].time,
          startOsc: prevOsc,
          endOsc: curOsc,
          startPrice: prevPrice,
          endPrice: curPrice,
        });
        lastBearEnd = cur;
        break;
      }

      if (includeHidden && m === k - 1 && curPrice < prevPrice && curOsc > prevOsc) {
        out.push({
          source,
          kind: 'hidden_bear',
          startIndex: prev,
          endIndex: cur,
          startTime: candles[prev].time,
          endTime: candles[cur].time,
          startOsc: prevOsc,
          endOsc: curOsc,
          startPrice: prevPrice,
          endPrice: curPrice,
        });
        lastBearEnd = cur;
        break;
      }
    }
  }

  return out.sort((a, b) => a.endIndex - b.endIndex);
}

