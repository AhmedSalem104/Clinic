const test = require('node:test');
const assert = require('node:assert/strict');
const { bookingSchema } = require('../src/modules/public-booking/public-booking.validation');

test('public booking accepts a minimal first-visit payload without login fields', () => {
  const result = bookingSchema.safeParse({
    fullName: 'Mona Hassan',
    phone: '01012345678',
    doctorId: 1,
    serviceId: 5,
    startAt: '2026-08-16T09:00:00+03:00',
    consent: true
  });
  assert.equal(result.success, true);
  assert.equal(Object.hasOwn(result.data, 'patientId'), false);
  assert.equal(Object.hasOwn(result.data, 'email'), false);
});

test('public booking accepts optional address and browser location metadata', () => {
  const result = bookingSchema.safeParse({
    fullName: 'Mona Hassan',
    phone: '01012345678',
    address: 'شارع تجريبي، القاهرة',
    locationLatitude: '30.0444',
    locationLongitude: '31.2357',
    locationAccuracyMeters: '18.5',
    locationCapturedAt: '2026-08-16T09:00:00+03:00',
    doctorId: 1,
    serviceId: 5,
    startAt: '2026-08-16T09:00:00+03:00',
    consent: true
  });
  assert.equal(result.success, true);
  assert.equal(result.data.locationLatitude, 30.0444);
  assert.equal(result.data.locationLongitude, 31.2357);
});

test('public booking rejects invalid browser location metadata', () => {
  const result = bookingSchema.safeParse({
    fullName: 'Mona Hassan',
    phone: '01012345678',
    locationLatitude: 120,
    locationLongitude: 31.2357,
    doctorId: 1,
    serviceId: 5,
    startAt: '2026-08-16T09:00:00+03:00',
    consent: true
  });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === 'locationLatitude'));
});

test('public booking requires consent and a future appointment shape', () => {
  const result = bookingSchema.safeParse({
    fullName: 'Mona Hassan',
    phone: '01012345678',
    doctorId: 1,
    serviceId: 5,
    startAt: '2026-08-16T09:00:00+03:00',
    consent: false
  });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === 'consent'));
});
