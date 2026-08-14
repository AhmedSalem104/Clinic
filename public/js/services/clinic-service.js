import { api } from '../core/api-service.js';
export const clinicService = {
  doctors: (params = {}) => api.get(`/doctors?${new URLSearchParams(params)}`),
  doctor: (id) => api.get(`/doctors/${id}`),
  createDoctor: (data) => api.post('/doctors', data),
  services: (params = {}) => api.get(`/services?${new URLSearchParams(params)}`),
  createService: (data) => api.post('/services', data),
  pricing: (params = {}) => api.get(`/pricing?${new URLSearchParams(params)}`),
  createPricing: (data) => api.post('/pricing', data),
  schedules: (params = {}) => api.get(`/schedules?${new URLSearchParams(params)}`),
  createSchedule: (data) => api.post('/schedules', data),
  addException: (data) => api.post('/schedules/exceptions', data)
};
