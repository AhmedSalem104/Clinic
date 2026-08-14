const test = require('node:test');
const assert = require('node:assert/strict');
const { requireAppointmentCreate } = require('../src/middleware/auth');

test('patient booking middleware binds the appointment to the signed-in patient', () => {
  const req = {
    user: { role: 'patient', patientId: 42 },
    body: { patientId: 999, bookingSource: 'reception', notes: 'should not be stored' }
  };
  let nextError;
  requireAppointmentCreate(req, {}, (error) => { nextError = error; });

  assert.equal(nextError, undefined);
  assert.equal(req.body.patientId, 42);
  assert.equal(req.body.bookingSource, 'online');
  assert.equal(req.body.notes, null);
});

test('unlinked patient accounts cannot create appointments', () => {
  const req = { user: { role: 'patient', patientId: null }, body: {} };
  let nextError;
  requireAppointmentCreate(req, {}, (error) => { nextError = error; });

  assert.equal(nextError?.code, 'FORBIDDEN');
});
