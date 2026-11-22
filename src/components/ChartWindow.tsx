import {
  Activity,
  Link2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  Candle,
  ChartWindowConfig,
  DataSourceTag,
  KlinesResponse,
  SyncGroup,
  TerminalSettings,
  WindowSyncConfig,
} from '../types/trading';
import { ChartCanvas } from './ChartCanvas';

interface ChartWindowProps {
  config: ChartWindowConfig;
  settings: TerminalSettings;
  resetOffsetSignal: number;
  isFocused: boolean;
  isMaximized: boolean;
  compact: boolean;
  syncedCrosshairTime: number | null;
  onFocus: () => void;
  onToggleMaximize: () => void;
  onOpenSymbolModal: () => void;
  onOpenIndicatorsModal: () => void;
  onUpdateSync: (sync: WindowSyncConfig) => void;
  onZoomBarsChange: (bars: number) => void;
  onCrosshairTimeChange: (time: number | null) => void;
}

const SYNC_ORDER: SyncGroup[] = ['none', 'A', 'B', 'C'];

function formatSourceTag(source: DataSourceTag): string {
  switch (source) {
    case 'binance-perp':
    case 'binance-perp-fallback':
      return 'BINANCE .P';
    case 'binance-spot':
      return 'BINANCE';
    case 'yahoo':
      return 'YAHOO';
    case 'synthetic':
      return 'SIM';
  }
}

export function ChartWindow({
  config,
  settings,
  resetOffsetSignal,
  isFocused,
  isMaximized,
  compact,
  syncedCrosshairTime,
  onFocus,
  onToggleMaximize,
  onOpenSymbolModal,
  onOpenIndicatorsModal,
  onUpdateSync,
  onZoomBarsChange,
  onCrosshairTimeChange,
}: ChartWindowProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [resolvedSymbol, setResolvedSymbol] = useState(config.symbol);
  const [sourceTag, setSourceTag] = useState<DataSourceTag>('binance-spot');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch(
          `/api/klines?symbol=${encodeURIComponent(config.symbol)}&assetType=${config.assetType}&timeframe=${config.timeframe}`
        );
        if (!res.ok) throw new Error('Failed to load chart data');
        const data = (await res.json()) as KlinesResponse;
        if (!active) return;
        setCandles(data.candles ?? []);
        setResolvedSymbol(data.resolvedSymbol || config.symbol);
        setSourceTag(data.source);
      } catch {
        // Keep existing candles if transient refresh error occurs
      } finally {
        if (active) setLoading(false);
      }
    }

    setLoading(true);
    load();
    const refreshMs = config.timeframe === '10s' ? 4000 : 15000;
    const interval = setInterval(load, refreshMs);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [config.symbol, config.assetType, config.timeframe]);

  const last = candles[candles.length - 1];
  const baseCandle = candles[Math.max(0, candles.length - 25)] ?? candles[0];
  const pctChange =
    last && baseCandle && baseCandle.open !== 0
      ? ((last.close - baseCandle.open) / baseCandle.open) * 100
      : 0;
  const isPctUp = pctChange >= 0;

  const cycleSyncGroup = () => {
    const idx = SYNC_ORDER.indexOf(config.sync.group);
    const nextGroup = SYNC_ORDER[(idx + 1) % SYNC_ORDER.length];
    onUpdateSync({ ...config.sync, group: nextGroup });
  };

  return (
    <section
      tabIndex={0}
      onFocus={onFocus}
      onClick={onFocus}
      data-testid={`chart-window-${config.id}`}
      aria-label={`Chart window ${config.index + 1}: ${resolvedSymbol} ${config.timeframe}`}
      className={`tv-focusable relative flex flex-col bg-[#0B0F17] rounded-md overflow-hidden transition-colors min-h-0 min-w-0 ${
        isFocused
          ? 'ring-2 ring-sky-400 border border-sky-400/70'
          : 'border border-slate-800/90 hover:border-slate-700'
      }`}
    >
      {/* Window Header Bar */}
      <div className="h-9 bg-[#111724] border-b border-slate-800/90 px-2 flex items-center justify-between gap-2 shrink-0 overflow-hidden">
        {/* Left: Symbol + Timeframe + Source + Price */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFocus();
              onOpenSymbolModal();
            }}
            aria-label={`Change symbol and timeframe for window ${config.index + 1}`}
            className="tv-focusable flex items-center gap-1 px-1.5 py-1 rounded bg-[#182132] hover:bg-[#212D42] text-xs font-semibold text-white transition-colors whitespace-nowrap min-w-0 cursor-pointer"
          >
            <span className="truncate max-w-[115px]">{resolvedSymbol}</span>
            <span className="text-sky-300 font-mono-num shrink-0">{config.timeframe}</span>
          </button>

          {!compact && (
            <span className="text-[10px] font-mono-num text-slate-400 whitespace-nowrap shrink-0 hidden lg:inline">
              {config.assetType === 'stock' ? 'STK' : 'CRP'} · {formatSourceTag(sourceTag)}
            </span>
          )}

          {last && !compact && (
            <div className="flex items-center gap-1.5 font-mono-num text-xs whitespace-nowrap shrink-0 ml-0.5">
              <span className="text-slate-100 font-semibold">
                {last.close >= 100 ? last.close.toFixed(2) : last.close.toFixed(3)}
              </span>
              <span className={isPctUp ? 'text-[#8EE53F]' : 'text-slate-400'}>
                {isPctUp ? '+' : ''}
                {pctChange.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Right: Sync Group + Indicators + Maximize */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFocus();
              cycleSyncGroup();
            }}
            title="Cycle Sync Group (Off, A, B, C)"
            aria-label={`Sync group ${config.sync.group} for window ${config.index + 1}`}
            className={`tv-focusable flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-mono-num font-medium transition-colors cursor-pointer whitespace-nowrap ${
              config.sync.group === 'none'
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
            }`}
          >
            <Link2 className="w-3 h-3" />
            <span>{config.sync.group === 'none' ? (compact ? '' : 'Sync') : config.sync.group}</span>
          </button>

          {config.sync.group !== 'none' && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateSync({ ...config.sync, syncIndicators: !config.sync.syncIndicators });
                }}
                aria-pressed={config.sync.syncIndicators}
                title="Sync Indicators in Group"
                className={`tv-focusable px-1.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  config.sync.syncIndicators
                    ? 'bg-[#8EE53F]/20 text-[#8EE53F] border border-[#8EE53F]/40'
                    : 'bg-slate-800/80 text-slate-400'
                }`}
              >
                {compact ? 'I' : 'Ind'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateSync({ ...config.sync, syncZoom: !config.sync.syncZoom });
                }}
                aria-pressed={config.sync.syncZoom}
                title="Sync Chart Zoom in Group"
                className={`tv-focusable px-1.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  config.sync.syncZoom
                    ? 'bg-[#8EE53F]/20 text-[#8EE53F] border border-[#8EE53F]/40'
                    : 'bg-slate-800/80 text-slate-400'
                }`}
              >
                {compact ? 'Z' : 'Zoom'}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFocus();
              onOpenIndicatorsModal();
            }}
            aria-label={`Indicators for window ${config.index + 1}`}
            title="Indicators"
            className="tv-focusable p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-[#8EE53F]" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFocus();
              onToggleMaximize();
            }}
            aria-label={
              isMaximized
                ? `Restore grid from window ${config.index + 1}`
                : `Maximize window ${config.index + 1}`
            }
            title={isMaximized ? 'Restore Grid' : 'Maximize Window'}
            className="tv-focusable p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Chart Body */}
      <div className="relative flex-1 min-h-0">
        {loading && candles.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs font-mono-num text-slate-400">
            Loading {config.symbol} ({config.timeframe})...
          </div>
        ) : (
          <ChartCanvas
            windowId={config.id}
            candles={candles}
            indicators={config.indicators}
            settings={settings}
            zoomBars={config.zoomBars}
            resetOffsetSignal={resetOffsetSignal}
            onZoomBarsChange={onZoomBarsChange}
            syncedCrosshairTime={syncedCrosshairTime}
            onCrosshairTimeChange={onCrosshairTimeChange}
            compact={compact}
          />
        )}
      </div>
    </section>
  );
}
