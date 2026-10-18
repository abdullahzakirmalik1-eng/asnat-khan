/**
 * Asnat Khan Studio — Unified Shopping Cart Engine
 * Single source of truth for client-side cart state, header badge synchronization,
 * and order calculation integration.
 * 
 * Strict Constraint: All prices and package definitions derive authoritatively
 * from js/packages.js. Strictly enforces brand color system.
 */

import { PACKAGES, ADDITIONAL_SERVICES, DOMAIN_HOSTING_NOTE, calculateCartPricing } from './packages.js';

export const CART_STORAGE_KEY = 'asnat_cart_v1';
export const ORDER_STATE_KEY = 'asnat_order_state';

let memoryCart = [];

/**
 * Safely reads the persisted cart items.
 * @returns {Array<Object>}
 */
export function getCartItems() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryCart = parsed;
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('[Cart] LocalStorage read error:', e);
  }
  return memoryCart;
}

/**
 * Persists cart items and notifies all subscribers across tabs and components.
 * @param {Array<Object>} items
 */
export function saveCartItems(items) {
  memoryCart = Array.isArray(items) ? items : [];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(memoryCart));
    }
  } catch (e) {
    console.warn('[Cart] LocalStorage save error:', e);
  }

  // Synchronize order state so checkout stays directly aligned
  syncToOrderState(memoryCart);

  // Dispatch custom event for real-time UI updates
  if (typeof window !== 'undefined') {
    const count = getCartCount();
    window.dispatchEvent(new CustomEvent('asnat:cart-updated', {
      detail: {
        items: memoryCart,
        count,
        pricing: getCartPricing()
      }
    }));
  }
}

/**
 * Syncs cart contents to asnat_order_state so checkout immediately reads cart contents.
 * @param {Array<Object>} items
 */
function syncToOrderState(items) {
  try {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem(ORDER_STATE_KEY) || localStorage.getItem(ORDER_STATE_KEY);
    let state = {};
    if (raw) {
      try { state = JSON.parse(raw); } catch {}
    }
    state.cartItems = items;

    // Determine primary package if present in cart
    const websiteItem = items.find(i => ['basic', 'standard', 'ecommerce'].includes((i.id || '').toLowerCase()));
    if (websiteItem) {
      state.packageId = websiteItem.id.toLowerCase();
      if (websiteItem.id.toLowerCase() === 'ecommerce') {
        state.additionalProducts = websiteItem.options?.additionalProducts || websiteItem.additionalProducts || 0;
      }
    } else if (items.length > 0) {
      state.packageId = items[0].id.toLowerCase();
    }

    // Additional services
    state.additionalServices = items
      .filter(i => ['pitchdeck', 'writing'].includes((i.id || '').toLowerCase()))
      .map(i => ({
        id: i.id.toLowerCase(),
        units: i.options?.units || i.units || 1,
        words: i.options?.words || i.words || 1000
      }));

    const str = JSON.stringify(state);
    sessionStorage.setItem(ORDER_STATE_KEY, str);
    localStorage.setItem(ORDER_STATE_KEY, str);
  } catch (e) {
    console.warn('[Cart] Sync to order state failed:', e);
  }
}

/**
 * Returns the total count of items in the cart.
 * @returns {number}
 */
export function getCartCount() {
  const items = getCartItems();
  return items.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0);
}

/**
 * Calculates authoritative cart pricing using verified package definitions.
 * @returns {Object}
 */
export function getCartPricing() {
  const items = getCartItems();
  return calculateCartPricing(items);
}

/**
 * Adds an item to the shopping cart.
 * If a website package is already in the cart and a new website package is added,
 * upgrades/replaces the website package to avoid conflicting base websites.
 * 
 * @param {Object} itemParams
 * @param {string} itemParams.id - 'basic' | 'standard' | 'ecommerce' | 'pitchdeck' | 'writing'
 * @param {number} [itemParams.quantity=1]
 * @param {Object} [itemParams.options] - e.g. { additionalProducts: 5 } or { words: 2000, units: 2 }
 * @param {boolean} [itemParams.silent=false] - If true, suppresses toast notification
 * @returns {Object} Added or updated item
 */
export function addItem({
  id,
  quantity = 1,
  options = {},
  silent = false
}) {
  const normalizedId = (id || '').toLowerCase().trim();
  const isWebsitePackage = ['basic', 'standard', 'ecommerce'].includes(normalizedId);
  const isAdditionalService = ['pitchdeck', 'writing'].includes(normalizedId);

  if (!isWebsitePackage && !isAdditionalService) {
    console.error(`[Cart] Unknown item ID: "${id}". Must match an official studio service.`);
    return null;
  }

  const items = [...getCartItems()];
  let itemDisplayName = normalizedId;
  let unitPrice = 0;

  if (PACKAGES[normalizedId]) {
    itemDisplayName = `${PACKAGES[normalizedId].name} Website`;
    unitPrice = PACKAGES[normalizedId].price;
  } else if (ADDITIONAL_SERVICES[normalizedId]) {
    itemDisplayName = ADDITIONAL_SERVICES[normalizedId].name;
    unitPrice = ADDITIONAL_SERVICES[normalizedId].price;
  }

  // Handle Website Package Replacement/Upgrade Rule
  if (isWebsitePackage) {
    const existingIndex = items.findIndex(i => ['basic', 'standard', 'ecommerce'].includes((i.id || '').toLowerCase()));
    if (existingIndex >= 0) {
      // Replace existing website package with newly chosen package
      const prev = items[existingIndex];
      items[existingIndex] = {
        id: normalizedId,
        name: itemDisplayName,
        unitPrice,
        quantity: 1,
        options: { ...prev.options, ...options },
        updatedAt: Date.now()
      };
    } else {
      items.push({
        id: normalizedId,
        name: itemDisplayName,
        unitPrice,
        quantity: 1,
        options: { ...options },
        addedAt: Date.now()
      });
    }
  } else {
    // Additional service: if already exists, update units/quantity
    const existingIndex = items.findIndex(i => (i.id || '').toLowerCase() === normalizedId);
    if (existingIndex >= 0) {
      const existing = items[existingIndex];
      if (normalizedId === 'writing') {
        const addUnits = options.units ? parseInt(options.units, 10) : 1;
        const currentUnits = existing.options?.units ? parseInt(existing.options.units, 10) : 1;
        const newUnits = currentUnits + addUnits;
        items[existingIndex] = {
          ...existing,
          options: {
            ...existing.options,
            units: newUnits,
            words: newUnits * 1000
          },
          updatedAt: Date.now()
        };
      } else {
        const addQty = Math.max(1, parseInt(quantity, 10) || 1);
        items[existingIndex] = {
          ...existing,
          quantity: (existing.quantity || 1) + addQty,
          options: { ...existing.options, ...options },
          updatedAt: Date.now()
        };
      }
    } else {
      items.push({
        id: normalizedId,
        name: itemDisplayName,
        unitPrice,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        options: { ...options },
        addedAt: Date.now()
      });
    }
  }

  saveCartItems(items);

  if (!silent) {
    showCartNotification(`Added <strong>${itemDisplayName}</strong> to your studio cart.`);
  }

  return items.find(i => (i.id || '').toLowerCase() === normalizedId);
}

/**
 * Removes an item from the cart.
 * @param {string} id
 */
export function removeItem(id) {
  const normalizedId = (id || '').toLowerCase().trim();
  const current = getCartItems();
  const filtered = current.filter(i => (i.id || '').toLowerCase() !== normalizedId);
  saveCartItems(filtered);
}

/**
 * Updates an item's quantity.
 * @param {string} id
 * @param {number} quantity
 */
export function updateQuantity(id, quantity) {
  const normalizedId = (id || '').toLowerCase().trim();
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    removeItem(normalizedId);
    return;
  }

  const items = getCartItems().map(item => {
    if ((item.id || '').toLowerCase() === normalizedId) {
      return { ...item, quantity: qty, updatedAt: Date.now() };
    }
    return item;
  });

  saveCartItems(items);
}

/**
 * Updates item options (e.g. extra products for e-commerce, or word count for writing).
 * @param {string} id
 * @param {Object} options
 */
export function updateItemOptions(id, options = {}) {
  const normalizedId = (id || '').toLowerCase().trim();
  const items = getCartItems().map(item => {
    if ((item.id || '').toLowerCase() === normalizedId) {
      return {
        ...item,
        options: { ...item.options, ...options },
        updatedAt: Date.now()
      };
    }
    return item;
  });

  saveCartItems(items);
}

/**
 * Empties all items from the shopping cart.
 */
export function clearCart() {
  saveCartItems([]);
}

/**
 * Displays a non-intrusive toast notification when cart items are updated.
 * @param {string} messageHtml
 * @param {'success'|'info'|'warning'} type
 */
export function showCartNotification(messageHtml, type = 'success') {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('cart-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cart-toast-container';
    container.className = 'cart-toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `cart-toast cart-toast-${type}`;
  toast.innerHTML = `
    <div class="cart-toast-content">
      <div class="cart-toast-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="cart-toast-msg">${messageHtml}</div>
    </div>
    <div class="cart-toast-actions">
      <a href="cart.html" class="cart-toast-link">View Cart &rarr;</a>
      <button type="button" class="cart-toast-close" aria-label="Dismiss notification">&times;</button>
    </div>
  `;

  const closeBtn = toast.querySelector('.cart-toast-close');
  const dismiss = () => {
    toast.classList.add('dismissing');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  };

  closeBtn?.addEventListener('click', dismiss);
  container.appendChild(toast);

  // Auto-dismiss after 4.5 seconds
  setTimeout(dismiss, 4500);
}

/**
 * Synchronizes header cart button badge and accessibility attributes.
 */
export function updateHeaderCartBadges() {
  if (typeof document === 'undefined') return;

  const count = getCartCount();
  const badges = document.querySelectorAll('.cart-badge, #header-cart-badge, #drawer-cart-badge');
  const cartBtns = document.querySelectorAll('.header-cart-btn, #header-cart-btn, .drawer-cart-link');

  badges.forEach(badge => {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  });

  cartBtns.forEach(btn => {
    const label = count === 0
      ? 'View shopping cart, empty'
      : `View shopping cart, ${count} item${count === 1 ? '' : 's'}`;
    btn.setAttribute('aria-label', label);
  });
}

/**
 * Initializes listeners for header cart buttons, storage events, and services page CTAs.
 */
export function initCart() {
  updateHeaderCartBadges();

  // Listen for internal cart update events
  window.addEventListener('asnat:cart-updated', () => {
    updateHeaderCartBadges();
  });

  // Listen for multi-tab storage synchronization
  window.addEventListener('storage', (e) => {
    if (e.key === CART_STORAGE_KEY) {
      updateHeaderCartBadges();
      window.dispatchEvent(new CustomEvent('asnat:cart-updated', {
        detail: {
          items: getCartItems(),
          count: getCartCount(),
          pricing: getCartPricing()
        }
      }));
    }
  });

  // Attach click handlers to any [data-add-cart] or [data-add-to-cart] buttons on the page
  const addButtons = document.querySelectorAll('[data-add-cart], [data-add-to-cart]');
  addButtons.forEach(btn => {
    // Prevent duplicate listener attachments
    if (btn.hasAttribute('data-cart-bound')) return;
    btn.setAttribute('data-cart-bound', 'true');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pkgId = btn.getAttribute('data-add-to-cart') || btn.getAttribute('data-add-cart');
      const units = btn.getAttribute('data-cart-units') ? parseInt(btn.getAttribute('data-cart-units'), 10) : 1;
      const extraProds = btn.getAttribute('data-cart-extra-products') ? parseInt(btn.getAttribute('data-cart-extra-products'), 10) : 0;

      addItem({
        id: pkgId,
        quantity: 1,
        options: {
          units: units,
          words: units * 1000,
          additionalProducts: extraProds
        }
      });
    });
  });
}

// Auto-initialize on browser load
if (typeof window !== 'undefined') {
  window.ASNAT_CART = {
    getCartItems,
    saveCartItems,
    getCartCount,
    getCartPricing,
    addItem,
    removeItem,
    updateQuantity,
    updateItemOptions,
    clearCart,
    showCartNotification,
    updateHeaderCartBadges,
    initCart
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCart);
  } else {
    initCart();
  }
}
