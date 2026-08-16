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

test('the address preview from the booking form is preserved with its structured location details', async () => {
  const result = await resolveBookingLocation({
    address: 'ميدان التحرير، القاهرة، مصر',
    locationAddressSource: 'reverse_geocoded',
    locationDetailsJson: JSON.stringify({ road: 'ميدان التحرير', city: 'القاهرة', country: 'مصر' }),
    locationLatitude: '30.0444',
    locationLongitude: '31.2357',
    locationAccuracyMeters: '12'
  });
  assert.equal(result.address, 'ميدان التحرير، القاهرة، مصر');
  assert.equal(result.addressSource, 'reverse_geocoded');
  assert.equal(result.latitude, 30.0444);
  assert.deepEqual(JSON.parse(result.detailsJson), { road: 'ميدان التحرير', city: 'القاهرة', country: 'مصر' });
});

test('a manually edited address remains manual even when location coordinates are attached', async () => {
  const result = await resolveBookingLocation({
    address: 'العنوان الذي كتبته المريضة',
    locationAddressSource: 'manual',
    locationLatitude: '30.0444',
    locationLongitude: '31.2357'
  });
  assert.equal(result.address, 'العنوان الذي كتبته المريضة');
  assert.equal(result.addressSource, 'manual');
});
