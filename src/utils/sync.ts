import type {
  ChartWindowConfig,
  IndicatorId,
  LayoutCount,
} from '../types/trading';

export interface GridGeometry {
  cols: number;
  rows: number;
}

/**
 * Returns optimal 4K widescreen grid columns & rows for 1 to 12 chart windows.
 */
export function getGridGeometry(count: LayoutCount): GridGeometry {
  switch (count) {
    case 1:
      return { cols: 1, rows: 1 };
    case 2:
      return { cols: 2, rows: 1 };
    case 3:
      return { cols: 3, rows: 1 };
    case 4:
      return { cols: 2, rows: 2 };
    case 5:
      return { cols: 3, rows: 2 };
    case 6:
      return { cols: 3, rows: 2 };
    case 7:
      return { cols: 4, rows: 2 };
    case 8:
      return { cols: 4, rows: 2 };
    case 9:
      return { cols: 3, rows: 3 };
    case 10:
      return { cols: 5, rows: 2 };
    case 11:
      return { cols: 4, rows: 3 };
    case 12:
      return { cols: 4, rows: 3 };
  }
}

/**
 * Extracts canonical symbol key so NVDA, NVDAUSDT, and NVDAUSDT.P match cleanly.
 */
export function canonicalSymbolKey(symbol: string): string {
  return symbol
    .toUpperCase()
    .replace(/\.P$/, '')
    .replace(/USDT$/, '')
    .replace(/USD$/, '');
}

/**
 * Propagates indicator stack changes from a source window to all windows
 * sharing the same non-'none' sync group with `syncIndicators: true`.
 */
export function propagateIndicatorsToGroup(
  windows: ChartWindowConfig[],
  sourceWindowId: string,
  nextIndicators: IndicatorId[]
): ChartWindowConfig[] {
  const source = windows.find((w) => w.id === sourceWindowId);
  if (!source) return windows;

  const shouldSync = source.sync.group !== 'none' && source.sync.syncIndicators;

  return windows.map((win) => {
    if (win.id === sourceWindowId) {
      return { ...win, indicators: [...nextIndicators] };
    }
    if (
      shouldSync &&
      win.sync.group === source.sync.group &&
      win.sync.syncIndicators
    ) {
      return { ...win, indicators: [...nextIndicators] };
    }
    return win;
  });
}

/**
 * Propagates chart zoom bar count to windows in the same sync group when `syncZoom: true`.
 */
export function propagateZoomToGroup(
  windows: ChartWindowConfig[],
  sourceWindowId: string,
  zoomBars: number
): ChartWindowConfig[] {
  const clamped = Math.min(260, Math.max(20, Math.round(zoomBars)));
  const source = windows.find((w) => w.id === sourceWindowId);
  if (!source) return windows;

  const shouldSync = source.sync.group !== 'none' && source.sync.syncZoom;

  return windows.map((win) => {
    if (win.id === sourceWindowId) {
      return { ...win, zoomBars: clamped };
    }
    if (shouldSync && win.sync.group === source.sync.group && win.sync.syncZoom) {
      return { ...win, zoomBars: clamped };
    }
    return win;
  });
}
