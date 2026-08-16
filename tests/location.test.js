const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCoordinates, resolveBookingLocation } = require('../src/services/location.service');

test('location metadata is normalized and validated before persistence', () => {
  assert.deepEqual(normalizeCoordinates({ locationLatitude: '30.0444', locationLongitude: '31.2357', locationAccuracyMeters: '12.5' }), {
    latitude: 30.0444,
    longitude: 31.2357,
    accuracy: 12.5
  });
  assert.equal(normalizeCoordinates({ locationLatitude: 91, locationLongitude: 31 }), null);
});

test('manual address remains optional and does not require geolocation', async () => {
  const result = await resolveBookingLocation({ address: 'شارع تجريبي، القاهرة' });
  assert.equal(result.address, 'شارع تجريبي، القاهرة');
  assert.equal(result.addressSource, 'manual');
  assert.equal(result.latitude, null);
});
