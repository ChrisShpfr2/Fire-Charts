import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Candle,
  IndicatorId,
  PriceAlert,
  TerminalSettings,
} from '../types/trading';
import { formatAlertConditionShort, inferAlertCondition } from '../utils/alerts';
import {
  calculateATR,
  calculateAutoFibonacci,
  calculateBollingerBands,
  calculateEMA,
  calculateMACD,
  calculateOscillatorDivergences,
  calculateRSI,
  calculateStochRSI,
  calculateTradersRealityMain,
  calculateVMCMoneyFlowSafe,
  calculateVWAP,
} from '../utils/chartIndicatorAdapter';
import type { OscillatorDivergence } from '../utils/indicators';

interface ChartCanvasProps {
  windowId: string;
  candles: Candle[];
  indicators: IndicatorId[];
  settings: TerminalSettings;
  zoomBars: number;
  resetOffsetSignal: number;
  onZoomBarsChange: (bars: number) => void;
  syncedCrosshairTime: number | null;
  onCrosshairTimeChange: (time: number | null) => void;
  compact: boolean;
  alerts?: PriceAlert[];
  alertPickMode?: boolean;
  onPickAlertPrice?: (price: number) => void;
}

function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '--';
  if (Math.abs(price) >= 1000) return price.toFixed(2);
  if (Math.abs(price) >= 10) return price.toFixed(2);
  if (Math.abs(price) >= 1) return price.toFixed(3);
  return price.toFixed(5);
}

function formatTimeLabel(sec: number): string {
  const d = new Date(sec * 1000);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function ChartCanvas({
  windowId,
  candles,
  indicators,
  settings,
  zoomBars,
  resetOffsetSignal,
  onZoomBarsChange,
  syncedCrosshairTime,
  onCrosshairTimeChange,
  compact,
  alerts = [],
  alertPickMode = false,
  onPickAlertPrice,
}: ChartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [size, setSize] = useState({ width: 600, height: 360 });
  const [rightOffset, setRightOffset] = useState(0);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOffset: number } | null>(null);

  useEffect(() => {
    setRightOffset(0);
  }, [resetOffsetSignal]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(120, Math.floor(entry.contentRect.width));
        const h = Math.max(100, Math.floor(entry.contentRect.height));
        setSize({ width: w, height: h });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const computed = useMemo(() => {
    const closes = candles.map((c) => c.close);
    const has = (id: IndicatorId) => indicators.includes(id);

    const tr = has('traders_reality_main')
      ? calculateTradersRealityMain(candles, settings.tradersReality)
      : null;

    const autoFib = has('auto_fib')
      ? calculateAutoFibonacci(candles, settings.autoFib)
      : null;

    const emaRibbon = has('ema_ribbon')
      ? {
          e9: calculateEMA(closes, 9),
          e21: calculateEMA(closes, 21),
          e50: calculateEMA(closes, 50),
          e200: calculateEMA(closes, 200),
        }
      : null;

    const bb = has('bollinger_bands')
      ? calculateBollingerBands(closes, settings.oscillators.bbPeriod, settings.oscillators.bbMult)
      : null;

    const vwap = has('vwap') ? calculateVWAP(candles) : null;

    const vmcWT = has('vumanchu_wavetrend')
      ? calculateVMCMoneyFlowSafe.waveTrend(
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
        )
      : null;

    const vmcMFI = has('vumanchu_moneyflow')
      ? calculateVMCMoneyFlowSafe.moneyFlow(
          candles,
          settings.vumanchu.rsiMFIPeriod,
          settings.vumanchu.rsiMFIMultiplier,
          settings.vumanchu.rsiMFIPosY
        )
      : null;

    const stochRsi = has('stoch_rsi')
      ? calculateStochRSI(
          closes,
          settings.oscillators.stochRsiLen,
          settings.oscillators.stochLen,
          settings.oscillators.stochKSmooth,
          settings.oscillators.stochDSmooth
        )
      : null;

    const rsi = has('rsi')
      ? calculateRSI(closes, settings.oscillators.rsiLen, settings.oscillators.rsiMaLen)
      : null;

    const macd = has('macd')
      ? calculateMACD(
          closes,
          settings.oscillators.macdFast,
          settings.oscillators.macdSlow,
          settings.oscillators.macdSignal
        )
      : null;

    const atr = has('atr') ? calculateATR(candles, settings.oscillators.atrPeriod) : null;

    const showDivergences = has('divergences');
    let wtDivergences: OscillatorDivergence[] = [];
    let rsiDivergences: OscillatorDivergence[] = [];

    if (showDivergences) {
      const divOpts = {
        pivotLeft: settings.divergences.pivotLeft,
        pivotRight: settings.divergences.pivotRight,
        maxLookbackBars: settings.divergences.maxLookbackBars,
        includeHidden: settings.divergences.showHidden,
      };
      if (settings.divergences.showWtDivergences) {
        const wtSource =
          vmcWT ??
          calculateVMCMoneyFlowSafe.waveTrend(
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
        wtDivergences = calculateOscillatorDivergences(candles, wtSource.wt2, 'wt', divOpts);
      }
      if (settings.divergences.showRsiDivergences) {
        const rsiSource =
          rsi ??
          calculateRSI(closes, settings.oscillators.rsiLen, settings.oscillators.rsiMaLen);
        rsiDivergences = calculateOscillatorDivergences(candles, rsiSource.rsi, 'rsi', divOpts);
      }
    }

    return {
      tr,
      autoFib,
      emaRibbon,
      bb,
      vwap,
      vmcWT,
      vmcMFI,
      stochRsi,
      rsi,
      macd,
      atr,
      showVolume: has('volume'),
      showDivergences,
      wtDivergences,
      rsiDivergences,
    };
  }, [candles, indicators, settings]);

  const subPanes = useMemo(() => {
    const panes: Array<'vumanchu' | 'stoch_rsi' | 'rsi' | 'macd' | 'atr'> = [];
    if (indicators.includes('vumanchu_wavetrend') || indicators.includes('vumanchu_moneyflow')) {
      panes.push('vumanchu');
    }
    if (indicators.includes('stoch_rsi')) panes.push('stoch_rsi');
    if (indicators.includes('rsi')) panes.push('rsi');
    if (indicators.includes('macd')) panes.push('macd');
    if (indicators.includes('atr')) panes.push('atr');
    return panes;
  }, [indicators]);

  const layout = useMemo(() => {
    const total = candles.length;
    const count = Math.min(Math.max(zoomBars, 20), Math.max(total, 20));
    const maxOffset = Math.max(0, total - 15);
    const clampedOffset = Math.min(Math.max(0, rightOffset), maxOffset);
    const endIdx = Math.max(0, total - clampedOffset);
    const startIdx = Math.max(0, endIdx - count);
    const sliceLen = Math.max(1, endIdx - startIdx);

    const priceAxisW = compact ? 54 : 66;
    const timeAxisH = compact ? 18 : 22;
    const plotW = Math.max(40, size.width - priceAxisW);
    const availH = Math.max(40, size.height - timeAxisH);

    const subPaneCount = subPanes.length;
    const vmcExtra = subPanes.includes('vumanchu') && subPaneCount === 1 ? (compact ? 0.28 : 0.32) : 0;
    const subRatio =
      subPaneCount === 0
        ? 0
        : vmcExtra > 0
        ? vmcExtra
        : Math.min(0.58, subPaneCount * (compact ? 0.17 : 0.2));
    const mainH = Math.floor(availH * (1 - subRatio));
    const subH = subPaneCount > 0 ? Math.floor((availH - mainH) / subPaneCount) : 0;

    let minP = Infinity;
    let maxP = -Infinity;
    let maxVol = 0;

    for (let i = startIdx; i < endIdx; i++) {
      const c = candles[i];
      if (!c) continue;
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
      if (c.volume > maxVol) maxVol = c.volume;

      if (computed.bb) {
        const u = computed.bb.upper[i];
        const l = computed.bb.lower[i];
        if (u !== null && u > maxP) maxP = u;
        if (l !== null && l < minP) minP = l;
      }
      if (computed.tr && settings.tradersReality.showEmas) {
        for (const arr of [computed.tr.ema5, computed.tr.ema13, computed.tr.ema50, computed.tr.ema200]) {
          const v = arr[i];
          if (v !== null) {
            if (v > maxP) maxP = v;
            if (v < minP) minP = v;
          }
        }
      }
    }

    if (!Number.isFinite(minP) || !Number.isFinite(maxP)) {
      minP = 0;
      maxP = 100;
    }
    const pad = Math.max((maxP - minP) * 0.08, maxP * 0.002);
    minP -= pad;
    maxP += pad;

    const barStep = plotW / sliceLen;

    const idxToX = (idx: number) => (idx - startIdx + 0.5) * barStep;
    const xToIdx = (x: number) => {
      const raw = Math.floor(x / barStep) + startIdx;
      return Math.max(0, Math.min(total - 1, raw));
    };
    const priceToY = (p: number) => {
      const ratio = (p - minP) / Math.max(maxP - minP, 1e-9);
      return mainH - ratio * (mainH - 14) - 7;
    };
    const yToPrice = (y: number) => {
      const ratio = (mainH - 7 - y) / Math.max(mainH - 14, 1);
      return minP + ratio * (maxP - minP);
    };

    const timeToX = (timeSec: number): number | null => {
      if (total === 0) return null;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < total; i++) {
        const d = Math.abs(candles[i].time - timeSec);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      return idxToX(bestIdx);
    };

    return {
      startIdx,
      endIdx,
      sliceLen,
      priceAxisW,
      timeAxisH,
      plotW,
      mainH,
      subH,
      minP,
      maxP,
      maxVol,
      barStep,
      idxToX,
      xToIdx,
      priceToY,
      yToPrice,
      timeToX,
    };
  }, [candles, zoomBars, rightOffset, size, subPanes, computed, compact, settings.tradersReality.showEmas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#0B0F17';
    ctx.fillRect(0, 0, size.width, size.height);

    const {
      startIdx,
      endIdx,
      plotW,
      priceAxisW,
      timeAxisH,
      mainH,
      subH,
      minP,
      maxP,
      maxVol,
      barStep,
      idxToX,
      priceToY,
      yToPrice,
      timeToX,
    } = layout;

    const upColor = settings.candles.upColor;
    const downColor = settings.candles.downColor;

    // Main Grid
    const gridRows = compact ? 4 : 6;
    for (let r = 0; r <= gridRows; r++) {
      const y = Math.round((mainH / gridRows) * r) + 0.5;
      if (settings.candles.showGrid) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotW, y);
        ctx.stroke();
      }

      if (r > 0 && r < gridRows) {
        const pVal = maxP - ((maxP - minP) / gridRows) * r;
        ctx.fillStyle = '#64748B';
        ctx.font = `${compact ? 10 : 11}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatPrice(pVal), plotW + 6, y);
      }
    }

    // Time Axis Grid
    const timeStepBars = Math.max(1, Math.floor((endIdx - startIdx) / (compact ? 4 : 6)));
    for (let i = startIdx; i < endIdx; i += timeStepBars) {
      const x = Math.round(idxToX(i)) + 0.5;
      if (settings.candles.showGrid) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size.height - timeAxisH);
        ctx.stroke();
      }

      if (candles[i]) {
        ctx.fillStyle = '#64748B';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatTimeLabel(candles[i].time), x, size.height - timeAxisH / 2);
      }
    }

    // Clip Main Plot
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, plotW, mainH);
    ctx.clip();

    // 1. Traders Reality Sessions & Brinks & Vector Zones
    if (computed.tr) {
      if (settings.tradersReality.showSessions) {
        for (const s of computed.tr.sessions) {
          if (s.endIdx < startIdx || s.startIdx >= endIdx) continue;
          const x1 = idxToX(Math.max(s.startIdx, startIdx)) - barStep * 0.4;
          const x2 = idxToX(Math.min(s.endIdx, endIdx - 1)) + barStep * 0.4;
          const y1 = priceToY(s.high);
          const y2 = priceToY(s.low);
          ctx.fillStyle = s.color;
          ctx.fillRect(x1, y1, Math.max(2, x2 - x1), Math.max(2, y2 - y1));
          ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(s.name, x1 + 4, y1 + 10);
        }
      }
      if (settings.tradersReality.showBrinksBox) {
        for (const b of computed.tr.brinksBoxes) {
          if (b.endIdx < startIdx || b.startIdx >= endIdx) continue;
          const x1 = idxToX(Math.max(b.startIdx, startIdx)) - barStep * 0.4;
          const x2 = idxToX(Math.min(b.endIdx, endIdx - 1)) + barStep * 0.4;
          const y1 = priceToY(b.high);
          const y2 = priceToY(b.low);
          ctx.fillStyle = b.color;
          ctx.fillRect(x1, y1, Math.max(2, x2 - x1), Math.max(2, y2 - y1));
          ctx.strokeStyle = 'rgba(251, 146, 60, 0.45)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x1, y1, Math.max(2, x2 - x1), Math.max(2, y2 - y1));
        }
      }
      if (settings.tradersReality.showVectorZones) {
        for (const vz of computed.tr.vectorZones) {
          if (vz.endIdx < startIdx) continue;
          const x1 = idxToX(Math.max(vz.startIdx, startIdx));
          const x2 = plotW;
          const y1 = priceToY(vz.high);
          const y2 = priceToY(vz.low);
          ctx.fillStyle =
            vz.direction === 'up'
              ? 'rgba(142, 229, 63, 0.11)'
              : 'rgba(192, 132, 252, 0.13)';
          ctx.fillRect(x1, y1, Math.max(4, x2 - x1), Math.max(2, y2 - y1));
        }
      }
    }

    // 2. Volume Histogram
    if (computed.showVolume && maxVol > 0) {
      const volMaxH = mainH * 0.16;
      const barW = Math.max(1.5, Math.min(barStep * 0.65, 14));
      for (let i = startIdx; i < endIdx; i++) {
        const c = candles[i];
        const x = idxToX(i) - barW / 2;
        const h = (c.volume / maxVol) * volMaxH;
        ctx.fillStyle = c.close >= c.open ? `${upColor}40` : `${downColor}45`;
        ctx.fillRect(x, mainH - h, barW, h);
      }
    }

    const drawSeries = (arr: (number | null)[], color: string, width = 1.4, dashed = false) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dashed) ctx.setLineDash([4, 4]);
      ctx.beginPath();
      let started = false;
      for (let i = startIdx; i < endIdx; i++) {
        const v = arr[i];
        if (v === null || !Number.isFinite(v)) continue;
        const x = idxToX(i);
        const y = priceToY(v);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    // 3. Bollinger Bands
    if (computed.bb) {
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.beginPath();
      let started = false;
      for (let i = startIdx; i < endIdx; i++) {
        const u = computed.bb.upper[i];
        if (u === null) continue;
        if (!started) {
          ctx.moveTo(idxToX(i), priceToY(u));
          started = true;
        } else {
          ctx.lineTo(idxToX(i), priceToY(u));
        }
      }
      for (let i = endIdx - 1; i >= startIdx; i--) {
        const l = computed.bb.lower[i];
        if (l === null) continue;
        ctx.lineTo(idxToX(i), priceToY(l));
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      drawSeries(computed.bb.upper, 'rgba(56, 189, 248, 0.55)', 1);
      drawSeries(computed.bb.basis, 'rgba(148, 163, 184, 0.65)', 1);
      drawSeries(computed.bb.lower, 'rgba(56, 189, 248, 0.55)', 1);
    }

    // 4. EMA Ribbon
    if (computed.emaRibbon) {
      drawSeries(computed.emaRibbon.e9, '#38BDF8', 1.2);
      drawSeries(computed.emaRibbon.e21, '#FACC15', 1.3);
      drawSeries(computed.emaRibbon.e50, '#FB923C', 1.5);
      drawSeries(computed.emaRibbon.e200, '#E2E8F0', 1.7);
    }

    // 5. VWAP
    if (computed.vwap) {
      drawSeries(computed.vwap, '#F472B6', 1.5);
    }

    // 6. Traders Reality EMAs, 50 Cloud, Levels
    if (computed.tr) {
      if (settings.tradersReality.showEma50Cloud) {
        ctx.save();
        ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
        ctx.beginPath();
        let cloudStart = false;
        for (let i = startIdx; i < endIdx; i++) {
          const hi = computed.tr.ema50High[i];
          if (hi === null) continue;
          if (!cloudStart) {
            ctx.moveTo(idxToX(i), priceToY(hi));
            cloudStart = true;
          } else {
            ctx.lineTo(idxToX(i), priceToY(hi));
          }
        }
        for (let i = endIdx - 1; i >= startIdx; i--) {
          const lo = computed.tr.ema50Low[i];
          if (lo === null) continue;
          ctx.lineTo(idxToX(i), priceToY(lo));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (settings.tradersReality.showEmas) {
        drawSeries(computed.tr.ema5, '#FACC15', 1.2);
        drawSeries(computed.tr.ema13, '#F87171', 1.3);
        drawSeries(computed.tr.ema50, '#22D3EE', 1.6);
        drawSeries(computed.tr.ema200, '#F8FAFC', 1.8);
        drawSeries(computed.tr.ema800, '#A78BFA', 1.8);
      }

      const levelLabels: Array<{ y: number; label: string; color: string }> = [];
      const drawLevelLine = (price: number | null, label: string, color: string) => {
        if (price === null || price < minP || price > maxP) return;
        const y = Math.round(priceToY(price)) + 0.5;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotW, y);
        ctx.stroke();
        ctx.restore();
        levelLabels.push({ y, label, color });
      };

      if (settings.tradersReality.showDailyOpen) drawLevelLine(computed.tr.dailyOpen, 'DO', '#FACC15');
      if (settings.tradersReality.showPrevDayHL) {
        drawLevelLine(computed.tr.prevDayHigh, 'PDH', upColor);
        drawLevelLine(computed.tr.prevDayLow, 'PDL', '#94A3B8');
      }
      if (settings.tradersReality.showAdr) {
        drawLevelLine(computed.tr.adrHigh, 'ADR H', '#38BDF8');
        drawLevelLine(computed.tr.adrLow, 'ADR L', '#38BDF8');
      }
      if (settings.tradersReality.showPsyLevels) {
        for (const psy of computed.tr.psyLevels) {
          drawLevelLine(psy, `PSY ${formatPrice(psy)}`, 'rgba(167, 139, 250, 0.72)');
        }
      }

      // De-overlap right-edge Traders Reality level labels vertically
      levelLabels.sort((a, b) => a.y - b.y);
      let lastLabelY = -999;
      ctx.save();
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const item of levelLabels) {
        const yPos = Math.max(12, Math.min(mainH - 8, Math.max(item.y - 6, lastLabelY + 12)));
        lastLabelY = yPos;
        const tw = ctx.measureText(item.label).width;
        ctx.fillStyle = 'rgba(8, 11, 17, 0.82)';
        ctx.fillRect(plotW - tw - 10, yPos - 6, tw + 6, 12);
        ctx.fillStyle = item.color;
        ctx.fillText(item.label, plotW - 6, yPos);
      }
      ctx.restore();
    }

    // 7. Automatic Fibonacci Retracement (Confirmed Deep Pivots)
    if (computed.autoFib) {
      const fib = computed.autoFib;
      const startX = Math.max(0, idxToX(fib.startPivot.index));
      const endX = idxToX(fib.endPivot.index);
      const anchorLeftX = Math.max(0, Math.min(startX, endX));

      // Shaded Golden Pocket (0.618 - 0.65)
      if (settings.autoFib.showGoldenPocket) {
        const gpTopY = priceToY(fib.goldenPocketTop);
        const gpBotY = priceToY(fib.goldenPocketBottom);
        if (gpBotY >= 0 && gpTopY <= mainH) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
          ctx.fillRect(anchorLeftX, gpTopY, plotW - anchorLeftX, Math.max(2, gpBotY - gpTopY));
        }
      }

      // Horizontal Fib Lines & De-overlapped Labels
      const fibDrawList: Array<{
        y: number;
        text: string;
        color: string;
        ratio: number;
      }> = [];
      for (const lvl of fib.levels) {
        const y = Math.round(priceToY(lvl.price)) + 0.5;
        if (y < -4 || y > mainH + 4) continue;
        ctx.save();
        ctx.strokeStyle = lvl.isGolden ? '#FACC15' : lvl.color;
        ctx.lineWidth = lvl.isGolden ? 1.4 : 1.0;
        if (lvl.isExtension) ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(anchorLeftX, y);
        ctx.lineTo(plotW, y);
        ctx.stroke();
        ctx.restore();

        fibDrawList.push({
          y,
          text: `${lvl.label} (${formatPrice(lvl.price)})`,
          color: lvl.isGolden ? '#FACC15' : lvl.color,
          ratio: lvl.ratio,
        });
      }

      fibDrawList.sort((a, b) => a.y - b.y);
      const labelLeftX = Math.min(Math.max(8, anchorLeftX + 4), Math.max(8, plotW - 190));
      let lastFibY = labelLeftX < 250 ? 24 : 8;
      ctx.save();
      ctx.font = `${compact ? 9 : 10}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (const item of fibDrawList) {
        // If 0.65 sits within 11px of 0.618, place 0.65 slightly to the right so text never collides
        const tooClose = Math.abs(item.y - lastFibY) < 12;
        const xPos = tooClose && item.ratio === 0.65 ? labelLeftX + 128 : labelLeftX;
        const yPos =
          tooClose && item.ratio === 0.65
            ? item.y
            : Math.max(lastFibY + 12, Math.min(mainH - 10, item.y - 6));
        if (!(tooClose && item.ratio === 0.65)) {
          lastFibY = yPos;
        }
        const tw = ctx.measureText(item.text).width;
        if (xPos + tw + 6 <= plotW - 56) {
          ctx.fillStyle = 'rgba(8, 11, 17, 0.84)';
          ctx.fillRect(xPos - 2, yPos - 6, tw + 6, 12);
          ctx.fillStyle = item.color;
          ctx.fillText(item.text, xPos + 1, yPos);
        }
      }
      ctx.restore();

      // Diagonal Pivot-to-Pivot ZigZag Impulse Line & Anchor Dots
      const px1 = idxToX(fib.startPivot.index);
      const py1 = priceToY(fib.startPivot.price);
      const px2 = idxToX(fib.endPivot.index);
      const py2 = priceToY(fib.endPivot.price);
      ctx.save();
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.75)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const p of [fib.startPivot, fib.endPivot]) {
        const ax = idxToX(p.index);
        const ay = priceToY(p.price);
        if (ax >= -10 && ax <= plotW + 10) {
          ctx.fillStyle = p.type === 'high' ? '#FACC15' : '#38BDF8';
          ctx.beginPath();
          ctx.arc(ax, ay, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#080B11';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          const pLabel =
            p.type === 'high'
              ? `PIVOT H ${formatPrice(p.price)}`
              : `PIVOT L ${formatPrice(p.price)}`;
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          const tw = ctx.measureText(pLabel).width;
          const clampedX = Math.max(tw / 2 + 6, Math.min(plotW - tw / 2 - 6, ax));
          const pillY = p.type === 'high' ? Math.max(12, ay - 15) : Math.min(mainH - 14, ay + 7);
          ctx.fillStyle = 'rgba(8, 11, 17, 0.88)';
          ctx.fillRect(clampedX - tw / 2 - 4, pillY - 2, tw + 8, 13);
          ctx.fillStyle = '#F8FAFC';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(pLabel, clampedX, pillY);
        }
      }
      ctx.restore();
    }

    // 8. Candlesticks
    const candleW = Math.max(2, Math.min(barStep * 0.68, 18));
    for (let i = startIdx; i < endIdx; i++) {
      const c = candles[i];
      const x = idxToX(i);
      const isUp = c.close >= c.open;
      let bodyColor = isUp ? upColor : downColor;
      const pv = computed.tr ? computed.tr.pvsra[i] : 'none';

      if (pv !== 'none' && settings.tradersReality.pvsraMode === 'candles') {
        bodyColor =
          pv === 'climax_up'
            ? '#00E676'
            : pv === 'climax_down'
            ? '#FF1744'
            : pv === 'rising_up'
            ? '#2979FF'
            : '#D500F9';
      }

      const yHigh = priceToY(c.high);
      const yLow = priceToY(c.low);
      const yOpen = priceToY(c.open);
      const yClose = priceToY(c.close);

      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = Math.max(1, Math.min(2, candleW * 0.18));
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      const top = Math.min(yOpen, yClose);
      const h = Math.max(1.5, Math.abs(yClose - yOpen));
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x - candleW / 2, top, candleW, h);

      if (pv !== 'none' && settings.tradersReality.pvsraMode === 'outline') {
        ctx.strokeStyle =
          pv === 'climax_up'
            ? '#BEF264'
            : pv === 'climax_down'
            ? '#F87171'
            : pv === 'rising_up'
            ? '#38BDF8'
            : '#C084FC';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x - candleW / 2 - 0.5, top - 0.5, candleW + 1, h + 1);
      }
    }

    // 9. RSI & WaveTrend Divergences on Main Price Chart
    const drawDivOverlay = (
      divs: OscillatorDivergence[],
      getY1: (d: OscillatorDivergence) => number,
      getY2: (d: OscillatorDivergence) => number,
      boundTop: number,
      boundBottom: number
    ) => {
      const visible = divs
        .filter((d) => d.endIndex >= startIdx && d.startIndex < endIdx)
        .slice(-6);
      const placedBoxes: Array<{ x: number; y: number; w: number; h: number }> = [];

      for (const d of visible) {
        const x1 = idxToX(d.startIndex);
        const y1 = getY1(d);
        const x2 = idxToX(d.endIndex);
        const y2 = getY2(d);
        const isBull = d.kind === 'bull' || d.kind === 'hidden_bull';
        const isHidden = d.kind === 'hidden_bull' || d.kind === 'hidden_bear';
        const color = isBull ? '#22C55E' : '#EF4444';

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = isHidden ? 1.2 : 1.8;
        if (isHidden) ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        for (const [px, py] of [
          [x1, y1],
          [x2, y2],
        ]) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(px, py, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }

        const srcTag = d.source === 'wt' ? 'WT' : 'RSI';
        const kindTag =
          d.kind === 'bull'
            ? 'BULL'
            : d.kind === 'bear'
            ? 'BEAR'
            : d.kind === 'hidden_bull'
            ? 'H.BULL'
            : 'H.BEAR';
        const label = compact ? `${srcTag} ${kindTag[0]}` : `${srcTag} ${kindTag}`;
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        const tw = ctx.measureText(label).width;
        const boxW = tw + 6;
        const boxH = 12;
        const lx = Math.max(tw / 2 + 4, Math.min(plotW - tw / 2 - 4, x2));
        const ly = isBull
          ? Math.min(boundBottom - 13, y2 + 5)
          : Math.max(boundTop + 2, y2 - 16);
        const boxX = lx - tw / 2 - 3;

        const overlaps = placedBoxes.some(
          (b) =>
            boxX < b.x + b.w + 4 &&
            boxX + boxW + 4 > b.x &&
            ly < b.y + b.h + 2 &&
            ly + boxH + 2 > b.y
        );

        if (!overlaps) {
          placedBoxes.push({ x: boxX, y: ly, w: boxW, h: boxH });
          ctx.fillStyle = 'rgba(8, 11, 17, 0.90)';
          ctx.fillRect(boxX, ly, boxW, boxH);
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.8;
          ctx.strokeRect(boxX, ly, boxW, boxH);
          ctx.fillStyle = isBull ? '#8EE53F' : '#FCA5A5';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(label, lx, ly + 1.5);
        }
        ctx.restore();
      }
    };

    if (computed.showDivergences && settings.divergences.showOnPriceChart) {
      drawDivOverlay(
        [...computed.wtDivergences, ...computed.rsiDivergences],
        (d) => priceToY(d.startPrice),
        (d) => priceToY(d.endPrice),
        18,
        mainH - 4
      );
    }

    // 10. Price Alert Horizontal Lines & Labels
    const visibleAlerts = alerts.filter(
      (a) => a.status !== 'triggered' || settings.alerts.showTriggeredLines
    );
    const axisAlertBadges: Array<{ y: number; text: string; bg: string; fg: string }> = [];

    if (visibleAlerts.length > 0) {
      const placedTagYs: number[] = [];
      const sortedAlerts = [...visibleAlerts].sort((a, b) => b.targetPrice - a.targetPrice);
      let offTopCount = 0;
      let offBottomCount = 0;

      for (const alert of sortedAlerts) {
        const isActive = alert.status === 'active';
        const isTriggered = alert.status === 'triggered';
        const lineColor = isActive ? '#F59E0B' : isTriggered ? '#8EE53F' : '#64748B';
        const textFg = isActive ? '#FDE68A' : isTriggered ? '#8EE53F' : '#94A3B8';
        const yRaw = priceToY(alert.targetPrice);

        if (yRaw < 4) {
          if (isActive) offTopCount++;
          continue;
        }
        if (yRaw > mainH - 4) {
          if (isActive) offBottomCount++;
          continue;
        }

        const y = Math.round(yRaw) + 0.5;
        ctx.save();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = isActive ? 1.6 : 1.2;
        if (isActive) ctx.setLineDash([6, 4]);
        else if (alert.status === 'paused') ctx.setLineDash([2, 4]);
        else ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotW, y);
        ctx.stroke();
        ctx.setLineDash([]);

        const condTag = formatAlertConditionShort(alert.condition);
        const icon = isTriggered ? '✓' : alert.status === 'paused' ? '⏸' : '🔔';
        const noteSuffix = alert.note && !compact ? ` · ${alert.note}` : '';
        const pillText = compact
          ? `${icon} ${formatPrice(alert.targetPrice)}`
          : `${icon} ${condTag} ${formatPrice(alert.targetPrice)}${noteSuffix}`;

        ctx.font = `bold ${compact ? 9 : 10}px "JetBrains Mono", monospace`;
        const tw = ctx.measureText(pillText).width;
        const boxW = tw + 10;
        const boxH = 14;
        let tagY = Math.max(4, Math.min(mainH - boxH - 4, y - boxH / 2));
        for (const prevY of placedTagYs) {
          if (Math.abs(tagY - prevY) < boxH + 2) {
            tagY = Math.min(mainH - boxH - 4, prevY + boxH + 2);
          }
        }
        placedTagYs.push(tagY);
        const boxX = Math.max(8, plotW - boxW - 8);

        ctx.fillStyle = 'rgba(8, 11, 17, 0.92)';
        ctx.fillRect(boxX, tagY, boxW, boxH);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, tagY, boxW, boxH);
        ctx.fillStyle = textFg;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(pillText, boxX + 5, tagY + boxH / 2);
        ctx.restore();

        axisAlertBadges.push({
          y: Math.max(9, Math.min(mainH - 9, y)),
          text: formatPrice(alert.targetPrice),
          bg: lineColor,
          fg: '#080B11',
        });
      }

      if (offTopCount > 0) {
        const label = `▲ ${offTopCount} Alert${offTopCount > 1 ? 's' : ''} Above`;
        ctx.save();
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(8, 11, 17, 0.9)';
        ctx.fillRect(plotW - tw - 16, 4, tw + 10, 14);
        ctx.strokeStyle = '#F59E0B';
        ctx.strokeRect(plotW - tw - 16, 4, tw + 10, 14);
        ctx.fillStyle = '#FCD34D';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, plotW - tw - 11, 11);
        ctx.restore();
      }
      if (offBottomCount > 0) {
        const label = `▼ ${offBottomCount} Alert${offBottomCount > 1 ? 's' : ''} Below`;
        ctx.save();
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(8, 11, 17, 0.9)';
        ctx.fillRect(plotW - tw - 16, mainH - 18, tw + 10, 14);
        ctx.strokeStyle = '#F59E0B';
        ctx.strokeRect(plotW - tw - 16, mainH - 18, tw + 10, 14);
        ctx.fillStyle = '#FCD34D';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, plotW - tw - 11, mainH - 11);
        ctx.restore();
      }
    }

    // Interactive Pick-on-Chart Preview Line
    if (alertPickMode && hoverPos && hoverPos.x <= plotW && hoverPos.y <= mainH) {
      const previewPrice = yToPrice(hoverPos.y);
      const lastClose = candles[candles.length - 1]?.close ?? null;
      const inferred = inferAlertCondition(previewPrice, lastClose);
      const py = Math.round(hoverPos.y) + 0.5;
      ctx.save();
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(plotW, py);
      ctx.stroke();
      ctx.setLineDash([]);

      const label = `CLICK TO SET ${formatAlertConditionShort(inferred)} ${formatPrice(previewPrice)}`;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      const tw = ctx.measureText(label).width;
      const pillX = Math.max(8, Math.min(plotW - tw - 18, hoverPos.x + 12));
      const pillY = Math.max(4, py - 18);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(pillX, pillY, tw + 10, 15);
      ctx.fillStyle = '#080B11';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pillX + 5, pillY + 7.5);
      ctx.restore();
    }

    ctx.restore(); // end main plot clip

    // Latest price tag Y coordinate (computed first so alert axis pills avoid overlapping it)
    const lastCandle = candles[candles.length - 1];
    const liveTagY = lastCandle
      ? Math.max(10, Math.min(mainH - 10, priceToY(lastCandle.close)))
      : null;

    // Alert Price Axis Tags (de-overlapped against liveTagY and neighboring pills)
    const placedAxisYs: number[] = liveTagY !== null ? [liveTagY] : [];
    for (const badge of axisAlertBadges) {
      let by = badge.y;
      for (const occupied of placedAxisYs) {
        if (Math.abs(by - occupied) < 17) {
          const shiftDown = occupied + 17;
          const shiftUp = occupied - 17;
          if (by >= occupied && shiftDown <= mainH - 9) {
            by = shiftDown;
          } else if (shiftUp >= 9) {
            by = shiftUp;
          } else if (shiftDown <= mainH - 9) {
            by = shiftDown;
          }
        }
      }
      if (placedAxisYs.some((occupied) => Math.abs(by - occupied) < 15)) {
        continue;
      }
      placedAxisYs.push(by);
      ctx.fillStyle = badge.bg;
      ctx.fillRect(plotW + 2, by - 7.5, priceAxisW - 4, 15);
      ctx.fillStyle = badge.fg;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badge.text, plotW + 5, by);
    }

    // Latest price tag
    if (lastCandle && liveTagY !== null) {
      const tagColor = lastCandle.close >= lastCandle.open ? upColor : downColor;
      ctx.fillStyle = tagColor;
      ctx.fillRect(plotW + 2, liveTagY - 9, priceAxisW - 4, 18);
      ctx.fillStyle = '#080B11';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(lastCandle.close), plotW + 6, liveTagY);
    }

    // 9. Sub-Panes Rendering
    subPanes.forEach((paneType, pIdx) => {
      const topY = mainH + pIdx * subH;
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, topY + 0.5);
      ctx.lineTo(size.width, topY + 0.5);
      ctx.stroke();

      const drawSubSeries = (
        arr: (number | null)[],
        minVal: number,
        maxVal: number,
        color: string,
        lineW = 1.4
      ) => {
        const span = Math.max(maxVal - minVal, 1e-6);
        const valToY = (v: number) => topY + subH - 6 - ((v - minVal) / span) * (subH - 14);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;
        ctx.beginPath();
        let started = false;
        for (let i = startIdx; i < endIdx; i++) {
          const v = arr[i];
          if (v === null || !Number.isFinite(v)) continue;
          const x = idxToX(i);
          const y = valToY(v);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      const drawFilledWave = (
        arr: (number | null)[],
        minVal: number,
        maxVal: number,
        posFill: string,
        negFill: string,
        posStroke: string,
        negStroke: string,
        lineW = 1.1
      ) => {
        const span = Math.max(maxVal - minVal, 1e-6);
        const valToY = (v: number) => topY + subH - 6 - ((v - minVal) / span) * (subH - 14);
        const zeroY = valToY(0);

        for (let i = startIdx + 1; i < endIdx; i++) {
          const v0 = arr[i - 1];
          const v1 = arr[i];
          if (v0 === null || v1 === null) continue;
          const x0 = idxToX(i - 1);
          const x1 = idxToX(i);
          const c0 = Math.max(minVal, Math.min(maxVal, v0));
          const c1 = Math.max(minVal, Math.min(maxVal, v1));
          const y0 = valToY(c0);
          const y1 = valToY(c1);

          if ((c0 >= 0 && c1 >= 0) || (c0 <= 0 && c1 <= 0)) {
            const isPos = c0 + c1 >= 0;
            ctx.fillStyle = isPos ? posFill : negFill;
            ctx.beginPath();
            ctx.moveTo(x0, zeroY);
            ctx.lineTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x1, zeroY);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = isPos ? posStroke : negStroke;
            ctx.lineWidth = lineW;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
          } else {
            const t = Math.abs(c0) / (Math.abs(c0) + Math.abs(c1));
            const xm = x0 + (x1 - x0) * t;
            const posFirst = c0 > 0;

            ctx.fillStyle = posFirst ? posFill : negFill;
            ctx.beginPath();
            ctx.moveTo(x0, zeroY);
            ctx.lineTo(x0, y0);
            ctx.lineTo(xm, zeroY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = posFirst ? negFill : posFill;
            ctx.beginPath();
            ctx.moveTo(xm, zeroY);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x1, zeroY);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = posFirst ? posStroke : negStroke;
            ctx.lineWidth = lineW;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(xm, zeroY);
            ctx.stroke();

            ctx.strokeStyle = posFirst ? negStroke : posStroke;
            ctx.beginPath();
            ctx.moveTo(xm, zeroY);
            ctx.lineTo(x1, y1);
            ctx.stroke();
          }
        }
      };

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, topY + 1, plotW, subH - 2);
      ctx.clip();

      if (paneType === 'vumanchu') {
        const minV = -125;
        const maxV = 125;
        const span = maxV - minV;
        const valToY = (v: number) => topY + subH - 4 - ((v - minV) / span) * (subH - 18);

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, Math.round(valToY(0)) + 0.5);
        ctx.lineTo(plotW, Math.round(valToY(0)) + 0.5);
        ctx.stroke();

        for (const lvl of [100, settings.vumanchu.obLevel1, settings.vumanchu.osLevel1]) {
          const ly = Math.round(valToY(lvl)) + 0.5;
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.72)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(0, ly);
          ctx.lineTo(plotW, ly);
          ctx.stroke();
        }

        for (const lvl of [settings.vumanchu.obLevel2, settings.vumanchu.osLevel2]) {
          const ly = Math.round(valToY(lvl)) + 0.5;
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(0, ly);
          ctx.lineTo(plotW, ly);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        if (computed.vmcWT && settings.vumanchu.showWTWaves) {
          drawFilledWave(
            computed.vmcWT.wt1,
            minV,
            maxV,
            'rgba(41, 98, 255, 0.48)',
            'rgba(41, 98, 255, 0.48)',
            '#38BDF8',
            '#38BDF8',
            1.2
          );
          drawFilledWave(
            computed.vmcWT.wt2,
            minV,
            maxV,
            'rgba(26, 35, 126, 0.72)',
            'rgba(26, 35, 126, 0.72)',
            '#1D4ED8',
            '#1D4ED8',
            1.2
          );
        }

        if (computed.vmcMFI && settings.vumanchu.showMoneyFlow) {
          drawFilledWave(
            computed.vmcMFI,
            minV,
            maxV,
            'rgba(34, 197, 94, 0.46)',
            'rgba(239, 68, 68, 0.48)',
            '#4ADE80',
            '#F87171',
            1.2
          );
        }

        if (computed.vmcWT && settings.vumanchu.showWTVwap) {
          drawFilledWave(
            computed.vmcWT.vwap,
            minV,
            maxV,
            'rgba(241, 245, 249, 0.42)',
            'rgba(241, 245, 249, 0.36)',
            'rgba(241, 245, 249, 0.8)',
            'rgba(241, 245, 249, 0.75)',
            1.0
          );
        }

        if (computed.vmcWT && settings.vumanchu.showStochInPane) {
          drawSubSeries(computed.vmcWT.stochK, minV, maxV, '#38BDF8', 1.1);
          drawSubSeries(computed.vmcWT.stochD, minV, maxV, '#F59E0B', 1.1);
        }

        if (computed.vmcWT && settings.vumanchu.showRsiInPane) {
          for (let i = startIdx + 1; i < endIdx; i++) {
            const r0 = computed.vmcWT.rsi[i - 1];
            const r1 = computed.vmcWT.rsi[i];
            if (r0 === null || r1 === null) continue;
            ctx.strokeStyle = r1 >= 60 ? '#EF4444' : '#D946EF';
            ctx.lineWidth = 1.9;
            ctx.beginPath();
            ctx.moveTo(idxToX(i - 1), valToY(r0));
            ctx.lineTo(idxToX(i), valToY(r1));
            ctx.stroke();
          }
        }

        if (computed.vmcWT && settings.vumanchu.showSignalDots) {
          for (let i = startIdx; i < endIdx; i++) {
            const wt2Val = computed.vmcWT.wt2[i];
            if (wt2Val !== null) {
              if (computed.vmcWT.buySignals[i]) {
                ctx.fillStyle = '#00E676';
                ctx.beginPath();
                ctx.arc(idxToX(i), valToY(wt2Val), 3.6, 0, Math.PI * 2);
                ctx.fill();
              } else if (computed.vmcWT.crossUpDots[i]) {
                ctx.fillStyle = '#22C55E';
                ctx.beginPath();
                ctx.arc(idxToX(i), valToY(wt2Val), 2.5, 0, Math.PI * 2);
                ctx.fill();
              }

              if (computed.vmcWT.sellSignals[i]) {
                ctx.fillStyle = '#FF5252';
                ctx.beginPath();
                ctx.arc(idxToX(i), valToY(wt2Val), 3.6, 0, Math.PI * 2);
                ctx.fill();
              } else if (computed.vmcWT.crossDownDots[i]) {
                ctx.fillStyle = '#EF4444';
                ctx.beginPath();
                ctx.arc(idxToX(i), valToY(wt2Val), 2.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            if (computed.vmcWT.topOverboughtDots[i]) {
              ctx.fillStyle = '#991B1B';
              ctx.beginPath();
              ctx.arc(idxToX(i), valToY(105), 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        if (computed.vmcMFI && settings.vumanchu.showBottomRibbon) {
          const ribbonY = valToY(-106);
          const segW = Math.max(barStep + 0.5, 2);
          for (let i = startIdx; i < endIdx; i++) {
            const m = computed.vmcMFI[i];
            if (m === null) continue;
            ctx.fillStyle = m >= 0 ? '#16A34A' : '#DC2626';
            ctx.fillRect(idxToX(i) - segW / 2, ribbonY - 2, segW, 3.5);
          }
        }

        if (computed.showDivergences) {
          const paneDivs = [
            ...computed.wtDivergences.filter((d) => d.endIndex >= startIdx && d.startIndex < endIdx).slice(-4),
            ...(settings.vumanchu.showRsiInPane
              ? computed.rsiDivergences.filter((d) => d.endIndex >= startIdx && d.startIndex < endIdx).slice(-4)
              : []),
          ];
          const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
          for (const d of paneDivs) {
            const x1 = idxToX(d.startIndex);
            const y1 = valToY(d.startOsc);
            const x2 = idxToX(d.endIndex);
            const y2 = valToY(d.endOsc);
            const isBull = d.kind === 'bull' || d.kind === 'hidden_bull';
            const isHidden = d.kind === 'hidden_bull' || d.kind === 'hidden_bear';
            const color = isBull ? '#22C55E' : '#EF4444';
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = isHidden ? 1.2 : 1.7;
            if (isHidden) ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x1, y1, 2.4, 0, Math.PI * 2);
            ctx.arc(x2, y2, 2.8, 0, Math.PI * 2);
            ctx.fill();
            if (!compact) {
              const badge = `${d.source === 'wt' ? 'WT' : 'RSI'} ${
                d.kind === 'bull' ? 'BULL' : d.kind === 'bear' ? 'BEAR' : isBull ? 'H.B' : 'H.S'
              }`;
              ctx.font = 'bold 8px "JetBrains Mono", monospace';
              const tw = ctx.measureText(badge).width;
              const bx = Math.max(tw / 2 + 4, Math.min(plotW - tw / 2 - 4, x2));
              const by = isBull ? Math.min(topY + subH - 14, y2 + 4) : Math.max(topY + 14, y2 - 12);
              const boxX = bx - tw / 2 - 2;
              const overlaps = placed.some(
                (p) => boxX < p.x + p.w + 3 && boxX + tw + 7 > p.x && by < p.y + p.h + 2 && by + 12 > p.y
              );
              if (!overlaps) {
                placed.push({ x: boxX, y: by, w: tw + 4, h: 10 });
                ctx.fillStyle = 'rgba(8, 11, 17, 0.88)';
                ctx.fillRect(boxX, by, tw + 4, 10);
                ctx.fillStyle = isBull ? '#8EE53F' : '#FCA5A5';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(badge, bx, by + 1);
              }
            }
            ctx.restore();
          }
        }
      } else if (paneType === 'stoch_rsi' && computed.stochRsi) {
        const y80 = topY + subH - 6 - 0.8 * (subH - 14);
        const y20 = topY + subH - 6 - 0.2 * (subH - 14);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
        ctx.fillRect(0, y80, plotW, y20 - y80);
        drawSubSeries(computed.stochRsi.k, 0, 100, '#38BDF8', 1.5);
        drawSubSeries(computed.stochRsi.d, 0, 100, '#F59E0B', 1.4);
      } else if (paneType === 'rsi' && computed.rsi) {
        const y70 = topY + subH - 6 - 0.7 * (subH - 14);
        const y30 = topY + subH - 6 - 0.3 * (subH - 14);
        ctx.fillStyle = 'rgba(192, 132, 252, 0.06)';
        ctx.fillRect(0, y70, plotW, y30 - y70);
        drawSubSeries(computed.rsi.rsi, 0, 100, '#C084FC', 1.6);
        drawSubSeries(computed.rsi.ma, 0, 100, '#FACC15', 1.2);

        if (computed.showDivergences && computed.rsiDivergences.length > 0) {
          const valToY = (v: number) => topY + subH - 6 - (v / 100) * (subH - 14);
          const visibleRsi = computed.rsiDivergences
            .filter((d) => d.endIndex >= startIdx && d.startIndex < endIdx)
            .slice(-5);
          const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
          for (const d of visibleRsi) {
            const x1 = idxToX(d.startIndex);
            const y1 = valToY(d.startOsc);
            const x2 = idxToX(d.endIndex);
            const y2 = valToY(d.endOsc);
            const isBull = d.kind === 'bull' || d.kind === 'hidden_bull';
            const isHidden = d.kind === 'hidden_bull' || d.kind === 'hidden_bear';
            const color = isBull ? '#22C55E' : '#EF4444';
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = isHidden ? 1.2 : 1.7;
            if (isHidden) ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x1, y1, 2.4, 0, Math.PI * 2);
            ctx.arc(x2, y2, 2.8, 0, Math.PI * 2);
            ctx.fill();
            if (!compact) {
              const badge =
                d.kind === 'bull'
                  ? 'BULL'
                  : d.kind === 'bear'
                  ? 'BEAR'
                  : isBull
                  ? 'H.BULL'
                  : 'H.BEAR';
              ctx.font = 'bold 8px "JetBrains Mono", monospace';
              const tw = ctx.measureText(badge).width;
              const bx = Math.max(tw / 2 + 4, Math.min(plotW - tw / 2 - 4, x2));
              const by = isBull ? Math.min(topY + subH - 13, y2 + 3) : Math.max(topY + 14, y2 - 11);
              const boxX = bx - tw / 2 - 2;
              const overlaps = placed.some(
                (p) => boxX < p.x + p.w + 3 && boxX + tw + 7 > p.x && by < p.y + p.h + 2 && by + 12 > p.y
              );
              if (!overlaps) {
                placed.push({ x: boxX, y: by, w: tw + 4, h: 10 });
                ctx.fillStyle = 'rgba(8, 11, 17, 0.88)';
                ctx.fillRect(boxX, by, tw + 4, 10);
                ctx.fillStyle = isBull ? '#8EE53F' : '#FCA5A5';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(badge, bx, by + 1);
              }
            }
            ctx.restore();
          }
        }
      } else if (paneType === 'macd' && computed.macd) {
        let maxAbs = 0.0001;
        for (let i = startIdx; i < endIdx; i++) {
          for (const v of [computed.macd.macd[i], computed.macd.signal[i], computed.macd.histogram[i]]) {
            if (v !== null && Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
          }
        }
        const minV = -maxAbs * 1.15;
        const maxV = maxAbs * 1.15;
        const valToY = (v: number) => topY + subH - 6 - ((v - minV) / (maxV - minV)) * (subH - 14);
        const zeroY = valToY(0);
        const barW = Math.max(1.5, Math.min(barStep * 0.55, 10));
        for (let i = startIdx; i < endIdx; i++) {
          const h = computed.macd.histogram[i];
          if (h === null) continue;
          const y = valToY(h);
          ctx.fillStyle = h >= 0 ? `${upColor}99` : `${downColor}99`;
          ctx.fillRect(idxToX(i) - barW / 2, Math.min(zeroY, y), barW, Math.max(1, Math.abs(y - zeroY)));
        }
        drawSubSeries(computed.macd.macd, minV, maxV, '#38BDF8', 1.5);
        drawSubSeries(computed.macd.signal, minV, maxV, '#FB923C', 1.4);
      } else if (paneType === 'atr' && computed.atr) {
        let minA = Infinity;
        let maxA = -Infinity;
        for (let i = startIdx; i < endIdx; i++) {
          const v = computed.atr[i];
          if (v !== null) {
            if (v < minA) minA = v;
            if (v > maxA) maxA = v;
          }
        }
        if (!Number.isFinite(minA)) {
          minA = 0;
          maxA = 1;
        }
        drawSubSeries(computed.atr, minA * 0.9, maxA * 1.1, '#2DD4BF', 1.5);
      }

      ctx.restore();

      if (paneType === 'vumanchu' && !compact) {
        const minV = -125;
        const maxV = 125;
        const span = maxV - minV;
        const valToY = (v: number) => topY + subH - 4 - ((v - minV) / span) * (subH - 18);
        ctx.fillStyle = '#64748B';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const ticks = subH >= 100 ? [120, 80, 40, 0, -40, -80, -120] : [80, 0, -80];
        for (const tick of ticks) {
          const ty = valToY(tick);
          if (ty > topY + 6 && ty < topY + subH - 4) {
            ctx.fillText(String(tick), plotW + 6, ty);
          }
        }
      }

      const label =
        paneType === 'vumanchu'
          ? 'VuManChu Cipher B (WT + MFI)'
          : paneType === 'stoch_rsi'
          ? `Stoch RSI (${settings.oscillators.stochRsiLen},${settings.oscillators.stochLen})`
          : paneType === 'rsi'
          ? `RSI (${settings.oscillators.rsiLen})`
          : paneType === 'macd'
          ? `MACD (${settings.oscillators.macdFast},${settings.oscillators.macdSlow},${settings.oscillators.macdSignal})`
          : `ATR (${settings.oscillators.atrPeriod})`;
      ctx.save();
      ctx.font = '10px "JetBrains Mono", monospace';
      const labelW = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(8, 11, 17, 0.78)';
      ctx.fillRect(6, topY + 3, labelW + 8, 13);
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, 10, topY + 4);
      ctx.restore();
    });

    // Axis divider lines
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotW + 0.5, 0);
    ctx.lineTo(plotW + 0.5, size.height - timeAxisH);
    ctx.moveTo(0, size.height - timeAxisH + 0.5);
    ctx.lineTo(size.width, size.height - timeAxisH + 0.5);
    ctx.stroke();

    // Crosshair
    const crossX = hoverPos
      ? hoverPos.x
      : syncedCrosshairTime !== null
      ? timeToX(syncedCrosshairTime)
      : null;

    if (crossX !== null && crossX >= 0 && crossX <= plotW) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      if (settings.candles.crosshairDashed) ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(crossX) + 0.5, 0);
      ctx.lineTo(Math.round(crossX) + 0.5, size.height - timeAxisH);
      if (hoverPos && hoverPos.y <= mainH) {
        ctx.moveTo(0, Math.round(hoverPos.y) + 0.5);
        ctx.lineTo(plotW, Math.round(hoverPos.y) + 0.5);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [
    candles,
    computed,
    hoverPos,
    layout,
    size,
    subPanes,
    syncedCrosshairTime,
    compact,
    settings,
    alerts,
    alertPickMode,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragRef.current && !alertPickMode) {
      const dx = x - dragRef.current.startX;
      const barShift = Math.round(dx / Math.max(layout.barStep, 2));
      const maxOffset = Math.max(0, candles.length - 15);
      setRightOffset(Math.min(maxOffset, Math.max(0, dragRef.current.startOffset + barShift)));
    }

    setHoverPos({ x, y });
    const idx = layout.xToIdx(x);
    if (candles[idx]) {
      onCrosshairTimeChange(candles[idx].time);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startOffset: rightOffset,
    };
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const moved = dragRef.current
      ? Math.hypot(x - dragRef.current.startX, y - dragRef.current.startY)
      : 0;
    dragRef.current = null;

    if (
      onPickAlertPrice &&
      (alertPickMode || e.shiftKey) &&
      moved < 6 &&
      x <= layout.plotW &&
      y <= layout.mainH
    ) {
      const picked = layout.yToPrice(y);
      if (Number.isFinite(picked) && picked > 0) {
        onPickAlertPrice(picked);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 12 : -12;
    onZoomBarsChange(Math.min(260, Math.max(20, zoomBars + delta)));
  };

  const hoveredCandle = useMemo(() => {
    if (!hoverPos || candles.length === 0) return candles[candles.length - 1];
    const idx = layout.xToIdx(hoverPos.x);
    return candles[idx] ?? candles[candles.length - 1];
  }, [hoverPos, candles, layout]);

  const recentDivergences = useMemo(() => {
    if (!computed.showDivergences) return [];
    const all = [...computed.wtDivergences, ...computed.rsiDivergences];
    return all
      .filter((d) => d.endIndex >= layout.startIdx && d.endIndex < layout.endIdx)
      .sort((a, b) => b.endIndex - a.endIndex)
      .slice(0, 3);
  }, [computed.showDivergences, computed.wtDivergences, computed.rsiDivergences, layout.startIdx, layout.endIdx]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        data-testid={`chart-canvas-${windowId}`}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoverPos(null);
          dragRef.current = null;
          onCrosshairTimeChange(null);
        }}
        onWheel={handleWheel}
        className={`w-full h-full block ${alertPickMode ? 'cursor-cell' : 'cursor-crosshair'}`}
      />

      {alertPickMode && (
        <div className="pointer-events-none absolute top-1.5 right-[72px] z-10 px-2 py-0.5 rounded bg-amber-400 text-[#080B11] text-[10px] font-bold shadow">
          Click on chart to place alert line
        </div>
      )}

      {hoveredCandle && (
        <div className="pointer-events-none absolute top-1.5 left-2 flex flex-col items-start gap-1">
          <div className="flex items-center gap-2 text-[10px] font-mono-num text-slate-300 bg-[#080B11]/80 px-1.5 py-0.5 rounded">
            <span>O {formatPrice(hoveredCandle.open)}</span>
            <span>H {formatPrice(hoveredCandle.high)}</span>
            <span>L {formatPrice(hoveredCandle.low)}</span>
            <span
              style={{
                color:
                  hoveredCandle.close >= hoveredCandle.open
                    ? settings.candles.upColor
                    : settings.candles.downColor,
              }}
            >
              C {formatPrice(hoveredCandle.close)}
            </span>
          </div>

          {!compact && computed.showDivergences && (
            <div
              className="flex flex-wrap items-center gap-1"
              data-testid={`divergence-radar-${windowId}`}
            >
              {recentDivergences.length > 0 ? (
                recentDivergences.map((d) => {
                  const isBull = d.kind === 'bull' || d.kind === 'hidden_bull';
                  const barsAgo = Math.max(0, candles.length - 1 - d.endIndex);
                  const kindName =
                    d.kind === 'bull'
                      ? 'BULL'
                      : d.kind === 'bear'
                      ? 'BEAR'
                      : d.kind === 'hidden_bull'
                      ? 'H.BULL'
                      : 'H.BEAR';
                  return (
                    <span
                      key={`${d.source}-${d.kind}-${d.startIndex}-${d.endIndex}`}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono-num font-bold border ${
                        isBull
                          ? 'bg-[#8EE53F]/15 text-[#8EE53F] border-[#8EE53F]/45'
                          : 'bg-red-500/15 text-red-300 border-red-500/45'
                      }`}
                    >
                      {d.source === 'wt' ? 'WT' : 'RSI'} {kindName} · {barsAgo}b
                    </span>
                  );
                })
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-num text-slate-400 bg-[#080B11]/75 border border-slate-800">
                  RSI/WT Div: Scanning
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
