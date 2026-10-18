/**
 * Asnat Khan Studio — Admin Client-side Router
 * Handles seamless page and sub-tab transitions via HTML5 History API with query fallback.
 */

export class AdminRouter {
  constructor(routes = {}) {
    this.routes = routes;
    this.currentRoute = null;
    this.currentParams = {};
    this.init();
  }

  init() {
    window.addEventListener('popstate', () => {
      this.resolveCurrentRoute();
    });

    // Intercept clicks on internal admin links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-admin-link], a[href^="/admin"]');
      if (link && !link.hasAttribute('target') && !e.ctrlKey && !e.metaKey) {
        const href = link.getAttribute('href');
        if (href && (href.startsWith('/admin') || href.startsWith('?'))) {
          e.preventDefault();
          this.navigate(href);
        }
      }
    });
  }

  parsePath(pathname = window.location.pathname, search = window.location.search) {
    // Also check query param fallback e.g. /admin?page=orders&id=...
    const urlParams = new URLSearchParams(search);
    const queryRoute = urlParams.get('route') || urlParams.get('page');

    let clean = pathname.replace(/\/+$/, '') || '/admin';
    if (!clean.startsWith('/admin')) {
      clean = '/admin';
    }

    // 1. Overview: /admin or /admin.html
    if (clean === '/admin' || clean === '/admin.html') {
      if (queryRoute) {
        return this.parseQueryRoute(queryRoute, urlParams);
      }
      return { route: 'overview', params: {} };
    }

    // 2. Orders List: /admin/orders
    if (clean === '/admin/orders') {
      return { route: 'orders', params: Object.fromEntries(urlParams.entries()) };
    }

    // 3. Order Subroutes: /admin/orders/:id(/progress|/requirements|/files|/messages)
    const orderMatch = clean.match(/^\/admin\/orders\/([^/]+)(?:\/(progress|requirements|files|messages))?$/);
    if (orderMatch) {
      return {
        route: 'order_detail',
        params: {
          orderId: decodeURIComponent(orderMatch[1]),
          subtab: orderMatch[2] || 'details',
          ...Object.fromEntries(urlParams.entries())
        }
      };
    }

    // 4. Customers: /admin/customers or /admin/customers/:id
    const customerMatch = clean.match(/^\/admin\/customers(?:\/([^/]+))?$/);
    if (customerMatch) {
      if (customerMatch[1]) {
        return {
          route: 'customer_detail',
          params: { customerId: decodeURIComponent(customerMatch[1]), ...Object.fromEntries(urlParams.entries()) }
        };
      }
      return { route: 'customers', params: Object.fromEntries(urlParams.entries()) };
    }

    // 5. Notifications: /admin/notifications
    if (clean === '/admin/notifications') {
      return { route: 'notifications', params: Object.fromEntries(urlParams.entries()) };
    }

    // 6. Settings: /admin/settings
    if (clean === '/admin/settings') {
      return { route: 'settings', params: Object.fromEntries(urlParams.entries()) };
    }

    return { route: 'overview', params: {} };
  }

  parseQueryRoute(route, urlParams) {
    if (route === 'orders') return { route: 'orders', params: Object.fromEntries(urlParams.entries()) };
    if (route === 'order' || route === 'order_detail') {
      return {
        route: 'order_detail',
        params: {
          orderId: urlParams.get('id') || urlParams.get('orderId'),
          subtab: urlParams.get('tab') || 'details'
        }
      };
    }
    if (route === 'customers') return { route: 'customers', params: Object.fromEntries(urlParams.entries()) };
    if (route === 'customer') {
      return {
        route: 'customer_detail',
        params: { customerId: urlParams.get('id') || urlParams.get('customerId') }
      };
    }
    if (route === 'notifications') return { route: 'notifications', params: {} };
    if (route === 'settings') return { route: 'settings', params: {} };
    return { route: 'overview', params: {} };
  }

  navigate(path, replace = false) {
    let target = path;
    if (target.startsWith('?')) {
      target = '/admin' + target;
    }

    if (replace) {
      window.history.replaceState({}, '', target);
    } else {
      window.history.pushState({}, '', target);
    }

    this.resolveCurrentRoute();
  }

  resolveCurrentRoute() {
    const { route, params } = this.parsePath();
    this.currentRoute = route;
    this.currentParams = params;

    this.updateBreadcrumbs(route, params);
    this.updateActiveNav(route);

    if (typeof this.routes[route] === 'function') {
      this.routes[route](params);
    } else if (typeof this.routes['overview'] === 'function') {
      this.routes['overview'](params);
    }
  }

  updateBreadcrumbs(route, params) {
    const container = document.getElementById('admin-breadcrumbs');
    if (!container) return;

    let html = `<a href="/admin">Admin</a>`;

    if (route === 'overview') {
      html += ` <span class="separator">/</span> <span class="current">Overview</span>`;
    } else if (route === 'orders') {
      html += ` <span class="separator">/</span> <span class="current">Orders</span>`;
    } else if (route === 'order_detail') {
      const orderId = params.orderId || 'Order';
      html += ` <span class="separator">/</span> <a href="/admin/orders">Orders</a>`;
      html += ` <span class="separator">/</span> <a href="/admin/orders/${encodeURIComponent(orderId)}">${orderId}</a>`;
      if (params.subtab && params.subtab !== 'details') {
        const tabTitle = params.subtab.charAt(0).toUpperCase() + params.subtab.slice(1);
        html += ` <span class="separator">/</span> <span class="current">${tabTitle}</span>`;
      }
    } else if (route === 'customers') {
      html += ` <span class="separator">/</span> <span class="current">Customers</span>`;
    } else if (route === 'customer_detail') {
      html += ` <span class="separator">/</span> <a href="/admin/customers">Customers</a>`;
      html += ` <span class="separator">/</span> <span class="current">${params.customerId || 'Profile'}</span>`;
    } else if (route === 'notifications') {
      html += ` <span class="separator">/</span> <span class="current">Notifications</span>`;
    } else if (route === 'settings') {
      html += ` <span class="separator">/</span> <span class="current">Settings</span>`;
    }

    container.innerHTML = html;
  }

  updateActiveNav(route) {
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
      const target = item.getAttribute('data-route');
      if (
        target === route ||
        (target === 'orders' && route === 'order_detail') ||
        (target === 'customers' && route === 'customer_detail')
      ) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}
