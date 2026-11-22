import { BellRing, Crosshair, X } from 'lucide-react';
import type { PriceAlert } from '../types/trading';
import { formatAlertConditionShort, formatAlertPrice } from '../utils/alerts';

export interface AlertToastItem {
  toastId: string;
  alert: PriceAlert;
  windowIndex: number;
  timeframe: string;
}

interface AlertToastStackProps {
  toasts: AlertToastItem[];
  onFocusWindow: (windowId: string) => void;
  onDismiss: (toastId: string) => void;
}

export function AlertToastStack({
  toasts,
  onFocusWindow,
  onDismiss,
}: AlertToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      data-testid="alert-toast-stack"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[340px] max-w-[calc(100vw-24px)] pointer-events-none"
    >
      {toasts.map(({ toastId, alert, windowIndex, timeframe }) => (
        <div
          key={toastId}
          role="status"
          className="pointer-events-auto bg-[#0F172A]/95 backdrop-blur-md border border-amber-400/70 rounded-xl p-3 shadow-2xl flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/40 flex items-center justify-center shrink-0 mt-0.5">
              <BellRing className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {alert.symbol}
                </span>
                <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-slate-800 text-sky-300">
                  W{windowIndex + 1} · {timeframe}
                </span>
              </div>
              <div className="text-xs font-mono-num text-amber-300 font-semibold mt-0.5">
                {formatAlertConditionShort(alert.condition)} {formatAlertPrice(alert.targetPrice)}
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {alert.triggeredPrice !== undefined
                  ? `Triggered @ ${formatAlertPrice(alert.triggeredPrice)}`
                  : 'Threshold reached'}
                {alert.note ? ` · ${alert.note}` : ''}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onDismiss(toastId)}
              aria-label={`Dismiss alert notification for ${alert.symbol}`}
              className="tv-focusable p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onFocusWindow(alert.windowId)}
              aria-label={`Jump to window ${windowIndex + 1} for ${alert.symbol}`}
              className="tv-focusable flex items-center gap-1 px-2 py-1 rounded bg-[#8EE53F]/20 hover:bg-[#8EE53F]/30 text-[#8EE53F] text-[10px] font-semibold cursor-pointer"
            >
              <Crosshair className="w-3 h-3" />
              <span>View</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
