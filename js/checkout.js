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
  const calculation = calculateOrderPricing({
    packageId: state.packageId,
    additionalProducts: state.additionalProducts,
    additionalServices: state.additionalServices
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
            projectName: state.project.name,
            brandName: state.project.brand,
            websiteUrl: state.project.website,
            projectDescription: state.project.description || 'Website project order',
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
}

function renderSuccessState(container, order) {
  const formattedDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  container.innerHTML = `
    <div class="confirmation-card">
      <div class="confirmation-header">
        <span class="confirmation-status-pill success">
          <span aria-hidden="true">✓</span> ORDER CONFIRMED
        </span>
        <h1 class="confirmation-heading">You're One Step Closer.</h1>
        <p class="confirmation-subtext">
          Thank you for placing your order. Your purchase has been confirmed, and your project details are ready for the next step.
        </p>
      </div>

      <div class="confirmation-details-box">
        <div class="details-grid">
          <div class="detail-cell">
            <span class="detail-label">Order Reference</span>
            <span class="detail-value order-ref">${order.orderRef || order.order_ref}</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">Package</span>
            <span class="detail-value">${order.packageName || order.package_name}</span>
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
            <span class="detail-label">Customer</span>
            <span class="detail-value">${order.customerName || order.customer_name}</span>
          </div>
        </div>

        <div class="detail-cell">
          <span class="detail-label">Confirmation &amp; Updates Sent To</span>
          <span class="detail-value" style="color: var(--color-gold-highlight); font-size: 0.95rem;">${order.customerEmail || order.customer_email}</span>
        </div>
      </div>

      <div class="next-steps-section">
        <h3 class="next-steps-title">What Happens Next</h3>
        <div class="next-steps-list">
          <div class="next-step-item">
            <div class="next-step-num">01</div>
            <div class="next-step-content">
              <h5>Project Brief &amp; Scope Review</h5>
              <p>Asnat Khan will review your project description, design preferences, and selected package requirements.</p>
            </div>
          </div>
          <div class="next-step-item">
            <div class="next-step-num">02</div>
            <div class="next-step-content">
              <h5>Kickoff Coordination</h5>
              <p>You will receive an onboarding confirmation email to align on your timeline and collect any specific assets.</p>
            </div>
          </div>
          <div class="next-step-item">
            <div class="next-step-num">03</div>
            <div class="next-step-content">
              <h5>Domain &amp; Hosting Connection</h5>
              <p>We'll assist with connecting the domain name you provide to the free hosting included with your package.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="confirmation-actions-bar">
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
