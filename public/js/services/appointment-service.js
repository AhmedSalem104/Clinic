import { api } from '../core/api-service.js';
export const appointmentService = {
  list: (params = {}) => api.get(`/appointments?${new URLSearchParams(params)}`),
  slots: (params) => api.get(`/appointments/available-slots?${new URLSearchParams(params)}`),
  get: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  reschedule: (id, data) => api.patch(`/appointments/${id}/reschedule`, data),
  status: (id, data) => api.patch(`/appointments/${id}/status`, data)
};
