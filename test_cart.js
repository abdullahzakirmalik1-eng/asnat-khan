/**
 * Asnat Khan Studio — Shopping Cart & Checkout Integration Test Suite
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PACKAGES, ADDITIONAL_SERVICES, DOMAIN_HOSTING_NOTE, calculateCartPricing, calculateOrderPricing } from './js/packages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('--- 1. TEST AUTHORITATIVE CATALOG PRICING ENGINE ---');
console.log('======================================================');

// 1.1 Basic Website: $50
const basicPricing = calculateCartPricing([{ id: 'basic', quantity: 1 }]);
assert(basicPricing.totalAmount === 50, 'Basic Website calculates to $50.00');
assert(basicPricing.lineItems[0].name === 'Basic Website', 'Basic line item name correct');

// 1.2 Standard Website: $100
const stdPricing = calculateCartPricing([{ id: 'standard', quantity: 1 }]);
assert(stdPricing.totalAmount === 100, 'Standard Website calculates to $100.00');

// 1.3 E-Commerce Website: $200 (first 10 included)
const ecomPricing = calculateCartPricing([{ id: 'ecommerce', quantity: 1 }]);
assert(ecomPricing.totalAmount === 200, 'E-Commerce Website base calculates to $200.00');

// 1.4 E-Commerce with 15 extra products ($1 each -> +$15)
const ecomExtraPricing = calculateCartPricing([{ id: 'ecommerce', quantity: 1, options: { additionalProducts: 15 } }]);
assert(ecomExtraPricing.totalAmount === 215, 'E-Commerce Website + 15 extra products calculates to $215.00');
assert(ecomExtraPricing.additionalProducts === 15, 'additionalProducts recorded as 15');
assert(ecomExtraPricing.additionalProductsCost === 15, 'additionalProductsCost recorded as $15.00');

// 1.5 Pitch Deck Design: $50
const pitchPricing = calculateCartPricing([{ id: 'pitchdeck', quantity: 1 }]);
assert(pitchPricing.totalAmount === 50, 'Pitch Deck Design calculates to $50.00');

// 1.6 Article Writing: $10 per 1,000 words
const writing1k = calculateCartPricing([{ id: 'writing', quantity: 1, options: { words: 1000 } }]);
assert(writing1k.totalAmount === 10, 'Article Writing (1,000 words) calculates to $10.00');

const writing3k = calculateCartPricing([{ id: 'writing', quantity: 1, options: { words: 3000 } }]);
assert(writing3k.totalAmount === 30, 'Article Writing (3,000 words) calculates to $30.00');

// 1.7 Multi-item Cart Combination: Standard ($100) + Pitch Deck ($50) + 2k words Writing ($20) = $170
const comboPricing = calculateCartPricing([
  { id: 'standard', quantity: 1 },
  { id: 'pitchdeck', quantity: 1 },
  { id: 'writing', quantity: 1, options: { words: 2000 } }
]);
assert(comboPricing.totalAmount === 170, 'Combo of Standard ($100) + Pitch Deck ($50) + 2k Writing ($20) calculates to $170.00');
assert(comboPricing.lineItems.length === 3, 'Combo has exactly 3 line items');

// 1.8 Order Calculation with cartItems parameter
const orderPricingFromCart = calculateOrderPricing({
  cartItems: [
    { id: 'basic', quantity: 1 },
    { id: 'pitchdeck', quantity: 1 }
  ]
});
assert(orderPricingFromCart.totalAmount === 100, 'calculateOrderPricing with cartItems returns verified $100.00');
assert(orderPricingFromCart.domainNote.statement.includes('You provide and purchase your own domain name'), 'Domain note statement verified');

console.log('\n======================================================');
console.log('--- 2. TEST CART PAGE (cart.html) STRUCTURE & CONTENT ---');
console.log('======================================================');

const cartHtml = fs.readFileSync(path.join(__dirname, 'cart.html'), 'utf8');
assert(cartHtml.includes('id="cart-items-container"'), 'cart.html has cart items container');
assert(cartHtml.includes('id="cart-empty-state"'), 'cart.html has empty cart state');
assert(cartHtml.includes('id="cart-summary-subtotal"'), 'cart.html has subtotal element');
assert(cartHtml.includes('id="cart-summary-total"'), 'cart.html has final total element');
assert(cartHtml.includes('services.html') && cartHtml.includes('Continue Shopping'), 'cart.html has Continue Shopping link');
assert(cartHtml.includes('checkout.html') && cartHtml.includes('PROCEED TO CHECKOUT'), 'cart.html has Proceed to Checkout CTA');
assert(cartHtml.includes('You provide and purchase your own domain name. Free hosting is included with your website package. We can help you connect your domain to your website.'), 'cart.html contains exact required domain notice');

console.log('\n======================================================');
console.log('--- 3. TEST HEADER CART BUTTON & BADGE ACROSS ALL HTML PAGES ---');
console.log('======================================================');

const htmlPagesToCheck = [
  'index.html',
  'founder-story.html',
  'services.html',
  'get-quote.html',
  'order.html',
  'checkout.html',
  'order-confirmation.html',
  'cart.html',
  'login.html',
  'register.html',
  'forgot-password.html',
  'reset-password.html',
  'verify-email.html'
];

htmlPagesToCheck.forEach(pageName => {
  const filePath = path.join(__dirname, pageName);
  assert(fs.existsSync(filePath), `${pageName} exists`);
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('header-cart-btn') || content.includes('id="header-cart-btn"'), `${pageName} has header cart button`);
  assert(content.includes('header-cart-badge') || content.includes('cart-badge'), `${pageName} has cart badge element`);
  assert(content.includes('js/cart.js'), `${pageName} imports js/cart.js`);
});

console.log('\n======================================================');
console.log('--- 4. TEST SERVICES PAGE INTEGRATION ---');
console.log('======================================================');

const servicesHtml = fs.readFileSync(path.join(__dirname, 'services.html'), 'utf8');
assert(servicesHtml.includes('data-add-to-cart="basic"'), 'services.html has Add to Cart button for basic package');
assert(servicesHtml.includes('data-add-to-cart="standard"'), 'services.html has Add to Cart button for standard package');
assert(servicesHtml.includes('data-add-to-cart="ecommerce"'), 'services.html has Add to Cart button for ecommerce package');
assert(servicesHtml.includes('data-add-to-cart="pitchdeck"'), 'services.html has Add to Cart button for pitchdeck service');
assert(servicesHtml.includes('data-add-to-cart="writing"'), 'services.html has Add to Cart button for writing service');

console.log('\n======================================================');
console.log('--- 5. TEST CHECKOUT INTEGRATION & NAVIGATION ---');
console.log('======================================================');

const checkoutHtml = fs.readFileSync(path.join(__dirname, 'checkout.html'), 'utf8');
assert(checkoutHtml.includes('href="cart.html" class="change-package-btn"') && checkoutHtml.includes('Edit Cart'), 'checkout.html has "Edit Cart" link back to cart');
assert(checkoutHtml.includes('Back to Cart'), 'checkout.html has "Back to Cart" navigation link');

const checkoutJs = fs.readFileSync(path.join(__dirname, 'js/checkout.js'), 'utf8');
assert(checkoutJs.includes('cartItems: (cartItems && cartItems.length > 0) ? cartItems : null'), 'checkout.js passes cartItems to calculateOrderPricing');
assert(checkoutJs.includes('clearCart()'), 'checkout.js calls clearCart() upon verified order completion');

console.log('\n======================================================');
console.log('--- 6. TEST ROUTING & SERVER REWRITES ---');
console.log('======================================================');

const vercelJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'vercel.json'), 'utf8'));
const cartRewrite = vercelJson.rewrites.find(r => r.source === '/cart');
assert(cartRewrite && cartRewrite.destination === '/cart.html', 'vercel.json has rewrite for /cart -> /cart.html');

const servePs1 = fs.readFileSync(path.join(__dirname, 'serve.ps1'), 'utf8');
assert(servePs1.includes('$path -eq "/cart"'), 'serve.ps1 maps /cart to /cart.html');
assert(servePs1.includes('$hasCart = ($body.cartItems'), 'serve.ps1 supports authoritative cartItems calculation in POST /api/order');

console.log('\n======================================================');
console.log('--- 7. TEST BRAND COLOR COMPLIANCE (ZERO FORBIDDEN GOLD) ---');
console.log('======================================================');

let forbiddenColorOccurrences = 0;
const forbiddenHex = ['#', 'D4', 'AF37'].join('');
const allFiles = fs.readdirSync(__dirname);
allFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const stat = fs.statSync(fullPath);
  if (stat.isFile() && (file.endsWith('.html') || file.endsWith('.css') || file.endsWith('.js') || file.endsWith('.json'))) {
    if (file.startsWith('test_')) return;
    const content = fs.readFileSync(fullPath, 'utf8');
    const regex = new RegExp(forbiddenHex, 'gi');
    const matches = (content.match(regex) || []).length;
    if (matches > 0) {
      console.error(`  Prohibited color found in ${file}: ${matches} time(s)`);
      forbiddenColorOccurrences += matches;
    }
  }
});
assert(forbiddenColorOccurrences === 0, `Zero occurrences of prohibited color across codebase (found: ${forbiddenColorOccurrences})`);

console.log('\n======================================================');
console.log(`--- TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
