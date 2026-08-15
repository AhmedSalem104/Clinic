import { api } from '../core/api-service.js';
export const patientService = {
  list: (params = {}, options) => api.get(`/patients?${new URLSearchParams(params)}`, { ...options, requestKey: 'patient-search' }),
  get: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.patch(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`),
  assignments: (id) => api.get(`/patients/${id}/assignments`),
  assign: (id, data) => api.post(`/patients/${id}/assignments`, data)
};
