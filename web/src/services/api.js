import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try refresh token
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !error.config._retried) {
        error.config._retried = true;
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(error.config);
        } catch {
          localStorage.clear();
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  guest: () => api.post('/auth/guest'),
};

// Triage API
export const triageApi = {
  start: (text, language) => api.post('/triage/start', { text, language }),
  clarify: (sessionId, answer, questionId) =>
    api.post('/triage/clarify', { sessionId, answer, questionId }),
  result: (sessionId) => api.get(`/triage/result/${sessionId}`),
};

// Sessions API
export const sessionsApi = {
  list: () => api.get('/sessions'),
  detail: (id) => api.get(`/sessions/${id}`),
  delete: (id) => api.delete(`/sessions/${id}`),
  deleteAll: () => api.delete('/sessions'),
};

// Facilities API
export const facilitiesApi = {
  nearby: (lat, lng, radius = 10) =>
    api.get('/facilities/nearby', { params: { lat, lng, radius } }),
};

// Emergency API
export const emergencyApi = {
  number: (province, city) => api.get('/emergency/number', { params: { province, city } }),
  guidance: (category) => api.get(`/emergency/guidance/${category}`),
};

export default api;
