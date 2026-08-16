const { env } = require('../config/env');

const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCoordinates = (body = {}) => {
  const latitude = toFiniteNumber(body.locationLatitude);
  const longitude = toFiniteNumber(body.locationLongitude);
  const accuracy = toFiniteNumber(body.locationAccuracyMeters);
  if (latitude === null || longitude === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return {
    latitude,
    longitude,
    accuracy: accuracy !== null && accuracy >= 0 && accuracy <= 100000 ? accuracy : null
  };
};

const normalizeAddress = (value) => {
  const address = String(value || '').trim();
  return address ? address.slice(0, 500) : null;
};

const reverseGeocode = async ({ latitude, longitude }) => {
  try {
    const url = new URL(env.location.reverseGeocoderUrl);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ar,en',
        'User-Agent': env.location.reverseGeocoderUserAgent
      },
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const details = payload?.address && typeof payload.address === 'object'
      ? Object.fromEntries(['house_number', 'road', 'neighbourhood', 'suburb', 'city_district', 'city', 'town', 'village', 'state', 'postcode', 'country', 'country_code']
        .filter((key) => payload.address[key])
        .map((key) => [key, String(payload.address[key]).slice(0, 160)]))
      : null;
    const displayName = normalizeAddress(payload?.display_name);
    if (!displayName && !details) return null;
    return { displayName, details };
  } catch (_) {
    // Location is optional. A geocoder outage must never block a booking.
    return null;
  }
};

const resolveBookingLocation = async (body = {}) => {
  const coordinates = normalizeCoordinates(body);
  const manualAddress = normalizeAddress(body.address);
  if (!coordinates) {
    return manualAddress
      ? { address: manualAddress, addressSource: 'manual', latitude: null, longitude: null, accuracy: null, capturedAt: null, detailsJson: null }
      : null;
  }

  const geocoded = await reverseGeocode(coordinates);
  const capturedAtValue = body.locationCapturedAt ? new Date(body.locationCapturedAt) : new Date();
  const capturedAt = Number.isNaN(capturedAtValue.getTime()) ? new Date() : capturedAtValue;
  return {
    address: geocoded?.displayName || manualAddress,
    addressSource: geocoded ? 'reverse_geocoded' : manualAddress ? 'manual' : 'browser_geolocation',
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    accuracy: coordinates.accuracy,
    capturedAt,
    detailsJson: geocoded?.details ? JSON.stringify(geocoded.details) : null
  };
};

module.exports = { normalizeCoordinates, resolveBookingLocation };
