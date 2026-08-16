import { api } from '../core/api-service.js';

export const publicBookingService = {
  options: (params = {}) => api.get(`/public/booking/options?${new URLSearchParams(params)}`, { requestKey: 'public-booking-options', cacheMode: 'default', timeoutMs: 10000 }),
  reverseGeocode: (params) => api.get(`/public/booking/reverse-geocode?${new URLSearchParams(params)}`, { requestKey: 'public-booking-geocode' }),
  slots: (params) => api.get(`/public/booking/available-slots?${new URLSearchParams(params)}`, { requestKey: 'public-booking-slots' }),
  create: (data) => api.post('/public/booking', data)
};
