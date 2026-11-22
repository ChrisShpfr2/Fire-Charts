import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMarketApi,
  generateSyntheticCandles,
  parseRssXml,
  toBinanceFuturesSymbol,
} from './marketApi';

test('parseRssXml extracts articles cleanly and decodes entities', () => {
  const sampleXml = `
    <rss><channel>
      <item>
        <title><![CDATA[Fed &amp; Treasury yields climb ahead of CPI]]></title>
        <link>https://example.com/1</link>
        <pubDate>Sun, 22 Nov 2026 10:00:00 GMT</pubDate>
        <description><![CDATA[<p>Markets react to rate outlook.</p>]]></description>
      </item>
    </channel></rss>
  `;
  const parsed = parseRssXml(sampleXml, 'MarketWatch', 'Markets');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, 'Fed & Treasury yields climb ahead of CPI');
  assert.equal(parsed[0].summary, 'Markets react to rate outlook.');
  assert.equal(parsed[0].source, 'MarketWatch');
});

test('createMarketApi falls back from Yahoo to Binance .P for stocks when Yahoo fails', async () => {
  const api = createMarketApi(async (url) => {
    if (url.includes('query1.finance.yahoo.com')) {
      throw new Error('Yahoo unavailable');
    }
    if (url.includes('fapi.binance.com')) {
      return JSON.stringify(
        Array.from({ length: 30 }, (_, i) => [
          (1700000000 + i * 900) * 1000,
          '130.0',
          '132.0',
          '129.0',
          '131.5',
          '5000',
        ])
      );
    }
    throw new Error('Unexpected url');
  });

  const res = await api.getKlines({ symbol: 'NVDA', assetType: 'stock', timeframe: '15m' });
  assert.equal(res.source, 'binance-perp-fallback');
  assert.equal(res.resolvedSymbol, 'NVDAUSDT.P');
  assert.equal(res.candles.length, 30);
});

test('generateSyntheticCandles and toBinanceFuturesSymbol produce valid fallback values', () => {
  assert.equal(toBinanceFuturesSymbol('nvda.p'), 'NVDAUSDT');
  assert.equal(toBinanceFuturesSymbol('BTCUSDT'), 'BTCUSDT');
  const bars = generateSyntheticCandles('TQQQ', '10s');
  assert.equal(bars.length, 160);
  assert.ok(bars.every((b) => b.high >= b.low && b.close > 0));
});
