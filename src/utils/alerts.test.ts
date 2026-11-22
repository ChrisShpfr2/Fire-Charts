import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAndTriggerAlerts,
  computePercentDelta,
  createPriceAlert,
  evaluateAlertTrigger,
  getAlertsForWindow,
  inferAlertCondition,
} from './alerts';

test('inferAlertCondition chooses above when target >= live price and below otherwise', () => {
  assert.equal(inferAlertCondition(95000, 92000), 'above');
  assert.equal(inferAlertCondition(92000, 92000), 'above');
  assert.equal(inferAlertCondition(89000, 92000), 'below');
  assert.equal(inferAlertCondition(100, null), 'above');
});

test('evaluateAlertTrigger handles above, below, cross, and paused/triggered states', () => {
  const aboveAlert = createPriceAlert({
    windowId: 'win-1',
    symbol: 'BTCUSDT',
    targetPrice: 95000,
    condition: 'above',
    nowMs: 1000,
  });
  assert.equal(evaluateAlertTrigger(aboveAlert, 94500, 94999), false);
  assert.equal(evaluateAlertTrigger(aboveAlert, 94900, 95000), true);
  assert.equal(evaluateAlertTrigger(aboveAlert, 94900, 95250), true);

  const belowAlert = createPriceAlert({
    windowId: 'win-1',
    symbol: 'BTCUSDT',
    targetPrice: 90000,
    condition: 'below',
    nowMs: 1000,
  });
  assert.equal(evaluateAlertTrigger(belowAlert, 90500, 90001), false);
  assert.equal(evaluateAlertTrigger(belowAlert, 90500, 89950), true);

  const crossAlert = createPriceAlert({
    windowId: 'win-1',
    symbol: 'BTCUSDT',
    targetPrice: 92000,
    condition: 'cross',
    nowMs: 1000,
  });
  assert.equal(evaluateAlertTrigger(crossAlert, 91800, 91950), false);
  assert.equal(evaluateAlertTrigger(crossAlert, 91800, 92100), true);
  assert.equal(evaluateAlertTrigger(crossAlert, 92200, 91900), true);

  assert.equal(
    evaluateAlertTrigger({ ...aboveAlert, status: 'paused' }, 94000, 96000),
    false
  );
  assert.equal(
    evaluateAlertTrigger({ ...aboveAlert, status: 'triggered' }, 94000, 96000),
    false
  );
});

test('checkAndTriggerAlerts scopes strictly to windowId + canonical symbol and triggers once', () => {
  const a1 = createPriceAlert({
    windowId: 'win-1',
    symbol: 'NVDA',
    targetPrice: 150,
    condition: 'above',
    nowMs: 1000,
  });
  const a2 = createPriceAlert({
    windowId: 'win-2',
    symbol: 'NVDAUSDT.P',
    targetPrice: 145,
    condition: 'above',
    nowMs: 1001,
  });
  const a3 = createPriceAlert({
    windowId: 'win-1',
    symbol: 'BTCUSDT',
    targetPrice: 145,
    condition: 'above',
    nowMs: 1002,
  });

  const firstPass = checkAndTriggerAlerts([a1, a2, a3], 'win-1', 'NVDAUSDT.P', 148, 151, 5000);
  assert.equal(firstPass.changed, true);
  assert.equal(firstPass.newlyTriggered.length, 1);
  assert.equal(firstPass.newlyTriggered[0].id, a1.id);
  assert.equal(firstPass.newlyTriggered[0].status, 'triggered');
  assert.equal(firstPass.newlyTriggered[0].triggeredAt, 5000);
  assert.equal(firstPass.newlyTriggered[0].triggeredPrice, 151);

  // Other window & other symbol remain active
  const secondWindow = firstPass.nextAlerts.find((a) => a.id === a2.id);
  const otherSymbol = firstPass.nextAlerts.find((a) => a.id === a3.id);
  assert.equal(secondWindow?.status, 'active');
  assert.equal(otherSymbol?.status, 'active');

  // Re-evaluating win-1 does not double-fire
  const secondPass = checkAndTriggerAlerts(firstPass.nextAlerts, 'win-1', 'NVDA', 151, 155, 6000);
  assert.equal(secondPass.changed, false);
  assert.equal(secondPass.newlyTriggered.length, 0);
});

test('getAlertsForWindow filters by window & canonical symbol and sorts active before triggered/paused', () => {
  const active = createPriceAlert({
    windowId: 'win-1',
    symbol: 'NVDA',
    targetPrice: 155,
    condition: 'above',
    nowMs: 2000,
  });
  const triggered = {
    ...createPriceAlert({
      windowId: 'win-1',
      symbol: 'NVDAUSDT.P',
      targetPrice: 140,
      condition: 'below',
      nowMs: 3000,
    }),
    status: 'triggered' as const,
  };
  const paused = {
    ...createPriceAlert({
      windowId: 'win-1',
      symbol: 'NVDA',
      targetPrice: 130,
      condition: 'below',
      nowMs: 4000,
    }),
    status: 'paused' as const,
  };
  const otherWin = createPriceAlert({
    windowId: 'win-2',
    symbol: 'NVDA',
    targetPrice: 160,
    condition: 'above',
    nowMs: 5000,
  });

  const sorted = getAlertsForWindow([paused, triggered, otherWin, active], 'win-1', 'NVDA');
  assert.deepEqual(
    sorted.map((a) => a.status),
    ['active', 'triggered', 'paused']
  );
  assert.ok(Math.abs((computePercentDelta(110, 100) ?? 0) - 10) < 1e-6);
});
