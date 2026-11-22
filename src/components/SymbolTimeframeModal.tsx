import { Search, X } from 'lucide-react';
import { useState } from 'react';
import type { AssetType, SymbolOption, Timeframe } from '../types/trading';
import { ALL_TIMEFRAMES } from '../utils/timeframes';

interface SymbolTimeframeModalProps {
  isOpen: boolean;
  windowIndex: number;
  currentSymbol: string;
  currentAssetType: AssetType;
  currentTimeframe: Timeframe;
  stocks: SymbolOption[];
  crypto: SymbolOption[];
  onClose: () => void;
  onApply: (symbol: string, assetType: AssetType, timeframe: Timeframe) => void;
}

export function SymbolTimeframeModal({
  isOpen,
  windowIndex,
  currentSymbol,
  currentAssetType,
  currentTimeframe,
  stocks,
  crypto,
  onClose,
  onApply,
}: SymbolTimeframeModalProps) {
  const [assetTab, setAssetTab] = useState<AssetType>(currentAssetType);
  const [selectedSymbol, setSelectedSymbol] = useState(currentSymbol);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(currentTimeframe);
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const list = assetTab === 'crypto' ? crypto : stocks;
  const filtered = list.filter(
    (s) =>
      s.symbol.toLowerCase().includes(query.trim().toLowerCase()) ||
      s.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const customTicker = query.trim().toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Configure Window ${windowIndex + 1} Symbol and Timeframe`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#101622] border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-white">
              Window {windowIndex + 1} · Symbol &amp; Timeframe
            </h2>
            <p className="text-xs text-slate-400">
              Stocks automatically fall back to Binance Futures (.P) such as NVDAUSDT.P or TQQQUSDT.P if equity data is unavailable.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close symbol and timeframe modal"
            className="tv-focusable p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Asset Type Tabs + Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#0B0F17] rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setAssetTab('crypto')}
                className={`tv-focusable px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  assetTab === 'crypto'
                    ? 'bg-[#8EE53F] text-[#080B11]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Crypto
              </button>
              <button
                type="button"
                onClick={() => setAssetTab('stock')}
                className={`tv-focusable px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  assetTab === 'stock'
                    ? 'bg-[#8EE53F] text-[#080B11]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Stocks &amp; Perps (.P)
              </button>
            </div>

            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or enter custom ticker (e.g. NVDA, TQQQUSDT.P, BTCUSDT)"
                aria-label="Search or enter custom ticker"
                className="tv-focusable w-full pl-9 pr-3 py-2 bg-[#0B0F17] border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500"
              />
            </div>

            {customTicker && !filtered.some((f) => f.symbol === customTicker) && (
              <button
                type="button"
                onClick={() => setSelectedSymbol(customTicker)}
                className="tv-focusable px-3 py-2 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 cursor-pointer"
              >
                Use {customTicker}
              </button>
            )}
          </div>

          {/* Symbol Grid */}
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2">
              Select {assetTab === 'crypto' ? 'Crypto Pair' : 'Stock / ETF / Binance .P'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {filtered.map((item) => {
                const active = selectedSymbol.toUpperCase() === item.symbol.toUpperCase();
                return (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => setSelectedSymbol(item.symbol)}
                    className={`tv-focusable text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#8EE53F]/15 border-[#8EE53F] text-white'
                        : 'bg-[#0B0F17] border-slate-800 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono-num">{item.symbol}</div>
                    <div className="text-[11px] text-slate-400 truncate">{item.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exact 18 Timeframes */}
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2">
              Timeframe (10s · Minutes · Hours)
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
              {ALL_TIMEFRAMES.map((tf) => {
                const active = selectedTimeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setSelectedTimeframe(tf.id)}
                    className={`tv-focusable py-2 rounded-md text-xs font-mono-num font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#8EE53F] text-[#080B11] border-[#8EE53F]'
                        : 'bg-[#0B0F17] text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between bg-[#0B0F17]">
          <div className="text-xs text-slate-300 font-mono-num">
            Selected: <span className="text-white font-bold">{selectedSymbol}</span> ·{' '}
            <span className="text-sky-300">{assetTab.toUpperCase()}</span> ·{' '}
            <span className="text-[#8EE53F]">{selectedTimeframe}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="tv-focusable px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(selectedSymbol, assetTab, selectedTimeframe);
                onClose();
              }}
              className="tv-focusable px-5 py-2 rounded-lg text-xs font-bold bg-[#8EE53F] text-[#080B11] hover:bg-[#9EEB54] cursor-pointer"
            >
              Apply to Window {windowIndex + 1}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
