import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertToastStack, type AlertToastItem } from './components/AlertToastStack';
import { BreakingNewsBar } from './components/BreakingNewsBar';
import { ChartWindow } from './components/ChartWindow';
import { DeviceSyncModal } from './components/DeviceSyncModal';
import { IndicatorsModal } from './components/IndicatorsModal';
import { NewsDetailModal } from './components/NewsDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { SymbolTimeframeModal } from './components/SymbolTimeframeModal';
import { TopControlBar } from './components/TopControlBar';
import { WallStreetTicker } from './components/WallStreetTicker';
import type {
  AlertCondition,
  AssetType,
  ChartWindowConfig,
  IndicatorId,
  LayoutCount,
  NewsArticle,
  PriceAlert,
  SymbolOption,
  TerminalSettings,
  TickerTapeItem,
  Timeframe,
  WindowSyncConfig,
} from './types/trading';
import {
  checkAndTriggerAlerts,
  createPriceAlert,
  getAlertsForWindow,
  playAlertChime,
} from './utils/alerts';
import { DEFAULT_SETTINGS, mergeTerminalSettings } from './utils/settings';
import {
  canonicalSymbolKey,
  getGridGeometry,
  propagateIndicatorsToGroup,
  propagateZoomToGroup,
} from './utils/sync';
import type { SyncedWorkspaceState } from './utils/deviceSync';
import { useDeviceSync } from './utils/useDeviceSync';

const STORAGE_KEY = 'apex-tv-4k-workspace-v3';
const SETTINGS_STORAGE_KEY = 'apex-tv-4k-settings-v1';
const ALERTS_STORAGE_KEY = 'apex-tv-4k-alerts-v1';

const DEFAULT_WINDOWS: ChartWindowConfig[] = [
  {
    id: 'win-1',
    index: 0,
    symbol: 'BTCUSDT',
    assetType: 'crypto',
    timeframe: '15m',
    indicators: [
      'traders_reality_main',
      'auto_fib',
      'divergences',
      'vumanchu_wavetrend',
      'vumanchu_moneyflow',
      'volume',
    ],
    sync: { group: 'A', syncIndicators: true, syncCrosshair: true, syncZoom: true },
    zoomBars: 110,
  },
  {
    id: 'win-2',
    index: 1,
    symbol: 'NVDA',
    assetType: 'stock',
    timeframe: '15m',
    indicators: ['traders_reality_main', 'auto_fib', 'divergences', 'stoch_rsi', 'rsi', 'volume'],
    sync: { group: 'B', syncIndicators: true, syncCrosshair: true, syncZoom: true },
    zoomBars: 110,
  },
  {
    id: 'win-3',
    index: 2,
    symbol: 'TQQQ',
    assetType: 'stock',
    timeframe: '10s',
    indicators: ['ema_ribbon', 'vumanchu_wavetrend', 'vumanchu_moneyflow', 'volume'],
    sync: { group: 'B', syncIndicators: true, syncCrosshair: true, syncZoom: true },
    zoomBars: 90,
  },
  {
    id: 'win-4',
    index: 3,
    symbol: 'ETHUSDT',
    assetType: 'crypto',
    timeframe: '1h',
    indicators: [
      'traders_reality_main',
      'divergences',
      'vumanchu_wavetrend',
      'vumanchu_moneyflow',
      'stoch_rsi',
    ],
    sync: { group: 'A', syncIndicators: true, syncCrosshair: true, syncZoom: true },
    zoomBars: 90,
  },
  {
    id: 'win-5',
    index: 4,
    symbol: 'SOLUSDT',
    assetType: 'crypto',
    timeframe: '7m',
    indicators: ['traders_reality_main', 'rsi', 'volume'],
    sync: { group: 'A', syncIndicators: false, syncCrosshair: true, syncZoom: false },
    zoomBars: 90,
  },
  {
    id: 'win-6',
    index: 5,
    symbol: 'TSLA',
    assetType: 'stock',
    timeframe: '30m',
    indicators: ['bollinger_bands', 'macd', 'volume'],
    sync: { group: 'none', syncIndicators: false, syncCrosshair: false, syncZoom: false },
    zoomBars: 90,
  },
  {
    id: 'win-7',
    index: 6,
    symbol: 'AAPL',
    assetType: 'stock',
    timeframe: '1h',
    indicators: ['ema_ribbon', 'rsi', 'volume'],
    sync: { group: 'none', syncIndicators: false, syncCrosshair: false, syncZoom: false },
    zoomBars: 90,
  },
  {
    id: 'win-8',
    index: 7,
    symbol: 'SPY',
    assetType: 'stock',
    timeframe: '4h',
    indicators: ['traders_reality_main', 'auto_fib', 'volume'],
    sync: { group: 'none', syncIndicators: false, syncCrosshair: false, syncZoom: false },
    zoomBars: 90,
  },
  {
    id: 'win-9',
    index: 8,
    symbol: 'XRPUSDT',
    assetType: 'crypto',
    timeframe: '12m',
    indicators: ['vumanchu_wavetrend', 'vumanchu_moneyflow', 'volume'],
    sync: { group: 'none', syncIndicators: false, syncCrosshair: false, syncZoom: false },
    zoomBars: 90,
  },
  {
    id: 'win-10',
    index: 9,
    symbol: 'QQQ',
    assetType: 'stock',
    timeframe: '24m',
    indicators: ['vwap', 'stoch_rsi', 'volume'],
    sync: { group: 'none', syncIndicators: false, syncCrosshair: false, syncZoom: false },
    zoomBars: 90,
  },
  {
    id: 'win-11',
    index: 10,
    symbol: 'AMD',
    assetType: 'stock',
    timeframe: '45m',
    indicators: ['ema_ribbon', 'rsi', 'volume'],
    sync: { group: 'none', syncIndicators: false, syncCrosshair: false, syncZoom: false },
    zoomBars: 90,
  },
  {
    id: 'win-12',
    index: 11,
    symbol: 'BNBUSDT',
    assetType: 'crypto',
    timeframe: '8h',
    indicators: ['traders_reality_main', 'atr', 'volume'],
    sync: { group: 'none', syncIndicators: false, syncCrosshair: false, syncZoom: false },
    zoomBars: 90,
  },
];

function sanitizeWindows(rawWindows?: Partial<ChartWindowConfig>[]): ChartWindowConfig[] {
  if (!Array.isArray(rawWindows) || rawWindows.length !== 12) {
    return DEFAULT_WINDOWS;
  }
  return DEFAULT_WINDOWS.map((def, idx) => {
    const candidate = rawWindows[idx];
    if (!candidate) return def;
    return {
      ...def,
      ...candidate,
      zoomBars:
        typeof candidate.zoomBars === 'number' && Number.isFinite(candidate.zoomBars)
          ? Math.min(260, Math.max(20, Math.round(candidate.zoomBars)))
          : def.zoomBars,
      sync: {
        ...def.sync,
        ...(candidate.sync ?? {}),
      },
      indicators: Array.isArray(candidate.indicators) ? candidate.indicators : def.indicators,
    };
  });
}

function loadSavedWorkspace(): {
  layoutCount: LayoutCount;
  windows: ChartWindowConfig[];
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { layoutCount: 4, windows: DEFAULT_WINDOWS };
    }
    const parsed = JSON.parse(raw) as {
      layoutCount?: number;
      windows?: Partial<ChartWindowConfig>[];
    };
    const count =
      parsed.layoutCount && parsed.layoutCount >= 1 && parsed.layoutCount <= 12
        ? (parsed.layoutCount as LayoutCount)
        : 4;
    return {
      layoutCount: count,
      windows: sanitizeWindows(parsed.windows),
    };
  } catch {
    return { layoutCount: 4, windows: DEFAULT_WINDOWS };
  }
}

function loadSavedSettings(): TerminalSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return mergeTerminalSettings(JSON.parse(raw) as Partial<TerminalSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadSavedAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is PriceAlert =>
        Boolean(a) &&
        typeof a.id === 'string' &&
        typeof a.windowId === 'string' &&
        typeof a.symbol === 'string' &&
        typeof a.targetPrice === 'number' &&
        Number.isFinite(a.targetPrice)
    );
  } catch {
    return [];
  }
}

export default function App() {
  const initial = useMemo(() => loadSavedWorkspace(), []);
  const initialSettings = useMemo(() => loadSavedSettings(), []);
  const initialAlerts = useMemo(() => loadSavedAlerts(), []);

  const [layoutCount, setLayoutCount] = useState<LayoutCount>(initial.layoutCount);
  const [windows, setWindows] = useState<ChartWindowConfig[]>(initial.windows);
  const [settings, setSettings] = useState<TerminalSettings>(initialSettings);
  const [alerts, setAlerts] = useState<PriceAlert[]>(initialAlerts);
  const [alertToasts, setAlertToasts] = useState<AlertToastItem[]>([]);
  const [latestPriceByWindow, setLatestPriceByWindow] = useState<
    Record<string, { symbol: string; price: number }>
  >({});

  const [focusedWindowId, setFocusedWindowId] = useState<string>(initial.windows[0].id);
  const [maximizedWindowId, setMaximizedWindowId] = useState<string | null>(null);
  const [resetOffsetSignal, setResetOffsetSignal] = useState(0);

  const [tickerItems, setTickerItems] = useState<TickerTapeItem[]>([]);
  const [tickerLoading, setTickerLoading] = useState(true);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [stockCatalog, setStockCatalog] = useState<SymbolOption[]>([]);
  const [cryptoCatalog, setCryptoCatalog] = useState<SymbolOption[]>([]);

  const [symbolModalOpen, setSymbolModalOpen] = useState(false);
  const [indicatorsModalOpen, setIndicatorsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [deviceSyncModalOpen, setDeviceSyncModalOpen] = useState(false);
  const [remoteSyncNotice, setRemoteSyncNotice] = useState<string | null>(null);
  const [newsModalState, setNewsModalState] = useState<{
    open: boolean;
    article?: NewsArticle;
  }>({ open: false });

  const [crosshairByGroup, setCrosshairByGroup] = useState<Record<string, number | null>>({});

  const handleApplyRemoteState = useCallback((remote: SyncedWorkspaceState) => {
    if (
      typeof remote.layoutCount === 'number' &&
      remote.layoutCount >= 1 &&
      remote.layoutCount <= 12
    ) {
      setLayoutCount(remote.layoutCount);
    }
    if (Array.isArray(remote.windows) && remote.windows.length === 12) {
      setWindows(sanitizeWindows(remote.windows));
    }
    if (remote.settings && typeof remote.settings === 'object') {
      setSettings(mergeTerminalSettings(remote.settings));
    }
    if (Array.isArray(remote.alerts)) {
      setAlerts(remote.alerts);
    }
  }, []);

  const handleRemoteNotice = useCallback((msg: string) => {
    setRemoteSyncNotice(msg);
    setTimeout(() => {
      setRemoteSyncNotice((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  const deviceSync = useDeviceSync({
    currentState: { layoutCount, windows, settings, alerts },
    onApplyRemoteState: handleApplyRemoteState,
    onRemoteSyncNotice: handleRemoteNotice,
  });

  // Persist workspace state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ layoutCount, windows }));
    } catch {
      // Ignore storage quota issues
    }
  }, [layoutCount, windows]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota issues
    }
  }, [settings]);

  // Persist alerts
  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    } catch {
      // Ignore storage quota issues
    }
  }, [alerts]);

  // Fetch symbols catalog
  useEffect(() => {
    fetch('/api/symbols')
      .then((r) => r.json())
      .then((data: { stocks?: SymbolOption[]; crypto?: SymbolOption[] }) => {
        setStockCatalog(data.stocks ?? []);
        setCryptoCatalog(data.crypto ?? []);
      })
      .catch(() => {});
  }, []);

  // Fetch rolling Wall Street ticker tape
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/ticker-tape');
        const data = (await res.json()) as { items?: TickerTapeItem[] };
        if (active && data.items) setTickerItems(data.items);
      } catch {
        // Keep last ticker items
      } finally {
        if (active) setTickerLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // Fetch breaking financial news
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/news');
        const data = (await res.json()) as { items?: NewsArticle[] };
        if (active && data.items) setNewsArticles(data.items);
      } catch {
        // Keep last articles
      } finally {
        if (active) setNewsLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const visibleWindows = useMemo(() => {
    if (maximizedWindowId) {
      const found = windows.find((w) => w.id === maximizedWindowId);
      if (found) return [found];
    }
    return windows.slice(0, layoutCount);
  }, [windows, layoutCount, maximizedWindowId]);

  const focusedWindow = useMemo(
    () =>
      visibleWindows.find((w) => w.id === focusedWindowId) ??
      visibleWindows[0] ??
      windows[0],
    [visibleWindows, focusedWindowId, windows]
  );

  const gridGeom = useMemo(
    () => getGridGeometry(maximizedWindowId ? 1 : layoutCount),
    [layoutCount, maximizedWindowId]
  );

  const handleZoomChange = useCallback((windowId: string, bars: number) => {
    setWindows((prev) => propagateZoomToGroup(prev, windowId, bars));
  }, []);

  // Fire TV D-pad & Keyboard navigation + Zoom +/- shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        if (symbolModalOpen) setSymbolModalOpen(false);
        else if (indicatorsModalOpen) setIndicatorsModalOpen(false);
        else if (settingsModalOpen) setSettingsModalOpen(false);
        else if (deviceSyncModalOpen) setDeviceSyncModalOpen(false);
        else if (newsModalState.open) setNewsModalState({ open: false });
        else if (maximizedWindowId) setMaximizedWindowId(null);
        return;
      }

      if (
        symbolModalOpen ||
        indicatorsModalOpen ||
        settingsModalOpen ||
        deviceSyncModalOpen ||
        newsModalState.open
      ) {
        return;
      }

      if ((e.key === '+' || e.key === '=') && focusedWindow) {
        e.preventDefault();
        handleZoomChange(focusedWindow.id, Math.max(20, focusedWindow.zoomBars - 15));
        return;
      }
      if (e.key === '-' && focusedWindow) {
        e.preventDefault();
        handleZoomChange(focusedWindow.id, Math.min(260, focusedWindow.zoomBars + 15));
        return;
      }

      const idx = visibleWindows.findIndex((w) => w.id === focusedWindow?.id);
      if (idx === -1) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = visibleWindows[(idx + 1) % visibleWindows.length];
        setFocusedWindowId(next.id);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = visibleWindows[(idx - 1 + visibleWindows.length) % visibleWindows.length];
        setFocusedWindowId(prev.id);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(visibleWindows.length - 1, idx + gridGeom.cols);
        setFocusedWindowId(visibleWindows[nextIdx].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(0, idx - gridGeom.cols);
        setFocusedWindowId(visibleWindows[prevIdx].id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    visibleWindows,
    focusedWindow,
    gridGeom.cols,
    symbolModalOpen,
    indicatorsModalOpen,
    settingsModalOpen,
    newsModalState.open,
    maximizedWindowId,
    handleZoomChange,
  ]);

  const handleChangeLayoutCount = (count: LayoutCount) => {
    setMaximizedWindowId(null);
    setLayoutCount(count);
    const activeIdx = windows.findIndex((w) => w.id === focusedWindowId);
    if (activeIdx >= count) {
      setFocusedWindowId(windows[0].id);
    }
  };

  const handleApplySymbolTimeframe = useCallback(
    (windowId: string, symbol: string, assetType: AssetType, timeframe: Timeframe) => {
      setWindows((prev) =>
        prev.map((w) => (w.id === windowId ? { ...w, symbol, assetType, timeframe } : w))
      );
    },
    []
  );

  const handleToggleIndicator = useCallback((windowId: string, indicatorId: IndicatorId) => {
    setWindows((prev) => {
      const target = prev.find((w) => w.id === windowId);
      if (!target) return prev;
      const exists = target.indicators.includes(indicatorId);
      const nextIndicators = exists
        ? target.indicators.filter((id) => id !== indicatorId)
        : [...target.indicators, indicatorId];
      return propagateIndicatorsToGroup(prev, windowId, nextIndicators);
    });
  }, []);

  const handleUpdateSync = useCallback((windowId: string, sync: WindowSyncConfig) => {
    setWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, sync } : w)));
  }, []);

  const handleResetView = useCallback(() => {
    if (!focusedWindow) return;
    handleZoomChange(focusedWindow.id, settings.candles.defaultZoomBars);
    setResetOffsetSignal((n) => n + 1);
  }, [focusedWindow, handleZoomChange, settings.candles.defaultZoomBars]);

  const emitTriggeredToasts = useCallback(
    (triggered: PriceAlert[]) => {
      if (triggered.length === 0) return;
      if (settings.alerts.soundEnabled) {
        playAlertChime();
      }
      const newItems: AlertToastItem[] = triggered.map((alert) => {
        const win = windows.find((w) => w.id === alert.windowId);
        return {
          toastId: `toast-${alert.id}-${Date.now()}`,
          alert,
          windowIndex: win?.index ?? 0,
          timeframe: win?.timeframe ?? '',
        };
      });
      setAlertToasts((prev) => [...newItems, ...prev].slice(0, 4));
      for (const item of newItems) {
        setTimeout(() => {
          setAlertToasts((prev) => prev.filter((t) => t.toastId !== item.toastId));
        }, 12000);
      }
    },
    [windows, settings.alerts.soundEnabled]
  );

  const handleLivePriceUpdate = useCallback(
    (windowId: string, symbol: string, prevPrice: number | null, currentPrice: number) => {
      setLatestPriceByWindow((prev) => {
        const existing = prev[windowId];
        if (existing && existing.symbol === symbol && existing.price === currentPrice) {
          return prev;
        }
        return { ...prev, [windowId]: { symbol, price: currentPrice } };
      });

      setAlerts((prev) => {
        const res = checkAndTriggerAlerts(prev, windowId, symbol, prevPrice, currentPrice);
        if (!res.changed) return prev;
        queueMicrotask(() => emitTriggeredToasts(res.newlyTriggered));
        return res.nextAlerts;
      });
    },
    [emitTriggeredToasts]
  );

  const handleCreateAlert = useCallback(
    (
      windowId: string,
      symbol: string,
      input: { targetPrice: number; condition: AlertCondition; note?: string }
    ) => {
      const created = createPriceAlert({
        windowId,
        symbol,
        targetPrice: input.targetPrice,
        condition: input.condition,
        note: input.note,
      });

      const live = latestPriceByWindow[windowId];
      if (live && canonicalSymbolKey(live.symbol) === canonicalSymbolKey(symbol)) {
        const res = checkAndTriggerAlerts([created], windowId, symbol, live.price, live.price);
        if (res.changed) {
          setAlerts((prev) => [res.nextAlerts[0], ...prev]);
          emitTriggeredToasts(res.newlyTriggered);
          return;
        }
      }

      setAlerts((prev) => [created, ...prev]);
    },
    [latestPriceByWindow, emitTriggeredToasts]
  );

  const handleTogglePauseAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, status: a.status === 'paused' ? 'active' : 'paused' }
          : a
      )
    );
  }, []);

  const handleRearmAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'active',
              triggeredAt: undefined,
              triggeredPrice: undefined,
            }
          : a
      )
    );
  }, []);

  const handleDeleteAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const handleClearTriggeredAlerts = useCallback((windowId: string, symbol: string) => {
    const key = canonicalSymbolKey(symbol);
    setAlerts((prev) =>
      prev.filter(
        (a) =>
          !(
            a.windowId === windowId &&
            canonicalSymbolKey(a.symbol) === key &&
            a.status === 'triggered'
          )
      )
    );
  }, []);

  return (
    <div className="w-screen h-screen bg-[#080B11] text-slate-100 flex flex-col overflow-hidden">
      {/* 1. Rolling Wall Street Ticker Banner */}
      {settings.display.showTickerBanner && (
        <WallStreetTicker
          items={tickerItems}
          loading={tickerLoading}
          speedSec={settings.display.tickerSpeedSec}
          onSelectSymbol={(symbol, assetType) => {
            if (!focusedWindow) return;
            handleApplySymbolTimeframe(focusedWindow.id, symbol, assetType, focusedWindow.timeframe);
          }}
        />
      )}

      {/* 2. Breaking Financial News Directly Below Running Banner */}
      {settings.display.showNewsBar && (
        <BreakingNewsBar
          articles={newsArticles}
          loading={newsLoading}
          rotateSec={settings.display.newsRotateSec}
          onOpenReader={(article) => setNewsModalState({ open: true, article })}
        />
      )}

      {/* 3. Top Control Bar (Logo + 1-12 Window Selector + Zoom Slider + Multi-Device Sync + Settings) */}
      <TopControlBar
        layoutCount={layoutCount}
        onChangeLayoutCount={handleChangeLayoutCount}
        focusedWindow={focusedWindow}
        maximizedWindowId={maximizedWindowId}
        onExitMaximize={() => setMaximizedWindowId(null)}
        onOpenSymbolModal={() => setSymbolModalOpen(true)}
        onOpenIndicatorsModal={() => setIndicatorsModalOpen(true)}
        onOpenSettingsModal={() => setSettingsModalOpen(true)}
        onOpenDeviceSyncModal={() => setDeviceSyncModalOpen(true)}
        deviceSyncConnected={deviceSync.connected}
        deviceConnectedCount={deviceSync.connectedCount}
        onZoomChange={(bars) => {
          if (focusedWindow) handleZoomChange(focusedWindow.id, bars);
        }}
        onResetView={handleResetView}
      />

      {/* OTA App Update Banner (pushed from server/deploy/device to all Fire TVs) */}
      {deviceSync.otaUpdateNotice && (
        <div
          role="status"
          data-testid="ota-update-banner"
          className="bg-sky-500/20 border-b border-sky-400/50 px-4 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0"
        >
          <span className="font-medium text-sky-100">
            Update pushed ({deviceSync.otaUpdateNotice.reason}) — refreshing terminal in{' '}
            <strong className="font-mono-num text-[#8EE53F]">
              {deviceSync.otaUpdateNotice.secondsRemaining}s
            </strong>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="tv-focusable px-2.5 py-0.5 rounded bg-[#8EE53F] text-[#080B11] font-bold cursor-pointer"
            >
              Update Now
            </button>
            <button
              type="button"
              onClick={deviceSync.dismissOtaNotice}
              className="tv-focusable px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* 4. 1 to 12 Window Multi-Chart Grid */}
      <main
        className="flex-1 min-h-0 p-1.5 grid gap-1.5 bg-[#080B11]"
        style={{
          gridTemplateColumns: `repeat(${gridGeom.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridGeom.rows}, minmax(0, 1fr))`,
        }}
        data-testid="chart-grid"
        data-window-count={visibleWindows.length}
      >
        {visibleWindows.map((win) => {
          const groupKey = win.sync.group !== 'none' && win.sync.syncCrosshair ? win.sync.group : null;
          const syncedCrosshairTime = groupKey ? crosshairByGroup[groupKey] ?? null : null;
          const windowAlerts = getAlertsForWindow(alerts, win.id, win.symbol);

          return (
            <ChartWindow
              key={win.id}
              config={win}
              settings={settings}
              alerts={windowAlerts}
              resetOffsetSignal={resetOffsetSignal}
              isFocused={focusedWindow?.id === win.id}
              isMaximized={maximizedWindowId === win.id}
              compact={!maximizedWindowId && layoutCount >= 6}
              syncedCrosshairTime={syncedCrosshairTime}
              onFocus={() => setFocusedWindowId(win.id)}
              onToggleMaximize={() =>
                setMaximizedWindowId((prev) => (prev === win.id ? null : win.id))
              }
              onOpenSymbolModal={() => {
                setFocusedWindowId(win.id);
                setSymbolModalOpen(true);
              }}
              onOpenIndicatorsModal={() => {
                setFocusedWindowId(win.id);
                setIndicatorsModalOpen(true);
              }}
              onUpdateSync={(sync) => handleUpdateSync(win.id, sync)}
              onZoomBarsChange={(bars) => handleZoomChange(win.id, bars)}
              onCrosshairTimeChange={(time) => {
                if (!groupKey) return;
                setCrosshairByGroup((prev) =>
                  prev[groupKey] === time ? prev : { ...prev, [groupKey]: time }
                );
              }}
              onCreateAlert={handleCreateAlert}
              onTogglePauseAlert={handleTogglePauseAlert}
              onRearmAlert={handleRearmAlert}
              onDeleteAlert={handleDeleteAlert}
              onClearTriggeredAlerts={handleClearTriggeredAlerts}
              onLivePriceUpdate={handleLivePriceUpdate}
            />
          );
        })}
      </main>

      {/* Modals */}
      {focusedWindow && (
        <SymbolTimeframeModal
          key={`sym-${focusedWindow.id}-${focusedWindow.symbol}-${focusedWindow.timeframe}`}
          isOpen={symbolModalOpen}
          windowIndex={focusedWindow.index}
          currentSymbol={focusedWindow.symbol}
          currentAssetType={focusedWindow.assetType}
          currentTimeframe={focusedWindow.timeframe}
          stocks={stockCatalog}
          crypto={cryptoCatalog}
          onClose={() => setSymbolModalOpen(false)}
          onApply={(symbol, assetType, timeframe) =>
            handleApplySymbolTimeframe(focusedWindow.id, symbol, assetType, timeframe)
          }
        />
      )}

      {focusedWindow && (
        <IndicatorsModal
          isOpen={indicatorsModalOpen}
          windowIndex={focusedWindow.index}
          activeIndicators={focusedWindow.indicators}
          sync={focusedWindow.sync}
          onClose={() => setIndicatorsModalOpen(false)}
          onToggleIndicator={(id) => handleToggleIndicator(focusedWindow.id, id)}
        />
      )}

      <SettingsModal
        isOpen={settingsModalOpen}
        settings={settings}
        onClose={() => setSettingsModalOpen(false)}
        onChange={setSettings}
      />

      <DeviceSyncModal
        isOpen={deviceSyncModalOpen}
        roomId={deviceSync.roomId}
        connected={deviceSync.connected}
        connectedCount={deviceSync.connectedCount}
        revision={deviceSync.revision}
        autoSyncEnabled={deviceSync.autoSyncEnabled}
        onChangeRoomId={deviceSync.setRoomId}
        onToggleAutoSync={deviceSync.toggleAutoSync}
        onPushWorkspaceNow={deviceSync.pushWorkspaceNow}
        onPushAppReload={deviceSync.pushAppReloadToAllDevices}
        onClose={() => setDeviceSyncModalOpen(false)}
      />

      <NewsDetailModal
        isOpen={newsModalState.open}
        articles={newsArticles}
        initialArticle={newsModalState.article}
        onClose={() => setNewsModalState({ open: false })}
      />

      {remoteSyncNotice && (
        <div
          role="status"
          data-testid="remote-sync-toast"
          className="fixed bottom-4 left-4 z-50 px-3 py-2 rounded-lg bg-[#0F172A]/95 border border-sky-400/50 text-xs font-medium text-sky-200 shadow-xl"
        >
          {remoteSyncNotice}
        </div>
      )}

      <AlertToastStack
        toasts={alertToasts}
        onFocusWindow={(winId) => {
          setFocusedWindowId(winId);
          setAlertToasts((prev) => prev.filter((t) => t.alert.windowId !== winId));
        }}
        onDismiss={(toastId) =>
          setAlertToasts((prev) => prev.filter((t) => t.toastId !== toastId))
        }
      />
    </div>
  );
}
