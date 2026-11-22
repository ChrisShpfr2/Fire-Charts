import type { AssetType, TickerTapeItem } from '../types/trading';

interface WallStreetTickerProps {
  items: TickerTapeItem[];
  loading: boolean;
  speedSec?: number;
  onSelectSymbol: (symbol: string, assetType: AssetType) => void;
}

function formatTickerPrice(price: number): string {
  if (!Number.isFinite(price)) return '--';
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export function WallStreetTicker({
  items,
  loading,
  speedSec = 48,
  onSelectSymbol,
}: WallStreetTickerProps) {
  if (loading && items.length === 0) {
    return (
      <div
        className="h-10 bg-[#0B0F17] border-b border-slate-800/90 flex items-center px-4 text-xs text-slate-400 font-mono-num shrink-0"
        data-testid="wallstreet-ticker"
      >
        Loading live Wall Street &amp; Crypto tape...
      </div>
    );
  }

  const doubled = items.length > 0 ? [...items, ...items] : [];

  return (
    <div
      className="h-10 bg-[#0B0F17] border-b border-slate-800/90 flex items-center overflow-hidden relative shrink-0"
      data-testid="wallstreet-ticker"
      aria-label="Wall Street Rolling Ticker Banner"
    >
      <div className="px-3.5 h-full bg-[#111827] border-r border-slate-800 flex items-center gap-2 z-10 shrink-0">
        <span className="text-xs font-display font-bold tracking-wider text-[#8EE53F] uppercase whitespace-nowrap">
          Wall Street Tape
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          className="animate-ticker-marquee flex items-center"
          style={{ animationDuration: `${Math.max(10, speedSec)}s` }}
        >
          {doubled.map((item, idx) => {
            const isUp = item.changePercent >= 0;
            return (
              <button
                key={`${item.symbol}-${idx}`}
                type="button"
                onClick={() => onSelectSymbol(item.symbol, item.assetType)}
                className="tv-focusable flex items-center gap-2.5 px-4 h-10 border-r border-slate-800/60 hover:bg-slate-800/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title={`Load ${item.symbol} into active window`}
              >
                <span className="text-xs font-semibold text-slate-100 tracking-tight">
                  {item.displaySymbol}
                </span>
                <span className="text-xs font-mono-num text-slate-200">
                  {formatTickerPrice(item.price)}
                </span>
                <span
                  className={`text-xs font-mono-num font-medium ${
                    isUp ? 'text-[#8EE53F]' : 'text-slate-400'
                  }`}
                >
                  {isUp ? '▲' : '▼'} {isUp ? '+' : ''}
                  {item.changePercent.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
