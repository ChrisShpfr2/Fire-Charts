import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AssetType,
  Candle,
  DataSourceTag,
  NewsArticle,
  SymbolOption,
  TickerTapeItem,
  Timeframe,
} from './src/types/trading.ts';
import {
  aggTradesToCandles,
  expandMinuteCandlesTo10s,
  resampleCandles,
  type RawAggTrade,
} from './src/utils/resample.ts';
import { getTimeframeSeconds, isValidTimeframe } from './src/utils/timeframes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

const STOCK_CATALOG: SymbolOption[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corp.', assetType: 'stock', binancePerpAlias: 'NVDAUSDT.P' },
  { symbol: 'TQQQ', name: 'ProShares UltraPro QQQ', assetType: 'stock', binancePerpAlias: 'TQQQUSDT.P' },
  { symbol: 'TSLA', name: 'Tesla Inc.', assetType: 'stock', binancePerpAlias: 'TSLAUSDT.P' },
  { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'stock', binancePerpAlias: 'AAPLUSDT.P' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', assetType: 'stock', binancePerpAlias: 'MSFTUSDT.P' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', assetType: 'stock', binancePerpAlias: 'AMZNUSDT.P' },
  { symbol: 'META', name: 'Meta Platforms', assetType: 'stock', binancePerpAlias: 'METAUSDT.P' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', assetType: 'stock', binancePerpAlias: 'GOOGLUSDT.P' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', assetType: 'stock', binancePerpAlias: 'SPYUSDT.P' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', assetType: 'stock', binancePerpAlias: 'QQQUSDT.P' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', assetType: 'stock', binancePerpAlias: 'AMDUSDT.P' },
  { symbol: 'COIN', name: 'Coinbase Global', assetType: 'stock', binancePerpAlias: 'COINUSDT.P' },
  { symbol: 'MSTR', name: 'Strategy (MicroStrategy)', assetType: 'stock', binancePerpAlias: 'MSTRUSDT.P' },
  { symbol: 'PLTR', name: 'Palantir Technologies', assetType: 'stock', binancePerpAlias: 'PLTRUSDT.P' },
  { symbol: 'NVDAUSDT.P', name: 'NVIDIA Perp (Binance)', assetType: 'stock', binancePerpAlias: 'NVDAUSDT.P' },
  { symbol: 'TQQQUSDT.P', name: 'TQQQ Perp (Binance)', assetType: 'stock', binancePerpAlias: 'TQQQUSDT.P' },
];

const CRYPTO_CATALOG: SymbolOption[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', assetType: 'crypto', binancePerpAlias: 'BTCUSDT.P' },
  { symbol: 'ETHUSDT', name: 'Ethereum / USDT', assetType: 'crypto', binancePerpAlias: 'ETHUSDT.P' },
  { symbol: 'SOLUSDT', name: 'Solana / USDT', assetType: 'crypto', binancePerpAlias: 'SOLUSDT.P' },
  { symbol: 'XRPUSDT', name: 'XRP / USDT', assetType: 'crypto', binancePerpAlias: 'XRPUSDT.P' },
  { symbol: 'BNBUSDT', name: 'BNB / USDT', assetType: 'crypto', binancePerpAlias: 'BNBUSDT.P' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin / USDT', assetType: 'crypto', binancePerpAlias: 'DOGEUSDT.P' },
  { symbol: 'AVAXUSDT', name: 'Avalanche / USDT', assetType: 'crypto', binancePerpAlias: 'AVAXUSDT.P' },
  { symbol: 'LINKUSDT', name: 'Chainlink / USDT', assetType: 'crypto', binancePerpAlias: 'LINKUSDT.P' },
  { symbol: 'ADAUSDT', name: 'Cardano / USDT', assetType: 'crypto', binancePerpAlias: 'ADAUSDT.P' },
  { symbol: 'SUIUSDT', name: 'Sui / USDT', assetType: 'crypto', binancePerpAlias: 'SUIUSDT.P' },
  { symbol: 'BTCUSDT.P', name: 'Bitcoin Perp (Binance)', assetType: 'crypto', binancePerpAlias: 'BTCUSDT.P' },
  { symbol: 'ETHUSDT.P', name: 'Ethereum Perp (Binance)', assetType: 'crypto', binancePerpAlias: 'ETHUSDT.P' },
];

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 4500): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextWithTimeout(url: string, timeoutMs = 4500): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

type RawBinanceKline = [
  number, // 0 open time ms
  string, // 1 open
  string, // 2 high
  string, // 3 low
  string, // 4 close
  string, // 5 volume
  ...unknown[],
];

function parseBinanceKlines(rows: RawBinanceKline[]): Candle[] {
  return rows
    .map((r) => ({
      time: Math.floor(Number(r[0]) / 1000),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
    }))
    .filter(
      (c) =>
        Number.isFinite(c.time) &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close)
    );
}

function resolveBinanceBaseInterval(tf: Timeframe): {
  binanceInterval: string;
  resampleSec: number | null;
  limit: number;
} {
  switch (tf) {
    case '10s':
      return { binanceInterval: '1s', resampleSec: 10, limit: 1000 };
    case '1m':
      return { binanceInterval: '1m', resampleSec: null, limit: 240 };
    case '3m':
      return { binanceInterval: '3m', resampleSec: null, limit: 240 };
    case '6m':
      return { binanceInterval: '1m', resampleSec: 360, limit: 1000 };
    case '7m':
      return { binanceInterval: '1m', resampleSec: 420, limit: 1000 };
    case '9m':
      return { binanceInterval: '1m', resampleSec: 540, limit: 1000 };
    case '12m':
      return { binanceInterval: '1m', resampleSec: 720, limit: 1000 };
    case '15m':
      return { binanceInterval: '15m', resampleSec: null, limit: 240 };
    case '24m':
      return { binanceInterval: '1m', resampleSec: 1440, limit: 1000 };
    case '30m':
      return { binanceInterval: '30m', resampleSec: null, limit: 240 };
    case '45m':
      return { binanceInterval: '15m', resampleSec: 2700, limit: 600 };
    case '1h':
      return { binanceInterval: '1h', resampleSec: null, limit: 240 };
    case '2h':
      return { binanceInterval: '2h', resampleSec: null, limit: 240 };
    case '3h':
      return { binanceInterval: '1h', resampleSec: 10800, limit: 600 };
    case '4h':
      return { binanceInterval: '4h', resampleSec: null, limit: 240 };
    case '7h':
      return { binanceInterval: '1h', resampleSec: 25200, limit: 1000 };
    case '8h':
      return { binanceInterval: '8h', resampleSec: null, limit: 240 };
    case '12h':
      return { binanceInterval: '12h', resampleSec: null, limit: 240 };
  }
}

function toBinanceFuturesSymbol(symbol: string): string {
  const clean = symbol.toUpperCase().trim().replace(/\.P$/, '');
  if (clean.endsWith('USDT') || clean.endsWith('BUSD') || clean.endsWith('USDC')) {
    return clean;
  }
  return `${clean}USDT`;
}

async function fetchBinanceFuturesKlines(
  rawSymbol: string,
  timeframe: Timeframe
): Promise<{ candles: Candle[]; resolvedSymbol: string }> {
  const fapiSymbol = toBinanceFuturesSymbol(rawSymbol);
  const { binanceInterval, resampleSec, limit } = resolveBinanceBaseInterval(timeframe);

  if (timeframe === '10s') {
    // Binance Futures does not have 1s klines; merge 1m expansion + live 10s aggTrades
    const [trades, minKlines] = await Promise.all([
      fetchJsonWithTimeout<RawAggTrade[]>(
        `https://fapi.binance.com/fapi/v1/aggTrades?symbol=${encodeURIComponent(fapiSymbol)}&limit=1000`
      ).catch(() => []),
      fetchJsonWithTimeout<RawBinanceKline[]>(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${encodeURIComponent(fapiSymbol)}&interval=1m&limit=40`
      ),
    ]);
    const expanded = expandMinuteCandlesTo10s(parseBinanceKlines(minKlines));
    const live10s = aggTradesToCandles(trades, 10);
    if (live10s.length > 0) {
      const firstLiveTime = live10s[0].time;
      const merged = [
        ...expanded.filter((c) => c.time < firstLiveTime),
        ...live10s,
      ];
      return {
        candles: merged.slice(-200),
        resolvedSymbol: `${fapiSymbol}.P`,
      };
    }
    return {
      candles: expanded.slice(-200),
      resolvedSymbol: `${fapiSymbol}.P`,
    };
  }

  const rows = await fetchJsonWithTimeout<RawBinanceKline[]>(
    `https://fapi.binance.com/fapi/v1/klines?symbol=${encodeURIComponent(fapiSymbol)}&interval=${binanceInterval}&limit=${Math.max(limit, 360)}`
  );
  let candles = parseBinanceKlines(rows);
  if (resampleSec) {
    candles = resampleCandles(candles, resampleSec);
  }
  return {
    candles: candles.slice(-360),
    resolvedSymbol: `${fapiSymbol}.P`,
  };
}

async function fetchBinanceSpotKlines(
  rawSymbol: string,
  timeframe: Timeframe
): Promise<{ candles: Candle[]; resolvedSymbol: string }> {
  const spotSymbol = rawSymbol.toUpperCase().trim().replace(/\.P$/, '');
  const { binanceInterval, resampleSec, limit } = resolveBinanceBaseInterval(timeframe);
  const rows = await fetchJsonWithTimeout<RawBinanceKline[]>(
    `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(spotSymbol)}&interval=${binanceInterval}&limit=${Math.max(limit, 360)}`
  );
  let candles = parseBinanceKlines(rows);
  if (resampleSec) {
    candles = resampleCandles(candles, resampleSec);
  }
  return {
    candles: candles.slice(-360),
    resolvedSymbol: spotSymbol,
  };
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
}

function resolveYahooParams(tf: Timeframe): { interval: string; range: string; resampleSec: number | null } | null {
  switch (tf) {
    case '10s':
      return null; // Yahoo does not offer 10s bars -> triggers Binance .P fallback
    case '1m':
      return { interval: '1m', range: '1d', resampleSec: null };
    case '3m':
    case '6m':
    case '7m':
    case '9m':
    case '12m':
    case '24m':
      return { interval: '1m', range: '5d', resampleSec: getTimeframeSeconds(tf) };
    case '15m':
      return { interval: '15m', range: '5d', resampleSec: null };
    case '30m':
      return { interval: '30m', range: '1mo', resampleSec: null };
    case '45m':
      return { interval: '15m', range: '1mo', resampleSec: 2700 };
    case '1h':
      return { interval: '60m', range: '1mo', resampleSec: null };
    case '2h':
    case '3h':
    case '4h':
    case '7h':
    case '8h':
    case '12h':
      return { interval: '60m', range: '3mo', resampleSec: getTimeframeSeconds(tf) };
  }
}

async function fetchYahooStockKlines(
  symbol: string,
  timeframe: Timeframe
): Promise<{ candles: Candle[]; resolvedSymbol: string }> {
  const params = resolveYahooParams(timeframe);
  if (!params) {
    throw new Error(`Yahoo does not support ${timeframe}`);
  }

  const clean = symbol.toUpperCase().trim();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(clean)}?interval=${params.interval}&range=${params.range}&includePrePost=true`;
  const data = await fetchJsonWithTimeout<YahooChartResponse>(url);
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  if (!timestamps.length || !quote) {
    throw new Error(`No Yahoo quote data for ${clean}`);
  }

  let candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i] ?? 0;
    if (
      typeof o === 'number' &&
      typeof h === 'number' &&
      typeof l === 'number' &&
      typeof c === 'number' &&
      Number.isFinite(o) &&
      Number.isFinite(c)
    ) {
      candles.push({
        time: timestamps[i],
        open: o,
        high: h,
        low: l,
        close: c,
        volume: typeof v === 'number' && Number.isFinite(v) ? v : 0,
      });
    }
  }

  if (params.resampleSec) {
    candles = resampleCandles(candles, params.resampleSec);
  }

  if (candles.length < 10) {
    throw new Error(`Insufficient Yahoo bars for ${clean}`);
  }

  return {
    candles: candles.slice(-220),
    resolvedSymbol: clean,
  };
}

function generateSyntheticCandles(symbol: string, timeframe: Timeframe): Candle[] {
  const stepSec = getTimeframeSeconds(timeframe);
  const count = 160;
  const now = Math.floor(Date.now() / 1000);
  const alignedNow = now - (now % stepSec);

  let seed = 0;
  for (let i = 0; i < symbol.length; i++) {
    seed = (seed * 31 + symbol.charCodeAt(i)) % 10000;
  }

  let price = 80 + (seed % 320);
  const candles: Candle[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const t = alignedNow - i * stepSec;
    const x = i + seed;
    const drift = Math.sin(x * 0.17) * (price * 0.006) + Math.cos(x * 0.43) * (price * 0.004);
    const open = price;
    const close = Math.max(1, open + drift);
    const wick = Math.abs(Math.sin(x * 0.71)) * (price * 0.0045) + price * 0.001;
    const high = Math.max(open, close) + wick;
    const low = Math.max(0.5, Math.min(open, close) - wick);
    candles.push({
      time: t,
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
      volume: Math.round(5000 + Math.abs(Math.sin(x * 0.37)) * 25000),
    });
    price = close;
  }
  return candles;
}

// --- Caches ---
const klinesCache = new Map<string, { expiresAt: number; payload: unknown }>();
let tickerCache: { expiresAt: number; items: TickerTapeItem[] } | null = null;
let newsCache: { expiresAt: number; items: NewsArticle[] } | null = null;

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;|&ndash;/g, '-')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeHtmlEntities(match[1]) : '';
}

function parseRssXml(
  xml: string,
  sourceName: string,
  category: NewsArticle['category']
): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (let i = 0; i < Math.min(itemMatches.length, 10); i++) {
    const block = itemMatches[i];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const desc = extractTag(block, 'description');
    if (!title) continue;
    const parsedTime = pubDate ? new Date(pubDate) : new Date();
    const iso = Number.isNaN(parsedTime.getTime()) ? new Date().toISOString() : parsedTime.toISOString();
    items.push({
      id: `${sourceName}-${i}-${title.slice(0, 24)}`,
      title,
      source: sourceName,
      url: link || '#',
      publishedAt: iso,
      summary: desc || title,
      category,
    });
  }
  return items;
}

async function fetchBreakingNews(): Promise<NewsArticle[]> {
  if (newsCache && newsCache.expiresAt > Date.now()) {
    return newsCache.items;
  }

  const feeds: Array<{ url: string; source: string; category: NewsArticle['category'] }> = [
    {
      url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
      source: 'MarketWatch',
      category: 'Markets',
    },
    {
      url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
      source: 'Wall Street Journal',
      category: 'Equities',
    },
    {
      url: 'https://www.investing.com/rss/news.rss',
      source: 'Investing.com',
      category: 'Macro',
    },
    {
      url: 'https://cointelegraph.com/rss',
      source: 'Cointelegraph',
      category: 'Crypto',
    },
  ];

  const settled = await Promise.allSettled(
    feeds.map(async (f) => {
      const xml = await fetchTextWithTimeout(f.url, 4500);
      return parseRssXml(xml, f.source, f.category);
    })
  );

  const combined: NewsArticle[] = [];
  const seenTitles = new Set<string>();
  for (const res of settled) {
    if (res.status === 'fulfilled') {
      for (const item of res.value) {
        const key = item.title.toLowerCase();
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          combined.push(item);
        }
      }
    }
  }

  combined.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const finalItems =
    combined.length > 0
      ? combined.slice(0, 32)
      : [
          {
            id: 'fallback-1',
            title: 'Wall Street futures steady ahead of tech and semiconductor earnings cycle',
            source: 'MarketWatch',
            url: 'https://www.marketwatch.com',
            publishedAt: new Date().toISOString(),
            summary: 'Live RSS feed temporarily unreachable; displaying market watch fallback.',
            category: 'Markets' as const,
          },
        ];

  newsCache = {
    expiresAt: Date.now() + 60_000,
    items: finalItems,
  };
  return finalItems;
}

interface Binance24hrTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
}

async function fetchTickerTape(): Promise<TickerTapeItem[]> {
  if (tickerCache && tickerCache.expiresAt > Date.now()) {
    return tickerCache.items;
  }

  const cryptoSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'AVAXUSDT', 'DOGEUSDT'];
  const stockSymbols = ['NVDA', 'TQQQ', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'SPY', 'QQQ', 'AMD'];

  const [spotTickers, fapiTickers, yahooResults] = await Promise.all([
    fetchJsonWithTimeout<Binance24hrTicker[]>('https://data-api.binance.vision/api/v3/ticker/24hr').catch(
      () => [] as Binance24hrTicker[]
    ),
    fetchJsonWithTimeout<Binance24hrTicker[]>('https://fapi.binance.com/fapi/v1/ticker/24hr').catch(
      () => [] as Binance24hrTicker[]
    ),
    Promise.allSettled(
      stockSymbols.map(async (sym) => {
        const data = await fetchJsonWithTimeout<YahooChartResponse>(
          `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=5d`,
          3500
        );
        const meta = data.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) throw new Error('No meta');
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose ?? price;
        const pct = prev > 0 ? ((price - prev) / prev) * 100 : 0;
        return {
          symbol: sym,
          displaySymbol: sym,
          assetType: 'stock' as const,
          price,
          changePercent: pct,
          source: 'yahoo' as const,
        };
      })
    ),
  ]);

  const spotMap = new Map(spotTickers.map((t) => [t.symbol, t]));
  const fapiMap = new Map(fapiTickers.map((t) => [t.symbol, t]));

  const items: TickerTapeItem[] = [];

  for (let i = 0; i < stockSymbols.length; i++) {
    const sym = stockSymbols[i];
    const yRes = yahooResults[i];
    const fapi = fapiMap.get(`${sym}USDT`);
    if (yRes && yRes.status === 'fulfilled') {
      items.push(yRes.value);
    } else if (fapi) {
      items.push({
        symbol: `${sym}USDT.P`,
        displaySymbol: `${sym}USDT.P`,
        assetType: 'stock',
        price: Number(fapi.lastPrice),
        changePercent: Number(fapi.priceChangePercent),
        source: 'binance-perp-fallback',
      });
    }
  }

  for (const sym of cryptoSymbols) {
    const t = spotMap.get(sym) ?? fapiMap.get(sym);
    if (t) {
      items.push({
        symbol: sym,
        displaySymbol: sym.replace('USDT', '/USD'),
        assetType: 'crypto',
        price: Number(t.lastPrice),
        changePercent: Number(t.priceChangePercent),
        source: 'binance-spot',
      });
    }
  }

  tickerCache = {
    expiresAt: Date.now() + 8_000,
    items,
  };
  return items;
}

async function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.get('/api/symbols', (_req, res) => {
    res.json({
      stocks: STOCK_CATALOG,
      crypto: CRYPTO_CATALOG,
    });
  });

  app.get('/api/ticker-tape', async (_req, res) => {
    try {
      const items = await fetchTickerTape();
      res.json({ items });
    } catch (err) {
      res.status(500).json({ items: [], error: err instanceof Error ? err.message : 'Ticker fetch failed' });
    }
  });

  app.get('/api/news', async (_req, res) => {
    try {
      const items = await fetchBreakingNews();
      res.json({ items });
    } catch (err) {
      res.status(500).json({ items: [], error: err instanceof Error ? err.message : 'News fetch failed' });
    }
  });

  app.get('/api/klines', async (req, res) => {
    const rawSymbol = String(req.query.symbol ?? 'BTCUSDT').trim().toUpperCase();
    const assetType = (String(req.query.assetType ?? 'crypto') === 'stock' ? 'stock' : 'crypto') as AssetType;
    const rawTf = String(req.query.timeframe ?? '15m');
    const timeframe: Timeframe = isValidTimeframe(rawTf) ? rawTf : '15m';

    const cacheKey = `${assetType}:${rawSymbol}:${timeframe}`;
    const cached = klinesCache.get(cacheKey);
    const cacheTtl = timeframe === '10s' ? 3_000 : 12_000;
    if (cached && cached.expiresAt > Date.now()) {
      res.json(cached.payload);
      return;
    }

    let candles: Candle[] = [];
    let resolvedSymbol = rawSymbol;
    let source: DataSourceTag = 'binance-spot';

    try {
      if (assetType === 'crypto') {
        if (rawSymbol.endsWith('.P')) {
          const out = await fetchBinanceFuturesKlines(rawSymbol, timeframe);
          candles = out.candles;
          resolvedSymbol = out.resolvedSymbol;
          source = 'binance-perp';
        } else {
          try {
            const out = await fetchBinanceSpotKlines(rawSymbol, timeframe);
            candles = out.candles;
            resolvedSymbol = out.resolvedSymbol;
            source = 'binance-spot';
          } catch {
            const out = await fetchBinanceFuturesKlines(rawSymbol, timeframe);
            candles = out.candles;
            resolvedSymbol = out.resolvedSymbol;
            source = 'binance-perp';
          }
        }
      } else {
        // Stock asset type:
        // If explicit .P requested (e.g. NVDAUSDT.P or TQQQUSDT.P), fetch directly from Binance Futures.
        if (rawSymbol.endsWith('.P')) {
          const out = await fetchBinanceFuturesKlines(rawSymbol, timeframe);
          candles = out.candles;
          resolvedSymbol = out.resolvedSymbol;
          source = 'binance-perp';
        } else {
          // Try Yahoo Finance first; if no data available (e.g. 10s, halted, unsupported, offline), fall back to Binance .P
          try {
            const out = await fetchYahooStockKlines(rawSymbol, timeframe);
            candles = out.candles;
            resolvedSymbol = out.resolvedSymbol;
            source = 'yahoo';
          } catch {
            const out = await fetchBinanceFuturesKlines(rawSymbol, timeframe);
            candles = out.candles;
            resolvedSymbol = out.resolvedSymbol;
            source = 'binance-perp-fallback';
          }
        }
      }
    } catch {
      candles = generateSyntheticCandles(rawSymbol, timeframe);
      resolvedSymbol = assetType === 'stock' && !rawSymbol.endsWith('.P') ? `${toBinanceFuturesSymbol(rawSymbol)}.P` : rawSymbol;
      source = 'synthetic';
    }

    const payload = {
      symbol: rawSymbol,
      resolvedSymbol,
      assetType,
      timeframe,
      source,
      candles,
    };

    klinesCache.set(cacheKey, {
      expiresAt: Date.now() + cacheTtl,
      payload,
    });

    res.json(payload);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Apex 4K Financial TV server running on http://0.0.0.0:${PORT}`);
  });
}

createApp();
