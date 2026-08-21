import axios from 'axios';

// ── Configuration ─────────────────────────────────────────────────────────────
// In production, VITE_API_BASE_URL should point to the Render backend.
// In development, it can be empty (proxied by Vite) or point to localhost:3001.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 180000, // 3 minutes for PDF upload + file validation
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// ── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  res => {
    // Validate that the response is JSON (not an HTML page)
    const contentType = res.headers?.['content-type'] || '';
    if (contentType.includes('text/html') && !contentType.includes('application/json')) {
      const err = new Error(
        'API endpoint returned HTML instead of JSON. ' +
        'Check that VITE_API_BASE_URL is set to your backend URL (e.g., https://your-app.onrender.com).'
      );
      err.response = {
        status: 0,
        data: {
          error: 'Invalid response type',
          detail: 'The API endpoint returned HTML instead of JSON. This typically means VITE_API_BASE_URL is not configured correctly or the backend is not reachable.',
        },
      };
      return Promise.reject(err);
    }
    return res;
  },
  err => {
    const data = err.response?.data;

    let msg = 'An unexpected error occurred';
    if (data) {
      if (typeof data === 'string' && data.startsWith('<')) {
        msg =
          'API endpoint is not reachable. The server returned an HTML page instead of JSON. ' +
          'This usually means VITE_API_BASE_URL is not set or the backend is not running.';
      } else if (data.detail) {
        msg = data.detail;
      } else if (data.error) {
        msg = data.error;
      } else if (typeof data === 'string') {
        msg = data;
      }
    } else if (err.message) {
      msg = err.message;
    }

    const error = new Error(msg);
    error.printError = data?.printError || null;
    error.statusCode = err.response?.status || null;
    error.response = err.response;
    return Promise.reject(error);
  }
);

// ── App Installation Status ───────────────────────────────────────────────────
// Centralized check: is the Literary App installed for this subaccount?
// Mirrors the backend source of truth (ghl_tokens row for the location).

export async function getAppInstallStatus(locationId) {
  const resp = await api.get('/oauth/status', { params: { locationId } });
  return { installed: resp.data?.installed === true, ...(resp.data || {}) };
}

// ── Dashboard / Analytics ─────────────────────────────────────────────────────

export async function fetchAnalytics(locationId) {
  return api.get('/analytics', { params: { locationId } });
}

export async function fetchHealth(locationId) {
  return api.get('/health', { params: { locationId } });
}

// ── Lulu Integration (Per-Subaccount Credentials) ───────────────────────────

export async function getLuluCredentials(locationId) {
  return api.get('/lulu-integration/credentials', { params: { locationId } });
}

export async function saveLuluCredentials(data) {
  return api.post('/lulu-integration/credentials', data);
}

export async function deleteLuluCredentials(locationId) {
  return api.delete('/lulu-integration/credentials', { params: { locationId } });
}

export async function testLuluCredentials(data) {
  return api.post('/lulu-integration/test', data);
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function listOrders(params) {
  return api.get('/print-jobs/', { params });
}

export async function getOrderDetail(jobId, locationId) {
  return api.get(`/print-jobs/${jobId}`, { params: { locationId } });
}

export async function getOrderStatus(jobId, locationId) {
  return api.get(`/print-jobs/${jobId}/status`, { params: { locationId } });
}

export async function getOrderCosts(jobId, locationId) {
  return api.get(`/print-jobs/${jobId}/costs`, { params: { locationId } });
}

export async function syncOrder(jobId, locationId) {
  return api.post(`/print-jobs/${jobId}/sync`, { locationId });
}

export async function syncAllOrders(locationId) {
  return api.post('/print-jobs/sync-all', { locationId });
}

export async function reorderOrder(jobId, locationId, data) {
  return api.post(`/print-jobs/${jobId}/reorder`, { locationId, ...data });
}

export async function submitPrintJob(data) {
  return api.post('/print-jobs/submit', data);
}

export async function exportOrdersCSV(params) {
  return api.get('/print-jobs/export-csv', { params, responseType: 'blob' });
}

export async function reconcileOrders(locationId) {
  return api.get(`/print-jobs/reconcile/${locationId}`, {
    params: { secret: import.meta.env.VITE_API_SECRET || '' },
  });
}

export async function getWebhookHealth(locationId) {
  return api.get(`/print-jobs/webhook-health/${locationId}`, {
    params: { secret: import.meta.env.VITE_API_SECRET || '' },
  });
}

export async function reactivateWebhook(locationId) {
  return api.post(`/print-jobs/webhook-health/${locationId}/reactivate`, {
    secret: import.meta.env.VITE_API_SECRET || '',
  });
}

// ── CRM Pipeline Stage Configuration (per location) ──────────────────────────

export async function getPipelineOptions(locationId) {
  return api.get(`/pipelines/${locationId}/options`);
}

export async function getPipelineConfig(locationId) {
  return api.get(`/pipelines/${locationId}`);
}

export async function savePipelineConfig(locationId, config) {
  return api.post(`/pipelines/${locationId}`, config);
}

export default api;
