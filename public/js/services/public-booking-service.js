import { api } from '../core/api-service.js';

export const publicBookingService = {
  options: () => api.get('/public/booking/options', { requestKey: 'public-booking-options' }),
  slots: (params) => api.get(`/public/booking/available-slots?${new URLSearchParams(params)}`, { requestKey: 'public-booking-slots' }),
  create: (data) => api.post('/public/booking', data)
};
