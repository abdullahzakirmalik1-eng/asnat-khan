import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${details ? ' - ' + details : ''}`);
    failedTests++;
  }
}

console.log('====================================================');
console.log('TEST SUITE: FLOATING WHATSAPP BUTTON IMPLEMENTATION');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// Test 1: URL, Phone Number, and Prefilled Message Encoding
// -----------------------------------------------------------------------------
console.log('1. URL and Message Encoding Verification');
const expectedPhone = '447848180022';
const prefilledText = 'Hi! I’m interested in your website services. Could you please help me get started?';
const expectedEncoded = encodeURIComponent(prefilledText);
const expectedUrl = `https://wa.me/${expectedPhone}?text=${expectedEncoded}`;

assert(!expectedPhone.includes('+') && !expectedPhone.includes(' ') && !expectedPhone.includes('-'), 'Phone number formatted digits-only without +, spaces, or hyphens');
assert(expectedPhone === '447848180022', 'Phone number matches exact digits 447848180022');
assert(expectedEncoded === 'Hi!%20I%E2%80%99m%20interested%20in%20your%20website%20services.%20Could%20you%20please%20help%20me%20get%20started%3F', 'Prefilled message correctly URL encoded');
assert(expectedUrl === 'https://wa.me/447848180022?text=Hi!%20I%E2%80%99m%20interested%20in%20your%20website%20services.%20Could%20you%20please%20help%20me%20get%20started%3F', 'Full destination URL matches wa.me specification');

// -----------------------------------------------------------------------------
// Test 2: CSS Stylesheet Verification
// -----------------------------------------------------------------------------
console.log('\n2. CSS Stylesheet Rules & Tokens');
const stylesPath = path.join(__dirname, 'css', 'styles.css');
const stylesContent = fs.readFileSync(stylesPath, 'utf8');

assert(stylesContent.includes('.whatsapp-float-wrap'), 'styles.css contains .whatsapp-float-wrap selector');
assert(stylesContent.includes('.whatsapp-float-btn'), 'styles.css contains .whatsapp-float-btn selector');
assert(stylesContent.includes('.whatsapp-float-tooltip'), 'styles.css contains .whatsapp-float-tooltip selector');
assert(stylesContent.includes('position: fixed;'), 'WhatsApp wrap uses fixed positioning');
assert(stylesContent.includes('env(safe-area-inset-right'), 'WhatsApp wrap respects mobile safe area right');
assert(stylesContent.includes('env(safe-area-inset-bottom'), 'WhatsApp wrap respects mobile safe area bottom');
assert(stylesContent.includes('z-index: 990;'), 'WhatsApp button uses non-intrusive z-index 990 below drawers (1100) and modals (2000)');
assert(stylesContent.includes(':focus-visible'), 'WhatsApp button supports clearly visible keyboard focus-visible');
assert(stylesContent.includes('@media (prefers-reduced-motion: reduce)'), 'WhatsApp button respects prefers-reduced-motion preferences');
assert(stylesContent.includes('@media (hover: none)'), 'Discreet tooltip is hidden on touch-only devices to avoid persistent clutter');
assert(stylesContent.includes('@media (max-width: 640px)'), 'Includes responsive rules for narrow mobile viewports');
assert(!stylesContent.includes('#D4AF37'), 'Strict verification: generic gold #D4AF37 is NEVER used in stylesheet');
assert(stylesContent.includes('.admin-body .whatsapp-float-wrap'), 'Admin layouts explicitly excluded from showing WhatsApp button in CSS');
assert(stylesContent.includes('.page-order-confirmation .whatsapp-float-wrap'), 'Customer dashboard layout explicitly excluded in CSS');

// -----------------------------------------------------------------------------
// Test 3: Standalone Component (js/whatsapp-button.js)
// -----------------------------------------------------------------------------
console.log('\n3. Standalone Component (js/whatsapp-button.js)');
const componentPath = path.join(__dirname, 'js', 'whatsapp-button.js');
assert(fs.existsSync(componentPath), 'js/whatsapp-button.js exists');

const componentContent = fs.readFileSync(componentPath, 'utf8');
assert(componentContent.includes('447848180022'), 'Component defines phone 447848180022');
assert(componentContent.includes("'_blank'"), 'Link opens conversation in new tab');
assert(componentContent.includes('noopener noreferrer'), 'Link includes security attributes rel="noopener noreferrer"');
assert(componentContent.includes('isExcludedPage'), 'Component includes exclusion logic for admin and customer dashboard pages');
assert(componentContent.includes('document.getElementById(\'whatsapp-float-btn\')'), 'Component guards against duplicate buttons');

// -----------------------------------------------------------------------------
// Test 4: Integration in js/main.js
// -----------------------------------------------------------------------------
console.log('\n4. Integration in Main Script (js/main.js)');
const mainJsPath = path.join(__dirname, 'js', 'main.js');
const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
assert(mainJsContent.includes('initWhatsAppFloatingButton();'), 'main.js calls initWhatsAppFloatingButton() on DOMContentLoaded');
assert(mainJsContent.includes('function initWhatsAppFloatingButton()'), 'main.js implements initWhatsAppFloatingButton()');
assert(mainJsContent.includes('admin-body'), 'main.js checks for admin-body exclusion');
assert(mainJsContent.includes('confirmation-view'), 'main.js checks for customer confirmation view exclusion');

// -----------------------------------------------------------------------------
// Test 5: DOM Execution Simulation (Node.js DOM Mock)
// -----------------------------------------------------------------------------
console.log('\n5. DOM Execution & Idempotency Simulation');

// Mock a lightweight browser environment to simulate DOM execution
function createMockDOM(options = {}) {
  const elements = new Map();
  const classes = new Set(options.classes || []);

  const document = {
    readyState: 'complete',
    body: {
      classList: {
        contains: (c) => classes.has(c)
      },
      appendChild: (el) => {
        elements.set(el.id || el.className, el);
      }
    },
    getElementById: (id) => elements.get(id) || null,
    querySelector: (sel) => {
      if (options.hasAdminLayout && sel === '.admin-layout') return {};
      return null;
    },
    createElement: (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        children: [],
        attributes: {},
        classList: {
          add: (c) => { el.className = (el.className ? el.className + ' ' : '') + c; }
        },
        setAttribute: (k, v) => {
          el.attributes[k] = v;
          if (k === 'id') {
            el.id = v;
            elements.set(v, el);
          }
          if (k === 'class') el.className = v;
          if (k === 'href') el.href = v;
        },
        getAttribute: (k) => el.attributes[k] || (k === 'id' ? el.id : null),
        appendChild: (child) => {
          el.children.push(child);
          if (child.id) elements.set(child.id, child);
        }
      };
      return el;
    },
    createElementNS: (ns, tag) => {
      const el = {
        namespaceURI: ns,
        tagName: tag,
        attributes: {},
        children: [],
        classList: {
          add: (c) => { el.className = (el.className ? el.className + ' ' : '') + c; }
        },
        setAttribute: (k, v) => { el.attributes[k] = v; },
        appendChild: (child) => { el.children.push(child); }
      };
      return el;
    },
    addEventListener: (evt, fn) => {
      if (evt === 'DOMContentLoaded') fn();
    }
  };

  const window = {
    location: {
      pathname: options.pathname || '/'
    },
    document
  };

  return { window, document, elements };
}

// Subtest 5A: Public Homepage
{
  const { window, document, elements } = createMockDOM({ pathname: '/' });
  // Execute component code in simulated context
  const runComponent = new Function('window', 'document', componentContent);
  runComponent(window, document);

  const btn = document.getElementById('whatsapp-float-btn');
  assert(btn !== null, 'Public page: Button is created and appended to document');
  assert(btn.href === expectedUrl, 'Public page: Button href matches expected WhatsApp URL');
  assert(btn.attributes['aria-label'] === 'Chat with us on WhatsApp', 'Public page: Button has aria-label="Chat with us on WhatsApp"');
  assert(btn.attributes['target'] === '_blank', 'Public page: Button opens in target="_blank"');
  assert(btn.attributes['rel'] === 'noopener noreferrer', 'Public page: Button has rel="noopener noreferrer"');

  // Subtest 5B: Idempotency (multiple calls do not create duplicates)
  window.initWhatsAppFloatingButton();
  window.initWhatsAppFloatingButton();
  let count = 0;
  for (const [key, val] of elements.entries()) {
    if (key === 'whatsapp-float-btn') count++;
  }
  assert(count === 1, 'Idempotency: calling initWhatsAppFloatingButton multiple times never creates duplicate buttons');
}

// Subtest 5C: Admin Page Exclusion
{
  const { window, document } = createMockDOM({ classes: ['admin-body'], pathname: '/admin' });
  const runComponent = new Function('window', 'document', componentContent);
  runComponent(window, document);

  const btn = document.getElementById('whatsapp-float-btn');
  assert(btn === null, 'Admin page: Button is NOT injected on admin.html (admin-body)');
}

// Subtest 5D: Customer Dashboard / Order Confirmation Exclusion
{
  const { window, document } = createMockDOM({ classes: ['page-order-confirmation'], pathname: '/order-confirmation' });
  const runComponent = new Function('window', 'document', componentContent);
  runComponent(window, document);

  const btn = document.getElementById('whatsapp-float-btn');
  assert(btn === null, 'Customer dashboard: Button is NOT injected on order-confirmation.html');
}

// -----------------------------------------------------------------------------
// Test 6: Verify All Public Website Pages Load Script and Styles
// -----------------------------------------------------------------------------
console.log('\n6. Public Pages Script and Stylesheet Inclusions');

const publicPages = [
  'index.html',
  'services.html',
  'founder-story.html',
  'portfolio.html',
  'portfolio-presentations.html',
  'get-quote.html',
  'cart.html',
  'checkout.html',
  'order.html',
  'terms-and-conditions.html',
  'privacy-policy.html',
  'ownership-statement.html',
  'cancellation-return-refund-policy.html',
  'login.html',
  'register.html',
  'forgot-password.html',
  'reset-password.html',
  'verify-email.html'
];

for (const page of publicPages) {
  const filePath = path.join(__dirname, page);
  if (!fs.existsSync(filePath)) {
    assert(false, `${page} exists`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const hasStyles = content.includes('css/styles.css');
  const hasScript = content.includes('js/main.js') || content.includes('js/whatsapp-button.js');
  assert(hasStyles, `${page} includes css/styles.css`);
  assert(hasScript, `${page} includes WhatsApp button script (main.js or whatsapp-button.js)`);
}

// Check admin.html explicitly
{
  const adminFile = path.join(__dirname, 'admin.html');
  const adminContent = fs.readFileSync(adminFile, 'utf8');
  assert(!adminContent.includes('js/whatsapp-button.js'), 'admin.html does NOT load whatsapp-button.js');
}

// Check order-confirmation.html explicitly
{
  const confFile = path.join(__dirname, 'order-confirmation.html');
  const confContent = fs.readFileSync(confFile, 'utf8');
  assert(!confContent.includes('js/whatsapp-button.js'), 'order-confirmation.html does NOT load whatsapp-button.js');
}

// -----------------------------------------------------------------------------
// Test 7: Live HTTP Server Verification
// -----------------------------------------------------------------------------
console.log('\n7. Live HTTP Server Route Verification');
try {
  const testRoutes = [
    { path: '/', expectedTitle: 'Asnat Khan' },
    { path: '/services', expectedTitle: 'Services' },
    { path: '/portfolio', expectedTitle: 'Portfolio' },
    { path: '/get-quote', expectedTitle: 'Quote' },
    { path: '/founder-story', expectedTitle: 'Founder' },
    { path: '/cart', expectedTitle: 'Cart' },
    { path: '/checkout', expectedTitle: 'Checkout' },
    { path: '/terms-and-conditions', expectedTitle: 'Terms' },
    { path: '/privacy-policy', expectedTitle: 'Privacy' }
  ];

  for (const route of testRoutes) {
    const res = await fetch(`http://localhost:8090${route.path}`);
    assert(res.status === 200, `HTTP GET http://localhost:8090${route.path} returns 200 OK`);
  }

  // Also verify css and js are served properly
  const cssRes = await fetch('http://localhost:8090/css/styles.css');
  const cssText = await cssRes.text();
  assert(cssRes.status === 200 && cssText.includes('.whatsapp-float-btn'), 'HTTP GET /css/styles.css serves WhatsApp button styles');

  const jsRes = await fetch('http://localhost:8090/js/whatsapp-button.js');
  const jsText = await jsRes.text();
  assert(jsRes.status === 200 && jsText.includes('447848180022'), 'HTTP GET /js/whatsapp-button.js serves component script');

  const mainRes = await fetch('http://localhost:8090/js/main.js');
  const mainText = await mainRes.text();
  assert(mainRes.status === 200 && mainText.includes('initWhatsAppFloatingButton'), 'HTTP GET /js/main.js serves initWhatsAppFloatingButton');
} catch (e) {
  assert(false, 'Live HTTP server test', e.message);
}

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
