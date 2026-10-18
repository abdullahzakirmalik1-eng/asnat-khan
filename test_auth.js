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
  firebaseConfig,
  getFirebaseServices,
  isFirebaseConfigured,
  signInWithEmail,
  createAccount,
  requestPasswordReset,
  confirmPasswordReset,
  sendEmailVerification,
  checkEmailVerification,
  onAuthStateChanged,
  getFriendlyAuthErrorMessage,
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

  console.log('\n--- 3. Firebase Auth Live Integration & Contract Tests ---');
  
  // Real configuration checks
  assert.strictEqual(isFirebaseConfigured(), true, 'Firebase should be configured with user credentials');
  assert.strictEqual(firebaseConfig.projectId, 'asnat-khan', 'Expected project ID asnat-khan');
  assert.strictEqual(firebaseConfig.authDomain, 'asnat-khan.firebaseapp.com');
  
  // Service initialization
  const services = await getFirebaseServices();
  assert.ok(services.app, 'Firebase app initialized');
  assert.ok(services.auth, 'Firebase auth initialized');
  console.log('✓ Firebase SDK initialized with project:', services.app.options.projectId);

  // Live Firebase Authentication Call (Verifying Google Firebase Identity Server API)
  let liveAuthError = null;
  try {
    await signInWithEmail('client-test-account@studio-boundary-check.internal', 'InvalidPassword123!');
  } catch (err) {
    liveAuthError = err;
  }
  assert.ok(liveAuthError, 'signInWithEmail reported error from Google Firebase');
  assert.ok(
    liveAuthError.code && liveAuthError.code.startsWith('auth/'),
    `Expected authentic Firebase error code, received: ${liveAuthError?.code}`
  );
  console.log('✓ Real Google Firebase Identity Server responded:', liveAuthError.code);

  // Friendly error message verification
  const friendly = getFriendlyAuthErrorMessage(liveAuthError);
  assert.ok(friendly && friendly.length > 10, 'Friendly error message generated');
  console.log('✓ Friendly error message mapped:', friendly);

  // Live Firebase password reset request
  try {
    await requestPasswordReset('studio-client@asnatkhan.internal');
    console.log('✓ Firebase password reset dispatch accepted by Google servers');
  } catch (resetErr) {
    assert.ok(resetErr.code && resetErr.code.startsWith('auth/'), 'Password reset handled by Firebase');
    console.log('✓ Firebase password reset responded:', resetErr.code);
  }

  // Verification checks when unauthenticated
  const isVerified = await checkEmailVerification();
  assert.strictEqual(isVerified, false, 'Unauthenticated state is not verified');

  // Auth state listener test
  await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged((user) => {
      assert.strictEqual(user, null, 'Initial auth state is null (clean unauthenticated state)');
      unsubscribe();
      resolve();
    });
  });
  console.log('✓ onAuthStateChanged listener verified');

  console.log('\n--- 4. HTTP Routes & Integration Verification ---');
  const baseUrl = 'http://localhost:8090';

  let transientServer = null;
  try {
    await fetch(`${baseUrl}/`);
  } catch {
    const http = await import('node:http');
    const fs = await import('node:fs');
    const path = await import('node:path');

    transientServer = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';
      if (!reqPath.includes('.')) reqPath += '.html';
      const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(fs.readFileSync(filePath));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    await new Promise((resolve) => transientServer.listen(8090, resolve));
  }

  try {
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
  } finally {
    if (transientServer) {
      transientServer.close();
    }
  }

  console.log('\n=========================================');
  console.log('ALL AUTHENTICATION CHECKS PASSED (100%)');
  console.log('=========================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

