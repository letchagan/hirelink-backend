import axios from 'axios';

// Configure default axios instance
const api = axios.create({
  baseURL: '', // Empty base URL is resolved via Vite proxy during development
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
