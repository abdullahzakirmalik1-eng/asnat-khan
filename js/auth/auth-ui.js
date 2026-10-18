/**
 * Asnat Khan Studio — Authentication UI Controller
 * 
 * Manages accessible form interactions, password visibility toggles,
 * inline validation feedback, cross-page state preservation,
 * and the clean Firebase Authentication integration boundary.
 * 
 * Strict Constraint: Never simulates fake successful authentication or sets fake tokens.
 */

import {
  signInWithEmail,
  createAccount,
  requestPasswordReset,
  confirmPasswordReset,
  sendEmailVerification,
  checkEmailVerification,
  getFriendlyAuthErrorMessage,
  AuthIntegrationPendingError
} from './auth-interface.js';

import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateFullName
} from './validation.js';

import {
  getReturnUrlFromLocation,
  buildAuthCrossLink
} from './return-path.js';

/**
 * Initializes Password Visibility Toggles across the page.
 * Provides accessible aria-pressed and aria-label updates.
 */
export function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll('[data-toggle-password]');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-toggle-password');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      btn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');

      // Update icon visual
      const eyeIcon = btn.querySelector('.icon-eye');
      const eyeOffIcon = btn.querySelector('.icon-eye-off');
      if (eyeIcon && eyeOffIcon) {
        eyeIcon.style.display = isPassword ? 'none' : 'block';
        eyeOffIcon.style.display = isPassword ? 'block' : 'none';
      }
    });
  });
}

/**
 * Preserves query parameters across all auth cross-links.
 */
export function initCrossLinks() {
  const crossLinks = document.querySelectorAll('[data-auth-crosslink]');
  crossLinks.forEach(link => {
    const rawHref = link.getAttribute('href');
    if (rawHref) {
      link.setAttribute('href', buildAuthCrossLink(rawHref));
    }
  });
}

/**
 * Sets field-level error state with accessible attributes.
 * @param {HTMLElement} inputEl
 * @param {HTMLElement} errorEl
 * @param {string} message
 */
export function setFieldError(inputEl, errorEl, message) {
  if (inputEl) {
    inputEl.classList.add('input-error');
    inputEl.setAttribute('aria-invalid', 'true');
  }
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

/**
 * Clears field-level error state.
 * @param {HTMLElement} inputEl
 * @param {HTMLElement} errorEl
 */
export function clearFieldError(inputEl, errorEl) {
  if (inputEl) {
    inputEl.classList.remove('input-error');
    inputEl.removeAttribute('aria-invalid');
  }
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
}

/**
 * Displays top-level form status banner (info, error, or notice).
 * @param {HTMLElement} alertEl
 * @param {string} message
 * @param {'error'|'info'|'warning'|'success'} type
 */
export function showStatusAlert(alertEl, message, type = 'error') {
  if (!alertEl) return;
  alertEl.className = `auth-status-alert auth-status-${type}`;
  alertEl.textContent = message;
  alertEl.style.display = 'flex';
  alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function hideStatusAlert(alertEl) {
  if (!alertEl) return;
  alertEl.style.display = 'none';
  alertEl.textContent = '';
}

/**
 * Sets button loading state.
 * @param {HTMLButtonElement} btn
 * @param {boolean} isLoading
 * @param {string} idleText
 * @param {string} loadingText
 */
export function setButtonLoading(btn, isLoading, idleText = 'SUBMIT →', loadingText = 'PROCESSING...') {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  btn.textContent = isLoading ? loadingText : idleText;
}

// ==========================================
// Page Specific Initializers
// ==========================================

/**
 * Initialize /login page
 */
export function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const emailError = document.getElementById('login-email-error');
  const passwordError = document.getElementById('login-password-error');
  const statusAlert = document.getElementById('login-status-alert');
  const submitBtn = document.getElementById('login-submit-btn');

  // Input listeners to clear errors on user typing
  emailInput?.addEventListener('input', () => clearFieldError(emailInput, emailError));
  passwordInput?.addEventListener('input', () => clearFieldError(passwordInput, passwordError));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatusAlert(statusAlert);

    let hasErrors = false;

    // Validate email
    const emailRes = validateEmail(emailInput.value);
    if (!emailRes.isValid) {
      setFieldError(emailInput, emailError, emailRes.message);
      hasErrors = true;
    }

    // Validate password presence
    if (!passwordInput.value) {
      setFieldError(passwordInput, passwordError, 'Please enter your password.');
      hasErrors = true;
    }

    if (hasErrors) return;

    setButtonLoading(submitBtn, true, 'SIGN IN →', 'CONNECTING...');

    try {
      await signInWithEmail(emailInput.value, passwordInput.value);
      showStatusAlert(statusAlert, 'Sign in successful! Redirecting to studio...', 'success');
      setButtonLoading(submitBtn, true, 'SIGN IN →', 'REDIRECTING...');
      const returnUrl = getReturnUrlFromLocation('/checkout');
      setTimeout(() => {
        window.location.href = returnUrl;
      }, 700);
    } catch (err) {
      setButtonLoading(submitBtn, false, 'SIGN IN →');
      if (err instanceof AuthIntegrationPendingError) {
        showStatusAlert(statusAlert, err.message, 'info');
      } else {
        showStatusAlert(statusAlert, getFriendlyAuthErrorMessage(err), 'error');
      }
    }
  });
}

/**
 * Initialize /register page
 */
export function initRegisterPage() {
  const form = document.getElementById('register-form');
  if (!form) return;

  const nameInput = document.getElementById('register-name');
  const emailInput = document.getElementById('register-email');
  const passwordInput = document.getElementById('register-password');
  const confirmInput = document.getElementById('register-confirm-password');

  const nameError = document.getElementById('register-name-error');
  const emailError = document.getElementById('register-email-error');
  const passwordError = document.getElementById('register-password-error');
  const confirmError = document.getElementById('register-confirm-error');

  const statusAlert = document.getElementById('register-status-alert');
  const submitBtn = document.getElementById('register-submit-btn');

  nameInput?.addEventListener('input', () => clearFieldError(nameInput, nameError));
  emailInput?.addEventListener('input', () => clearFieldError(emailInput, emailError));
  passwordInput?.addEventListener('input', () => clearFieldError(passwordInput, passwordError));
  confirmInput?.addEventListener('input', () => clearFieldError(confirmInput, confirmError));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatusAlert(statusAlert);

    let hasErrors = false;

    // Validate Full Name
    const nameRes = validateFullName(nameInput.value);
    if (!nameRes.isValid) {
      setFieldError(nameInput, nameError, nameRes.message);
      hasErrors = true;
    }

    // Validate Email
    const emailRes = validateEmail(emailInput.value);
    if (!emailRes.isValid) {
      setFieldError(emailInput, emailError, emailRes.message);
      hasErrors = true;
    }

    // Validate Password
    const passwordRes = validatePassword(passwordInput.value);
    if (!passwordRes.isValid) {
      setFieldError(passwordInput, passwordError, passwordRes.message);
      hasErrors = true;
    }

    // Validate Confirm Password Match
    const matchRes = validatePasswordMatch(passwordInput.value, confirmInput.value);
    if (!matchRes.isValid) {
      setFieldError(confirmInput, confirmError, matchRes.message);
      hasErrors = true;
    }

    if (hasErrors) return;

    setButtonLoading(submitBtn, true, 'CREATE ACCOUNT →', 'CREATING...');

    try {
      await createAccount(nameInput.value, emailInput.value, passwordInput.value);
      showStatusAlert(statusAlert, 'Account created successfully! Preparing your studio workspace...', 'success');
      setButtonLoading(submitBtn, true, 'CREATE ACCOUNT →', 'REDIRECTING...');
      const returnUrl = getReturnUrlFromLocation('/checkout');
      setTimeout(() => {
        window.location.href = returnUrl;
      }, 900);
    } catch (err) {
      setButtonLoading(submitBtn, false, 'CREATE ACCOUNT →');
      if (err instanceof AuthIntegrationPendingError) {
        showStatusAlert(statusAlert, err.message, 'info');
      } else {
        showStatusAlert(statusAlert, getFriendlyAuthErrorMessage(err), 'error');
      }
    }
  });
}

/**
 * Initialize /forgot-password page
 */
export function initForgotPasswordPage() {
  const form = document.getElementById('forgot-form');
  if (!form) return;

  const emailInput = document.getElementById('forgot-email');
  const emailError = document.getElementById('forgot-email-error');
  const statusAlert = document.getElementById('forgot-status-alert');
  const submitBtn = document.getElementById('forgot-submit-btn');

  emailInput?.addEventListener('input', () => clearFieldError(emailInput, emailError));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatusAlert(statusAlert);

    const emailRes = validateEmail(emailInput.value);
    if (!emailRes.isValid) {
      setFieldError(emailInput, emailError, emailRes.message);
      return;
    }

    setButtonLoading(submitBtn, true, 'SEND RESET LINK →', 'DISPATCHING...');

    try {
      await requestPasswordReset(emailInput.value);
      setButtonLoading(submitBtn, false, 'SEND RESET LINK →');
      showStatusAlert(
        statusAlert,
        'Password recovery link sent! Please check your email inbox (and spam folder) for instructions.',
        'success'
      );
    } catch (err) {
      setButtonLoading(submitBtn, false, 'SEND RESET LINK →');
      if (err instanceof AuthIntegrationPendingError) {
        showStatusAlert(statusAlert, err.message, 'info');
      } else {
        showStatusAlert(statusAlert, getFriendlyAuthErrorMessage(err), 'error');
      }
    }
  });
}

/**
 * Initialize /reset-password page
 */
export function initResetPasswordPage() {
  const form = document.getElementById('reset-form');
  if (!form) return;

  const passwordInput = document.getElementById('reset-new-password');
  const confirmInput = document.getElementById('reset-confirm-password');
  const passwordError = document.getElementById('reset-password-error');
  const confirmError = document.getElementById('reset-confirm-error');
  const statusAlert = document.getElementById('reset-status-alert');
  const submitBtn = document.getElementById('reset-submit-btn');
  const codeNotice = document.getElementById('reset-code-notice');

  // Check for action code (e.g., ?oobCode=... or ?code=...)
  const urlParams = new URLSearchParams(window.location.search);
  const actionCode = urlParams.get('oobCode') || urlParams.get('code');

  if (!actionCode) {
    if (codeNotice) {
      codeNotice.style.display = 'block';
      codeNotice.textContent = 'No password reset code detected in the URL. Please arrive through the link in your recovery email.';
    }
    if (submitBtn) {
      submitBtn.disabled = true;
    }
  }

  passwordInput?.addEventListener('input', () => clearFieldError(passwordInput, passwordError));
  confirmInput?.addEventListener('input', () => clearFieldError(confirmInput, confirmError));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatusAlert(statusAlert);

    let hasErrors = false;

    const passwordRes = validatePassword(passwordInput.value);
    if (!passwordRes.isValid) {
      setFieldError(passwordInput, passwordError, passwordRes.message);
      hasErrors = true;
    }

    const matchRes = validatePasswordMatch(passwordInput.value, confirmInput.value);
    if (!matchRes.isValid) {
      setFieldError(confirmInput, confirmError, matchRes.message);
      hasErrors = true;
    }

    if (hasErrors) return;

    setButtonLoading(submitBtn, true, 'UPDATE PASSWORD →', 'UPDATING...');

    try {
      await confirmPasswordReset(actionCode || 'code-pending', passwordInput.value);
      setButtonLoading(submitBtn, true, 'UPDATE PASSWORD →', 'REDIRECTING...');
      showStatusAlert(statusAlert, 'Password updated successfully! Redirecting to sign in...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
    } catch (err) {
      setButtonLoading(submitBtn, false, 'UPDATE PASSWORD →');
      if (err instanceof AuthIntegrationPendingError) {
        showStatusAlert(statusAlert, err.message, 'info');
      } else {
        showStatusAlert(statusAlert, getFriendlyAuthErrorMessage(err), 'error');
      }
    }
  });
}

/**
 * Initialize /verify-email page
 */
export function initVerifyEmailPage() {
  const resendBtn = document.getElementById('resend-verify-btn');
  const checkBtn = document.getElementById('check-verify-btn');
  const statusAlert = document.getElementById('verify-status-alert');

  resendBtn?.addEventListener('click', async () => {
    hideStatusAlert(statusAlert);
    setButtonLoading(resendBtn, true, 'RESEND VERIFICATION EMAIL', 'SENDING...');
    try {
      await sendEmailVerification();
      setButtonLoading(resendBtn, false, 'RESEND VERIFICATION EMAIL');
      showStatusAlert(statusAlert, 'Verification email sent! Check your inbox.', 'success');
    } catch (err) {
      setButtonLoading(resendBtn, false, 'RESEND VERIFICATION EMAIL');
      if (err instanceof AuthIntegrationPendingError) {
        showStatusAlert(statusAlert, err.message, 'info');
      } else {
        showStatusAlert(statusAlert, getFriendlyAuthErrorMessage(err), 'error');
      }
    }
  });

  checkBtn?.addEventListener('click', async () => {
    hideStatusAlert(statusAlert);
    setButtonLoading(checkBtn, true, "I'VE VERIFIED MY EMAIL →", 'CHECKING STATUS...');
    try {
      const isVerified = await checkEmailVerification();
      setButtonLoading(checkBtn, false, "I'VE VERIFIED MY EMAIL →");
      if (isVerified) {
        showStatusAlert(statusAlert, 'Email successfully verified! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = getReturnUrlFromLocation('/checkout');
        }, 800);
      } else {
        showStatusAlert(
          statusAlert,
          'Your email is not verified yet. Please click the confirmation link sent to your inbox and retry.',
          'warning'
        );
      }
    } catch (err) {
      setButtonLoading(checkBtn, false, "I'VE VERIFIED MY EMAIL →");
      showStatusAlert(statusAlert, getFriendlyAuthErrorMessage(err), 'error');
    }
  });
}

/**
 * Global initialization helper run on DOMContentLoaded
 */
export function initAuth() {
  initPasswordToggles();
  initCrossLinks();
  initLoginPage();
  initRegisterPage();
  initForgotPasswordPage();
  initResetPasswordPage();
  initVerifyEmailPage();
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }
}
