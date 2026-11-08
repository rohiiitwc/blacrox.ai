const API = (() => {
  const TOKEN_KEY = 'blacrox_jwt_token';
  const USER_KEY = 'blacrox_user_data';
  const EXPIRY_KEY = 'blacrox_token_expires_at';
  const VAULT_KEY = 'blacrox_accounts_vault';
  const LAST_EMAIL_KEY = 'blacrox_last_login_email';

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

  function getAccountsVault() {
    try {
      const raw = localStorage.getItem(VAULT_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveVaultAccount(user, vaultToken) {
    if (!user || !user.email) return;
    const email = user.email.trim().toLowerCase();
    const vault = getAccountsVault();
    vault[email] = {
      email,
      full_name: user.full_name || '',
      vault_token: vaultToken || (vault[email] && vault[email].vault_token) || '',
      last_saved: Date.now()
    };
    try {
      localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
      localStorage.setItem(LAST_EMAIL_KEY, email);
    } catch (e) {
      console.warn('Vault save error:', e);
    }
  }

  function getVaultAccount(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    const vault = getAccountsVault();
    return vault[clean] || null;
  }

  function getLastLoginEmail() {
    try {
      return localStorage.getItem(LAST_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  }

  function saveSession(token, user, expiresInMinutes = 120) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    const expiresAt = Date.now() + (expiresInMinutes * 60 * 1000);
    localStorage.setItem(EXPIRY_KEY, expiresAt.toString());
    if (user && user.email) {
      localStorage.setItem(LAST_EMAIL_KEY, user.email.trim().toLowerCase());
    }
  }

  function clearSession() {
    // Only clear active session credentials; NEVER delete user's permanent vault registration
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  }

  function handleSessionExpiry(message = 'Session completed (120 minutes). Please log in with your password to continue.') {
    clearSession();
    window.dispatchEvent(new CustomEvent('session-expired', { detail: { message } }));
  }

  async function request(endpoint, options = {}) {
    const token = getToken();
    const expiry = getExpiry();

    // Client-side automatic expiration check (120 minutes)
    if (token && expiry && Date.now() > expiry) {
      handleSessionExpiry('Session completed (120 minutes). Please enter your password to continue.');
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
          handleSessionExpiry('Session completed (120 minutes). Please enter your password to continue.');
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
    getLastLoginEmail,
    getVaultAccount,
    saveVaultAccount,

    // Auth
    async login(email, password) {
      const cleanEmail = email.trim().toLowerCase();
      const vault = getVaultAccount(cleanEmail);
      const prevUser = getUser();
      const hasHistory = Object.keys(localStorage).some(k => k.startsWith('blacrox_persistent_history_'));
      const isKnown = Boolean(vault || (prevUser && prevUser.email === cleanEmail) || hasHistory);

      const bodyPayload = {
        email: cleanEmail,
        password,
        vault_token: vault ? vault.vault_token : null,
        full_name: (vault && vault.full_name) || (prevUser && prevUser.full_name) || null,
        client_user_registered: isKnown
      };

      const data = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(bodyPayload)
      });

      if (data.success && data.token) {
        saveSession(data.token, data.user, data.expiresInMinutes || 120);
        if (data.vaultToken) {
          saveVaultAccount(data.user, data.vaultToken);
        }
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
        if (data.vaultToken) {
          saveVaultAccount(data.user, data.vaultToken);
        }
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
      const data = await request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password, confirm_password })
      });
      if (data.success && data.vaultToken && data.user) {
        saveVaultAccount(data.user, data.vaultToken);
      }
      return data;
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

    async syncAnalyses(analyses) {
      return request('/api/analysis/sync', {
        method: 'POST',
        body: JSON.stringify({ analyses })
      });
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

    async refreshAi() {
      return request('/api/evaluation/refresh-ai', {
        method: 'POST'
      });
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

