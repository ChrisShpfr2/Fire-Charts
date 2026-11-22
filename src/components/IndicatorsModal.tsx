import { Check, Search, X } from 'lucide-react';
import { useState } from 'react';
import type { IndicatorId, WindowSyncConfig } from '../types/trading';
import { INDICATOR_CATALOG } from '../utils/indicators';

interface IndicatorsModalProps {
  isOpen: boolean;
  windowIndex: number;
  activeIndicators: IndicatorId[];
  sync: WindowSyncConfig;
  onClose: () => void;
  onToggleIndicator: (id: IndicatorId) => void;
}

const CATEGORIES = ['All', 'Pine Suite', 'Momentum', 'Trend', 'Volatility', 'Volume'] as const;

export function IndicatorsModal({
  isOpen,
  windowIndex,
  activeIndicators,
  sync,
  onClose,
  onToggleIndicator,
}: IndicatorsModalProps) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = INDICATOR_CATALOG.filter((ind) => {
    const matchesCat = category === 'All' || ind.category === category;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      ind.name.toLowerCase().includes(q) ||
      ind.description.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Indicators for Window ${windowIndex + 1}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#101622] border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-white">
              Window {windowIndex + 1} · Technical Indicators
            </h2>
            <p className="text-xs text-slate-400">
              {sync.group !== 'none' && sync.syncIndicators
                ? `Indicator changes are synchronized to Sync Group ${sync.group}.`
                : 'Changes apply only to this window unless Sync Indicators is enabled for its group.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close indicators modal"
            className="tv-focusable p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0F17] rounded-lg border border-slate-800">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`tv-focusable px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    category === cat
                      ? 'bg-[#8EE53F] text-[#080B11] font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search indicators..."
                aria-label="Search indicators"
                className="tv-focusable w-full pl-9 pr-3 py-2 bg-[#0B0F17] border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {filtered.map((ind) => {
              const enabled = activeIndicators.includes(ind.id);
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => onToggleIndicator(ind.id)}
                  aria-pressed={enabled}
                  className={`tv-focusable w-full text-left p-3.5 rounded-lg border flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                    enabled
                      ? 'bg-[#8EE53F]/10 border-[#8EE53F]/60'
                      : 'bg-[#0B0F17] border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span>{ind.name}</span>
                      <span className="text-[11px] font-normal text-slate-400">
                        · {ind.category} · {ind.paramsLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{ind.description}</p>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                      enabled
                        ? 'bg-[#8EE53F] border-[#8EE53F] text-[#080B11]'
                        : 'border-slate-700 bg-slate-900 text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end bg-[#0B0F17]">
          <button
            type="button"
            onClick={onClose}
            className="tv-focusable px-5 py-2 rounded-lg text-xs font-bold bg-[#8EE53F] text-[#080B11] hover:bg-[#9EEB54] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
