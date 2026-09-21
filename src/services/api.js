/**
 * KashviMLM REST API Client
 * Connects frontend views to the Node.js + Express + Prisma backend at http://localhost:5000/api/v1
 * Features resilient failover: If network is offline, gracefully preserves existing client flow.
 */

const API_BASE_URL = 'http://localhost:5000/api/v1';

function getAuthHeaders() {
  try {
    const saved = localStorage.getItem('kashvi_auth');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.token) {
        return {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${parsed.token}`,
        };
      }
    }
  } catch {
    // ignore
  }
  return { 'Content-Type': 'application/json' };
}

export const api = {
  // 1. Authentication
  async login(username, password, sponsorId) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, sponsorId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data;
      }
      throw new Error(data.message || 'Login failed.');
    } catch (err) {
      console.warn('[API] Login request failed or offline:', err.message);
      return null; // Signals fallback to local session
    }
  },

  async register(formData) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data;
      }
      throw new Error(data.message || 'Registration failed.');
    } catch (err) {
      console.warn('[API] Register request failed or offline:', err.message);
      return null;
    }
  },

  // 2. Products & Wholesale Catalog
  async getProducts(category, search) {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All Categories') params.append('category', category);
      if (search) params.append('search', search);

      const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Fetch products offline:', err.message);
    }
    return null;
  },

  async addProduct(productData) {
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(productData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Add product failed:', err.message);
    }
    return null;
  },

  async updateProduct(id, productData) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(productData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Update product failed:', err.message);
    }
    return null;
  },

  async deleteProduct(id) {
    try {
      await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.warn('[API] Delete product failed:', err.message);
    }
  },

  async bulkDeleteProducts(ids) {
    try {
      await fetch(`${API_BASE_URL}/products/bulk-delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids }),
      });
    } catch (err) {
      console.warn('[API] Bulk delete failed:', err.message);
    }
  },

  async resetZeroProducts() {
    try {
      await fetch(`${API_BASE_URL}/products/reset-zero`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.warn('[API] Reset zero failed:', err.message);
    }
  },

  async loadPlaceholders() {
    try {
      const res = await fetch(`${API_BASE_URL}/products/load-placeholders`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Load placeholders failed:', err.message);
    }
    return null;
  },

  // 3. Orders & Cart Checkout
  async checkoutOrder(orderData) {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/checkout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Checkout order failed:', err.message);
    }
    return null;
  },

  // 4. Downline Enrollment
  async enroll(enrollData) {
    try {
      const res = await fetch(`${API_BASE_URL}/enrollment/enroll`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(enrollData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Enrollment request failed:', err.message);
    }
    return null;
  },

  // 5. Support Tickets
  async submitSupportTicket(ticketData) {
    try {
      const res = await fetch(`${API_BASE_URL}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Support ticket submission failed:', err.message);
    }
    return null;
  },

  // 6. Distributor Profile & Volume
  async getProfile(memberId = '88767139') {
    try {
      const res = await fetch(`${API_BASE_URL}/distributors/profile/${memberId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Fetch profile failed:', err.message);
    }
    return null;
  },
};
