import { api } from './api-service.js';

let currentUser = null;

export const auth = {
  async restore() {
    try {
      const data = await api.get('/auth/me');
      currentUser = data.user;
      return currentUser;
    } catch (_) {
      currentUser = null;
      return null;
    }
  },
  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    currentUser = data.user;
    return currentUser;
  },
  async logout() {
    try { await api.post('/auth/logout'); } catch (_) { /* The cookie may already be expired. */ } finally { currentUser = null; }
  },
  user() { return currentUser; },
  isAuthenticated() { return Boolean(currentUser); }
};
