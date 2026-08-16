const test = require('node:test');
const assert = require('node:assert/strict');
const { QUEUE_STATUS_TRANSITIONS } = require('../src/modules/queue/queue.repository');

test('queue transitions allow the normal patient journey', () => {
  assert.ok(QUEUE_STATUS_TRANSITIONS.booked.includes('arrived'));
  assert.ok(QUEUE_STATUS_TRANSITIONS.arrived.includes('in_consultation'));
  assert.ok(QUEUE_STATUS_TRANSITIONS.in_consultation.includes('completed'));
});

test('queue transitions keep terminal states terminal', () => {
  assert.deepEqual(QUEUE_STATUS_TRANSITIONS.completed, []);
  assert.deepEqual(QUEUE_STATUS_TRANSITIONS.no_show, []);
  assert.deepEqual(QUEUE_STATUS_TRANSITIONS.cancelled, []);
});
