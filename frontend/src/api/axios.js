import axios from 'axios';

// Configure default axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '', // Uses production URL or falls back to Vite proxy in dev
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to append authentication token automatically to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hirescheduler_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
