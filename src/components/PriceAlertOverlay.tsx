import {
  Bell,
  BellRing,
  CheckCircle2,
  Crosshair,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AlertCondition, PriceAlert } from '../types/trading';
import {
  computePercentDelta,
  formatAlertConditionShort,
  formatAlertPrice,
  inferAlertCondition,
  roundPricePrecision,
} from '../utils/alerts';

interface PriceAlertOverlayProps {
  windowId: string;
  windowIndex: number;
  symbol: string;
  currentPrice: number | null;
  alerts: PriceAlert[];
  pickMode: boolean;
  compact: boolean;
  onTogglePickMode: () => void;
  onCreateAlert: (input: {
    targetPrice: number;
    condition: AlertCondition;
    note?: string;
  }) => void;
  onTogglePauseAlert: (alertId: string) => void;
  onRearmAlert: (alertId: string) => void;
  onDeleteAlert: (alertId: string) => void;
  onClearTriggered: () => void;
  onClose: () => void;
}

const PRESET_PCTS = [-2, -1, -0.5, 0.5, 1, 2];

export function PriceAlertOverlay({
  windowId,
  windowIndex,
  symbol,
  currentPrice,
  alerts,
  pickMode,
  compact,
  onTogglePickMode,
  onCreateAlert,
  onTogglePauseAlert,
  onRearmAlert,
  onDeleteAlert,
  onClearTriggered,
  onClose,
}: PriceAlertOverlayProps) {
  const defaultSuggested =
    currentPrice !== null && Number.isFinite(currentPrice)
      ? roundPricePrecision(currentPrice * 1.01)
      : 100;

  const [priceInput, setPriceInput] = useState<string>(() => String(defaultSuggested));
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [manualCondition, setManualCondition] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!manualCondition) {
      const parsed = Number(priceInput);
      if (Number.isFinite(parsed) && parsed > 0) {
        setCondition(inferAlertCondition(parsed, currentPrice));
      }
    }
  }, [priceInput, currentPrice, manualCondition]);

  const applyPreset = (pct: number) => {
    if (currentPrice === null || !Number.isFinite(currentPrice)) return;
    const nextPrice = roundPricePrecision(currentPrice * (1 + pct / 100));
    setPriceInput(String(nextPrice));
    setManualCondition(false);
    setCondition(pct >= 0 ? 'above' : 'below');
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(priceInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setErrorMsg('Enter a valid threshold price greater than 0.');
      return;
    }
    setErrorMsg(null);
    onCreateAlert({
      targetPrice: parsed,
      condition,
      note: noteInput.trim() || undefined,
    });
    setNoteInput('');
    setManualCondition(false);
  };

  const hasTriggered = alerts.some((a) => a.status === 'triggered');
  const inputId = `alert-price-input-${windowId}`;
  const noteId = `alert-note-input-${windowId}`;

  return (
    <div
      role="region"
      aria-label={`Price alerts for window ${windowIndex + 1} ${symbol}`}
      data-testid={`alert-overlay-${windowId}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`absolute z-20 bg-[#0D131F]/95 backdrop-blur-md border border-amber-400/45 rounded-lg shadow-2xl flex flex-col overflow-hidden ${
        compact
          ? 'inset-x-1.5 top-1.5 bottom-1.5'
          : 'right-2 top-1.5 w-[316px] max-w-[calc(100%-16px)] max-h-[calc(100%-14px)]'
      }`}
    >
      {/* Header */}
      <div className="px-2.5 py-1.5 bg-[#131B2B] border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <BellRing className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-white truncate">
            W{windowIndex + 1} Alerts · {symbol}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onTogglePickMode}
            aria-pressed={pickMode}
            aria-label={`Pick alert price on chart for window ${windowIndex + 1}`}
            title="Click anywhere on chart to drop a horizontal alert"
            className={`tv-focusable flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
              pickMode
                ? 'bg-amber-400 text-[#080B11]'
                : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            <span>{pickMode ? 'Click Chart…' : 'Pick on Chart'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close price alerts for window ${windowIndex + 1}`}
            className="tv-focusable p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="p-2 overflow-y-auto space-y-2 flex-1 min-h-0">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-1.5 bg-[#080B11]/85 p-2 rounded-md border border-slate-800/90">
          <div className="flex items-center justify-between text-[11px] font-mono-num">
            <label htmlFor={inputId} className="text-slate-300 font-medium">
              Threshold Price
            </label>
            {currentPrice !== null && (
              <span className="text-slate-400">
                Live: <strong className="text-slate-100">{formatAlertPrice(currentPrice)}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              id={inputId}
              type="number"
              step="any"
              value={priceInput}
              onChange={(e) => {
                setPriceInput(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Target price"
              className="tv-focusable flex-1 min-w-0 bg-[#111827] border border-slate-700 rounded px-2 py-1 text-xs font-mono-num text-white focus:border-amber-400 outline-none"
            />
            <button
              type="submit"
              className="tv-focusable flex items-center gap-1 px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-[#080B11] text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set Alert</span>
            </button>
          </div>

          {/* Quick Percent Offsets */}
          {currentPrice !== null && (
            <div className="grid grid-cols-6 gap-1">
              {PRESET_PCTS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyPreset(pct)}
                  className={`tv-focusable py-0.5 rounded text-[10px] font-mono-num font-semibold border transition-colors cursor-pointer ${
                    pct < 0
                      ? 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-amber-400/60 hover:text-white'
                      : 'bg-slate-800/80 border-slate-700/80 text-[#8EE53F] hover:border-[#8EE53F]/60'
                  }`}
                >
                  {pct > 0 ? `+${pct}%` : `${pct}%`}
                </button>
              ))}
            </div>
          )}

          {/* Condition Selector */}
          <div className="grid grid-cols-3 gap-1" role="group" aria-label="Alert trigger condition">
            {(
              [
                { id: 'above', label: '▲ Above' },
                { id: 'below', label: '▼ Below' },
                { id: 'cross', label: '⇅ Cross' },
              ] as const
            ).map((item) => {
              const active = condition === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setManualCondition(true);
                    setCondition(item.id);
                  }}
                  aria-pressed={active}
                  className={`tv-focusable py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/60'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor={noteId} className="sr-only">
              Alert note
            </label>
            <input
              id={noteId}
              type="text"
              maxLength={32}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Optional label (e.g. TP1, Breakout)"
              className="tv-focusable w-full bg-[#111827] border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-slate-600 outline-none"
            />
          </div>

          {errorMsg && (
            <div className="text-[11px] text-red-400 font-medium" role="alert">
              {errorMsg}
            </div>
          )}
        </form>

        {/* Active / Triggered List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Window Thresholds ({alerts.length})
            </span>
            {hasTriggered && (
              <button
                type="button"
                onClick={onClearTriggered}
                className="tv-focusable text-[10px] font-semibold text-sky-300 hover:text-sky-200 cursor-pointer"
              >
                Clear Triggered
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="p-3 rounded-md bg-[#080B11]/60 border border-dashed border-slate-800 text-center text-[11px] text-slate-400">
              No thresholds set on W{windowIndex + 1}. Enter a price, tap a % preset, or use{' '}
              <span className="text-amber-300 font-semibold">Pick on Chart</span> (or Shift+Click).
            </div>
          ) : (
            <ul className="space-y-1.5">
              {alerts.map((alert) => {
                const delta = computePercentDelta(alert.targetPrice, currentPrice);
                const formatted = formatAlertPrice(alert.targetPrice);
                const condLabel = formatAlertConditionShort(alert.condition);

                return (
                  <li
                    key={alert.id}
                    data-testid={`alert-item-${alert.id}`}
                    className={`p-2 rounded-md border flex items-center justify-between gap-2 ${
                      alert.status === 'triggered'
                        ? 'bg-[#8EE53F]/10 border-[#8EE53F]/45'
                        : alert.status === 'paused'
                        ? 'bg-slate-900/70 border-slate-800 opacity-75'
                        : 'bg-[#121928] border-amber-400/35'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-mono-num text-xs">
                        {alert.status === 'triggered' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#8EE53F] shrink-0" />
                        ) : (
                          <Bell
                            className={`w-3 h-3 shrink-0 ${
                              alert.status === 'paused' ? 'text-slate-500' : 'text-amber-400'
                            }`}
                          />
                        )}
                        <span
                          className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                            alert.status === 'triggered'
                              ? 'bg-[#8EE53F]/20 text-[#8EE53F]'
                              : alert.status === 'paused'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-amber-400/15 text-amber-300'
                          }`}
                        >
                          {condLabel}
                        </span>
                        <span className="font-bold text-white truncate">{formatted}</span>
                        {delta !== null && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({delta >= 0 ? '+' : ''}
                            {delta.toFixed(2)}%)
                          </span>
                        )}
                      </div>
                      {(alert.note || alert.status === 'triggered') && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5 pl-4">
                          {alert.status === 'triggered'
                            ? `Triggered${
                                alert.triggeredPrice !== undefined
                                  ? ` @ ${formatAlertPrice(alert.triggeredPrice)}`
                                  : ''
                              }${alert.note ? ` · ${alert.note}` : ''}`
                            : alert.note}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {alert.status === 'triggered' ? (
                        <button
                          type="button"
                          onClick={() => onRearmAlert(alert.id)}
                          aria-label={`Re-arm ${condLabel} alert at ${formatted}`}
                          title="Re-arm Alert"
                          className="tv-focusable p-1 rounded bg-slate-800 hover:bg-slate-700 text-[#8EE53F] cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onTogglePauseAlert(alert.id)}
                          aria-label={`${
                            alert.status === 'paused' ? 'Resume' : 'Pause'
                          } ${condLabel} alert at ${formatted}`}
                          title={alert.status === 'paused' ? 'Resume Alert' : 'Pause Alert'}
                          className="tv-focusable p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                        >
                          {alert.status === 'paused' ? (
                            <Play className="w-3 h-3" />
                          ) : (
                            <Pause className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteAlert(alert.id)}
                        aria-label={`Delete ${condLabel} alert at ${formatted}`}
                        title="Delete Alert"
                        className="tv-focusable p-1 rounded bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
