/**
 * Asnat Khan Studio — Admin API Client
 * Secure client service communicating with /api/admin
 */

const TOKEN_STORAGE_KEY = 'ak_admin_session_token';
const ADMIN_USER_KEY = 'ak_admin_user_profile';

export class AdminApiClient {
  constructor() {
    this.token = this.loadToken();
  }

  loadToken() {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  }

  saveToken(token, persist = false) {
    this.token = token;
    if (typeof window === 'undefined') return;
    if (persist) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  }

  isAuthenticated() {
    return !!this.token;
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['x-admin-key'] = this.token;
    }
    return headers;
  }

  async request(action, options = {}) {
    const method = options.method || 'GET';
    let url = `/api/admin?action=${encodeURIComponent(action)}`;

    if (options.query) {
      Object.entries(options.query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
        }
      });
    }

    const fetchOptions = {
      method,
      headers: this.getAuthHeaders()
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, fetchOptions);
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        this.clearToken();
        throw new Error(data.error || 'Administrator session expired or unauthorized');
      }

      if (!res.ok || data.success === false) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      return data;
    } catch (err) {
      console.error(`[AdminApiClient ${action}] Error:`, err);
      throw err;
    }
  }

  // Auth
  async login(email, password, remember = false) {
    const res = await fetch('/api/admin?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Authentication failed');
    }
    this.saveToken(data.token, remember);
    if (data.admin) {
      sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
    }
    return data;
  }

  async verifySession() {
    if (!this.token) return false;
    try {
      const res = await this.request('verify_session');
      return res.success;
    } catch {
      this.clearToken();
      return false;
    }
  }

  // Dashboard Overview
  async getOverview() {
    return this.request('overview');
  }

  // Orders Table & Filter
  async getOrders(params = {}) {
    return this.request('orders', { query: params });
  }

  // Order Details
  async getOrder(id) {
    return this.request('order', { query: { id } });
  }

  // Update Project Status
  async updateStatus(id, newStatus, customerUpdateMessage = '', expectedCompletionDate = '') {
    return this.request('update_status', {
      method: 'POST',
      body: {
        id,
        newStatus,
        customerUpdateMessage,
        expectedCompletionDate
      }
    });
  }

  // Update Milestone
  async updateMilestone(id, milestoneId, status, description = '', customerUpdate = '') {
    return this.request('update_milestone', {
      method: 'POST',
      body: {
        id,
        milestoneId,
        status,
        description,
        customerUpdate
      }
    });
  }

  // Update Requirements Review
  async updateRequirements(id, status, reviewerNotes = '', missingItems = [], clarificationRequest = '') {
    return this.request('update_requirements', {
      method: 'POST',
      body: {
        id,
        status,
        reviewerNotes,
        missingItems,
        clarificationRequest
      }
    });
  }

  // Add Private Internal Note
  async addInternalNote(id, text) {
    return this.request('add_note', {
      method: 'POST',
      body: { id, text }
    });
  }

  // Send Customer Message
  async sendMessage(id, message) {
    return this.request('send_message', {
      method: 'POST',
      body: { id, message }
    });
  }

  // Manage Files & Deliverables
  async manageFile(id, fileData) {
    return this.request('manage_file', {
      method: 'POST',
      body: {
        id,
        ...fileData
      }
    });
  }

  // Customers
  async getCustomers() {
    return this.request('customers');
  }

  // Notifications
  async getNotifications() {
    return this.request('notifications');
  }

  // Settings
  async getSettings() {
    return this.request('settings');
  }
}

export const adminApi = new AdminApiClient();
