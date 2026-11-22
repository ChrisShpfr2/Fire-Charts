import type { AlertCondition, PriceAlert } from '../types/trading';
import { canonicalSymbolKey } from './sync';

export function formatAlertPrice(price: number): string {
  if (!Number.isFinite(price)) return '--';
  if (Math.abs(price) >= 1000) return price.toFixed(2);
  if (Math.abs(price) >= 10) return price.toFixed(2);
  if (Math.abs(price) >= 1) return price.toFixed(3);
  return price.toFixed(5);
}

export function roundPricePrecision(price: number): number {
  if (!Number.isFinite(price)) return 0;
  if (Math.abs(price) >= 10) return Number(price.toFixed(2));
  if (Math.abs(price) >= 1) return Number(price.toFixed(3));
  return Number(price.toFixed(5));
}

export function inferAlertCondition(
  targetPrice: number,
  currentPrice: number | null | undefined
): AlertCondition {
  if (currentPrice === null || currentPrice === undefined || !Number.isFinite(currentPrice)) {
    return 'above';
  }
  return targetPrice >= currentPrice ? 'above' : 'below';
}

export function computePercentDelta(
  targetPrice: number,
  currentPrice: number | null | undefined
): number | null {
  if (
    currentPrice === null ||
    currentPrice === undefined ||
    !Number.isFinite(currentPrice) ||
    currentPrice === 0 ||
    !Number.isFinite(targetPrice)
  ) {
    return null;
  }
  return ((targetPrice - currentPrice) / currentPrice) * 100;
}

export function formatAlertConditionShort(condition: AlertCondition): string {
  switch (condition) {
    case 'above':
      return 'ABOVE';
    case 'below':
      return 'BELOW';
    case 'cross':
      return 'CROSS';
  }
}

export function getAlertsForWindow(
  alerts: PriceAlert[],
  windowId: string,
  symbol: string
): PriceAlert[] {
  const key = canonicalSymbolKey(symbol);
  const rank = (status: PriceAlert['status']) =>
    status === 'active' ? 0 : status === 'triggered' ? 1 : 2;

  return alerts
    .filter((a) => a.windowId === windowId && canonicalSymbolKey(a.symbol) === key)
    .sort((a, b) => {
      const rDiff = rank(a.status) - rank(b.status);
      if (rDiff !== 0) return rDiff;
      return b.createdAt - a.createdAt;
    });
}

export function evaluateAlertTrigger(
  alert: PriceAlert,
  prevPrice: number | null,
  currentPrice: number
): boolean {
  if (alert.status !== 'active') return false;
  if (!Number.isFinite(currentPrice) || !Number.isFinite(alert.targetPrice)) return false;

  if (alert.condition === 'above') {
    return currentPrice >= alert.targetPrice;
  }
  if (alert.condition === 'below') {
    return currentPrice <= alert.targetPrice;
  }
  // 'cross'
  if (prevPrice !== null && Number.isFinite(prevPrice)) {
    const crossedUp = prevPrice < alert.targetPrice && currentPrice >= alert.targetPrice;
    const crossedDown = prevPrice > alert.targetPrice && currentPrice <= alert.targetPrice;
    return crossedUp || crossedDown || currentPrice === alert.targetPrice;
  }
  const relDiff = Math.abs(currentPrice - alert.targetPrice) / Math.max(Math.abs(alert.targetPrice), 1e-9);
  return relDiff <= 0.0002;
}

export function checkAndTriggerAlerts(
  alerts: PriceAlert[],
  windowId: string,
  symbol: string,
  prevPrice: number | null,
  currentPrice: number,
  nowMs = Date.now()
): { nextAlerts: PriceAlert[]; newlyTriggered: PriceAlert[]; changed: boolean } {
  const key = canonicalSymbolKey(symbol);
  const newlyTriggered: PriceAlert[] = [];
  let changed = false;

  const nextAlerts = alerts.map((alert) => {
    if (
      alert.windowId !== windowId ||
      canonicalSymbolKey(alert.symbol) !== key ||
      alert.status !== 'active'
    ) {
      return alert;
    }

    if (evaluateAlertTrigger(alert, prevPrice, currentPrice)) {
      const updated: PriceAlert = {
        ...alert,
        status: 'triggered',
        triggeredAt: nowMs,
        triggeredPrice: currentPrice,
      };
      newlyTriggered.push(updated);
      changed = true;
      return updated;
    }

    return alert;
  });

  return { nextAlerts, newlyTriggered, changed };
}

export function createPriceAlert(input: {
  windowId: string;
  symbol: string;
  targetPrice: number;
  condition: AlertCondition;
  note?: string;
  nowMs?: number;
}): PriceAlert {
  const now = input.nowMs ?? Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  const cleanNote = input.note?.trim();
  return {
    id: `alert-${now}-${rand}`,
    windowId: input.windowId,
    symbol: input.symbol,
    targetPrice: roundPricePrecision(input.targetPrice),
    condition: input.condition,
    status: 'active',
    note: cleanNote ? cleanNote : undefined,
    createdAt: now,
  };
}

export function playAlertChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.34);
  } catch {
    // Ignore audio context restrictions in headless/TV environments
  }
}
