import { ChevronLeft, ChevronRight, Radar } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  formatDivergenceKindLabel,
  isBullishDivergence,
  type DivergenceBannerFilter,
  type WindowDivergenceSignal,
} from '../utils/divergenceBanner';

interface DivergenceBannerProps {
  signals: WindowDivergenceSignal[];
  focusedWindowId: string | undefined;
  activeWindowCount: number;
  onFocusWindow: (windowId: string) => void;
}

function formatSignalPrice(p: number): string {
  if (!Number.isFinite(p)) return '--';
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(5);
}

export function DivergenceBanner({
  signals,
  focusedWindowId,
  activeWindowCount,
  onFocusWindow,
}: DivergenceBannerProps) {
  const [filter, setFilter] = useState<DivergenceBannerFilter>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  if (activeWindowCount === 0) return null;

  const filtered = signals.filter((s) => {
    if (filter === 'bull') return isBullishDivergence(s.kind);
    if (filter === 'bear') return !isBullishDivergence(s.kind);
    return true;
  });

  const scrollTrack = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  return (
    <section
      data-testid="divergence-banner"
      aria-label="RSI and WaveTrend Divergence Scanner Banner"
      className="h-11 bg-[#0B101A] border-t border-slate-800/95 px-3 flex items-center gap-2.5 shrink-0 select-none"
    >
      {/* Left Header Block */}
      <div className="flex items-center gap-2 pr-2.5 border-r border-slate-800 shrink-0">
        <Radar className="w-4 h-4 text-[#8EE53F]" />
        <span className="text-[11px] font-display font-bold tracking-wider text-slate-100 uppercase whitespace-nowrap">
          RSI / WT Divergences
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold ${
            filtered.length > 0
              ? 'bg-[#8EE53F]/15 text-[#8EE53F] border border-[#8EE53F]/35'
              : 'bg-slate-800/90 text-slate-400 border border-slate-700'
          }`}
        >
          {filtered.length > 0 ? `${filtered.length} LIVE` : 'SCAN'}
        </span>
      </div>

      {/* Horizontal Divergence Signal Blocks */}
      <div
        ref={scrollRef}
        className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar"
      >
        {filtered.length > 0 ? (
          filtered.map((sig) => {
            const isBull = isBullishDivergence(sig.kind);
            const isFocused = sig.windowId === focusedWindowId;
            return (
              <button
                key={sig.id}
                type="button"
                onClick={() => onFocusWindow(sig.windowId)}
                data-testid={`divergence-block-${sig.id}`}
                title={`Focus Window ${sig.windowIndex + 1} (${sig.symbol} ${sig.timeframe})`}
                className={`tv-focusable shrink-0 flex items-center gap-2 px-2.5 py-1 rounded border text-left transition-colors cursor-pointer ${
                  isBull
                    ? isFocused
                      ? 'bg-[#8EE53F]/15 border-[#8EE53F]/75 text-slate-100'
                      : 'bg-[#101A17] border-[#8EE53F]/35 hover:border-[#8EE53F]/70 text-slate-100'
                    : isFocused
                    ? 'bg-red-500/20 border-red-400/80 text-slate-100'
                    : 'bg-[#1A1115] border-red-500/35 hover:border-red-400/70 text-slate-100'
                }`}
              >
                <span
                  className={`w-1.5 h-5 rounded-sm shrink-0 ${
                    isBull ? 'bg-[#8EE53F]' : 'bg-red-400'
                  }`}
                />
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-[11px] font-bold text-white">
                    {sig.symbol}
                  </span>
                  <span className="text-[10px] font-mono-num text-sky-300">
                    {sig.timeframe}
                  </span>
                  <span
                    className={`text-[10px] font-mono-num font-bold ${
                      isBull ? 'text-[#8EE53F]' : 'text-red-300'
                    }`}
                  >
                    {sig.source === 'wt' ? 'WT' : 'RSI'} {formatDivergenceKindLabel(sig.kind)}
                  </span>
                  <span className="text-[10px] font-mono-num text-slate-400">
                    {sig.barsAgo === 0 ? 'NOW' : `${sig.barsAgo}b`} · {formatSignalPrice(sig.price)}
                  </span>
                  <span className="text-[10px] font-mono-num text-slate-500 hidden xl:inline">
                    ({sig.startOsc.toFixed(0)}→{sig.endOsc.toFixed(0)})
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="px-2.5 py-1 rounded bg-[#111724] border border-slate-800 text-[11px] font-mono-num text-slate-400 whitespace-nowrap">
            {signals.length === 0
              ? `Scanning ${activeWindowCount} active chart ${
                  activeWindowCount === 1 ? 'window' : 'windows'
                } for RSI & WaveTrend pivot divergences...`
              : `No ${filter === 'bull' ? 'bullish' : 'bearish'} divergences matched`}
          </div>
        )}
      </div>

      {/* Right Filter & Scroll Controls */}
      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800 shrink-0">
        <div className="flex items-center p-0.5 rounded bg-[#111724] border border-slate-800">
          {(['all', 'bull', 'bear'] as DivergenceBannerFilter[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              aria-pressed={filter === mode}
              className={`tv-focusable px-2 py-0.5 rounded text-[10px] font-semibold uppercase transition-colors cursor-pointer ${
                filter === mode
                  ? mode === 'bull'
                    ? 'bg-[#8EE53F] text-[#080B11]'
                    : mode === 'bear'
                    ? 'bg-red-500 text-white'
                    : 'bg-sky-400 text-[#080B11]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollTrack(-1)}
          aria-label="Scroll divergence blocks left"
          className="tv-focusable p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => scrollTrack(1)}
          aria-label="Scroll divergence blocks right"
          className="tv-focusable p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
}
