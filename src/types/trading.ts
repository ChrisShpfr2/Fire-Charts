export type AssetType = 'crypto' | 'stock';

export type Timeframe =
  | '10s'
  | '1m'
  | '3m'
  | '6m'
  | '7m'
  | '9m'
  | '12m'
  | '15m'
  | '24m'
  | '30m'
  | '45m'
  | '1h'
  | '2h'
  | '3h'
  | '4h'
  | '7h'
  | '8h'
  | '12h';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type DataSourceTag =
  | 'binance-spot'
  | 'binance-perp'
  | 'binance-perp-fallback'
  | 'yahoo'
  | 'synthetic';

export interface KlinesResponse {
  symbol: string;
  resolvedSymbol: string;
  assetType: AssetType;
  timeframe: Timeframe;
  source: DataSourceTag;
  candles: Candle[];
  error?: string;
}

export type IndicatorId =
  | 'traders_reality_main'
  | 'auto_fib'
  | 'divergences'
  | 'vumanchu_wavetrend'
  | 'vumanchu_moneyflow'
  | 'stoch_rsi'
  | 'rsi'
  | 'ema_ribbon'
  | 'bollinger_bands'
  | 'macd'
  | 'vwap'
  | 'volume'
  | 'atr';

export interface IndicatorDefinition {
  id: IndicatorId;
  name: string;
  shortName: string;
  category: 'Pine Suite' | 'Momentum' | 'Trend' | 'Volatility' | 'Volume';
  pane: 'main' | 'vumanchu' | 'rsi' | 'stoch_rsi' | 'macd' | 'atr';
  description: string;
  paramsLabel: string;
}

export type SyncGroup = 'none' | 'A' | 'B' | 'C';

export interface WindowSyncConfig {
  group: SyncGroup;
  syncIndicators: boolean;
  syncCrosshair: boolean;
  syncZoom: boolean;
}

export interface ChartWindowConfig {
  id: string;
  index: number;
  symbol: string;
  assetType: AssetType;
  timeframe: Timeframe;
  indicators: IndicatorId[];
  sync: WindowSyncConfig;
  zoomBars: number; // Number of visible candles (20..260)
}

export type LayoutCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface TickerTapeItem {
  symbol: string;
  displaySymbol: string;
  assetType: AssetType;
  price: number;
  changePercent: number;
  source: DataSourceTag;
}

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  category: 'Markets' | 'Equities' | 'Crypto' | 'Macro';
}

export interface SymbolOption {
  symbol: string;
  name: string;
  assetType: AssetType;
  binancePerpAlias?: string;
}

export type PvsraVisualMode = 'outline' | 'candles' | 'off';

export interface TerminalSettings {
  candles: {
    upColor: string;
    downColor: string;
    showGrid: boolean;
    crosshairDashed: boolean;
    defaultZoomBars: number;
  };
  autoFib: {
    sensitivity: number; // 0 (Swing Trading, deep lookback) .. 100 (Fast Scalp, short lookback)
    pivotDepth: number;
    lookbackBars: number;
    reverse: boolean;
    showExtensions: boolean;
    showGoldenPocket: boolean;
  };
  vumanchu: {
    wtChannelLen: number;
    wtAverageLen: number;
    wtMALen: number;
    obLevel1: number;
    obLevel2: number;
    osLevel1: number;
    osLevel2: number;
    rsiMFIPeriod: number;
    rsiMFIMultiplier: number;
    rsiMFIPosY: number;
    showWTWaves: boolean;
    showWTVwap: boolean;
    showMoneyFlow: boolean;
    showSignalDots: boolean;
    showBottomRibbon: boolean;
    showStochInPane: boolean;
    showRsiInPane: boolean;
  };
  tradersReality: {
    ema5Len: number;
    ema13Len: number;
    ema50Len: number;
    ema200Len: number;
    ema800Len: number;
    showEmas: boolean;
    showEma50Cloud: boolean;
    pvsraMode: PvsraVisualMode;
    pvsraClimaxMult: number;
    pvsraRisingMult: number;
    showVectorZones: boolean;
    showSessions: boolean;
    showBrinksBox: boolean;
    showDailyOpen: boolean;
    showPrevDayHL: boolean;
    showAdr: boolean;
    showPsyLevels: boolean;
  };
  oscillators: {
    rsiLen: number;
    rsiMaLen: number;
    stochRsiLen: number;
    stochLen: number;
    stochKSmooth: number;
    stochDSmooth: number;
    bbPeriod: number;
    bbMult: number;
    macdFast: number;
    macdSlow: number;
    macdSignal: number;
    atrPeriod: number;
  };
  divergences: {
    showWtDivergences: boolean;
    showRsiDivergences: boolean;
    showHidden: boolean;
    showOnPriceChart: boolean;
    pivotLeft: number;
    pivotRight: number;
    maxLookbackBars: number;
  };
  display: {
    showTickerBanner: boolean;
    tickerSpeedSec: number;
    showNewsBar: boolean;
    newsRotateSec: number;
  };
  alerts: {
    showTriggeredLines: boolean;
    soundEnabled: boolean;
  };
}

export type AlertCondition = 'above' | 'below' | 'cross';
export type AlertStatus = 'active' | 'triggered' | 'paused';

export interface PriceAlert {
  id: string;
  windowId: string;
  symbol: string;
  targetPrice: number;
  condition: AlertCondition;
  status: AlertStatus;
  note?: string;
  createdAt: number;
  triggeredAt?: number;
  triggeredPrice?: number;
}

