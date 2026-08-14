const test = require('node:test');
const assert = require('node:assert/strict');
const { PERMISSIONS, hasPermission } = require('../src/config/permissions');

test('role permissions keep clinical data away from reception', () => {
  assert.equal(hasPermission('owner', PERMISSIONS.VIEW_MEDICAL), true);
  assert.equal(hasPermission('doctor', PERMISSIONS.VIEW_MEDICAL), true);
  assert.equal(hasPermission('reception', PERMISSIONS.VIEW_MEDICAL), false);
  assert.equal(hasPermission('reception', PERMISSIONS.MANAGE_QUEUE), true);
  assert.equal(hasPermission('doctor', PERMISSIONS.VIEW_ALL_PATIENTS), false);
  assert.equal(hasPermission('patient', PERMISSIONS.BOOK_SELF_APPOINTMENT), true);
  assert.equal(hasPermission('patient', PERMISSIONS.MANAGE_BOOKINGS), false);
});
