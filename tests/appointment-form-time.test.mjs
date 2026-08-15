import test from 'node:test';
import assert from 'node:assert/strict';
import { clockMinutes } from '../public/js/utils/time.mjs';
import { makeSlots } from '../public/js/utils/appointment-slots.mjs';

test('booking slots parse SQL Server ISO time values', () => {
  assert.equal(clockMinutes('1970-01-01T09:00:00.000Z'), 540);
  assert.equal(clockMinutes('09:00:00'), 540);
  assert.equal(clockMinutes('17:00:00'), 1020);
});

test('booking slots are generated from an ISO schedule', () => {
  const slots = makeSlots(
    { StartTime: '1970-01-01T09:00:00.000Z', EndTime: '1970-01-01T17:00:00.000Z', BreaksJson: '[]' },
    [],
    20,
    '2026-08-16'
  );
  assert.equal(slots.length, 24);
});
