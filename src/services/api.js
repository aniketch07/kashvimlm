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

  // 5. Support Tickets & Messages
  async submitSupportTicket(ticketData) {
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets`, {
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

  async getSupportTickets(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val) queryParams.append(key, val);
      });
      const url = `${API_BASE_URL}/support/tickets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Get support tickets failed:', err.message);
    }
    return null;
  },

  async getSupportTicket(ticketId) {
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Get support ticket failed:', err.message);
    }
    return null;
  },

  async addTicketMessage(ticketId, messageData) {
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(messageData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Add ticket message failed:', err.message);
    }
    return null;
  },

  async closeSupportTicket(ticketId, reason) {
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}/close`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Close support ticket failed:', err.message);
    }
    return null;
  },

  // Admin Support Ticket Management
  async getAdminSupportTickets(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val) queryParams.append(key, val);
      });
      const url = `${API_BASE_URL}/admin/support/tickets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Get admin support tickets failed:', err.message);
    }
    return null;
  },

  async updateAdminSupportTicket(id, ticketData) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/support/tickets/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(ticketData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Update admin support ticket failed:', err.message);
    }
    return null;
  },

  async replyAdminSupportTicket(id, replyData) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/support/tickets/${id}/reply`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(replyData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Reply admin support ticket failed:', err.message);
    }
    return null;
  },

  // Executive Admin Management
  async getAdminOverview() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data;
      }
    } catch (err) {
      console.warn('[API] Get admin overview failed:', err.message);
    }
    return null;
  },

  async getAdminMetrics() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/metrics`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Get admin metrics failed:', err.message);
    }
    return null;
  },

  async getAdminAuditLogs(params = 50) {
    try {
      const queryParams = new URLSearchParams();
      if (typeof params === 'number') {
        queryParams.append('limit', params.toString());
      } else if (typeof params === 'object' && params !== null) {
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') queryParams.append(key, val.toString());
        });
      }
      const url = `${API_BASE_URL}/admin/audit-logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Get admin audit logs failed:', err.message);
    }
    return null;
  },

  async calculateAdminCommissions(cycleWeek, cycleYear) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/calculate-commissions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ cycleWeek, cycleYear }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data;
      }
    } catch (err) {
      console.warn('[API] Calculate commissions failed:', err.message);
    }
    return null;
  },

  async settleAdminPayouts(batchCode) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settle-payouts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ batchCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data;
      }
    } catch (err) {
      console.warn('[API] Settle payouts failed:', err.message);
    }
    return null;
  },

  async updateAdminDistributorStatus(memberId, status) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/distributors/${memberId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Update distributor status failed:', err.message);
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

  // 7. Notifications
  async getNotifications(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) queryParams.append(key, val);
      });
      const url = `${API_BASE_URL}/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        return data;
      }
    } catch (err) {
      console.warn('[API] Fetch notifications failed:', err.message);
    }
    return null;
  },

  async markNotificationAsRead(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Mark notification read failed:', err.message);
    }
    return null;
  },

  async markAllNotificationsAsRead() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data;
      }
    } catch (err) {
      console.warn('[API] Mark all notifications read failed:', err.message);
    }
    return null;
  },

  // 8. MLM Binary Network Tree (Database-Driven)
  async getBinaryTree(rootId = 'root-demo', depth = 3) {
    try {
      const res = await fetch(`${API_BASE_URL}/tree/binary/${encodeURIComponent(rootId)}?depth=${depth}`);
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Get binary tree failed:', err.message);
    }
    return null;
  },

  async getNextAvailableSlot(nodeId, preferredLeg = 'BALANCED') {
    try {
      const res = await fetch(`${API_BASE_URL}/tree/next-slot/${encodeURIComponent(nodeId)}?preferredLeg=${preferredLeg}`);
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Get next slot failed:', err.message);
    }
    return null;
  },

  async placeDistributorInTree(placementData) {
    try {
      const res = await fetch(`${API_BASE_URL}/tree/place`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(placementData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
      throw new Error(data.message || 'Placement failed');
    } catch (err) {
      console.warn('[API] Tree placement failed:', err.message);
      throw err;
    }
  },

  async enrollMember(memberData) {
    try {
      const res = await fetch(`${API_BASE_URL}/tree/enroll`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(memberData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Enroll member failed:', err.message);
    }
    return null;
  },

  async getSponsorTree(distributorId = 'KV-1001', depth = 3) {
    try {
      const res = await fetch(`${API_BASE_URL}/tree/sponsor/${encodeURIComponent(distributorId)}?depth=${depth}`);
      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
    } catch (err) {
      console.warn('[API] Get sponsor tree failed:', err.message);
    }
    return null;
  },

  // 9. Sponsor Validation & Binary Enrollment (Prompt 5)
  async validateSponsor(sponsorId) {
    try {
      const res = await fetch(`${API_BASE_URL}/sponsors/${encodeURIComponent(sponsorId)}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('[API] Validate sponsor failed:', err.message);
      return { success: false, code: 'NETWORK_ERROR', message: err.message };
    }
  },

  async submitCompleteEnrollment(enrollData) {
    try {
      const res = await fetch(`${API_BASE_URL}/enrollments/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(enrollData),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('[API] Submit complete enrollment failed:', err.message);
      return { success: false, code: 'NETWORK_ERROR', message: err.message };
    }
  },
};

