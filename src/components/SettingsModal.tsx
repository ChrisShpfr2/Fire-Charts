import { RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import type { PvsraVisualMode, TerminalSettings } from '../types/trading';
import {
  autoFibParamsFromSensitivity,
  DEFAULT_SETTINGS,
  getSensitivityLabel,
} from '../utils/settings';

interface SettingsModalProps {
  isOpen: boolean;
  settings: TerminalSettings;
  onClose: () => void;
  onChange: (next: TerminalSettings) => void;
}

type SettingsTab =
  | 'candles'
  | 'auto_fib'
  | 'divergences'
  | 'vumanchu'
  | 'traders_reality'
  | 'oscillators'
  | 'display';

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'candles', label: 'Candles & Zoom' },
  { id: 'auto_fib', label: 'Auto Fib' },
  { id: 'divergences', label: 'RSI & WT Divs' },
  { id: 'vumanchu', label: 'VuManChu' },
  { id: 'traders_reality', label: 'Traders Reality' },
  { id: 'oscillators', label: 'RSI / Stoch / MACD' },
  { id: 'display', label: 'TV Ticker & News' },
];

function ToggleRow({
  label,
  hint,
  checked,
  onToggle,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="tv-focusable w-full flex items-center justify-between gap-4 p-3 rounded-lg bg-[#0B0F17] border border-slate-800 hover:border-slate-600 transition-colors text-left cursor-pointer"
    >
      <div>
        <div className="text-sm font-medium text-slate-100">{label}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      <div
        className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
          checked ? 'bg-[#8EE53F]' : 'bg-slate-700'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-[#080B11] transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  );
}

function StepperRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Number(n.toFixed(2))));

  return (
    <div className="p-3 rounded-lg bg-[#0B0F17] border border-slate-800 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm font-medium text-slate-100">{label}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          aria-label={`Decrease ${label}`}
          className="tv-focusable w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer"
        >
          -
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="w-28 accent-[#8EE53F] cursor-pointer"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          aria-label={`Increase ${label}`}
          className="tv-focusable w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer"
        >
          +
        </button>
        <span className="w-16 text-right font-mono-num text-xs font-semibold text-[#8EE53F]">
          {value}
          {unit}
        </span>
      </div>
    </div>
  );
}

export function SettingsModal({
  isOpen,
  settings,
  onClose,
  onChange,
}: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('vumanchu');

  if (!isOpen) return null;

  const updateCandles = (patch: Partial<TerminalSettings['candles']>) =>
    onChange({ ...settings, candles: { ...settings.candles, ...patch } });
  const updateFib = (patch: Partial<TerminalSettings['autoFib']>) =>
    onChange({ ...settings, autoFib: { ...settings.autoFib, ...patch } });
  const updateVmc = (patch: Partial<TerminalSettings['vumanchu']>) =>
    onChange({ ...settings, vumanchu: { ...settings.vumanchu, ...patch } });
  const updateTr = (patch: Partial<TerminalSettings['tradersReality']>) =>
    onChange({ ...settings, tradersReality: { ...settings.tradersReality, ...patch } });
  const updateOsc = (patch: Partial<TerminalSettings['oscillators']>) =>
    onChange({ ...settings, oscillators: { ...settings.oscillators, ...patch } });
  const updateDiv = (patch: Partial<TerminalSettings['divergences']>) =>
    onChange({ ...settings, divergences: { ...settings.divergences, ...patch } });
  const updateDisplay = (patch: Partial<TerminalSettings['display']>) =>
    onChange({ ...settings, display: { ...settings.display, ...patch } });
  const updateAlerts = (patch: Partial<TerminalSettings['alerts']>) =>
    onChange({ ...settings, alerts: { ...settings.alerts, ...patch } });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Terminal and Indicator Settings"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#101622] border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-white">
              Terminal &amp; Pine Script Settings
            </h2>
            <p className="text-xs text-slate-400">
              Customize VuManChu Cipher B, Traders Reality Main, Auto Fibonacci pivots, candle colors, zoom, oscillators, and TV display.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings modal"
            className="tv-focusable p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TV-optimized Category Tabs */}
        <div className="px-5 py-2.5 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto bg-[#0B0F17]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`tv-focusable px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                tab === t.id
                  ? 'bg-[#8EE53F] text-[#080B11]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
          {tab === 'candles' && (
            <>
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-100">Bullish Candle Color</div>
                  <div className="text-xs text-slate-400">Default: Kiwi Green (#8EE53F)</div>
                </div>
                <div className="flex items-center gap-2">
                  {['#8EE53F', '#22C55E', '#10B981', '#38BDF8'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => updateCandles({ upColor: col })}
                      aria-label={`Set bullish candle color ${col}`}
                      className={`tv-focusable w-7 h-7 rounded border-2 cursor-pointer ${
                        settings.candles.upColor === col ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                  <input
                    type="color"
                    value={settings.candles.upColor}
                    onChange={(e) => updateCandles({ upColor: e.target.value })}
                    aria-label="Custom bullish candle color"
                    className="w-8 h-8 rounded bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0B0F17] border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-100">Bearish Candle Color</div>
                  <div className="text-xs text-slate-400">Default: Slate Grey (#7C8594)</div>
                </div>
                <div className="flex items-center gap-2">
                  {['#7C8594', '#64748B', '#94A3B8', '#EF4444'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => updateCandles({ downColor: col })}
                      aria-label={`Set bearish candle color ${col}`}
                      className={`tv-focusable w-7 h-7 rounded border-2 cursor-pointer ${
                        settings.candles.downColor === col ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                  <input
                    type="color"
                    value={settings.candles.downColor}
                    onChange={(e) => updateCandles({ downColor: e.target.value })}
                    aria-label="Custom bearish candle color"
                    className="w-8 h-8 rounded bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              <StepperRow
                label="Default Chart Zoom (Visible Candles)"
                value={settings.candles.defaultZoomBars}
                min={20}
                max={220}
                step={5}
                unit=" bars"
                onChange={(v) => updateCandles({ defaultZoomBars: v })}
              />
              <ToggleRow
                label="Show Price & Time Grid Lines"
                checked={settings.candles.showGrid}
                onToggle={() => updateCandles({ showGrid: !settings.candles.showGrid })}
              />
              <ToggleRow
                label="Dashed Crosshair Lines"
                checked={settings.candles.crosshairDashed}
                onToggle={() =>
                  updateCandles({ crosshairDashed: !settings.candles.crosshairDashed })
                }
              />
            </>
          )}

          {tab === 'auto_fib' && (() => {
            const sens = settings.autoFib.sensitivity ?? 40;
            const sensInfo = getSensitivityLabel(sens);
            const applySensitivity = (nextSens: number) => {
              const mapped = autoFibParamsFromSensitivity(nextSens);
              updateFib(mapped);
            };
            return (
              <>
                <div className="p-3.5 rounded-lg bg-[#0B0F17] border border-slate-700/90 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        Pivot Sensitivity (Scalp ↔ Swing)
                      </div>
                      <div className="text-xs text-slate-400">
                        Adjusts pivot look-back window and confirmation depth for fast scalp swings or macro levels.
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold ${sensInfo.colorClass}`}>
                        {sensInfo.mode}
                      </span>
                      <span className="font-mono-num text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded">
                        {sens}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => applySensitivity(Math.max(0, sens - 5))}
                      aria-label="Decrease Pivot Sensitivity"
                      className="tv-focusable w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer shrink-0"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={sens}
                      aria-label="Pivot sensitivity"
                      onChange={(e) => applySensitivity(Number(e.target.value))}
                      className="tv-focusable flex-1 accent-[#8EE53F] cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => applySensitivity(Math.min(100, sens + 5))}
                      aria-label="Increase Pivot Sensitivity"
                      className="tv-focusable w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer shrink-0"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-400">
                    <span>0% Swing (360b)</span>
                    <span>50% Intraday (200b)</span>
                    <span>100% Fast Scalp (40b)</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {[
                      { label: 'Swing Levels (15%)', val: 15 },
                      { label: 'Balanced (40%)', val: 40 },
                      { label: 'Fast Scalp (85%)', val: 85 },
                    ].map((preset) => {
                      const active = sens === preset.val;
                      return (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => applySensitivity(preset.val)}
                          aria-pressed={active}
                          className={`tv-focusable px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#8EE53F] text-[#080B11]'
                              : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <StepperRow
                  label="Macro Lookback Window"
                  value={settings.autoFib.lookbackBars}
                  min={40}
                  max={360}
                  step={5}
                  unit=" bars"
                  onChange={(v) => updateFib({ lookbackBars: v })}
                />
                <StepperRow
                  label="Pivot Depth (Left / Right Confirmation Bars)"
                  value={settings.autoFib.pivotDepth}
                  min={2}
                  max={20}
                  step={1}
                  unit=" bars"
                  onChange={(v) => updateFib({ pivotDepth: v })}
                />
              <ToggleRow
                label="Highlight Golden Pocket (0.618 – 0.65)"
                hint="Shades the high-probability institutional Golden Pocket retracement band."
                checked={settings.autoFib.showGoldenPocket}
                onToggle={() =>
                  updateFib({ showGoldenPocket: !settings.autoFib.showGoldenPocket })
                }
              />
              <ToggleRow
                label="Show Fibonacci Extensions (1.272 / 1.618)"
                hint="Draws continuation extension targets beyond the 0.0 / 1.0 swing range."
                checked={settings.autoFib.showExtensions}
                onToggle={() =>
                  updateFib({ showExtensions: !settings.autoFib.showExtensions })
                }
              />
              <ToggleRow
                label="Reverse Fib Direction"
                hint="Flips 0.0% and 100% anchor ratios on the active pivot impulse."
                checked={settings.autoFib.reverse}
                onToggle={() => updateFib({ reverse: !settings.autoFib.reverse })}
              />
            </>
          );
          })()}

          {tab === 'divergences' && (
            <>
              <ToggleRow
                label="Show WaveTrend (WT2) Divergences"
                hint="Detects regular & hidden divergences on VuManChu Cipher B WaveTrend and streams them into the bottom Divergence Banner."
                checked={settings.divergences.showWtDivergences}
                onToggle={() =>
                  updateDiv({ showWtDivergences: !settings.divergences.showWtDivergences })
                }
              />
              <ToggleRow
                label="Show RSI Divergences"
                hint="Detects regular & hidden divergences on Wilder RSI and streams them into the bottom Divergence Banner."
                checked={settings.divergences.showRsiDivergences}
                onToggle={() =>
                  updateDiv({ showRsiDivergences: !settings.divergences.showRsiDivergences })
                }
              />
              <ToggleRow
                label="Include Hidden Divergences"
                hint="Includes trend-continuation hidden bullish & hidden bearish divergence blocks in the banner."
                checked={settings.divergences.showHidden}
                onToggle={() => updateDiv({ showHidden: !settings.divergences.showHidden })}
              />
              <StepperRow
                label="Divergence Pivot Left Bars"
                value={settings.divergences.pivotLeft}
                min={2}
                max={15}
                unit=" bars"
                onChange={(v) => updateDiv({ pivotLeft: v })}
              />
              <StepperRow
                label="Divergence Pivot Right Confirmation"
                value={settings.divergences.pivotRight}
                min={1}
                max={8}
                unit=" bars"
                onChange={(v) => updateDiv({ pivotRight: v })}
              />
              <StepperRow
                label="Max Pivot Lookback Span"
                value={settings.divergences.maxLookbackBars}
                min={20}
                max={120}
                step={5}
                unit=" bars"
                onChange={(v) => updateDiv({ maxLookbackBars: v })}
              />
            </>
          )}

          {tab === 'vumanchu' && (
            <>
              <StepperRow
                label="WaveTrend Channel Length (wtChannelLen)"
                value={settings.vumanchu.wtChannelLen}
                min={3}
                max={30}
                onChange={(v) => updateVmc({ wtChannelLen: v })}
              />
              <StepperRow
                label="WaveTrend Average Length (wtAverageLen)"
                value={settings.vumanchu.wtAverageLen}
                min={3}
                max={40}
                onChange={(v) => updateVmc({ wtAverageLen: v })}
              />
              <StepperRow
                label="WaveTrend MA Length (wtMALen)"
                value={settings.vumanchu.wtMALen}
                min={1}
                max={15}
                onChange={(v) => updateVmc({ wtMALen: v })}
              />
              <StepperRow
                label="Money Flow Period (rsiMFIPeriod)"
                value={settings.vumanchu.rsiMFIPeriod}
                min={10}
                max={150}
                step={5}
                onChange={(v) => updateVmc({ rsiMFIPeriod: v })}
              />
              <StepperRow
                label="Money Flow Area Multiplier (rsiMFIMultiplier)"
                value={settings.vumanchu.rsiMFIMultiplier}
                min={50}
                max={350}
                step={10}
                onChange={(v) => updateVmc({ rsiMFIMultiplier: v })}
              />
              <StepperRow
                label="Money Flow Y-Offset (rsiMFIPosY)"
                value={settings.vumanchu.rsiMFIPosY}
                min={-10}
                max={15}
                step={0.5}
                onChange={(v) => updateVmc({ rsiMFIPosY: v })}
              />
              <StepperRow
                label="Overbought Line 1 (obLevel1)"
                value={settings.vumanchu.obLevel1}
                min={40}
                max={90}
                onChange={(v) => updateVmc({ obLevel1: v, osLevel1: -v })}
              />
              <StepperRow
                label="Overbought Line 2 (obLevel2)"
                value={settings.vumanchu.obLevel2}
                min={60}
                max={105}
                onChange={(v) => updateVmc({ obLevel2: v, osLevel2: -v })}
              />
              <ToggleRow
                label="Show Two-Tone Blue WaveTrend Waves (WT1 & WT2)"
                checked={settings.vumanchu.showWTWaves}
                onToggle={() => updateVmc({ showWTWaves: !settings.vumanchu.showWTWaves })}
              />
              <ToggleRow
                label="Show White/Silver WT VWAP Wave (wt1 - wt2)"
                checked={settings.vumanchu.showWTVwap}
                onToggle={() => updateVmc({ showWTVwap: !settings.vumanchu.showWTVwap })}
              />
              <ToggleRow
                label="Show Money Flow Green/Red Liquidity Cloud"
                checked={settings.vumanchu.showMoneyFlow}
                onToggle={() => updateVmc({ showMoneyFlow: !settings.vumanchu.showMoneyFlow })}
              />
              <ToggleRow
                label="Show Stoch RSI (%K / %D) Inside Cipher B Pane"
                checked={settings.vumanchu.showStochInPane}
                onToggle={() => updateVmc({ showStochInPane: !settings.vumanchu.showStochInPane })}
              />
              <ToggleRow
                label="Show RSI (Magenta/Red) Inside Cipher B Pane"
                checked={settings.vumanchu.showRsiInPane}
                onToggle={() => updateVmc({ showRsiInPane: !settings.vumanchu.showRsiInPane })}
              />
              <ToggleRow
                label="Show Crossover Buy/Sell Signal Dots"
                checked={settings.vumanchu.showSignalDots}
                onToggle={() => updateVmc({ showSignalDots: !settings.vumanchu.showSignalDots })}
              />
              <ToggleRow
                label="Show Bottom Green/Red MFI Trend Ribbon"
                checked={settings.vumanchu.showBottomRibbon}
                onToggle={() =>
                  updateVmc({ showBottomRibbon: !settings.vumanchu.showBottomRibbon })
                }
              />
            </>
          )}

          {tab === 'traders_reality' && (
            <>
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-100">
                    PVSRA Vector Candle Mode
                  </div>
                  <div className="text-xs text-slate-400">
                    Outline preserves Kiwi Green &amp; Grey bodies; Full Colors applies classic PVSRA Green/Red/Blue/Violet.
                  </div>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-700">
                  {(['outline', 'candles', 'off'] as PvsraVisualMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateTr({ pvsraMode: mode })}
                      className={`tv-focusable px-3 py-1 rounded text-xs font-semibold capitalize cursor-pointer ${
                        settings.tradersReality.pvsraMode === mode
                          ? 'bg-[#8EE53F] text-[#080B11]'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <StepperRow
                label="PVSRA Climax Volume Multiplier"
                value={settings.tradersReality.pvsraClimaxMult}
                min={1.4}
                max={3.5}
                step={0.1}
                unit="x"
                onChange={(v) => updateTr({ pvsraClimaxMult: v })}
              />
              <StepperRow
                label="PVSRA Rising Volume Multiplier"
                value={settings.tradersReality.pvsraRisingMult}
                min={1.1}
                max={2.5}
                step={0.1}
                unit="x"
                onChange={(v) => updateTr({ pvsraRisingMult: v })}
              />
              <StepperRow
                label="Fast EMA 1 Length"
                value={settings.tradersReality.ema5Len}
                min={2}
                max={20}
                onChange={(v) => updateTr({ ema5Len: v })}
              />
              <StepperRow
                label="Fast EMA 2 Length"
                value={settings.tradersReality.ema13Len}
                min={5}
                max={34}
                onChange={(v) => updateTr({ ema13Len: v })}
              />
              <StepperRow
                label="Cloud EMA Length (50)"
                value={settings.tradersReality.ema50Len}
                min={20}
                max={100}
                onChange={(v) => updateTr({ ema50Len: v })}
              />
              <StepperRow
                label="Macro EMA Length (200)"
                value={settings.tradersReality.ema200Len}
                min={50}
                max={400}
                step={10}
                onChange={(v) => updateTr({ ema200Len: v })}
              />
              <ToggleRow
                label="Show 5 / 13 / 50 / 200 / 800 EMAs"
                checked={settings.tradersReality.showEmas}
                onToggle={() => updateTr({ showEmas: !settings.tradersReality.showEmas })}
              />
              <ToggleRow
                label="Show 50 EMA High / Low Cloud"
                checked={settings.tradersReality.showEma50Cloud}
                onToggle={() => updateTr({ showEma50Cloud: !settings.tradersReality.showEma50Cloud })}
              />
              <ToggleRow
                label="Show Unrecovered Vector Candle Zones"
                checked={settings.tradersReality.showVectorZones}
                onToggle={() =>
                  updateTr({ showVectorZones: !settings.tradersReality.showVectorZones })
                }
              />
              <ToggleRow
                label="Show Session Boxes (Asia / London / NY)"
                checked={settings.tradersReality.showSessions}
                onToggle={() => updateTr({ showSessions: !settings.tradersReality.showSessions })}
              />
              <ToggleRow
                label="Show Brinks Institutional Boxes"
                checked={settings.tradersReality.showBrinksBox}
                onToggle={() => updateTr({ showBrinksBox: !settings.tradersReality.showBrinksBox })}
              />
              <ToggleRow
                label="Show Daily Open (DO)"
                checked={settings.tradersReality.showDailyOpen}
                onToggle={() => updateTr({ showDailyOpen: !settings.tradersReality.showDailyOpen })}
              />
              <ToggleRow
                label="Show Previous Day High / Low (PDH / PDL)"
                checked={settings.tradersReality.showPrevDayHL}
                onToggle={() => updateTr({ showPrevDayHL: !settings.tradersReality.showPrevDayHL })}
              />
              <ToggleRow
                label="Show ADR High / Low"
                checked={settings.tradersReality.showAdr}
                onToggle={() => updateTr({ showAdr: !settings.tradersReality.showAdr })}
              />
              <ToggleRow
                label="Show Psychological Levels (Psy)"
                checked={settings.tradersReality.showPsyLevels}
                onToggle={() => updateTr({ showPsyLevels: !settings.tradersReality.showPsyLevels })}
              />
            </>
          )}

          {tab === 'oscillators' && (
            <>
              <StepperRow
                label="RSI Period"
                value={settings.oscillators.rsiLen}
                min={5}
                max={30}
                onChange={(v) => updateOsc({ rsiLen: v })}
              />
              <StepperRow
                label="RSI MA Length"
                value={settings.oscillators.rsiMaLen}
                min={2}
                max={30}
                onChange={(v) => updateOsc({ rsiMaLen: v })}
              />
              <StepperRow
                label="Stoch RSI Length"
                value={settings.oscillators.stochLen}
                min={5}
                max={30}
                onChange={(v) => updateOsc({ stochLen: v })}
              />
              <StepperRow
                label="Stoch %K Smooth"
                value={settings.oscillators.stochKSmooth}
                min={1}
                max={10}
                onChange={(v) => updateOsc({ stochKSmooth: v })}
              />
              <StepperRow
                label="Stoch %D Smooth"
                value={settings.oscillators.stochDSmooth}
                min={1}
                max={10}
                onChange={(v) => updateOsc({ stochDSmooth: v })}
              />
              <StepperRow
                label="Bollinger Bands Period"
                value={settings.oscillators.bbPeriod}
                min={10}
                max={50}
                onChange={(v) => updateOsc({ bbPeriod: v })}
              />
              <StepperRow
                label="Bollinger Bands Multiplier"
                value={settings.oscillators.bbMult}
                min={1}
                max={4}
                step={0.5}
                onChange={(v) => updateOsc({ bbMult: v })}
              />
              <StepperRow
                label="MACD Fast Length"
                value={settings.oscillators.macdFast}
                min={4}
                max={24}
                onChange={(v) => updateOsc({ macdFast: v })}
              />
              <StepperRow
                label="MACD Slow Length"
                value={settings.oscillators.macdSlow}
                min={14}
                max={52}
                onChange={(v) => updateOsc({ macdSlow: v })}
              />
              <StepperRow
                label="MACD Signal Length"
                value={settings.oscillators.macdSignal}
                min={3}
                max={20}
                onChange={(v) => updateOsc({ macdSignal: v })}
              />
              <StepperRow
                label="ATR Period"
                value={settings.oscillators.atrPeriod}
                min={5}
                max={30}
                onChange={(v) => updateOsc({ atrPeriod: v })}
              />
            </>
          )}

          {tab === 'display' && (
            <>
              <ToggleRow
                label="Show Rolling Wall Street Ticker Banner"
                checked={settings.display.showTickerBanner}
                onToggle={() =>
                  updateDisplay({ showTickerBanner: !settings.display.showTickerBanner })
                }
              />
              <StepperRow
                label="Ticker Scroll Duration (Lower = Faster)"
                value={settings.display.tickerSpeedSec}
                min={18}
                max={90}
                step={4}
                unit="s"
                onChange={(v) => updateDisplay({ tickerSpeedSec: v })}
              />
              <ToggleRow
                label="Show Breaking Financial News Wire"
                checked={settings.display.showNewsBar}
                onToggle={() => updateDisplay({ showNewsBar: !settings.display.showNewsBar })}
              />
              <StepperRow
                label="News Headline Rotation Interval"
                value={settings.display.newsRotateSec}
                min={4}
                max={30}
                step={2}
                unit="s"
                onChange={(v) => updateDisplay({ newsRotateSec: v })}
              />
              <ToggleRow
                label="Show Triggered Price Alert Lines on Chart"
                hint="Keeps triggered horizontal threshold lines visible in Kiwi Green until re-armed or cleared."
                checked={settings.alerts.showTriggeredLines}
                onToggle={() =>
                  updateAlerts({ showTriggeredLines: !settings.alerts.showTriggeredLines })
                }
              />
              <ToggleRow
                label="Play Audio Chime When Price Alert Triggers"
                hint="Emits a subtle two-tone alert chime alongside the TV notification toast."
                checked={settings.alerts.soundEnabled}
                onToggle={() =>
                  updateAlerts({ soundEnabled: !settings.alerts.soundEnabled })
                }
              />
            </>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between bg-[#0B0F17]">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_SETTINGS)}
            className="tv-focusable flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tv-focusable px-5 py-2 rounded-lg text-xs font-bold bg-[#8EE53F] text-[#080B11] hover:bg-[#9EEB54] cursor-pointer"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
