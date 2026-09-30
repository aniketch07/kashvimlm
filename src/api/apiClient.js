/**
 * KashviMLM Centralized API Client
 * Enterprise HTTP Client with Auth Interceptors, Error Normalization & 401 Handling
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.onUnauthorizedCallbacks = new Set();
  }

  onUnauthorized(callback) {
    this.onUnauthorizedCallbacks.add(callback);
    return () => this.onUnauthorizedCallbacks.delete(callback);
  }

  getToken() {
    try {
      const explicitToken = localStorage.getItem('kashvi_token');
      if (explicitToken) return explicitToken;

      const authStr = localStorage.getItem('kashvi_auth');
      if (authStr) {
        const parsed = JSON.parse(authStr);
        return parsed.token || parsed.accessToken || (parsed.user && parsed.user.token) || null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...customHeaders,
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers = this.getHeaders(options.headers);
    const config = {
      ...options,
      headers,
      credentials: options.credentials || 'include',
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized (session expired or invalid)
      if (response.status === 401) {
        this.handle401();
      }

      let data = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text ? { raw: text } : null;
        }
      }

      if (!response.ok) {
        const error = new Error(
          data?.message || data?.error || `HTTP request failed with status ${response.status}`
        );
        error.status = response.status;
        error.data = data;
        error.isAuthError = response.status === 401;
        error.isForbidden = response.status === 403;
        error.isNotFound = response.status === 404;
        error.isValidationError = response.status === 422 || response.status === 400;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.status) {
        throw err;
      }
      // Network or offline error
      const networkError = new Error(err.message || 'Network connection failed. Please check backend server.');
      networkError.status = 0;
      networkError.isNetworkError = true;
      throw networkError;
    }
  }

  handle401() {
    try {
      localStorage.removeItem('kashvi_token');
      const authStr = localStorage.getItem('kashvi_auth');
      if (authStr) {
        const parsed = JSON.parse(authStr);
        parsed.isLoggedIn = false;
        parsed.token = null;
        localStorage.setItem('kashvi_auth', JSON.stringify(parsed));
      }
      window.dispatchEvent(new CustomEvent('kashvi_unauthorized'));
    } catch {
      // ignore
    }

    this.onUnauthorizedCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Error in onUnauthorized callback:', e);
      }
    });
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
