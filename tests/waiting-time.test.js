const test = require('node:test');
const assert = require('node:assert/strict');
const { expectedDuration, recalculateQueue } = require('../src/utils/waiting-time');

test('expected duration combines service and calibrated adjustments', () => {
  assert.equal(expectedDuration({ serviceBaseDuration: 20, doctorAdjustment: 3, currentDayAdjustment: -2 }), 21);
  assert.equal(expectedDuration({ serviceBaseDuration: 2 }), 5);
});

test('queue calculation pushes entries past a doctor pause', () => {
  const now = new Date('2026-08-14T14:00:00Z');
  const rows = recalculateQueue([
    { position: 1, expectedDurationMinutes: 30 },
    { position: 2, expectedDurationMinutes: 30 }
  ], now, [{ start: new Date('2026-08-14T14:20:00Z'), end: new Date('2026-08-14T15:00:00Z') }]);
  assert.equal(rows[0].expectedStartAt.toISOString(), '2026-08-14T15:00:00.000Z');
  assert.equal(rows[0].expectedEndAt.toISOString(), '2026-08-14T15:30:00.000Z');
  assert.equal(rows[1].expectedStartAt.toISOString(), '2026-08-14T15:30:00.000Z');
});
