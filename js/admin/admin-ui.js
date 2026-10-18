/**
 * Asnat Khan Studio — Admin UI Component & View Controller
 * Production-ready DOM rendering for the full administrator workspace.
 */

import { adminApi } from './admin-api.js';

// Status color mapping & accessible labels
export const STATUS_CONFIG = {
  // Project Lifecycle
  order_received: { label: 'Order Received', class: 'status-badge-pending' },
  awaiting_requirements: { label: 'Awaiting Requirements', class: 'status-badge-pending' },
  requirements_review: { label: 'Requirements Review', class: 'status-badge-in-progress' },
  ready_to_start: { label: 'Ready to Start', class: 'status-badge-in-progress' },
  in_progress: { label: 'In Progress', class: 'status-badge-in-progress' },
  awaiting_feedback: { label: 'Awaiting Feedback', class: 'status-badge-pending' },
  revisions: { label: 'Revisions', class: 'status-badge-in-progress' },
  final_qc: { label: 'Final Quality Check', class: 'status-badge-in-progress' },
  ready_for_delivery: { label: 'Ready for Delivery', class: 'status-badge-paid' },
  completed: { label: 'Completed', class: 'status-badge-completed' },
  on_hold: { label: 'On Hold', class: 'status-badge-on-hold' },
  cancelled: { label: 'Cancelled', class: 'status-badge-cancelled' },
  // Legacy / fallback
  pending: { label: 'Pending', class: 'status-badge-pending' },
  confirmed: { label: 'Confirmed', class: 'status-badge-paid' },
  // Payment Status
  paid: { label: 'Paid', class: 'status-badge-paid' },
  processing: { label: 'Processing', class: 'status-badge-pending' },
  failed: { label: 'Failed', class: 'status-badge-failed' },
  refunded: { label: 'Refunded', class: 'status-badge-cancelled' }
};

export function formatCurrency(amount, currency = 'USD') {
  const num = Number(amount) || 0;
  return `$${num.toFixed(2)} ${currency}`;
}

export function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return isoStr;
  }
}

export function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoStr;
  }
}

export function renderStatusBadge(statusKey) {
  const cfg = STATUS_CONFIG[statusKey] || { label: statusKey || 'Unknown', class: 'status-badge-pending' };
  return `<span class="status-badge ${cfg.class}">${escapeHtml(cfg.label)}</span>`;
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function showToast(message, type = 'success') {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      transition: opacity 0.3s, transform 0.3s;
      opacity: 0;
      transform: translateY(10px);
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  if (type === 'error') {
    toast.style.background = '#062C21';
    toast.style.color = '#f87171';
    toast.style.border = '1px solid rgba(220, 38, 38, 0.5)';
  } else {
    toast.style.background = '#062C21';
    toast.style.color = '#E1E7E4';
    toast.style.border = '1px solid #0A6046';
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
  }, 3500);
}

export class AdminUI {
  constructor(router) {
    this.router = router;
    this.stage = document.getElementById('admin-stage');
    this.currentOrder = null;
    this.ordersParams = {
      search: '',
      status: 'all',
      paymentStatus: 'all',
      packageId: 'all',
      attentionOnly: 'false',
      page: 1,
      limit: 10
    };
  }

  // --------------------------------------------------------------------------
  // AUTHENTICATION VIEW
  // --------------------------------------------------------------------------
  renderLoginScreen() {
    this.stage.innerHTML = `
      <div style="min-height: 70vh; display: flex; align-items: center; justify-content: center; padding: 2rem;">
        <div class="admin-card" style="width: 100%; max-width: 440px; padding: 2.5rem; border: 1px solid var(--admin-border-emerald); box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div class="admin-monogram" style="width: 48px; height: 48px; margin: 0 auto 1rem; font-size: 1.2rem;">AK</div>
            <h2 style="margin: 0; font-size: 1.5rem; color: var(--admin-silver);">Administrator Workspace</h2>
            <p style="margin: 0.5rem 0 0; color: var(--admin-sage); font-size: 0.88rem;">Private management panel for Asnat Khan Studio</p>
          </div>

          <form id="admin-login-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div class="admin-form-group">
              <label class="admin-label" for="login-email">Administrator Email</label>
              <input type="email" id="login-email" class="admin-search-input" value="asnat@asnatkhan.com" required autocomplete="username" />
            </div>

            <div class="admin-form-group">
              <label class="admin-label" for="login-password">Access Password</label>
              <input type="password" id="login-password" class="admin-search-input" placeholder="••••••••••••" required autocomplete="current-password" />
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: var(--admin-sage);">
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
                <input type="checkbox" id="login-remember" checked />
                <span>Keep session active</span>
              </label>
              <span style="color: var(--admin-gold-highlight); font-size: 0.75rem;">Verified Role Required</span>
            </div>

            <div id="login-error-msg" style="display: none; padding: 0.75rem; border-radius: 6px; font-size: 0.82rem; background: rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.4); color: #f87171;"></div>

            <button type="submit" id="login-submit-btn" class="admin-btn admin-btn-primary" style="padding: 0.8rem; font-size: 0.95rem; margin-top: 0.5rem;">
              <span>Authenticate Session</span>
              <span class="btn-arrow">&rarr;</span>
            </button>
          </form>

          <div style="margin-top: 1.75rem; text-align: center; border-top: 1px solid var(--admin-border-subtle); padding-top: 1.25rem;">
            <a href="/" style="color: var(--admin-sage); text-decoration: none; font-size: 0.82rem; transition: color 0.15s;">
              &larr; Return to Public Website
            </a>
          </div>
        </div>
      </div>
    `;

    const form = document.getElementById('admin-login-form');
    const errDiv = document.getElementById('login-error-msg');
    const submitBtn = document.getElementById('login-submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errDiv.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const remember = document.getElementById('login-remember').checked;

      try {
        await adminApi.login(email, password, remember);
        showToast('Administrator authenticated successfully');
        this.router.resolveCurrentRoute();
      } catch (err) {
        errDiv.textContent = err.message || 'Authentication error';
        errDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Authenticate Session</span> <span class="btn-arrow">&rarr;</span>`;
      }
    });
  }

  // --------------------------------------------------------------------------
  // OVERVIEW DASHBOARD
  // --------------------------------------------------------------------------
  async renderOverview() {
    this.stage.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--admin-sage);">
        <div class="status-badge-pending" style="display: inline-block; padding: 0.5rem 1rem;">Loading dashboard metrics...</div>
      </div>
    `;

    try {
      const data = await adminApi.getOverview();
      const metrics = data.metrics || {};
      const attention = data.needsAttention || [];
      const recents = data.recentOrders || [];

      let html = `
        <div class="admin-page-header">
          <div>
            <h1 class="admin-page-title">Executive Overview</h1>
            <p class="admin-page-subtitle">Real-time status of client inquiries, active production stages, and confirmed payments</p>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <a href="/admin/orders" class="admin-btn admin-btn-secondary">
              <span>View All Orders</span>
            </a>
            <button id="btn-refresh-overview" class="admin-btn admin-btn-primary">
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        <!-- Real Metrics Grid -->
        <div class="admin-metrics-grid">
          <div class="admin-metric-card">
            <div class="admin-metric-title">Total Orders</div>
            <div class="admin-metric-value">${metrics.totalOrders || 0}</div>
            <div class="admin-metric-foot">Recorded in database</div>
          </div>

          <div class="admin-metric-card" style="border-color: rgba(16, 185, 129, 0.3);">
            <div class="admin-metric-title" style="color: #34d399;">Paid Orders</div>
            <div class="admin-metric-value" style="color: #34d399;">${metrics.paidOrders || 0}</div>
            <div class="admin-metric-foot">Verified transactions</div>
          </div>

          <div class="admin-metric-card">
            <div class="admin-metric-title">In Progress</div>
            <div class="admin-metric-value">${metrics.inProgressOrders || 0}</div>
            <div class="admin-metric-foot">Active build &amp; review stages</div>
          </div>

          <div class="admin-metric-card" style="border-color: var(--admin-border-gold);">
            <div class="admin-metric-title" style="color: var(--admin-gold-highlight);">Awaiting Requirements</div>
            <div class="admin-metric-value" style="color: var(--admin-gold-highlight);">${metrics.awaitingRequirements || 0}</div>
            <div class="admin-metric-foot">Client briefing pending</div>
          </div>

          <div class="admin-metric-card">
            <div class="admin-metric-title">Completed</div>
            <div class="admin-metric-value">${metrics.completedOrders || 0}</div>
            <div class="admin-metric-foot">Final deliverables handed over</div>
          </div>

          <div class="admin-metric-card">
            <div class="admin-metric-title">Pending / Failed Payments</div>
            <div class="admin-metric-value" style="color: ${metrics.failedOrPendingPayments ? '#f87171' : 'var(--admin-sage)'};">${metrics.failedOrPendingPayments || 0}</div>
            <div class="admin-metric-foot">Awaiting payment provider</div>
          </div>
        </div>

        <!-- Needs Attention Queue -->
        ${attention.length > 0 ? `
          <div class="admin-card" style="border-left: 3px solid var(--admin-gold);">
            <div class="admin-card-header">
              <h3 class="admin-card-title" style="display: flex; align-items: center; gap: 0.5rem; color: var(--admin-gold-highlight);">
                <span aria-hidden="true">⚠️</span> Needs Attention (${attention.length})
              </h3>
              <span style="font-size: 0.8rem; color: var(--admin-sage);">Actionable items requiring admin input</span>
            </div>
            <div style="padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
              ${attention.map(item => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(9, 17, 14, 0.4); border: 1px solid var(--admin-border-subtle); border-radius: 6px; gap: 1rem; flex-wrap: wrap;">
                  <div>
                    <span class="status-badge status-badge-pending" style="margin-right: 0.5rem;">${escapeHtml(item.type.replace(/_/g, ' ').toUpperCase())}</span>
                    <span style="font-size: 0.88rem; color: var(--admin-silver); font-weight: 500;">${escapeHtml(item.message)}</span>
                  </div>
                  <a href="${escapeHtml(item.action_url)}" class="admin-btn admin-btn-sm admin-btn-gold">
                    <span>Resolve Action &rarr;</span>
                  </a>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Recent Orders Table -->
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">Recent Customer Orders</h3>
            <a href="/admin/orders" class="admin-btn admin-btn-sm admin-btn-secondary">View Complete Registry &rarr;</a>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Order Ref</th>
                  <th>Customer</th>
                  <th>Package</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Project Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${recents.length === 0 ? `
                  <tr><td colspan="8" style="text-align: center; color: var(--admin-sage); padding: 2rem;">No orders found in database.</td></tr>
                ` : recents.map(o => `
                  <tr>
                    <td style="font-weight: 700; color: var(--admin-gold-highlight);">${escapeHtml(o.order_ref || o.id)}</td>
                    <td>
                      <div style="font-weight: 600;">${escapeHtml(o.customer_name || 'Valued Client')}</div>
                      <div style="font-size: 0.75rem; color: var(--admin-sage);">${escapeHtml(o.customer_email || 'No email provided')}</div>
                    </td>
                    <td><span style="font-weight: 500;">${escapeHtml(o.package_name || 'Basic')}</span></td>
                    <td>${formatDate(o.created_at)}</td>
                    <td style="font-weight: 700; color: var(--admin-silver);">${formatCurrency(o.total_amount, o.currency)}</td>
                    <td>${renderStatusBadge(o.payment_status)}</td>
                    <td>${renderStatusBadge(o.order_status)}</td>
                    <td>
                      <a href="/admin/orders/${encodeURIComponent(o.id)}" class="admin-btn admin-btn-sm admin-btn-secondary">
                        Open Order
                      </a>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      this.stage.innerHTML = html;

      document.getElementById('btn-refresh-overview')?.addEventListener('click', () => {
        this.renderOverview();
      });
    } catch (err) {
      if (err.message.includes('Unauthorized') || err.message.includes('expired')) {
        this.renderLoginScreen();
        return;
      }
      this.stage.innerHTML = `
        <div class="admin-card" style="padding: 2rem; border-color: rgba(220, 38, 38, 0.4); text-align: center;">
          <h3 style="color: #f87171; margin-top: 0;">Error Loading Overview</h3>
          <p style="color: var(--admin-sage);">${escapeHtml(err.message)}</p>
          <button class="admin-btn admin-btn-primary" onclick="window.location.reload()">Retry Connection</button>
        </div>
      `;
    }
  }

  // --------------------------------------------------------------------------
  // ORDERS MANAGEMENT TABLE
  // --------------------------------------------------------------------------
  async renderOrders(params = {}) {
    this.ordersParams = { ...this.ordersParams, ...params };

    this.stage.innerHTML = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Orders Management</h1>
          <p class="admin-page-subtitle">Search, filter, and inspect client projects across all production stages</p>
        </div>
      </div>

      <div class="admin-card">
        <!-- Filter Bar -->
        <div class="admin-filters-bar">
          <input type="text" id="order-search-input" class="admin-search-input" placeholder="Search by Order ID, Client Name, Email, or Package..." value="${escapeHtml(this.ordersParams.search)}" />
          
          <select id="order-filter-status" class="admin-select" title="Filter by Project Status">
            <option value="all">All Project Stages</option>
            <option value="order_received" ${this.ordersParams.status === 'order_received' ? 'selected' : ''}>Order Received</option>
            <option value="awaiting_requirements" ${this.ordersParams.status === 'awaiting_requirements' ? 'selected' : ''}>Awaiting Requirements</option>
            <option value="requirements_review" ${this.ordersParams.status === 'requirements_review' ? 'selected' : ''}>Requirements Review</option>
            <option value="ready_to_start" ${this.ordersParams.status === 'ready_to_start' ? 'selected' : ''}>Ready to Start</option>
            <option value="in_progress" ${this.ordersParams.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="awaiting_feedback" ${this.ordersParams.status === 'awaiting_feedback' ? 'selected' : ''}>Awaiting Feedback</option>
            <option value="revisions" ${this.ordersParams.status === 'revisions' ? 'selected' : ''}>Revisions</option>
            <option value="final_qc" ${this.ordersParams.status === 'final_qc' ? 'selected' : ''}>Final QC</option>
            <option value="ready_for_delivery" ${this.ordersParams.status === 'ready_for_delivery' ? 'selected' : ''}>Ready for Delivery</option>
            <option value="completed" ${this.ordersParams.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="on_hold" ${this.ordersParams.status === 'on_hold' ? 'selected' : ''}>On Hold</option>
            <option value="cancelled" ${this.ordersParams.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>

          <select id="order-filter-payment" class="admin-select" title="Filter by Payment Status">
            <option value="all">All Payment Statuses</option>
            <option value="paid" ${this.ordersParams.paymentStatus === 'paid' ? 'selected' : ''}>Paid</option>
            <option value="pending" ${this.ordersParams.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="processing" ${this.ordersParams.paymentStatus === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="failed" ${this.ordersParams.paymentStatus === 'failed' ? 'selected' : ''}>Failed</option>
            <option value="refunded" ${this.ordersParams.paymentStatus === 'refunded' ? 'selected' : ''}>Refunded</option>
          </select>

          <select id="order-filter-package" class="admin-select" title="Filter by Package">
            <option value="all">All Packages</option>
            <option value="basic" ${this.ordersParams.packageId === 'basic' ? 'selected' : ''}>Basic ($50)</option>
            <option value="standard" ${this.ordersParams.packageId === 'standard' ? 'selected' : ''}>Standard ($100)</option>
            <option value="ecommerce" ${this.ordersParams.packageId === 'ecommerce' ? 'selected' : ''}>E-Commerce ($200)</option>
          </select>

          <button id="order-filter-reset" class="admin-btn admin-btn-sm admin-btn-secondary" title="Clear all filters">
            Reset Filters
          </button>
        </div>

        <!-- Orders Table Container -->
        <div id="orders-table-container" style="padding: 1.5rem; text-align: center; color: var(--admin-sage);">
          Loading order collection...
        </div>
      </div>
    `;

    // Hook filter inputs
    const searchInput = document.getElementById('order-search-input');
    const statusSelect = document.getElementById('order-filter-status');
    const paymentSelect = document.getElementById('order-filter-payment');
    const pkgSelect = document.getElementById('order-filter-package');
    const resetBtn = document.getElementById('order-filter-reset');

    const triggerFetch = () => {
      this.ordersParams.search = searchInput.value;
      this.ordersParams.status = statusSelect.value;
      this.ordersParams.paymentStatus = paymentSelect.value;
      this.ordersParams.packageId = pkgSelect.value;
      this.ordersParams.page = 1;
      this.fetchAndRenderOrdersTable();
    };

    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(triggerFetch, 300);
    });

    statusSelect.addEventListener('change', triggerFetch);
    paymentSelect.addEventListener('change', triggerFetch);
    pkgSelect.addEventListener('change', triggerFetch);

    resetBtn.addEventListener('click', () => {
      searchInput.value = '';
      statusSelect.value = 'all';
      paymentSelect.value = 'all';
      pkgSelect.value = 'all';
      this.ordersParams = {
        search: '',
        status: 'all',
        paymentStatus: 'all',
        packageId: 'all',
        attentionOnly: 'false',
        page: 1,
        limit: 10
      };
      this.fetchAndRenderOrdersTable();
    });

    await this.fetchAndRenderOrdersTable();
  }

  async fetchAndRenderOrdersTable() {
    const container = document.getElementById('orders-table-container');
    if (!container) return;

    try {
      const data = await adminApi.getOrders(this.ordersParams);
      const orders = data.orders || [];
      const pagination = data.pagination || { total: orders.length, page: 1, totalPages: 1 };

      if (orders.length === 0) {
        container.innerHTML = `
          <div style="padding: 3rem 1rem; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;" aria-hidden="true">🔍</div>
            <h3 style="margin: 0; color: var(--admin-silver);">No Matching Orders Found</h3>
            <p style="margin: 0.5rem 0 1.5rem; color: var(--admin-sage); font-size: 0.88rem;">Try adjusting your search criteria or resetting filters.</p>
            <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="document.getElementById('order-filter-reset').click()">Clear Active Filters</button>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="admin-table-wrap" style="margin: -1.5rem;">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Client</th>
                <th>Package</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Project Stage</th>
                <th>Date</th>
                <th>Last Activity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => `
                <tr>
                  <td style="font-weight: 700; color: var(--admin-gold-highlight); font-family: monospace; font-size: 0.9rem;">
                    ${escapeHtml(o.order_ref || o.id)}
                  </td>
                  <td>
                    <div style="font-weight: 600; color: var(--admin-silver);">${escapeHtml(o.customer_name || 'Client')}</div>
                    <div style="font-size: 0.75rem; color: var(--admin-sage);">${escapeHtml(o.customer_email || '—')}</div>
                  </td>
                  <td>
                    <span style="font-weight: 500;">${escapeHtml(o.package_name || 'Basic')}</span>
                  </td>
                  <td style="font-weight: 700; color: var(--admin-silver);">
                    ${formatCurrency(o.total_amount, o.currency)}
                  </td>
                  <td>${renderStatusBadge(o.payment_status)}</td>
                  <td>${renderStatusBadge(o.order_status)}</td>
                  <td>${formatDate(o.created_at)}</td>
                  <td style="font-size: 0.75rem; color: var(--admin-sage);">${formatDateTime(o.updated_at || o.created_at)}</td>
                  <td>
                    <a href="/admin/orders/${encodeURIComponent(o.id)}" class="admin-btn admin-btn-sm admin-btn-secondary">
                      Manage &rarr;
                    </a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 1.5rem; border-top: 1px solid var(--admin-border-subtle); margin-top: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div style="font-size: 0.85rem; color: var(--admin-sage);">
            Showing page <strong style="color: var(--admin-silver);">${pagination.page}</strong> of <strong style="color: var(--admin-silver);">${pagination.totalPages}</strong> (${pagination.total} total orders)
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button id="page-prev-btn" class="admin-btn admin-btn-sm admin-btn-secondary" ${pagination.page <= 1 ? 'disabled style="opacity: 0.4;"' : ''}>
              &larr; Previous
            </button>
            <button id="page-next-btn" class="admin-btn admin-btn-sm admin-btn-secondary" ${pagination.page >= pagination.totalPages ? 'disabled style="opacity: 0.4;"' : ''}>
              Next &rarr;
            </button>
          </div>
        </div>
      `;

      document.getElementById('page-prev-btn')?.addEventListener('click', () => {
        if (this.ordersParams.page > 1) {
          this.ordersParams.page--;
          this.fetchAndRenderOrdersTable();
        }
      });

      document.getElementById('page-next-btn')?.addEventListener('click', () => {
        if (this.ordersParams.page < pagination.totalPages) {
          this.ordersParams.page++;
          this.fetchAndRenderOrdersTable();
        }
      });
    } catch (err) {
      container.innerHTML = `
        <div style="padding: 2rem; color: #f87171; text-align: center;">
          Failed to load orders: ${escapeHtml(err.message)}
        </div>
      `;
    }
  }

  // --------------------------------------------------------------------------
  // ORDER DETAILS & MANAGEMENT (With All Sub-tabs)
  // --------------------------------------------------------------------------
  async renderOrderDetail(orderId, activeTab = 'details') {
    this.stage.innerHTML = `
      <div style="padding: 3rem; text-align: center; color: var(--admin-sage);">
        <div class="status-badge-pending" style="display: inline-block; padding: 0.5rem 1rem;">Loading project record ${escapeHtml(orderId)}...</div>
      </div>
    `;

    try {
      const data = await adminApi.getOrder(orderId);
      const order = data.order;
      this.currentOrder = order;

      const subtab = activeTab || 'details';

      const html = `
        <!-- Header -->
        <div class="admin-page-header">
          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.4rem; flex-wrap: wrap;">
              <h1 class="admin-page-title" style="font-family: monospace; font-size: 1.6rem; color: var(--admin-gold-highlight);">
                ${escapeHtml(order.order_ref || order.id)}
              </h1>
              ${renderStatusBadge(order.payment_status)}
              ${renderStatusBadge(order.order_status)}
            </div>
            <p class="admin-page-subtitle">
              Client: <strong style="color: var(--admin-silver);">${escapeHtml(order.customer_name || 'Client')}</strong> &bull;
              Ordered: ${formatDateTime(order.created_at)} &bull;
              Last Activity: ${formatDateTime(order.updated_at)}
            </p>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="btn-open-status-modal" class="admin-btn admin-btn-primary">
              <span>Update Project Status</span>
            </button>
            <a href="/order-confirmation?order_id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.access_token || '')}" target="_blank" class="admin-btn admin-btn-secondary" title="View the live tracker visible to this customer">
              <span>Preview Client Tracker &UpperRightArrow;</span>
            </a>
          </div>
        </div>

        <!-- Sub-tabs Navigation -->
        <div class="admin-tabs-nav">
          <button class="admin-tab-btn ${subtab === 'details' ? 'active' : ''}" data-tab="details">Overview &amp; Scope</button>
          <button class="admin-tab-btn ${subtab === 'progress' ? 'active' : ''}" data-tab="progress">Progress &amp; Milestones</button>
          <button class="admin-tab-btn ${subtab === 'requirements' ? 'active' : ''}" data-tab="requirements">Requirements Review</button>
          <button class="admin-tab-btn ${subtab === 'files' ? 'active' : ''}" data-tab="files">Files &amp; Deliverables (${(order.files || []).length})</button>
          <button class="admin-tab-btn ${subtab === 'messages' ? 'active' : ''}" data-tab="messages">Messages &amp; Notes (${(order.messages || []).length})</button>
        </div>

        <!-- Sub-tab Content Stage -->
        <div id="subtab-content-area"></div>
      `;

      this.stage.innerHTML = html;

      // Bind tab clicks
      const tabBtns = document.querySelectorAll('.admin-tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-tab');
          this.router.navigate(`/admin/orders/${encodeURIComponent(order.id)}/${tab === 'details' ? '' : tab}`);
        });
      });

      // Bind status modal trigger
      document.getElementById('btn-open-status-modal')?.addEventListener('click', () => {
        this.openStatusModal(order);
      });

      // Render the active sub-tab
      const subArea = document.getElementById('subtab-content-area');
      if (subtab === 'progress') {
        this.renderSubtabProgress(subArea, order);
      } else if (subtab === 'requirements') {
        this.renderSubtabRequirements(subArea, order);
      } else if (subtab === 'files') {
        this.renderSubtabFiles(subArea, order);
      } else if (subtab === 'messages') {
        this.renderSubtabMessages(subArea, order);
      } else {
        this.renderSubtabDetails(subArea, order);
      }
    } catch (err) {
      this.stage.innerHTML = `
        <div class="admin-card" style="padding: 2.5rem; text-align: center; border-color: rgba(220, 38, 38, 0.4);">
          <h3 style="color: #f87171; margin-top: 0;">Order Not Found or Inaccessible</h3>
          <p style="color: var(--admin-sage);">${escapeHtml(err.message)}</p>
          <a href="/admin/orders" class="admin-btn admin-btn-secondary" style="margin-top: 1rem;">&larr; Back to Orders List</a>
        </div>
      `;
    }
  }

  // Subtab 1: Details & Summary
  renderSubtabDetails(container, order) {
    const meta = order.metadata || {};
    const lineItems = order.line_items || [];

    container.innerHTML = `
      <div class="admin-details-grid">
        <!-- Left: Package Scope & Inclusions -->
        <div>
          <div class="admin-card">
            <div class="admin-card-header">
              <h3 class="admin-card-title">Package &amp; Line Items</h3>
              <span class="status-badge status-badge-paid">${escapeHtml(order.package_name || 'Standard')} Package</span>
            </div>
            <div style="padding: 1.5rem;">
              <table class="admin-table" style="margin-bottom: 1.5rem;">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItems.length > 0 ? lineItems.map(item => `
                    <tr>
                      <td style="font-weight: 500;">
                        ${escapeHtml(item.name)}
                        ${item.description ? `<div style="font-size: 0.75rem; color: var(--admin-sage);">${escapeHtml(item.description)}</div>` : ''}
                      </td>
                      <td>${item.quantity || 1}</td>
                      <td>${formatCurrency(item.unitPrice || item.amount)}</td>
                      <td style="text-align: right; font-weight: 600;">${formatCurrency(item.amount)}</td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td style="font-weight: 500;">${escapeHtml(order.package_name || 'Package Inclusions')}</td>
                      <td>1</td>
                      <td>${formatCurrency(order.package_price || order.total_amount)}</td>
                      <td style="text-align: right; font-weight: 600;">${formatCurrency(order.package_price || order.total_amount)}</td>
                    </tr>
                  `}
                </tbody>
              </table>

              <!-- Financial Summary Box -->
              <div style="background: rgba(9, 17, 14, 0.4); border: 1px solid var(--admin-border-subtle); border-radius: 8px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.88rem; color: var(--admin-sage);">
                  <span>Subtotal</span>
                  <span>${formatCurrency(order.subtotal || order.total_amount, order.currency)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.88rem; color: var(--admin-sage);">
                  <span>Tax</span>
                  <span>$0.00 USD</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 700; color: var(--admin-silver); border-top: 1px solid var(--admin-border-subtle); padding-top: 0.75rem; margin-top: 0.25rem;">
                  <span>Final Total</span>
                  <span style="color: var(--admin-gold-highlight);">${formatCurrency(order.total_amount, order.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Customer Visible Updates Published -->
          <div class="admin-card">
            <div class="admin-card-header">
              <h3 class="admin-card-title">Customer-Visible Progress Feed</h3>
              <span style="font-size: 0.78rem; color: var(--admin-sage);">Updates broadcasted to client tracker</span>
            </div>
            <div style="padding: 1.5rem;">
              ${(order.customer_updates && order.customer_updates.length > 0) ? `
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                  ${order.customer_updates.map(upd => `
                    <div style="padding: 1rem 1.25rem; background: rgba(9, 17, 14, 0.4); border-left: 3px solid var(--admin-emerald); border-radius: 4px;">
                      <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--admin-sage); margin-bottom: 0.4rem;">
                        <span style="font-weight: 600; color: var(--admin-silver);">${escapeHtml(upd.status_label || upd.status)}</span>
                        <span>${formatDateTime(upd.timestamp)}</span>
                      </div>
                      <div style="font-size: 0.9rem; color: var(--admin-silver); line-height: 1.5;">${escapeHtml(upd.message)}</div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="text-align: center; color: var(--admin-sage); padding: 1.5rem;">
                  No client updates broadcasted yet. When you change project status, you can publish a message here.
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- Right: Client Profile & Quick Metadata -->
        <div>
          <div class="admin-card">
            <div class="admin-card-header">
              <h3 class="admin-card-title">Customer Profile</h3>
            </div>
            <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
              <div>
                <span class="admin-label">Full Name</span>
                <div style="font-size: 1rem; font-weight: 600; color: var(--admin-silver); margin-top: 0.2rem;">
                  ${escapeHtml(order.customer_name || 'Guest Client')}
                </div>
              </div>

              <div>
                <span class="admin-label">Email Address</span>
                <div style="font-size: 0.9rem; color: var(--admin-gold-highlight); margin-top: 0.2rem;">
                  <a href="mailto:${escapeHtml(order.customer_email)}" style="color: inherit; text-decoration: none;">
                    ${escapeHtml(order.customer_email || '—')}
                  </a>
                </div>
              </div>

              <div>
                <span class="admin-label">Business / Brand</span>
                <div style="font-size: 0.9rem; color: var(--admin-silver); margin-top: 0.2rem;">
                  ${escapeHtml(order.customer_business || order.brand_name || '—')}
                </div>
              </div>

              <div>
                <span class="admin-label">Country</span>
                <div style="font-size: 0.9rem; color: var(--admin-silver); margin-top: 0.2rem;">
                  ${escapeHtml(order.customer_country || '—')}
                </div>
              </div>

              <div>
                <span class="admin-label">Website Target URL</span>
                <div style="font-size: 0.9rem; color: var(--admin-silver); margin-top: 0.2rem;">
                  ${order.website_url ? `<a href="${escapeHtml(order.website_url)}" target="_blank" style="color: var(--admin-emerald);">${escapeHtml(order.website_url)}</a>` : '—'}
                </div>
              </div>

              <div style="border-top: 1px solid var(--admin-border-subtle); padding-top: 1rem;">
                <span class="admin-label">Payment Provider</span>
                <div style="font-size: 0.88rem; color: var(--admin-silver); margin-top: 0.2rem;">
                  ${escapeHtml(order.payment_provider || 'Stripe / Sandbox')} &bull; Ref: ${escapeHtml(order.payment_reference || 'N/A')}
                </div>
              </div>
            </div>
          </div>

          <!-- Activity Audit Log (Recent snippet) -->
          <div class="admin-card">
            <div class="admin-card-header">
              <h3 class="admin-card-title">Audit Trail</h3>
            </div>
            <div style="padding: 1.25rem; max-height: 320px; overflow-y: auto;">
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${(order.activity_log || []).slice(0, 10).map(act => `
                  <div style="font-size: 0.8rem; border-left: 2px solid var(--admin-border-emerald); padding-left: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; color: var(--admin-sage); font-size: 0.72rem;">
                      <span>${escapeHtml(act.actor || 'Admin')}</span>
                      <span>${formatDateTime(act.timestamp)}</span>
                    </div>
                    <div style="color: var(--admin-silver); margin-top: 0.2rem;">${escapeHtml(act.description || act.type)}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Subtab 2: Progress & Milestones
  renderSubtabProgress(container, order) {
    const milestones = order.milestones || [];
    const completedCount = milestones.filter(m => m.status === 'completed').length;
    const progressPercent = Math.round((completedCount / (milestones.length || 1)) * 100);

    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3 class="admin-card-title">Production Milestones</h3>
            <p style="margin: 0.25rem 0 0; font-size: 0.82rem; color: var(--admin-sage);">
              Calculated Progress: <strong style="color: var(--admin-silver);">${progressPercent}%</strong> (${completedCount} of ${milestones.length} milestones completed)
            </p>
          </div>
          <button id="btn-progress-change-status" class="admin-btn admin-btn-primary admin-btn-sm">
            Update Overall Status
          </button>
        </div>

        <!-- Progress Bar -->
        <div style="padding: 0 1.5rem 1rem;">
          <div style="width: 100%; height: 8px; background: rgba(9, 17, 14, 0.6); border-radius: 4px; overflow: hidden; border: 1px solid var(--admin-border-subtle);">
            <div style="width: ${progressPercent}%; height: 100%; background: var(--admin-emerald); transition: width 0.3s ease;"></div>
          </div>
        </div>

        <div style="padding: 1.5rem;">
          <div class="milestones-list">
            ${milestones.map((m, idx) => `
              <div class="milestone-item ${m.status}" id="milestone-card-${m.id}">
                <div class="milestone-info">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 0.75rem; font-weight: 700; color: var(--admin-gold-highlight); font-family: monospace;">0${idx + 1}</span>
                    <h4 class="milestone-title">${escapeHtml(m.name)}</h4>
                    ${m.status === 'completed' ? `<span class="status-badge status-badge-paid">&#10003; Done</span>` : ''}
                    ${m.status === 'in_progress' ? `<span class="status-badge status-badge-in-progress">In Progress</span>` : ''}
                    ${m.status === 'blocked' ? `<span class="status-badge status-badge-failed">Blocked</span>` : ''}
                  </div>
                  <p class="milestone-desc">${escapeHtml(m.description || '')}</p>
                  ${m.updated_at ? `<div style="font-size: 0.72rem; color: var(--admin-sage); margin-top: 0.35rem;">Updated: ${formatDateTime(m.updated_at)}</div>` : ''}
                </div>

                <div class="milestone-controls">
                  <select class="admin-select admin-select-sm milestone-status-picker" data-id="${m.id}">
                    <option value="not_started" ${m.status === 'not_started' ? 'selected' : ''}>Not Started</option>
                    <option value="in_progress" ${m.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${m.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="blocked" ${m.status === 'blocked' ? 'selected' : ''}>Blocked</option>
                  </select>
                  <button class="admin-btn admin-btn-sm admin-btn-secondary btn-save-milestone" data-id="${m.id}">Save</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-progress-change-status')?.addEventListener('click', () => {
      this.openStatusModal(order);
    });

    // Handle individual milestone status saves
    container.querySelectorAll('.btn-save-milestone').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mId = btn.getAttribute('data-id');
        const select = container.querySelector(`.milestone-status-picker[data-id="${mId}"]`);
        const newStatus = select.value;

        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
          await adminApi.updateMilestone(order.id, mId, newStatus);
          showToast(`Milestone updated to ${newStatus}`);
          this.renderOrderDetail(order.id, 'progress');
        } catch (err) {
          showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Save';
        }
      });
    });
  }

  // Subtab 3: Requirements Review
  renderSubtabRequirements(container, order) {
    const reqData = order.requirements_data || {};
    const brief = order.project_description || order.projectDescription || '';

    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3 class="admin-card-title">Project Requirements &amp; Scope Alignment</h3>
            <span style="font-size: 0.8rem; color: var(--admin-sage);">Review client brief, verify provided assets, or request clarification</span>
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button id="btn-req-confirm" class="admin-btn admin-btn-sm admin-btn-primary">
              Mark Confirmed
            </button>
            <button id="btn-req-clarify" class="admin-btn admin-btn-sm admin-btn-gold">
              Request Clarification
            </button>
          </div>
        </div>

        <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- Current Review Status Banner -->
          <div style="padding: 1rem 1.25rem; background: rgba(9, 17, 14, 0.4); border: 1px solid var(--admin-border-subtle); border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span class="admin-label">Requirements Review State</span>
              <div style="margin-top: 0.25rem;">
                <span class="status-badge ${reqData.status === 'confirmed' ? 'status-badge-completed' : (reqData.status === 'clarification_requested' ? 'status-badge-failed' : 'status-badge-pending')}">
                  ${escapeHtml((reqData.status || 'Pending Review').toUpperCase())}
                </span>
              </div>
            </div>
            ${reqData.confirmed_at ? `<div style="font-size: 0.8rem; color: #34d399;">Confirmed on ${formatDateTime(reqData.confirmed_at)}</div>` : ''}
          </div>

          <!-- Submitted Project Description -->
          <div>
            <span class="admin-label">Customer's Primary Brief</span>
            <div style="margin-top: 0.5rem; padding: 1.25rem; background: var(--admin-obsidian); border: 1px solid var(--admin-border-subtle); border-radius: 8px; color: var(--admin-silver); line-height: 1.6; font-size: 0.95rem; white-space: pre-wrap;">
              ${brief ? escapeHtml(brief) : 'No written description was submitted with this order.'}
            </div>
          </div>

          <!-- Project Goals & References -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div>
              <span class="admin-label">Specific Project Goals</span>
              <div style="margin-top: 0.5rem; padding: 1rem; background: var(--admin-obsidian); border: 1px solid var(--admin-border-subtle); border-radius: 6px; color: var(--admin-silver); min-height: 60px;">
                ${order.project_goals ? escapeHtml(order.project_goals) : 'None provided'}
              </div>
            </div>

            <div>
              <span class="admin-label">Inspirations &amp; References</span>
              <div style="margin-top: 0.5rem; padding: 1rem; background: var(--admin-obsidian); border: 1px solid var(--admin-border-subtle); border-radius: 6px; color: var(--admin-silver); min-height: 60px;">
                ${order.project_references ? escapeHtml(order.project_references) : 'None provided'}
              </div>
            </div>
          </div>

          <!-- Special Requirements -->
          <div>
            <span class="admin-label">Special Requirements / Technical Constraints</span>
            <div style="margin-top: 0.5rem; padding: 1rem; background: var(--admin-obsidian); border: 1px solid var(--admin-border-subtle); border-radius: 6px; color: var(--admin-silver);">
              ${order.special_requirements ? escapeHtml(order.special_requirements) : 'Standard package delivery scope.'}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-req-confirm')?.addEventListener('click', async () => {
      try {
        await adminApi.updateRequirements(order.id, 'confirmed', 'Reviewed and aligned with scope.');
        showToast('Requirements marked as confirmed');
        this.renderOrderDetail(order.id, 'requirements');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    document.getElementById('btn-req-clarify')?.addEventListener('click', () => {
      this.openClarificationModal(order);
    });
  }

  // Subtab 4: Files & Deliverables
  renderSubtabFiles(container, order) {
    const files = order.files || [];
    const customerFiles = files.filter(f => f.category === 'customer_provided');
    const wipFiles = files.filter(f => f.category === 'wip');
    const deliverableFiles = files.filter(f => f.category === 'deliverable');

    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3 class="admin-card-title">Project Deliverables &amp; Assets</h3>
            <span style="font-size: 0.8rem; color: var(--admin-sage);">Manage client-provided assets, WIP drafts, and completed website handovers</span>
          </div>

          <button id="btn-upload-file-modal" class="admin-btn admin-btn-sm admin-btn-primary">
            + Upload / Attach File
          </button>
        </div>

        <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.75rem;">
          <!-- 1. Deliverables (Visible to Client) -->
          <div>
            <h4 style="margin: 0 0 0.75rem; font-size: 0.95rem; color: #34d399; display: flex; align-items: center; gap: 0.5rem;">
              <span>🏆 Final Website Deliverables</span>
              <span style="font-size: 0.75rem; color: var(--admin-sage); font-weight: normal;">(Visible to customer on confirmation dashboard)</span>
            </h4>
            ${deliverableFiles.length > 0 ? this.renderFilesList(deliverableFiles, order.id) : `
              <div style="padding: 1rem; background: rgba(9, 17, 14, 0.4); border: 1px dashed var(--admin-border-subtle); border-radius: 6px; text-align: center; color: var(--admin-sage); font-size: 0.85rem;">
                No final deliverables uploaded yet.
              </div>
            `}
          </div>

          <!-- 2. Work in Progress (Internal Only) -->
          <div>
            <h4 style="margin: 0 0 0.75rem; font-size: 0.95rem; color: var(--admin-gold-highlight); display: flex; align-items: center; gap: 0.5rem;">
              <span>🔒 Work In Progress</span>
              <span style="font-size: 0.75rem; color: var(--admin-sage); font-weight: normal;">(Private internal review only)</span>
            </h4>
            ${wipFiles.length > 0 ? this.renderFilesList(wipFiles, order.id) : `
              <div style="padding: 1rem; background: rgba(9, 17, 14, 0.4); border: 1px dashed var(--admin-border-subtle); border-radius: 6px; text-align: center; color: var(--admin-sage); font-size: 0.85rem;">
                No internal WIP files tracked.
              </div>
            `}
          </div>

          <!-- 3. Customer Provided Files -->
          <div>
            <h4 style="margin: 0 0 0.75rem; font-size: 0.95rem; color: var(--admin-silver);">
              📂 Customer-Provided Assets
            </h4>
            ${customerFiles.length > 0 ? this.renderFilesList(customerFiles, order.id) : `
              <div style="padding: 1rem; background: rgba(9, 17, 14, 0.4); border: 1px dashed var(--admin-border-subtle); border-radius: 6px; text-align: center; color: var(--admin-sage); font-size: 0.85rem;">
                No files submitted by client yet.
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-upload-file-modal')?.addEventListener('click', () => {
      this.openFileModal(order);
    });

    // Bind delete file buttons
    container.querySelectorAll('.btn-delete-file').forEach(btn => {
      btn.addEventListener('click', async () => {
        const fileId = btn.getAttribute('data-id');
        if (!confirm('Remove this file record?')) return;
        try {
          await adminApi.manageFile(order.id, { fileAction: 'remove', fileId });
          showToast('File record removed');
          this.renderOrderDetail(order.id, 'files');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  renderFilesList(fileArr, orderId) {
    return `
      <div style="display: flex; flex-direction: column; gap: 0.6rem;">
        ${fileArr.map(f => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(9, 17, 14, 0.5); border: 1px solid var(--admin-border-subtle); border-radius: 6px; gap: 1rem;">
            <div>
              <div style="font-weight: 600; color: var(--admin-silver); font-size: 0.9rem;">
                ${escapeHtml(f.name)}
              </div>
              <div style="font-size: 0.75rem; color: var(--admin-sage);">
                ${f.size ? (f.size / (1024 * 1024)).toFixed(2) + ' MB &bull; ' : ''}
                Uploaded ${formatDateTime(f.uploaded_at)}
                ${f.description ? ` &bull; ${escapeHtml(f.description)}` : ''}
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem;">
              <a href="${escapeHtml(f.url)}" target="_blank" class="admin-btn admin-btn-sm admin-btn-secondary">
                Download / View
              </a>
              <button class="admin-btn admin-btn-sm admin-btn-secondary btn-delete-file" data-id="${f.id}" style="color: #f87171;">
                &times;
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Subtab 5: Messages & Notes
  renderSubtabMessages(container, order) {
    const messages = order.messages || [];
    const notes = order.internal_notes || [];

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <!-- Left: Customer Conversation -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 class="admin-card-title">Customer Conversation</h3>
              <span style="font-size: 0.78rem; color: var(--admin-sage);">Direct 2-way client messages</span>
            </div>
          </div>

          <div style="padding: 1.25rem; display: flex; flex-direction: column; height: 500px;">
            <div class="chat-thread" id="chat-thread-box" style="flex: 1;">
              ${messages.length === 0 ? `
                <div style="text-align: center; color: var(--admin-sage); padding: 2rem;">No messages exchanged with client yet.</div>
              ` : messages.map(m => `
                <div class="chat-bubble ${m.sender === 'admin' ? 'admin' : 'customer'}">
                  <div>${escapeHtml(m.message)}</div>
                  <div class="chat-bubble-meta">
                    <span>${m.sender === 'admin' ? 'Asnat Khan' : escapeHtml(order.customer_name || 'Client')}</span>
                    <span>${formatDateTime(m.timestamp)}</span>
                  </div>
                </div>
              `).join('')}
            </div>

            <form id="form-send-customer-msg" style="display: flex; gap: 0.5rem; margin-top: 1rem; border-top: 1px solid var(--admin-border-subtle); padding-top: 1rem;">
              <input type="text" id="input-customer-msg" class="admin-search-input" placeholder="Type a message to ${escapeHtml(order.customer_name || 'Client')}..." required />
              <button type="submit" class="admin-btn admin-btn-primary">Send</button>
            </form>
          </div>
        </div>

        <!-- Right: Private Internal Notes -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <h3 class="admin-card-title" style="color: var(--admin-gold-highlight);">Private Internal Notes</h3>
              <span style="font-size: 0.78rem; color: var(--admin-sage);">Strictly internal &bull; Never visible to client</span>
            </div>
          </div>

          <div style="padding: 1.25rem; display: flex; flex-direction: column; height: 500px;">
            <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem;">
              ${notes.length === 0 ? `
                <div style="text-align: center; color: var(--admin-sage); padding: 2rem;">No private notes recorded.</div>
              ` : notes.map(n => `
                <div class="private-note-card">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="private-note-badge">Internal Note</span>
                    <span style="font-size: 0.72rem; color: var(--admin-sage);">${formatDateTime(n.created_at)}</span>
                  </div>
                  <div style="font-size: 0.88rem; color: var(--admin-silver); line-height: 1.5; margin-top: 0.25rem;">
                    ${escapeHtml(n.text)}
                  </div>
                </div>
              `).join('')}
            </div>

            <form id="form-add-internal-note" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; border-top: 1px solid var(--admin-border-subtle); padding-top: 1rem;">
              <textarea id="input-internal-note" class="admin-textarea" placeholder="Add confidential observation, client requirement details, or milestone checklist..." style="min-height: 70px;" required></textarea>
              <div style="display: flex; justify-content: flex-end;">
                <button type="submit" class="admin-btn admin-btn-sm admin-btn-gold">+ Add Private Note</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Send customer message handler
    document.getElementById('form-send-customer-msg')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('input-customer-msg');
      const msg = input.value.trim();
      if (!msg) return;

      input.disabled = true;
      try {
        await adminApi.sendMessage(order.id, msg);
        showToast('Message sent to client');
        this.renderOrderDetail(order.id, 'messages');
      } catch (err) {
        showToast(err.message, 'error');
        input.disabled = false;
      }
    });

    // Add internal note handler
    document.getElementById('form-add-internal-note')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('input-internal-note');
      const text = input.value.trim();
      if (!text) return;

      input.disabled = true;
      try {
        await adminApi.addInternalNote(order.id, text);
        showToast('Internal note saved');
        this.renderOrderDetail(order.id, 'messages');
      } catch (err) {
        showToast(err.message, 'error');
        input.disabled = false;
      }
    });

    // Scroll chat to bottom
    const chatBox = document.getElementById('chat-thread-box');
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
  }

  // --------------------------------------------------------------------------
  // CUSTOMERS DIRECTORY
  // --------------------------------------------------------------------------
  async renderCustomers() {
    this.stage.innerHTML = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Customer Directory</h1>
          <p class="admin-page-subtitle">Aggregated customer records, associated projects, and lifetime order history</p>
        </div>
      </div>

      <div class="admin-card">
        <div id="customers-table-container" style="padding: 2rem; text-align: center; color: var(--admin-sage);">
          Loading customer directory...
        </div>
      </div>
    `;

    const container = document.getElementById('customers-table-container');

    try {
      const data = await adminApi.getCustomers();
      const customers = data.customers || [];

      if (customers.length === 0) {
        container.innerHTML = `
          <div style="padding: 2rem;">No customers found in database.</div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="admin-table-wrap" style="margin: -2rem;">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Email</th>
                <th>Company / Brand</th>
                <th>Total Orders</th>
                <th>Lifetime Spent</th>
                <th>Recent Project</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${customers.map(c => `
                <tr>
                  <td style="font-weight: 600; color: var(--admin-silver);">${escapeHtml(c.name)}</td>
                  <td style="color: var(--admin-gold-highlight);">${escapeHtml(c.email)}</td>
                  <td>${escapeHtml(c.business || '—')}</td>
                  <td style="font-weight: 700;">${c.order_count}</td>
                  <td style="font-weight: 700; color: var(--admin-silver);">${formatCurrency(c.total_spent)}</td>
                  <td>${formatDate(c.latest_order_date)}</td>
                  <td>
                    <button class="admin-btn admin-btn-sm admin-btn-secondary btn-inspect-customer" data-email="${escapeHtml(c.email)}">
                      View Orders &rarr;
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      container.querySelectorAll('.btn-inspect-customer').forEach(btn => {
        btn.addEventListener('click', () => {
          const email = btn.getAttribute('data-email');
          this.router.navigate(`/admin/orders?search=${encodeURIComponent(email)}`);
        });
      });
    } catch (err) {
      container.innerHTML = `<div style="color: #f87171;">Failed to load customers: ${escapeHtml(err.message)}</div>`;
    }
  }

  // --------------------------------------------------------------------------
  // NOTIFICATIONS CENTER
  // --------------------------------------------------------------------------
  async renderNotifications() {
    this.stage.innerHTML = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Notifications Center</h1>
          <p class="admin-page-subtitle">Real-time alerts for paid orders, customer responses, and requirements ready for review</p>
        </div>
      </div>

      <div class="admin-card">
        <div id="notifications-list-container" style="padding: 2rem; text-align: center; color: var(--admin-sage);">
          Loading notifications...
        </div>
      </div>
    `;

    const container = document.getElementById('notifications-list-container');

    try {
      const data = await adminApi.getNotifications();
      const notifs = data.notifications || [];

      // Update badge on top bar
      const topBadge = document.getElementById('topbar-notif-count');
      if (topBadge) topBadge.textContent = data.unreadCount || 0;

      if (notifs.length === 0) {
        container.innerHTML = `
          <div style="padding: 3rem; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
            <h3 style="margin: 0; color: var(--admin-silver);">All Caught Up</h3>
            <p style="margin: 0.5rem 0 0; color: var(--admin-sage); font-size: 0.88rem;">No pending alerts or unreviewed orders.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.75rem; text-align: left;">
          ${notifs.map(n => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; background: rgba(9, 17, 14, 0.4); border: 1px solid var(--admin-border-subtle); border-radius: 8px; gap: 1rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                  <span class="status-badge status-badge-paid">${escapeHtml(n.type.replace(/_/g, ' ').toUpperCase())}</span>
                  <span style="font-weight: 700; color: var(--admin-silver); font-size: 0.95rem;">${escapeHtml(n.title)}</span>
                </div>
                <div style="font-size: 0.88rem; color: var(--admin-sage);">${escapeHtml(n.message)}</div>
                <div style="font-size: 0.75rem; color: rgba(134, 155, 146, 0.6); margin-top: 0.35rem;">${formatDateTime(n.timestamp)}</div>
              </div>

              <div>
                <a href="${escapeHtml(n.link)}" class="admin-btn admin-btn-sm admin-btn-primary">
                  Open Project &rarr;
                </a>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div style="color: #f87171;">Failed to load notifications: ${escapeHtml(err.message)}</div>`;
    }
  }

  // --------------------------------------------------------------------------
  // SETTINGS & SYSTEM INTEGRATIONS
  // --------------------------------------------------------------------------
  async renderSettings() {
    this.stage.innerHTML = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">System Settings &amp; Configuration</h1>
          <p class="admin-page-subtitle">Inspect database health, payment gateways, and administrator profile preferences</p>
        </div>
        <button id="btn-admin-signout" class="admin-btn admin-btn-secondary" style="color: #f87171; border-color: rgba(220, 38, 38, 0.3);">
          Sign Out of Workspace
        </button>
      </div>

      <div class="admin-card">
        <div class="admin-card-header">
          <h3 class="admin-card-title">Backend Integrations &amp; Infrastructure</h3>
        </div>
        <div id="settings-integrations-area" style="padding: 1.5rem; color: var(--admin-sage);">
          Verifying infrastructure connectivity...
        </div>
      </div>
    `;

    document.getElementById('btn-admin-signout')?.addEventListener('click', () => {
      adminApi.clearToken();
      showToast('Signed out of Administrator Workspace');
      this.renderLoginScreen();
    });

    const container = document.getElementById('settings-integrations-area');

    try {
      const data = await adminApi.getSettings();
      const integ = data.integrations || {};

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
          <!-- Database -->
          <div style="padding: 1.25rem; background: rgba(9, 17, 14, 0.4); border: 1px solid var(--admin-border-subtle); border-radius: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="font-weight: 700; color: var(--admin-silver);">PostgreSQL Database</span>
              <span class="status-badge status-badge-paid">Connected</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--admin-sage); margin: 0 0 0.5rem;">
              Provider: ${escapeHtml(integ.database?.provider || 'Supabase')}
            </p>
            <div style="font-size: 0.78rem; color: var(--admin-gold-highlight); font-family: monospace;">
              Total Orders in DB: ${integ.database?.order_records_count || '19+'}
            </div>
          </div>

          <!-- Payments -->
          <div style="padding: 1.25rem; background: rgba(9, 17, 14, 0.4); border: 1px solid var(--admin-border-subtle); border-radius: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="font-weight: 700; color: var(--admin-silver);">Payment Gateway</span>
              <span class="status-badge status-badge-pending">Test Mode Active</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--admin-sage); margin: 0 0 0.5rem;">
              Provider: Stripe (Sandbox &amp; Webhook ready)
            </p>
            <div style="font-size: 0.78rem; color: var(--admin-sage);">
              ${escapeHtml(integ.payments?.note || '')}
            </div>
          </div>

          <!-- Secure Storage -->
          <div style="padding: 1.25rem; background: rgba(9, 17, 14, 0.4); border: 1px solid var(--admin-border-subtle); border-radius: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="font-weight: 700; color: var(--admin-silver);">Secure File Delivery</span>
              <span class="status-badge status-badge-paid">Ready</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--admin-sage); margin: 0 0 0.5rem;">
              Deliverable tracking and client access links active.
            </p>
            <div style="font-size: 0.78rem; color: var(--admin-sage);">
              ${escapeHtml(integ.storage?.note || '')}
            </div>
          </div>

          <!-- Email Delivery -->
          <div style="padding: 1.25rem; background: rgba(9, 17, 14, 0.4); border: 1px solid var(--admin-border-subtle); border-radius: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="font-weight: 700; color: var(--admin-silver);">Client Notifications</span>
              <span class="status-badge status-badge-paid">In-App Live</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--admin-sage); margin: 0 0 0.5rem;">
              In-app status synchronization and direct messaging active.
            </p>
            <div style="font-size: 0.78rem; color: var(--admin-sage);">
              ${escapeHtml(integ.email?.note || '')}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div style="color: #f87171;">Failed to inspect settings: ${escapeHtml(err.message)}</div>`;
    }
  }

  // --------------------------------------------------------------------------
  // MODALS
  // --------------------------------------------------------------------------
  openStatusModal(order) {
    const backdrop = document.getElementById('admin-modal-backdrop');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    title.textContent = `Update Project Status — ${order.order_ref || order.id}`;

    body.innerHTML = `
      <form id="modal-status-form" style="display: flex; flex-direction: column; gap: 1rem;">
        <div class="admin-form-group">
          <label class="admin-label">Current Project Status</label>
          <div>${renderStatusBadge(order.order_status)}</div>
        </div>

        <div class="admin-form-group">
          <label class="admin-label" for="modal-new-status">New Production Stage</label>
          <select id="modal-new-status" class="admin-select" required>
            <option value="order_received" ${order.order_status === 'order_received' ? 'selected' : ''}>Order Received</option>
            <option value="awaiting_requirements" ${order.order_status === 'awaiting_requirements' ? 'selected' : ''}>Awaiting Requirements</option>
            <option value="requirements_review" ${order.order_status === 'requirements_review' ? 'selected' : ''}>Requirements Review</option>
            <option value="ready_to_start" ${order.order_status === 'ready_to_start' ? 'selected' : ''}>Ready to Start</option>
            <option value="in_progress" ${order.order_status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="awaiting_feedback" ${order.order_status === 'awaiting_feedback' ? 'selected' : ''}>Awaiting Customer Feedback</option>
            <option value="revisions" ${order.order_status === 'revisions' ? 'selected' : ''}>Revisions</option>
            <option value="final_qc" ${order.order_status === 'final_qc' ? 'selected' : ''}>Final Quality Check</option>
            <option value="ready_for_delivery" ${order.order_status === 'ready_for_delivery' ? 'selected' : ''}>Ready for Delivery</option>
            <option value="completed" ${order.order_status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="on_hold" ${order.order_status === 'on_hold' ? 'selected' : ''}>On Hold</option>
            <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>

        <div class="admin-form-group">
          <label class="admin-label" for="modal-update-msg">
            Customer-Visible Progress Message
            <span style="font-weight: normal; color: var(--admin-sage);">(Shown directly on client confirmation dashboard)</span>
          </label>
          <textarea id="modal-update-msg" class="admin-textarea" placeholder="e.g. Design wireframes have been completed. Moving to frontend coding..."></textarea>
        </div>

        <div class="admin-form-group">
          <label class="admin-label" for="modal-target-date">Estimated Completion Date (Optional)</label>
          <input type="date" id="modal-target-date" class="admin-search-input" />
        </div>
      </form>
    `;

    footer.innerHTML = `
      <button class="admin-btn admin-btn-secondary" id="btn-modal-cancel">Cancel</button>
      <button class="admin-btn admin-btn-primary" id="btn-modal-save-status">Save Changes</button>
    `;

    backdrop.classList.add('open');

    const close = () => backdrop.classList.remove('open');
    document.getElementById('btn-modal-cancel').onclick = close;
    document.getElementById('modal-close-btn').onclick = close;

    document.getElementById('btn-modal-save-status').onclick = async () => {
      const newStatus = document.getElementById('modal-new-status').value;
      const msg = document.getElementById('modal-update-msg').value;
      const targetDate = document.getElementById('modal-target-date').value;

      const saveBtn = document.getElementById('btn-modal-save-status');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Persisting to Database...';

      try {
        await adminApi.updateStatus(order.id, newStatus, msg, targetDate);
        showToast('Project status updated and broadcasted to client');
        close();
        this.renderOrderDetail(order.id);
      } catch (err) {
        showToast(err.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    };
  }

  openClarificationModal(order) {
    const backdrop = document.getElementById('admin-modal-backdrop');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    title.textContent = `Request Requirements Clarification — ${order.order_ref || order.id}`;

    body.innerHTML = `
      <div style="font-size: 0.88rem; color: var(--admin-sage); margin-bottom: 1rem;">
        This will post a highlighted alert and direct message to the customer's order tracker requesting specific input.
      </div>
      <div class="admin-form-group">
        <label class="admin-label" for="clarification-input">Questions / Clarifications Required</label>
        <textarea id="clarification-input" class="admin-textarea" placeholder="Please specify: 1. Brand logo vector file, 2. Required contact form fields, 3. Domain registrar login assistance..."></textarea>
      </div>
    `;

    footer.innerHTML = `
      <button class="admin-btn admin-btn-secondary" id="btn-modal-cancel">Cancel</button>
      <button class="admin-btn admin-btn-gold" id="btn-modal-submit-clarify">Send Request to Client</button>
    `;

    backdrop.classList.add('open');
    const close = () => backdrop.classList.remove('open');
    document.getElementById('btn-modal-cancel').onclick = close;
    document.getElementById('modal-close-btn').onclick = close;

    document.getElementById('btn-modal-submit-clarify').onclick = async () => {
      const text = document.getElementById('clarification-input').value.trim();
      if (!text) return;

      const btn = document.getElementById('btn-modal-submit-clarify');
      btn.disabled = true;
      btn.textContent = 'Sending...';

      try {
        await adminApi.updateRequirements(order.id, 'clarification_requested', 'Clarification requested from client', [], text);
        showToast('Clarification request dispatched to client');
        close();
        this.renderOrderDetail(order.id, 'requirements');
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Send Request to Client';
      }
    };
  }

  openFileModal(order) {
    const backdrop = document.getElementById('admin-modal-backdrop');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    title.textContent = `Upload / Attach Deliverable — ${order.order_ref || order.id}`;

    body.innerHTML = `
      <form id="file-modal-form" style="display: flex; flex-direction: column; gap: 1rem;">
        <div class="admin-form-group">
          <label class="admin-label" for="file-name-input">Deliverable Name / Title</label>
          <input type="text" id="file-name-input" class="admin-search-input" placeholder="e.g. Asnat_Khan_Final_Deliverable_v1.zip" required />
        </div>

        <div class="admin-form-group">
          <label class="admin-label" for="file-url-input">Secure File Download / Preview URL</label>
          <input type="url" id="file-url-input" class="admin-search-input" placeholder="https://..." required />
        </div>

        <div class="admin-form-group">
          <label class="admin-label" for="file-category-input">Classification</label>
          <select id="file-category-input" class="admin-select" required>
            <option value="deliverable">Final Website Deliverable (Client Visible)</option>
            <option value="wip">Work In Progress (Private Internal Only)</option>
            <option value="customer_provided">Customer-Provided Asset</option>
          </select>
        </div>

        <div class="admin-form-group">
          <label class="admin-label" for="file-desc-input">Description / Handover Instructions (Optional)</label>
          <textarea id="file-desc-input" class="admin-textarea" placeholder="Contains final production source code, deployment instructions, and admin dashboard credentials."></textarea>
        </div>
      </form>
    `;

    footer.innerHTML = `
      <button class="admin-btn admin-btn-secondary" id="btn-modal-cancel">Cancel</button>
      <button class="admin-btn admin-btn-primary" id="btn-modal-save-file">Attach Deliverable</button>
    `;

    backdrop.classList.add('open');
    const close = () => backdrop.classList.remove('open');
    document.getElementById('btn-modal-cancel').onclick = close;
    document.getElementById('modal-close-btn').onclick = close;

    document.getElementById('btn-modal-save-file').onclick = async () => {
      const name = document.getElementById('file-name-input').value.trim();
      const url = document.getElementById('file-url-input').value.trim();
      const cat = document.getElementById('file-category-input').value;
      const desc = document.getElementById('file-desc-input').value.trim();

      if (!name || !url) {
        showToast('Please provide both file name and download URL', 'error');
        return;
      }

      const btn = document.getElementById('btn-modal-save-file');
      btn.disabled = true;
      btn.textContent = 'Saving Record...';

      try {
        await adminApi.manageFile(order.id, {
          fileAction: 'add',
          fileName: name,
          fileUrl: url,
          fileCategory: cat,
          fileDescription: desc
        });
        showToast('Deliverable attached and saved to database');
        close();
        this.renderOrderDetail(order.id, 'files');
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Attach Deliverable';
      }
    };
  }
}
