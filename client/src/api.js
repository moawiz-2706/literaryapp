import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 180000 // 3 minutes for PDF upload + Lulu validation
});

api.interceptors.response.use(
  res => res,
  err => {
    const data = err.response?.data;

    // Build a human-readable message from the structured Lulu error response.
    // The backend now returns: { error, detail, luluError } on failures.
    let msg = 'An unexpected error occurred';
    if (data) {
      if (data.detail) {
        msg = data.detail;
      } else if (data.error) {
        msg = data.error;
      } else if (typeof data === 'string') {
        msg = data;
      }
    } else if (err.message) {
      msg = err.message;
    }

    // Attach the raw Lulu error data to the Error object so callers can
    // inspect it if needed (e.g. for debugging).
    const error = new Error(msg);
    error.luluError = data?.luluError || null;
    error.statusCode = err.response?.status || null;
    return Promise.reject(error);
  }
);

export default api;
