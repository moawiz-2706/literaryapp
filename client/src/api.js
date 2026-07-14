import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 180000 // 3 minutes for PDF upload + Lulu validation
});

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.error || err.message || 'An unexpected error occurred';
    return Promise.reject(new Error(msg));
  }
);

export default api;
