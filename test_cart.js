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
  'portfolio.html',
  'get-quote.html',
  'order.html',
  'checkout.html',
  'order-confirmation.html',
  'cart.html',
  'login.html',
  'register.html',
  'forgot-password.html',
  'reset-password.html',
  'verify-email.html',
  'privacy-policy.html',
  'terms-and-conditions.html',
  'cancellation-return-refund-policy.html',
  'ownership-statement.html'
];

htmlPagesToCheck.forEach(pageName => {
  const filePath = path.join(__dirname, pageName);
  assert(fs.existsSync(filePath), `${pageName} exists`);
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('header-cart-btn') || content.includes('id="header-cart-btn"'), `${pageName} has header cart button`);
  assert(content.includes('header-cart-badge') || content.includes('cart-badge'), `${pageName} has cart badge element`);
  assert(!content.includes('class="cart-label">Cart<'), `${pageName} does not have Cart text inside header-cart-btn`);
  assert(!content.includes('class="nav-link">Cart<'), `${pageName} does not have separate Cart page link in nav menu`);
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

const portfolioRewrite = vercelJson.rewrites.find(r => r.source === '/portfolio');
assert(portfolioRewrite && portfolioRewrite.destination === '/portfolio.html', 'vercel.json has rewrite for /portfolio -> /portfolio.html');

const presRewrite = vercelJson.rewrites.find(r => r.source === '/portfolio/presentations');
assert(presRewrite && presRewrite.destination === '/portfolio-presentations.html', 'vercel.json has rewrite for /portfolio/presentations -> /portfolio-presentations.html');

const privacyRewrite = vercelJson.rewrites.find(r => r.source === '/privacy-policy');
assert(privacyRewrite && privacyRewrite.destination === '/privacy-policy.html', 'vercel.json has rewrite for /privacy-policy -> /privacy-policy.html');

const termsRewrite = vercelJson.rewrites.find(r => r.source === '/terms-and-conditions');
assert(termsRewrite && termsRewrite.destination === '/terms-and-conditions.html', 'vercel.json has rewrite for /terms-and-conditions -> /terms-and-conditions.html');

const refundRewrite = vercelJson.rewrites.find(r => r.source === '/cancellation-return-refund-policy');
assert(refundRewrite && refundRewrite.destination === '/cancellation-return-refund-policy.html', 'vercel.json has rewrite for /cancellation-return-refund-policy -> /cancellation-return-refund-policy.html');

const ownershipRewrite = vercelJson.rewrites.find(r => r.source === '/ownership-statement');
assert(ownershipRewrite && ownershipRewrite.destination === '/ownership-statement.html', 'vercel.json has rewrite for /ownership-statement -> /ownership-statement.html');

const servePs1 = fs.readFileSync(path.join(__dirname, 'serve.ps1'), 'utf8');
assert(servePs1.includes('$path -eq "/portfolio/presentations"'), 'serve.ps1 maps /portfolio/presentations to /portfolio-presentations.html');
assert(servePs1.includes('$path -eq "/portfolio"'), 'serve.ps1 maps /portfolio to /portfolio.html');
assert(servePs1.includes('$path -eq "/cart"'), 'serve.ps1 maps /cart to /cart.html');
assert(servePs1.includes('$path -eq "/privacy-policy"'), 'serve.ps1 maps /privacy-policy to /privacy-policy.html');
assert(servePs1.includes('$path -eq "/terms-and-conditions"'), 'serve.ps1 maps /terms-and-conditions to /terms-and-conditions.html');
assert(servePs1.includes('$path -eq "/cancellation-return-refund-policy"'), 'serve.ps1 maps /cancellation-return-refund-policy to /cancellation-return-refund-policy.html');
assert(servePs1.includes('$path -eq "/ownership-statement"'), 'serve.ps1 maps /ownership-statement to /ownership-statement.html');
assert(servePs1.includes('$hasCart = ($body.cartItems'), 'serve.ps1 supports authoritative cartItems calculation in POST /api/order');

console.log('\n======================================================');
console.log('--- 7. TEST LEGAL POLICY PAGES CONTENT & INVARIANTS ---');
console.log('======================================================');

// 7.1 Privacy Policy Verification
const privacyHtml = fs.readFileSync(path.join(__dirname, 'privacy-policy.html'), 'utf8');
assert(privacyHtml.includes('Privacy Policy'), 'privacy-policy.html contains title');
assert(privacyHtml.includes('Google Firebase Authentication'), 'privacy-policy.html documents Firebase Auth accurately');
assert(privacyHtml.includes('PCI-DSS compliant'), 'privacy-policy.html documents payment gateway role');
assert(privacyHtml.includes('asnat_cart_v1'), 'privacy-policy.html documents actual localStorage usage accurately');
assert(privacyHtml.includes('contact@asnatkhan.com'), 'privacy-policy.html provides direct studio contact');

// 7.2 Terms & Conditions Verification
const termsHtml = fs.readFileSync(path.join(__dirname, 'terms-and-conditions.html'), 'utf8');
assert(termsHtml.includes('Terms &amp; Conditions') || termsHtml.includes('Terms and Conditions'), 'terms-and-conditions.html contains title');
assert(termsHtml.includes('Basic Website') && termsHtml.includes('$50'), 'terms-and-conditions.html includes Basic Website at $50');
assert(termsHtml.includes('Standard Website') && termsHtml.includes('$100'), 'terms-and-conditions.html includes Standard Website at $100');
assert(termsHtml.includes('E-Commerce Website') && termsHtml.includes('$200'), 'terms-and-conditions.html includes E-Commerce Website at $200');
assert(termsHtml.includes('Additional Products') || termsHtml.includes('$1.00'), 'terms-and-conditions.html includes $1 extra products');
assert(termsHtml.includes('Pitch Deck Design') && termsHtml.includes('$50'), 'terms-and-conditions.html includes Pitch Deck at $50');
assert(termsHtml.includes('Article Writing') && termsHtml.includes('$10'), 'terms-and-conditions.html includes Writing at $10/1k words');
assert(termsHtml.includes('You provide and purchase your own domain name'), 'terms-and-conditions.html includes exact domain policy');

// 7.3 Cancellation & Refund Policy Verification
const refundHtml = fs.readFileSync(path.join(__dirname, 'cancellation-return-refund-policy.html'), 'utf8');
assert(refundHtml.includes('Cancellation, Return &amp; Refund Policy') || refundHtml.includes('Cancellation, Return and Refund Policy'), 'refund policy contains title');
assert(refundHtml.includes('Cancellation Before Work Begins'), 'refund policy covers cancellation before work begins');
assert(refundHtml.includes('Cancellation After Project Work Has Started'), 'refund policy covers cancellation after work started');
assert(refundHtml.includes('Partially Completed Projects'), 'refund policy covers partially completed projects');
assert(refundHtml.includes('Duplicate Payments &amp; Billing Discrepancies'), 'refund policy covers duplicate payments');
assert(refundHtml.includes('Statutory Consumer Rights'), 'refund policy preserves statutory consumer rights');

// 7.4 Ownership Statement Verification
const ownershipHtml = fs.readFileSync(path.join(__dirname, 'ownership-statement.html'), 'utf8');
assert(ownershipHtml.includes('Ownership Statement'), 'ownership-statement.html contains title');
assert(ownershipHtml.includes('Ownership &amp; Transfer of Final Deliverables'), 'ownership-statement.html covers deliverables transfer');
assert(ownershipHtml.includes('Domain Ownership &amp; Registrar Control'), 'ownership-statement.html covers client domain ownership');
assert(ownershipHtml.includes('Customer-Provided Content, Logos &amp; Trademarks'), 'ownership-statement.html covers client trademarks');
assert(ownershipHtml.includes('Open-Source Software &amp; Frameworks'), 'ownership-statement.html distinguishes open-source licensing');
assert(ownershipHtml.includes('Portfolio Display &amp; Client Showcase'), 'ownership-statement.html explains portfolio display and NDA options');

// 7.5 Footer Integration Verification
const pagesWithSiteFooter = ['index.html', 'services.html', 'founder-story.html', 'portfolio.html', 'get-quote.html'];
pagesWithSiteFooter.forEach(pg => {
  const html = fs.readFileSync(path.join(__dirname, pg), 'utf8');
  assert(html.includes('portfolio.html'), `${pg} footer links to portfolio.html`);
  assert(html.includes('privacy-policy.html'), `${pg} footer links to privacy-policy.html`);
  assert(html.includes('terms-and-conditions.html'), `${pg} footer links to terms-and-conditions.html`);
  assert(html.includes('cancellation-return-refund-policy.html'), `${pg} footer links to cancellation-return-refund-policy.html`);
  assert(html.includes('ownership-statement.html'), `${pg} footer links to ownership-statement.html`);
});

console.log('\n======================================================');
console.log('--- 8. TEST BRAND COLOR COMPLIANCE (ZERO FORBIDDEN GOLD) ---');
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
