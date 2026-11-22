import type {
  AssetType,
  KlinesResponse,
  NewsArticle,
  SymbolOption,
  TickerTapeItem,
  Timeframe,
} from '../types/trading';
import { createMarketApi } from './marketApi';

export function isStandaloneNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname === 'appassets.androidplatform.net' ||
    window.location.protocol === 'file:'
  );
}

async function nativeProxyFetchText(url: string, timeoutMs = 6000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`/__native_fetch?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

const standaloneMarketApi = createMarketApi(nativeProxyFetchText);

export async function fetchSymbolsCatalog(): Promise<{
  stocks: SymbolOption[];
  crypto: SymbolOption[];
}> {
  if (isStandaloneNativeApp()) {
    return standaloneMarketApi.getSymbols();
  }
  const res = await fetch('/api/symbols');
  if (!res.ok) throw new Error('Failed to load symbols');
  const data = (await res.json()) as { stocks?: SymbolOption[]; crypto?: SymbolOption[] };
  return {
    stocks: data.stocks ?? [],
    crypto: data.crypto ?? [],
  };
}

export async function fetchTickerTapeItems(): Promise<TickerTapeItem[]> {
  if (isStandaloneNativeApp()) {
    return standaloneMarketApi.getTickerTape();
  }
  const res = await fetch('/api/ticker-tape');
  if (!res.ok) throw new Error('Failed to load ticker tape');
  const data = (await res.json()) as { items?: TickerTapeItem[] };
  return data.items ?? [];
}

export async function fetchBreakingNewsArticles(): Promise<NewsArticle[]> {
  if (isStandaloneNativeApp()) {
    return standaloneMarketApi.getBreakingNews();
  }
  const res = await fetch('/api/news');
  if (!res.ok) throw new Error('Failed to load news');
  const data = (await res.json()) as { items?: NewsArticle[] };
  return data.items ?? [];
}

export async function fetchWindowKlines(params: {
  symbol: string;
  assetType: AssetType;
  timeframe: Timeframe;
}): Promise<KlinesResponse> {
  if (isStandaloneNativeApp()) {
    return standaloneMarketApi.getKlines(params);
  }
  const res = await fetch(
    `/api/klines?symbol=${encodeURIComponent(params.symbol)}&assetType=${params.assetType}&timeframe=${params.timeframe}`
  );
  if (!res.ok) throw new Error('Failed to load chart data');
  return (await res.json()) as KlinesResponse;
}
