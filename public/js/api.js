const API = (() => {
  const TOKEN_KEY = 'blacrox_jwt_token';
  const USER_KEY = 'blacrox_user_data';
  const EXPIRY_KEY = 'blacrox_token_expires_at';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  function getExpiry() {
    const val = localStorage.getItem(EXPIRY_KEY);
    return val ? parseInt(val, 10) : null;
  }

  function saveSession(token, user, expiresInMinutes = 120) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    const expiresAt = Date.now() + (expiresInMinutes * 60 * 1000);
    localStorage.setItem(EXPIRY_KEY, expiresAt.toString());
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  }

  function handleSessionExpiry(message = 'Your session has expired. Please log in again.') {
    clearSession();
    window.dispatchEvent(new CustomEvent('session-expired', { detail: { message } }));
  }

  async function request(endpoint, options = {}) {
    const token = getToken();
    const expiry = getExpiry();

    // Client-side automatic expiration check (120 minutes)
    if (token && expiry && Date.now() > expiry) {
      handleSessionExpiry();
      throw new Error('Your session has expired. Please log in again.');
    }

    const headers = options.headers || {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Do not set Content-Type for FormData (browser sets boundary)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        if (data.expired || data.message?.includes('expired')) {
          handleSessionExpiry('Your session has expired. Please log in again.');
        }
        throw new Error(data.message || 'Unauthorized');
      }

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  return {
    getToken,
    getUser,
    getExpiry,
    saveSession,
    clearSession,
    handleSessionExpiry,

    // Auth
    async login(email, password) {
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.success && data.token) {
        saveSession(data.token, data.user, data.expiresInMinutes || 120);
      }
      return data;
    },

    async register(full_name, email, password, confirm_password) {
      const data = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name, email, password, confirm_password })
      });
      if (data.success && data.token) {
        saveSession(data.token, data.user, data.expiresInMinutes || 120);
      }
      return data;
    },

    async forgotPassword(email) {
      return request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    },

    async resetPassword(token, password, confirm_password) {
      return request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password, confirm_password })
      });
    },

    async getMe() {
      return request('/api/auth/me');
    },

    // Analysis
    async uploadScreenshot(formData) {
      return request('/api/analysis/upload', {
        method: 'POST',
        body: formData
      });
    },

    async getHistory() {
      return request('/api/analysis/history');
    },

    async clearHistory() {
      return request('/api/analysis/history', {
        method: 'DELETE'
      });
    },

    async deleteAnalysis(id) {
      return request(`/api/analysis/${id}`, {
        method: 'DELETE'
      });
    },

    async getAnalysis(id) {
      return request(`/api/analysis/${id}`);
    },

    // Evaluation
    async submitEvaluation(formData) {
      return request('/api/evaluation/submit', {
        method: 'POST',
        body: formData
      });
    },

    async getStats() {
      return request('/api/evaluation/stats');
    },

    async getGlobalStats() {
      return request('/api/evaluation/global-stats');
    },

    // System
    async getSystemStatus() {
      return request('/api/system/status');
    },

    async getSystemTime() {
      return request('/api/system/time');
    }
  };
})();

window.API = API;

