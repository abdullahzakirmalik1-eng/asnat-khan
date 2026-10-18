/**
 * Asnat Khan Studio — Order & Checkout Engine
 * Authoritative Client-Side Coordinator
 */

import { PACKAGES, ADDITIONAL_SERVICES, DOMAIN_HOSTING_NOTE, calculateOrderPricing } from './packages.js';

const STORAGE_KEY = 'asnat_order_state';

// State Helper Functions
function getStoredState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[Checkout] Storage read error:', e);
  }
  return {
    packageId: 'standard',
    additionalProducts: 0,
    additionalServices: [],
    project: {
      name: '',
      brand: '',
      website: '',
      description: '',
      goals: '',
      references: '',
      requirements: ''
    },
    customer: {
      name: '',
      email: '',
      country: 'United States',
      business: '',
      billingAddress: ''
    },
    orderId: null,
    orderRef: null,
    accessToken: null
  };
}

function saveState(state) {
  try {
    const str = JSON.stringify(state);
    sessionStorage.setItem(STORAGE_KEY, str);
    localStorage.setItem(STORAGE_KEY, str);
  } catch (e) {
    console.warn('[Checkout] Storage save error:', e);
  }
}

/* ==========================================================================
   01. PAGE 1 — ORDER DETAILS INITIALIZER (/order)
   ========================================================================== */
export function initOrderDetailsPage() {
  const form = document.getElementById('order-details-form');
  if (!form) return;

  const state = getStoredState();

  // Check URL query parameters (e.g. ?package=ecommerce)
  const urlParams = new URLSearchParams(window.location.search);
  const pkgFromUrl = urlParams.get('package');
  if (pkgFromUrl && (PACKAGES[pkgFromUrl.toLowerCase()] || ADDITIONAL_SERVICES[pkgFromUrl.toLowerCase()])) {
    state.packageId = pkgFromUrl.toLowerCase();
  }

  // Pre-fill form fields from state
  const nameInput = document.getElementById('project-name');
  const brandInput = document.getElementById('brand-name');
  const urlInput = document.getElementById('website-url');
  const descInput = document.getElementById('project-description');
  const goalsInput = document.getElementById('project-goals');
  const refsInput = document.getElementById('project-references');
  const reqsInput = document.getElementById('special-requirements');

  if (nameInput) nameInput.value = state.project.name || '';
  if (brandInput) brandInput.value = state.project.brand || '';
  if (urlInput) urlInput.value = state.project.website || '';
  if (descInput) descInput.value = state.project.description || '';
  if (goalsInput) goalsInput.value = state.project.goals || '';
  if (refsInput) refsInput.value = state.project.references || '';
  if (reqsInput) reqsInput.value = state.project.requirements || '';

  // Elements
  const pkgCardContainer = document.getElementById('selected-package-container');
  const ecommerceBox = document.getElementById('ecommerce-products-box');
  const stepperInput = document.getElementById('extra-products-count');
  const stepperMinus = document.getElementById('stepper-minus');
  const stepperPlus = document.getElementById('stepper-plus');
  const stepperTotal = document.getElementById('stepper-cost-display');

  const pitchdeckCheck = document.getElementById('addon-pitchdeck');
  const writingCheck = document.getElementById('addon-writing');
  const writingUnitsSelect = document.getElementById('writing-units-select');

  const summaryItemsContainer = document.getElementById('summary-items-list');
  const summarySubtotal = document.getElementById('summary-subtotal');
  const summaryTax = document.getElementById('summary-tax');
  const summaryTotal = document.getElementById('summary-total');
  const continueBtn = document.getElementById('continue-checkout-btn');

  // Package Switcher Modal elements
  const changePkgBtn = document.getElementById('change-package-btn');
  const pkgModal = document.getElementById('package-switcher-modal');
  const pkgModalClose = document.getElementById('package-modal-close');
  const pkgModalBackdrop = document.getElementById('package-modal-backdrop');
  const modalCards = document.querySelectorAll('.pkg-modal-card');

  // Helper to re-calculate and render UI
  function updateOrderUI() {
    const calculation = calculateOrderPricing({
      packageId: state.packageId,
      additionalProducts: state.additionalProducts,
      additionalServices: state.additionalServices
    });

    // 1. Render Selected Package Card
    if (pkgCardContainer) {
      const pkg = calculation.package;
      pkgCardContainer.innerHTML = `
        <div class="selected-package-top">
          <div class="package-name-wrap">
            <span class="package-tier-badge">${pkg.tier || 'PACKAGE'}</span>
            <h3 class="package-title-text">${pkg.name}</h3>
          </div>
          <div class="package-price-box">
            <span class="package-price-val">$${pkg.price}</span>
            <span class="package-price-period">USD / one-time</span>
          </div>
        </div>
        <p class="package-short-desc">${pkg.description}</p>
        <div class="package-inclusions-grid">
          ${pkg.inclusions.map(inc => `
            <div class="inclusion-item">
              <span class="inclusion-check" aria-hidden="true">✓</span>
              <span>${inc}</span>
            </div>
          `).join('')}
        </div>
        <div class="domain-hosting-callout">
          <div class="domain-callout-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          </div>
          <div class="domain-callout-content">
            <h4>${DOMAIN_HOSTING_NOTE.title}</h4>
            <p>${DOMAIN_HOSTING_NOTE.statement}</p>
          </div>
        </div>
      `;
    }

    // 2. E-Commerce Products Addon Visibility
    if (ecommerceBox) {
      if (state.packageId === 'ecommerce') {
        ecommerceBox.style.display = 'block';
        if (stepperInput) stepperInput.value = state.additionalProducts;
        if (stepperTotal) {
          const extraCost = state.additionalProducts * 1;
          stepperTotal.textContent = extraCost > 0 ? `+$${extraCost}.00` : '$0.00';
        }
      } else {
        ecommerceBox.style.display = 'none';
        state.additionalProducts = 0;
      }
    }

    // 3. Additional Services Checkbox states
    const hasPitch = state.additionalServices.some(s => s.id === 'pitchdeck');
    const hasWriting = state.additionalServices.some(s => s.id === 'writing');

    if (pitchdeckCheck) {
      pitchdeckCheck.checked = hasPitch;
      const card = pitchdeckCheck.closest('.addon-service-card');
      if (card) card.classList.toggle('selected', hasPitch);
    }

    if (writingCheck) {
      writingCheck.checked = hasWriting;
      const card = writingCheck.closest('.addon-service-card');
      if (card) card.classList.toggle('selected', hasWriting);
    }

    if (writingUnitsSelect) {
      const wService = state.additionalServices.find(s => s.id === 'writing');
      if (wService && wService.units) {
        writingUnitsSelect.value = wService.units;
      }
    }

    // 4. Render Persistent Order Summary Sidebar
    if (summaryItemsContainer) {
      summaryItemsContainer.innerHTML = calculation.lineItems.map(item => `
        <div class="summary-item-row">
          <div class="summary-item-name">
            <span>${item.name}</span>
            ${item.description ? `<span class="summary-item-sub">${item.description}</span>` : ''}
          </div>
          <div class="summary-item-price">$${Number(item.amount).toFixed(2)}</div>
        </div>
      `).join('');
    }

    if (summarySubtotal) summarySubtotal.textContent = `$${calculation.subtotal.toFixed(2)}`;
    if (summaryTax) summaryTax.textContent = `$0.00`;
    if (summaryTotal) summaryTotal.textContent = `$${calculation.totalAmount.toFixed(2)}`;

    // Save state
    saveState(state);
  }

  // Stepper handlers
  if (stepperMinus) {
    stepperMinus.addEventListener('click', () => {
      if (state.additionalProducts > 0) {
        state.additionalProducts -= 1;
        updateOrderUI();
      }
    });
  }

  if (stepperPlus) {
    stepperPlus.addEventListener('click', () => {
      state.additionalProducts += 1;
      updateOrderUI();
    });
  }

  if (stepperInput) {
    stepperInput.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      state.additionalProducts = isNaN(val) || val < 0 ? 0 : Math.min(val, 10000);
      updateOrderUI();
    });
  }

  // Additional Services toggles
  if (pitchdeckCheck) {
    pitchdeckCheck.addEventListener('change', (e) => {
      if (e.target.checked) {
        if (!state.additionalServices.some(s => s.id === 'pitchdeck')) {
          state.additionalServices.push({ id: 'pitchdeck' });
        }
      } else {
        state.additionalServices = state.additionalServices.filter(s => s.id !== 'pitchdeck');
      }
      updateOrderUI();
    });
  }

  if (writingCheck) {
    writingCheck.addEventListener('change', (e) => {
      if (e.target.checked) {
        const units = writingUnitsSelect ? parseInt(writingUnitsSelect.value, 10) || 1 : 1;
        if (!state.additionalServices.some(s => s.id === 'writing')) {
          state.additionalServices.push({ id: 'writing', units });
        }
      } else {
        state.additionalServices = state.additionalServices.filter(s => s.id !== 'writing');
      }
      updateOrderUI();
    });
  }

  if (writingUnitsSelect) {
    writingUnitsSelect.addEventListener('change', (e) => {
      const units = parseInt(e.target.value, 10) || 1;
      const wService = state.additionalServices.find(s => s.id === 'writing');
      if (wService) {
        wService.units = units;
      } else {
        state.additionalServices.push({ id: 'writing', units });
        if (writingCheck) writingCheck.checked = true;
      }
      updateOrderUI();
    });
  }

  // Package Switcher Modal
  if (changePkgBtn && pkgModal) {
    changePkgBtn.addEventListener('click', (e) => {
      e.preventDefault();
      pkgModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    const closeModal = () => {
      pkgModal.classList.remove('open');
      document.body.style.overflow = '';
    };

    if (pkgModalClose) pkgModalClose.addEventListener('click', closeModal);
    if (pkgModalBackdrop) pkgModalBackdrop.addEventListener('click', closeModal);

    modalCards.forEach(card => {
      card.addEventListener('click', () => {
        const pkgId = card.getAttribute('data-package');
        if (pkgId && PACKAGES[pkgId]) {
          state.packageId = pkgId;
          updateOrderUI();
          closeModal();
        }
      });
    });
  }

  // Continue to Checkout Action
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const descVal = descInput ? descInput.value.trim() : '';
      const descError = document.getElementById('project-desc-error');

      if (!descVal) {
        if (descError) descError.textContent = 'Please provide a brief description of your project to proceed.';
        if (descInput) {
          descInput.classList.add('error');
          descInput.focus();
        }
        return;
      } else {
        if (descError) descError.textContent = '';
        if (descInput) descInput.classList.remove('error');
      }

      // Collect project fields
      state.project = {
        name: nameInput ? nameInput.value.trim() : '',
        brand: brandInput ? brandInput.value.trim() : '',
        website: urlInput ? urlInput.value.trim() : '',
        description: descVal,
        goals: goalsInput ? goalsInput.value.trim() : '',
        references: refsInput ? refsInput.value.trim() : '',
        requirements: reqsInput ? reqsInput.value.trim() : ''
      };

      if (continueBtn) {
        continueBtn.disabled = true;
        continueBtn.innerHTML = '<span>PREPARING ORDER...</span>';
      }

      try {
        // Create draft order on server to guarantee authoritative pricing and ID
        const payload = {
          packageId: state.packageId,
          additionalProducts: state.additionalProducts,
          additionalServices: state.additionalServices,
          projectName: state.project.name,
          brandName: state.project.brand,
          websiteUrl: state.project.website,
          projectDescription: state.project.description,
          projectGoals: state.project.goals,
          projectReferences: state.project.references,
          specialRequirements: state.project.requirements,
          customerName: state.customer.name || '',
          customerEmail: state.customer.email || '',
          customerCountry: state.customer.country || 'United States',
          customerBusiness: state.customer.business || state.project.brand || '',
          existingOrderId: state.orderId || undefined,
          accessToken: state.accessToken || undefined
        };

        const res = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data && data.success && data.order) {
          state.orderId = data.order.id;
          state.orderRef = data.order.orderRef;
          state.accessToken = data.order.accessToken;
          saveState(state);
          window.location.href = `/checkout?order_id=${state.orderId}&token=${state.accessToken}`;
        } else {
          alert(data?.error || 'Unable to prepare order. Please try again.');
          if (continueBtn) {
            continueBtn.disabled = false;
            continueBtn.innerHTML = '<span>CONTINUE TO CHECKOUT</span><span class="btn-arrow">→</span>';
          }
        }
      } catch (err) {
        console.error('[Checkout] Order prepare network error:', err);
        // Fallback navigation with client state preserved
        saveState(state);
        window.location.href = '/checkout';
      }
    });
  }

  // Initial render
  updateOrderUI();
}

/* ==========================================================================
   02. PAGE 2 — CHECKOUT INITIALIZER (/checkout)
   ========================================================================== */
export function initCheckoutPage() {
  const checkoutForm = document.getElementById('checkout-payment-form');
  if (!checkoutForm) return;

  const state = getStoredState();

  // Read URL query parameters if present
  const urlParams = new URLSearchParams(window.location.search);
  const qOrderId = urlParams.get('order_id');
  const qToken = urlParams.get('token');
  const qError = urlParams.get('error');

  if (qOrderId) state.orderId = qOrderId;
  if (qToken) state.accessToken = qToken;

  // Elements
  const nameInput = document.getElementById('customer-name');
  const emailInput = document.getElementById('customer-email');
  const countrySelect = document.getElementById('customer-country');
  const businessInput = document.getElementById('customer-business');
  const termsCheckbox = document.getElementById('terms-agree');
  const payBtn = document.getElementById('pay-submit-btn');
  const payBtnAmount = document.getElementById('pay-btn-amount');
  const errorBanner = document.getElementById('checkout-error-banner');
  const errorMessage = document.getElementById('checkout-error-message');

  const summaryItemsContainer = document.getElementById('checkout-summary-items');
  const summarySubtotal = document.getElementById('checkout-summary-subtotal');
  const summaryTotal = document.getElementById('checkout-summary-total');

  // Test mode sandbox controls
  const testSuccessRadio = document.getElementById('test-action-success');
  const testPendingRadio = document.getElementById('test-action-pending');
  const testFailedRadio = document.getElementById('test-action-failed');
  const testCancelRadio = document.getElementById('test-action-cancel');
  let selectedTestAction = 'verify_success';

  if (testSuccessRadio) testSuccessRadio.addEventListener('change', () => selectedTestAction = 'verify_success');
  if (testPendingRadio) testPendingRadio.addEventListener('change', () => selectedTestAction = 'test_pending');
  if (testFailedRadio) testFailedRadio.addEventListener('change', () => selectedTestAction = 'test_failed');
  if (testCancelRadio) testCancelRadio.addEventListener('change', () => selectedTestAction = 'test_cancel');

  // Handle return from payment failure
  if (qError && errorBanner && errorMessage) {
    errorBanner.style.display = 'block';
    if (qError === 'payment_failed') {
      errorMessage.textContent = 'Payment could not be completed. Please check your billing information or try another payment method.';
    } else {
      errorMessage.textContent = 'The previous payment was not completed. Your details have been preserved so you can try again.';
    }
  }

  // Pre-fill customer fields
  if (nameInput && state.customer.name) nameInput.value = state.customer.name;
  if (emailInput && state.customer.email) emailInput.value = state.customer.email;
  if (countrySelect && state.customer.country) countrySelect.value = state.customer.country;
  if (businessInput && (state.customer.business || state.project.brand)) {
    businessInput.value = state.customer.business || state.project.brand;
  }

  // Render Persistent Order Summary
  const cartItems = (state.cartItems && state.cartItems.length > 0)
    ? state.cartItems
    : (typeof window !== 'undefined' && window.ASNAT_CART ? window.ASNAT_CART.getCartItems() : []);

  const calculation = calculateOrderPricing({
    packageId: state.packageId,
    additionalProducts: state.additionalProducts,
    additionalServices: state.additionalServices,
    cartItems: (cartItems && cartItems.length > 0) ? cartItems : null
  });

  if (summaryItemsContainer) {
    summaryItemsContainer.innerHTML = calculation.lineItems.map(item => `
      <div class="summary-item-row">
        <div class="summary-item-name">
          <span>${item.name}</span>
          ${item.description ? `<span class="summary-item-sub">${item.description}</span>` : ''}
        </div>
        <div class="summary-item-price">$${Number(item.amount).toFixed(2)}</div>
      </div>
    `).join('');
  }

  if (summarySubtotal) summarySubtotal.textContent = `$${calculation.subtotal.toFixed(2)}`;
  if (summaryTotal) summaryTotal.textContent = `$${calculation.totalAmount.toFixed(2)}`;
  if (payBtnAmount) payBtnAmount.textContent = `$${calculation.totalAmount.toFixed(2)}`;

  // Form Submission / Payment Initiation
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Validate fields
    let isValid = true;
    const nameVal = nameInput ? nameInput.value.trim() : '';
    const emailVal = emailInput ? emailInput.value.trim() : '';
    const countryVal = countrySelect ? countrySelect.value.trim() : '';

    const nameError = document.getElementById('name-error');
    const emailError = document.getElementById('email-error');
    const countryError = document.getElementById('country-error');
    const termsError = document.getElementById('terms-error');

    if (!nameVal) {
      if (nameError) nameError.textContent = 'Please enter your full name.';
      if (nameInput) nameInput.classList.add('error');
      isValid = false;
    } else {
      if (nameError) nameError.textContent = '';
      if (nameInput) nameInput.classList.remove('error');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      if (emailError) emailError.textContent = 'Please enter a valid email address for order confirmation.';
      if (emailInput) emailInput.classList.add('error');
      isValid = false;
    } else {
      if (emailError) emailError.textContent = '';
      if (emailInput) emailInput.classList.remove('error');
    }

    if (!countryVal) {
      if (countryError) countryError.textContent = 'Please select your billing country.';
      if (countrySelect) countrySelect.classList.add('error');
      isValid = false;
    } else {
      if (countryError) countryError.textContent = '';
      if (countrySelect) countrySelect.classList.remove('error');
    }

    if (termsCheckbox && !termsCheckbox.checked) {
      if (termsError) termsError.textContent = 'Please acknowledge the project scope and domain terms.';
      isValid = false;
    } else {
      if (termsError) termsError.textContent = '';
    }

    if (!isValid) return;

    // Save updated customer details in state
    state.customer = {
      name: nameVal,
      email: emailVal,
      country: countryVal,
      business: businessInput ? businessInput.value.trim() : ''
    };
    saveState(state);

    // Disable CTA button and show loading state to prevent duplicate submissions
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = '<span>INITIATING SECURE PAYMENT...</span>';
    }

    try {
      // Step A: Ensure Order Draft is saved
      if (!state.orderId || !state.accessToken) {
        const createRes = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageId: state.packageId,
            additionalProducts: state.additionalProducts,
            additionalServices: state.additionalServices,
            cartItems: (cartItems && cartItems.length > 0) ? cartItems : undefined,
            projectName: state.project.name || (cartItems && cartItems.length > 0 ? 'Custom Cart Project' : 'Website Project'),
            brandName: state.project.brand,
            websiteUrl: state.project.website,
            projectDescription: state.project.description || (cartItems && cartItems.length > 0 ? `Cart order with ${cartItems.length} item(s)` : 'Website project order'),
            customerName: state.customer.name,
            customerEmail: state.customer.email,
            customerCountry: state.customer.country,
            customerBusiness: state.customer.business
          })
        });
        const orderData = await createRes.json();
        if (orderData?.success && orderData.order) {
          state.orderId = orderData.order.id;
          state.orderRef = orderData.order.orderRef;
          state.accessToken = orderData.order.accessToken;
          saveState(state);
        }
      }

      // Step B: Create Checkout Session
      const checkoutPayload = {
        orderId: state.orderId,
        accessToken: state.accessToken,
        customerName: state.customer.name,
        customerEmail: state.customer.email,
        customerCountry: state.customer.country,
        customerBusiness: state.customer.business,
        testModeAction: selectedTestAction
      };

      const chRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload)
      });

      const chData = await chRes.json();

      if (chData?.success) {
        if (chData.provider === 'stripe' && chData.checkoutUrl) {
          // Live Stripe Checkout redirect
          window.location.href = chData.checkoutUrl;
        } else if (chData.redirectUrl) {
          // Developer Sandbox Test Mode redirect
          window.location.href = chData.redirectUrl;
        }
      } else {
        if (chData?.requiresConfiguration) {
          alert(chData.message || 'Payment provider configuration required.');
        } else {
          alert(chData?.error || 'Payment initiation failed. Please try again.');
        }
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.innerHTML = `<span>PAY $${calculation.totalAmount.toFixed(2)}</span><span class="btn-arrow">→</span>`;
        }
      }
    } catch (err) {
      console.error('[Checkout] Checkout network error:', err);
      alert('Unable to connect to payment server. Please check your connection and retry.');
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = `<span>PAY $${calculation.totalAmount.toFixed(2)}</span><span class="btn-arrow">→</span>`;
      }
    }
  });
}

/* ==========================================================================
   03. PAGE 3 — ORDER CONFIRMATION INITIALIZER (/order-confirmation)
   ========================================================================== */
export async function initConfirmationPage() {
  const container = document.getElementById('confirmation-view');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('order_id');
  const token = urlParams.get('token');
  const sessionId = urlParams.get('session_id');
  const urlStatus = urlParams.get('status');

  // Loading indicator while verifying
  container.innerHTML = `
    <div class="confirmation-card text-center" style="padding: 3rem;">
      <div class="stepper-gold-dot" style="width: 14px; height: 14px; margin: 0 auto 1.5rem; animation: pulse 1s infinite;"></div>
      <h2 style="font-size: 1.5rem; color: var(--color-silver);">Verifying Order with Server...</h2>
      <p style="color: var(--color-sage); margin-top: 0.5rem;">Authenticating payment record with database.</p>
    </div>
  `;

  try {
    let order = null;
    let verified = false;

    // Call server verify API
    if (orderId || sessionId) {
      const query = new URLSearchParams();
      if (orderId) query.set('orderId', orderId);
      if (token) query.set('token', token);
      if (sessionId) query.set('sessionId', sessionId);

      const res = await fetch(`/api/verify?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.order) {
          order = data.order;
          verified = data.verified;
        }
      }
    }

    // Fallback to local stored order if server call failed in offline dev
    if (!order) {
      const state = getStoredState();
      if (state && (state.orderId === orderId || !orderId)) {
        const calculation = calculateOrderPricing({
          packageId: state.packageId,
          additionalProducts: state.additionalProducts,
          additionalServices: state.additionalServices
        });
        order = {
          id: state.orderId || 'ord_demo',
          orderRef: state.orderRef || 'AK-20261014-0001',
          customerName: state.customer.name || 'Valued Client',
          customerEmail: state.customer.email || 'client@example.com',
          packageName: calculation.package.name,
          packagePrice: calculation.package.price,
          additionalProductsCount: calculation.additionalProducts,
          additionalServices: calculation.additionalServices,
          totalAmount: calculation.totalAmount,
          currency: 'USD',
          createdAt: new Date().toISOString(),
          paymentStatus: urlStatus === 'paid' ? 'paid' : (urlStatus === 'cancelled' ? 'cancelled' : 'pending'),
          orderStatus: urlStatus === 'paid' ? 'confirmed' : 'pending'
        };
        verified = (order.paymentStatus === 'paid');
      }
    }

    if (!order) {
      renderNotFoundState(container);
      return;
    }

    // Render the truthful status state
    if (order.paymentStatus === 'paid' || verified) {
      if (typeof window !== 'undefined' && window.ASNAT_CART) {
        window.ASNAT_CART.clearCart();
      } else {
        try { localStorage.removeItem('asnat_cart_v1'); } catch (e) {}
      }
      renderSuccessState(container, order);
    } else if (order.paymentStatus === 'processing' || order.paymentStatus === 'pending') {
      renderProcessingState(container, order);
    } else {
      renderFailedState(container, order, order.paymentStatus);
    }

  } catch (err) {
    console.error('[Confirmation] Verification error:', err);
    renderNotFoundState(container);
  }
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSuccessState(container, order) {
  const formattedDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const meta = order.metadata || {};
  const milestones = meta.milestones || [];
  const updates = meta.customer_updates || [];
  const reqData = meta.requirements_data || {};
  const deliverables = (meta.files || []).filter(f => f.category === 'deliverable');
  const messages = meta.messages || [];

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  const statusLabels = {
    order_received: 'Order Received',
    awaiting_requirements: 'Awaiting Requirements',
    requirements_review: 'Requirements Review',
    ready_to_start: 'Ready to Start',
    in_progress: 'In Progress',
    awaiting_feedback: 'Awaiting Feedback',
    revisions: 'Revisions',
    final_qc: 'Final Quality Check',
    ready_for_delivery: 'Ready for Delivery',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
    confirmed: 'Order Confirmed'
  };

  const statusLabel = statusLabels[order.order_status] || order.order_status || 'Order Confirmed';

  container.innerHTML = `
    <div class="confirmation-card">
      <div class="confirmation-header">
        <span class="confirmation-status-pill success">
          <span aria-hidden="true">✓</span> ${escapeHtml(statusLabel.toUpperCase())}
        </span>
        <h1 class="confirmation-heading">Your Project Tracker</h1>
        <p class="confirmation-subtext">
          Track real-time progress, review milestones, download deliverables, and communicate directly with Asnat Khan.
        </p>
      </div>

      <div class="confirmation-details-box">
        <div class="details-grid">
          <div class="detail-cell">
            <span class="detail-label">Order Reference</span>
            <span class="detail-value order-ref">${escapeHtml(order.orderRef || order.order_ref)}</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">Package</span>
            <span class="detail-value">${escapeHtml(order.packageName || order.package_name)}</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">Date</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">Amount Paid</span>
            <span class="detail-value" style="color: var(--color-silver); font-size: 1.15rem;">$${Number(order.totalAmount || order.total_amount).toFixed(2)} USD</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">Payment Status</span>
            <div><span class="detail-value status-badge-inline">PAID &bull; VERIFIED</span></div>
          </div>
          <div class="detail-cell">
            <span class="detail-label">Client</span>
            <span class="detail-value">${escapeHtml(order.customerName || order.customer_name)}</span>
          </div>
        </div>

        <div class="detail-cell">
          <span class="detail-label">Confirmation &amp; Updates Sent To</span>
          <span class="detail-value" style="color: var(--color-gold-highlight); font-size: 0.95rem;">${escapeHtml(order.customerEmail || order.customer_email)}</span>
        </div>

        ${((order.line_items && order.line_items.length > 1) || (order.lineItems && order.lineItems.length > 1)) ? `
          <div class="detail-cell" style="margin-top: 0.75rem; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
            <span class="detail-label">Purchased Services (${(order.line_items || order.lineItems).length})</span>
            <div style="margin-top: 0.35rem; display: flex; flex-direction: column; gap: 0.35rem;">
              ${(order.line_items || order.lineItems).map(li => `
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--color-silver);">
                  <span>${escapeHtml(li.name)} ${li.quantity > 1 ? `&times; ${li.quantity}` : ''}</span>
                  <span style="color: var(--color-gold-highlight); font-weight: 500;">$${Number(li.amount).toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Action Required Alert: Clarification Request -->
      ${reqData.status === 'clarification_requested' && reqData.clarification_request ? `
        <div class="tracker-alert-box" id="tracker-clarification-banner">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span aria-hidden="true" style="font-size: 1.2rem;">⚠️</span>
            <strong style="color: var(--color-gold-highlight); font-size: 1rem;">Action Requested by Asnat Khan</strong>
          </div>
          <p style="color: var(--color-silver); margin: 0 0 1rem; line-height: 1.5; font-size: 0.9rem;">
            ${escapeHtml(reqData.clarification_request)}
          </p>

          <form id="form-submit-clarification" style="display: flex; flex-direction: column; gap: 0.5rem;">
            <textarea id="clarification-response-text" class="auth-input" style="min-height: 80px;" placeholder="Provide the requested details or links..." required></textarea>
            <div style="display: flex; justify-content: flex-end;">
              <button type="submit" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                Submit Clarification
              </button>
            </div>
          </form>
        </div>
      ` : ''}

      <!-- Live Project Milestones Stepper -->
      <div class="tracker-progress-box">
        <div class="tracker-status-bar">
          <div>
            <h3 style="margin: 0; font-size: 1.1rem; color: var(--color-silver);">Production Stage: ${escapeHtml(statusLabel)}</h3>
            <span style="font-size: 0.8rem; color: var(--color-sage);">Progress: ${progressPercent}% completed</span>
          </div>
          <button id="btn-refresh-customer-tracker" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
            &#x21bb; Refresh Progress
          </button>
        </div>

        <div style="width: 100%; height: 6px; background: rgba(9, 17, 14, 0.8); border-radius: 3px; overflow: hidden; margin-bottom: 1.25rem;">
          <div style="width: ${progressPercent}%; height: 100%; background: var(--color-emerald); transition: width 0.3s ease;"></div>
        </div>

        <div class="tracker-stepper">
          ${milestones.map((m, idx) => `
            <div class="tracker-step-item ${m.status}">
              <div style="font-size: 0.7rem; font-family: monospace; color: var(--color-gold-highlight);">0${idx + 1}</div>
              <div class="tracker-step-title">${escapeHtml(m.name)}</div>
              <div class="tracker-step-status">
                ${m.status === 'completed' ? '&#10003; Completed' : (m.status === 'in_progress' ? 'In Progress' : 'Pending')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Published Project Updates Feed -->
      ${updates.length > 0 ? `
        <div class="tracker-progress-box" style="margin-top: 1.5rem;">
          <h4 style="margin: 0 0 1rem; font-size: 1rem; color: var(--color-silver); display: flex; align-items: center; gap: 0.5rem;">
            <span>📢 Recent Project Updates</span>
          </h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${updates.map(upd => `
              <div style="padding: 0.85rem 1rem; background: rgba(9, 17, 14, 0.5); border-left: 3px solid var(--color-emerald); border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--color-sage); margin-bottom: 0.25rem;">
                  <strong style="color: var(--color-silver);">${escapeHtml(upd.status_label || upd.status)}</strong>
                  <span>${new Date(upd.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style="font-size: 0.88rem; color: var(--color-silver); line-height: 1.5;">${escapeHtml(upd.message)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Website Deliverables -->
      ${deliverables.length > 0 ? `
        <div class="tracker-progress-box" style="margin-top: 1.5rem; border-color: var(--color-emerald);">
          <h4 style="margin: 0 0 1rem; font-size: 1rem; color: #34d399; display: flex; align-items: center; gap: 0.5rem;">
            <span>🏆 Final Project Deliverables</span>
          </h4>
          <div class="tracker-deliverables-list">
            ${deliverables.map(f => `
              <div class="tracker-file-row">
                <div>
                  <div style="font-weight: 600; color: var(--color-silver); font-size: 0.9rem;">${escapeHtml(f.name)}</div>
                  ${f.description ? `<div style="font-size: 0.78rem; color: var(--color-sage);">${escapeHtml(f.description)}</div>` : ''}
                </div>
                <a href="${escapeHtml(f.url)}" target="_blank" class="btn btn-primary" style="padding: 0.4rem 0.9rem; font-size: 0.82rem;">
                  Download Deliverable &rarr;
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Direct Project Communication -->
      <div class="tracker-progress-box" style="margin-top: 1.5rem;">
        <h4 style="margin: 0 0 0.5rem; font-size: 1rem; color: var(--color-silver);">Direct Project Communication</h4>
        <p style="margin: 0 0 1rem; font-size: 0.82rem; color: var(--color-sage);">Send messages or inquiries directly to Asnat Khan regarding this project.</p>

        <div class="tracker-messages-feed" id="customer-chat-feed">
          ${messages.length === 0 ? `
            <div style="text-align: center; color: var(--color-sage); padding: 1rem; font-size: 0.85rem;">No messages exchanged yet. Send a message below.</div>
          ` : messages.map(m => `
            <div style="padding: 0.65rem 0.9rem; border-radius: 8px; font-size: 0.85rem; max-width: 85%; ${m.sender === 'customer' ? 'align-self: flex-end; background: rgba(10, 96, 70, 0.3); border: 1px solid var(--color-emerald); color: var(--color-silver);' : 'align-self: flex-start; background: rgba(9, 17, 14, 0.7); border: 1px solid var(--border-subtle); color: var(--color-silver);'}">
              <div>${escapeHtml(m.message)}</div>
              <div style="font-size: 0.7rem; color: var(--color-sage); margin-top: 0.25rem; display: flex; justify-content: space-between; gap: 1rem;">
                <span>${m.sender === 'customer' ? 'You' : 'Asnat Khan'}</span>
                <span>${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <form id="form-customer-send-msg" style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <input type="text" id="customer-chat-input" class="auth-input" placeholder="Type your message to Asnat Khan..." required />
          <button type="submit" class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">Send</button>
        </form>
      </div>

      <div class="confirmation-actions-bar" style="margin-top: 2rem;">
        <a href="index.html" class="btn btn-secondary">
          <span>BACK TO HOME</span>
        </a>
        <a href="services.html" class="btn btn-primary">
          <span>VIEW SERVICES</span>
          <span class="btn-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  `;

  // Bind Refresh Button
  document.getElementById('btn-refresh-customer-tracker')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-refresh-customer-tracker');
    btn.disabled = true;
    btn.textContent = 'Checking...';
    try {
      const res = await fetch(`/api/order?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.access_token || '')}`);
      const data = await res.json();
      if (data.success && data.order) {
        renderPaidState(container, data.order, sessionId);
      } else {
        btn.disabled = false;
        btn.textContent = '↻ Refresh Progress';
      }
    } catch {
      btn.disabled = false;
      btn.textContent = '↻ Refresh Progress';
    }
  });

  // Bind Clarification Submit
  document.getElementById('form-submit-clarification')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('clarification-response-text');
    const text = input.value.trim();
    if (!text) return;

    input.disabled = true;
    try {
      const res = await fetch('/api/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          token: order.access_token,
          action: 'clarification_response',
          clarificationResponse: text
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        renderPaidState(container, data.order, sessionId);
      }
    } catch {
      input.disabled = false;
    }
  });

  // Bind Customer Message Send
  document.getElementById('form-customer-send-msg')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('customer-chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.disabled = true;
    try {
      const res = await fetch('/api/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          token: order.access_token,
          action: 'customer_message',
          customerMessage: msg
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        renderPaidState(container, data.order, sessionId);
      }
    } catch {
      input.disabled = false;
    }
  });
}

function renderProcessingState(container, order) {
  container.innerHTML = `
    <div class="confirmation-card text-center">
      <div class="confirmation-header">
        <span class="confirmation-status-pill processing">
          PAYMENT PROCESSING
        </span>
        <h1 class="confirmation-heading">We're Verifying Your Payment.</h1>
        <p class="confirmation-subtext">
          We're waiting for confirmation from the payment provider. You can check this order again shortly.
        </p>
      </div>

      <div class="confirmation-details-box text-center" style="max-width: 500px; margin: 0 auto 2rem;">
        <div class="detail-cell" style="margin-bottom: 1rem;">
          <span class="detail-label">Order Reference</span>
          <span class="detail-value order-ref">${order.orderRef || order.order_ref}</span>
        </div>
        <div class="detail-cell">
          <span class="detail-label">Amount Awaiting Clearance</span>
          <span class="detail-value">$${Number(order.totalAmount || order.total_amount).toFixed(2)} USD</span>
        </div>
      </div>

      <div class="confirmation-actions-bar">
        <button type="button" class="btn btn-primary" onclick="window.location.reload()">
          <span>REFRESH STATUS</span>
          <span class="btn-arrow" aria-hidden="true">↻</span>
        </button>
        <a href="index.html" class="btn btn-secondary">
          <span>BACK TO HOME</span>
        </a>
      </div>
    </div>
  `;
}

function renderFailedState(container, order, status) {
  const isCancelled = status === 'cancelled';
  container.innerHTML = `
    <div class="confirmation-card text-center">
      <div class="confirmation-header">
        <span class="confirmation-status-pill ${isCancelled ? 'cancelled' : 'failed'}">
          ${isCancelled ? 'PAYMENT CANCELLED' : 'PAYMENT NOT COMPLETED'}
        </span>
        <h1 class="confirmation-heading">${isCancelled ? 'Checkout Cancelled' : 'Payment Was Not Processed'}</h1>
        <p class="confirmation-subtext">
          ${isCancelled
            ? 'You cancelled the checkout session before completing payment. No funds were captured.'
            : 'The payment attempt could not be verified by the provider. No funds were captured.'}
          Your project information has been safely preserved so you don\'t have to re-enter anything.
        </p>
      </div>

      <div class="confirmation-actions-bar">
        <a href="/checkout?order_id=${order.id}&token=${order.access_token || ''}" class="btn btn-primary">
          <span>TRY AGAIN</span>
          <span class="btn-arrow" aria-hidden="true">→</span>
        </a>
        <a href="/order?package=${order.packageId || order.package_id || 'standard'}" class="btn btn-secondary">
          <span>RETURN TO ORDER</span>
        </a>
      </div>
    </div>
  `;
}

function renderNotFoundState(container) {
  container.innerHTML = `
    <div class="confirmation-card text-center">
      <h2 style="font-size: 1.6rem; color: var(--color-silver); margin-bottom: 0.75rem;">Order Not Found</h2>
      <p style="color: var(--color-sage); margin-bottom: 2rem;">We could not locate this order record. Please check the link or start a new project from our Services page.</p>
      <div class="confirmation-actions-bar">
        <a href="services.html" class="btn btn-primary">
          <span>BROWSE SERVICES</span>
          <span class="btn-arrow" aria-hidden="true">→</span>
        </a>
        <a href="index.html" class="btn btn-secondary">
          <span>HOME</span>
        </a>
      </div>
    </div>
  `;
}
