/**
 * Asnat Khan Studio — Authentication Test Suite
 */

import assert from 'node:assert';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateFullName
} from './js/auth/validation.js';

import {
  sanitizeReturnUrl
} from './js/auth/return-path.js';

import {
  isFirebaseConfigured,
  signInWithEmail,
  createAccount,
  requestPasswordReset,
  confirmPasswordReset,
  sendEmailVerification,
  checkEmailVerification,
  onAuthStateChanged,
  AuthIntegrationPendingError
} from './js/auth/auth-interface.js';

async function runTests() {
  console.log('--- 1. Validation Module Tests ---');
  
  // Email validation
  assert.strictEqual(validateEmail('test@example.com').isValid, true);
  assert.strictEqual(validateEmail('client.work+tag@studio.co.uk').isValid, true);
  assert.strictEqual(validateEmail('').isValid, false);
  assert.strictEqual(validateEmail('invalid-email').isValid, false);
  assert.strictEqual(validateEmail('@domain.com').isValid, false);
  console.log('✓ Email validation passed');

  // Password validation
  assert.strictEqual(validatePassword('123456').isValid, true);
  assert.strictEqual(validatePassword('pass').isValid, false);
  assert.strictEqual(validatePassword('').isValid, false);
  console.log('✓ Password validation passed');

  // Password Match validation
  assert.strictEqual(validatePasswordMatch('securePass123', 'securePass123').isValid, true);
  assert.strictEqual(validatePasswordMatch('securePass123', 'wrongPass').isValid, false);
  assert.strictEqual(validatePasswordMatch('securePass123', '').isValid, false);
  console.log('✓ Password match validation passed');

  // Full Name validation
  assert.strictEqual(validateFullName('Asnat Khan').isValid, true);
  assert.strictEqual(validateFullName('A').isValid, false);
  assert.strictEqual(validateFullName('   ').isValid, false);
  console.log('✓ Full name validation passed');

  console.log('\n--- 2. Return Path & Security Tests ---');
  
  // Safe relative URLs
  assert.strictEqual(sanitizeReturnUrl('/checkout'), '/checkout');
  assert.strictEqual(sanitizeReturnUrl('/order'), '/order');
  assert.strictEqual(sanitizeReturnUrl('/services'), '/services');
  assert.strictEqual(sanitizeReturnUrl('/checkout?pkg=standard'), '/checkout?pkg=standard');

  // Open redirect protection
  assert.strictEqual(sanitizeReturnUrl('https://evil.com'), '/checkout');
  assert.strictEqual(sanitizeReturnUrl('http://evil.com'), '/checkout');
  assert.strictEqual(sanitizeReturnUrl('//evil.com/phish'), '/checkout');
  assert.strictEqual(sanitizeReturnUrl('/\\evil.com'), '/checkout');
  assert.strictEqual(sanitizeReturnUrl('javascript:alert(1)'), '/checkout');
  assert.strictEqual(sanitizeReturnUrl('/unapproved-random-path'), '/checkout');

  // Sensitive parameter stripping
  const stripped = sanitizeReturnUrl('/checkout?pkg=standard&token=supersecret&password=abc');
  assert.strictEqual(stripped, '/checkout?pkg=standard');
  console.log('✓ Return path sanitization & open-redirect defenses passed');

  console.log('\n--- 3. Firebase Auth Boundary & Contract Tests ---');
  
  // Pre-configuration checks
  assert.strictEqual(isFirebaseConfigured(), false);
  
  let signinErrorCaught = false;
  try {
    await signInWithEmail('test@example.com', 'password');
  } catch (err) {
    assert.ok(err instanceof AuthIntegrationPendingError);
    assert.strictEqual(err.code, 'auth/provider-pending-configuration');
    signinErrorCaught = true;
  }
  assert.ok(signinErrorCaught, 'signInWithEmail correctly raised AuthIntegrationPendingError');

  let createErrorCaught = false;
  try {
    await createAccount('Client Name', 'test@example.com', 'password');
  } catch (err) {
    assert.ok(err instanceof AuthIntegrationPendingError);
    createErrorCaught = true;
  }
  assert.ok(createErrorCaught, 'createAccount correctly raised AuthIntegrationPendingError');

  let resetErrorCaught = false;
  try {
    await requestPasswordReset('test@example.com');
  } catch (err) {
    assert.ok(err instanceof AuthIntegrationPendingError);
    resetErrorCaught = true;
  }
  assert.ok(resetErrorCaught, 'requestPasswordReset correctly raised AuthIntegrationPendingError');

  let confirmErrorCaught = false;
  try {
    await confirmPasswordReset('code123', 'newpassword');
  } catch (err) {
    assert.ok(err instanceof AuthIntegrationPendingError);
    confirmErrorCaught = true;
  }
  assert.ok(confirmErrorCaught, 'confirmPasswordReset correctly raised AuthIntegrationPendingError');

  let sendEmailErrorCaught = false;
  try {
    await sendEmailVerification();
  } catch (err) {
    assert.ok(err instanceof AuthIntegrationPendingError);
    sendEmailErrorCaught = true;
  }
  assert.ok(sendEmailErrorCaught, 'sendEmailVerification correctly raised AuthIntegrationPendingError');

  const isVerified = await checkEmailVerification();
  assert.strictEqual(isVerified, false);

  await new Promise((resolve) => {
    onAuthStateChanged((user) => {
      assert.strictEqual(user, null, 'Unauthenticated state verified');
      resolve();
    });
  });

  console.log('✓ Auth interface contract & non-fake boundary passed');

  console.log('\n--- 4. HTTP Routes & Integration Verification ---');
  const baseUrl = 'http://localhost:8090';

  const routes = [
    { url: '/login', expectedText: 'Good to Have You Back.' },
    { url: '/register', expectedText: 'Your Projects. One Place.' },
    { url: '/forgot-password', expectedText: 'Forgot Your Password?' },
    { url: '/reset-password', expectedText: 'Choose a New Password.' },
    { url: '/verify-email', expectedText: 'Verify Your Email.' },
    { url: '/checkout', expectedText: 'Customer &amp; Billing Contact' },
    { url: '/order', expectedText: 'Selected Website Package' },
    { url: '/services', expectedText: 'Services &amp; Pricing' },
    { url: '/', expectedText: 'Asnat Khan' },
    { url: '/js/auth/auth-interface.js', expectedText: 'AuthIntegrationPendingError' },
    { url: '/js/auth/validation.js', expectedText: 'validateEmail' },
    { url: '/js/auth/return-path.js', expectedText: 'sanitizeReturnUrl' },
    { url: '/js/auth/auth-ui.js', expectedText: 'initLoginPage' }
  ];

  for (const r of routes) {
    const res = await fetch(`${baseUrl}${r.url}`);
    assert.strictEqual(res.status, 200, `Expected 200 for ${r.url}, got ${res.status}`);
    const text = await res.text();
    assert.ok(text.includes(r.expectedText), `Expected ${r.url} to contain "${r.expectedText}"`);
    console.log(`✓ HTTP 200 verified for ${r.url}`);
  }

  console.log('\n=========================================');
  console.log('ALL AUTHENTICATION CHECKS PASSED (100%)');
  console.log('=========================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
