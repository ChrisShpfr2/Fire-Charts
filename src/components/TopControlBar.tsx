import { Activity, MonitorSmartphone, RotateCcw, Settings, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';
import type { ChartWindowConfig, LayoutCount } from '../types/trading';

interface TopControlBarProps {
  layoutCount: LayoutCount;
  onChangeLayoutCount: (count: LayoutCount) => void;
  focusedWindow: ChartWindowConfig | undefined;
  maximizedWindowId: string | null;
  onExitMaximize: () => void;
  onOpenSymbolModal: () => void;
  onOpenIndicatorsModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenDeviceSyncModal: () => void;
  deviceSyncConnected: boolean;
  deviceConnectedCount: number;
  onZoomChange: (bars: number) => void;
  onResetView: () => void;
}

const WINDOW_COUNTS: LayoutCount[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function TopControlBar({
  layoutCount,
  onChangeLayoutCount,
  focusedWindow,
  maximizedWindowId,
  onExitMaximize,
  onOpenSymbolModal,
  onOpenIndicatorsModal,
  onOpenSettingsModal,
  onOpenDeviceSyncModal,
  deviceSyncConnected,
  deviceConnectedCount,
  onZoomChange,
  onResetView,
}: TopControlBarProps) {
  const [logoError, setLogoError] = useState(false);

  const zoomBars = focusedWindow?.zoomBars ?? 90;
  // Slider left = zoomed out (260 bars), right = zoomed in (20 bars)
  const sliderVal = 280 - zoomBars;

  return (
    <header className="h-12 bg-[#0B0F17] border-b border-slate-800 flex items-center justify-between gap-3 px-3.5 shrink-0">
      {/* Zone 1: Custom Generated TV Logo + Brand */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        {!logoError ? (
          <img
            src="/src/assets/images/apex_tv_logo_1795281494539.jpg"
            alt="Apex 4K Terminal Logo"
            referrerPolicy="no-referrer"
            onError={() => setLogoError(true)}
            className="w-7 h-7 rounded-md object-cover border border-slate-700/70 shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-md bg-[#111827] border border-[#8EE53F]/50 flex items-center justify-center text-[#8EE53F] font-display font-bold text-xs shrink-0">
            A4
          </div>
        )}
        <span className="font-display font-bold text-base tracking-tight text-white">
          Apex 4K Terminal
        </span>
      </div>

      {/* Zone 2: 1-12 Window Grid Count Selector */}
      <div
        className="flex items-center gap-1 bg-[#121824] p-1 rounded-lg border border-slate-800/90 overflow-x-auto"
        role="group"
        aria-label="Chart windows count from 1 to 12"
      >
        <span className="text-[11px] font-medium text-slate-400 px-1.5 whitespace-nowrap shrink-0 hidden xl:inline">
          Windows
        </span>
        {WINDOW_COUNTS.map((count) => {
          const active = !maximizedWindowId && layoutCount === count;
          return (
            <button
              key={count}
              type="button"
              onClick={() => onChangeLayoutCount(count)}
              aria-label={`${count} chart ${count === 1 ? 'window' : 'windows'}`}
              aria-pressed={active}
              className={`tv-focusable w-6 h-6 rounded text-xs font-mono-num font-semibold transition-colors cursor-pointer shrink-0 ${
                active
                  ? 'bg-[#8EE53F] text-[#080B11]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {count}
            </button>
          );
        })}
      </div>

      {/* Zone 3: TV Zoom Slider + Focused Window Actions + Multi-Device Sync + Settings */}
      <div className="flex items-center gap-2 shrink-0">
        {focusedWindow && (
          <div
            className="flex items-center gap-1 bg-[#121824] px-2 py-1 rounded-lg border border-slate-800"
            role="group"
            aria-label="Chart zoom controls"
          >
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(260, zoomBars + 15))}
              aria-label="Zoom out chart"
              title="Zoom Out (-)"
              className="tv-focusable p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={20}
              max={260}
              step={5}
              value={sliderVal}
              onChange={(e) => onZoomChange(280 - Number(e.target.value))}
              aria-label="Chart zoom level"
              className="tv-focusable w-20 xl:w-24 accent-[#8EE53F] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(20, zoomBars - 15))}
              aria-label="Zoom in chart"
              title="Zoom In (+)"
              className="tv-focusable p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono-num text-slate-300 w-9 text-right hidden lg:inline">
              {zoomBars}b
            </span>
            <button
              type="button"
              onClick={onResetView}
              aria-label="Reset chart zoom and pan"
              title="Reset Zoom & Fit"
              className="tv-focusable p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}

        {maximizedWindowId && (
          <button
            type="button"
            onClick={onExitMaximize}
            className="tv-focusable px-2.5 py-1.5 rounded-md text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Exit Zoom
          </button>
        )}

        {focusedWindow && (
          <>
            <button
              type="button"
              onClick={onOpenSymbolModal}
              className="tv-focusable px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#141B29] text-slate-100 border border-slate-700/80 hover:border-slate-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              W{focusedWindow.index + 1}: {focusedWindow.symbol} · {focusedWindow.timeframe}
            </button>
            <button
              type="button"
              onClick={onOpenIndicatorsModal}
              className="tv-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-[#8EE53F] text-[#080B11] hover:bg-[#9EEB54] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Indicators ({focusedWindow.indicators.length})</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onOpenDeviceSyncModal}
          data-testid="device-sync-btn"
          aria-label="Multi-device push sync and Fire TV APK"
          title="Multi-Device Live Push & Fire TV APK"
          className="tv-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#141B29] text-slate-200 border border-slate-700/80 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              deviceSyncConnected ? 'bg-[#8EE53F]' : 'bg-amber-400'
            }`}
          />
          <MonitorSmartphone className="w-3.5 h-3.5 text-sky-300" />
          <span className="font-mono-num">{deviceConnectedCount}</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettingsModal}
          aria-label="Open terminal and indicator settings"
          title="Settings"
          className="tv-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#141B29] text-slate-200 border border-slate-700/80 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-sky-300" />
          <span className="hidden xl:inline">Settings</span>
        </button>
      </div>
    </header>
  );
}
