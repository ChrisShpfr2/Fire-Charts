import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyWorkspacePatch,
  buildWsUrlFromLocation,
  sanitizeRoomId,
  sanitizeSyncedPatch,
} from './deviceSync';

test('sanitizeRoomId normalizes invalid characters and falls back to global', () => {
  assert.equal(sanitizeRoomId(''), 'global');
  assert.equal(sanitizeRoomId(null), 'global');
  assert.equal(sanitizeRoomId('Living Room #1!'), 'livingroom1');
  assert.equal(sanitizeRoomId('TV_Main-4K'), 'tv_main-4k');
});

test('sanitizeSyncedPatch keeps only valid layoutCount, 12-window array, settings, and finite alerts', () => {
  const cleaned = sanitizeSyncedPatch({
    layoutCount: 6,
    windows: new Array(12).fill({ id: 'win-1' }),
    alerts: [
      { id: 'a1', windowId: 'win-1', symbol: 'BTCUSDT', targetPrice: 60000 },
      { id: 'bad', windowId: 'win-1', symbol: 'BTCUSDT', targetPrice: Number.NaN },
    ],
  });
  assert.equal(cleaned.layoutCount, 6);
  assert.equal(cleaned.windows?.length, 12);
  assert.equal(cleaned.alerts?.length, 1);

  const invalid = sanitizeSyncedPatch({
    layoutCount: 99,
    windows: [{ id: 'only-1' }],
  });
  assert.equal(invalid.layoutCount, undefined);
  assert.equal(invalid.windows, undefined);
});

test('applyWorkspacePatch increments revision monotonically and preserves untouched keys', () => {
  const first = applyWorkspacePatch(
    undefined,
    'TV-Main',
    'dev-a',
    { layoutCount: 4 },
    1000
  );
  assert.equal(first.record.roomId, 'tv-main');
  assert.equal(first.record.revision, 1);
  assert.equal(first.record.state.layoutCount, 4);

  const second = applyWorkspacePatch(
    first.record,
    'TV-Main',
    'dev-b',
    { alerts: [{ id: 'a1', windowId: 'win-1', symbol: 'NVDA', targetPrice: 140, condition: 'above', status: 'active', createdAt: 1000 }] },
    2000
  );
  assert.equal(second.record.revision, 2);
  assert.equal(second.record.updatedByDeviceId, 'dev-b');
  assert.equal(second.record.state.layoutCount, 4);
  assert.equal(second.record.state.alerts?.length, 1);

  // Empty/invalid patch does not bump revision
  const noop = applyWorkspacePatch(second.record, 'TV-Main', 'dev-c', { layoutCount: 0 }, 3000);
  assert.equal(noop.appliedKeys.length, 0);
  assert.equal(noop.record.revision, 2);
});

test('buildWsUrlFromLocation selects ws:// for http and wss:// for https', () => {
  assert.equal(
    buildWsUrlFromLocation({ protocol: 'http:', host: 'localhost:3000' }),
    'ws://localhost:3000/ws'
  );
  assert.equal(
    buildWsUrlFromLocation({ protocol: 'https:', host: 'tv.example.com' }),
    'wss://tv.example.com/ws'
  );
});
