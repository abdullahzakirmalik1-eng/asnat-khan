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
console.log('TEST SUITE: FIVERR HEADER CTA & FOOTER SOCIAL ICONS');
console.log('====================================================\n');

const EXPECTED_FIVERR_URL = 'https://www.fiverr.com/asnatkhan1';
const EXPECTED_LINKEDIN_URL = 'https://www.linkedin.com/in/asnat-khan-a708b5392?utm_source=share_via&utm_content=profile&utm_medium=member_android';

// -----------------------------------------------------------------------------
// Test 1: CSS Stylesheet Verification
// -----------------------------------------------------------------------------
console.log('1. CSS Stylesheet Tokens & Rules');
const stylesPath = path.join(__dirname, 'css', 'styles.css');
const stylesContent = fs.readFileSync(stylesPath, 'utf8');

assert(stylesContent.includes('.footer-social-links'), 'styles.css contains .footer-social-links rule');
assert(stylesContent.includes('.footer-social-btn'), 'styles.css contains .footer-social-btn rule');
assert(stylesContent.includes('width: 44px;') && stylesContent.includes('height: 44px;'), 'Touch target size is comfortable ~44x44 CSS pixels');
assert(stylesContent.includes(':focus-visible'), 'Supports clear keyboard focus-visible style');
assert(stylesContent.includes('@media (prefers-reduced-motion: reduce)'), 'Supports prefers-reduced-motion override');
assert(!stylesContent.includes('#D4AF37'), 'Strict verification: ZERO occurrences of #D4AF37');

// -----------------------------------------------------------------------------
// Test 2: Header CTA Across Public Pages
// -----------------------------------------------------------------------------
console.log('\n2. Header CTA Across All Pages');

const headerPages = [
  'index.html',
  'services.html',
  'founder-story.html',
  'portfolio.html',
  'portfolio-presentations.html',
  'portfolio/presentations/index.html',
  'get-quote.html',
  'terms-and-conditions.html',
  'privacy-policy.html',
  'ownership-statement.html',
  'cancellation-return-refund-policy.html'
];

for (const relPath of headerPages) {
  const filePath = path.join(__dirname, relPath);
  const content = fs.readFileSync(filePath, 'utf8');

  // Match nav-cta
  const navCtaMatch = content.match(/<a[^>]*class="[^"]*nav-cta[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  assert(navCtaMatch !== null, `${relPath}: Header contains nav-cta button`);

  if (navCtaMatch) {
    const fullTag = navCtaMatch[0];
    assert(fullTag.includes(`href="${EXPECTED_FIVERR_URL}"`), `${relPath}: nav-cta links to official Fiverr profile`);
    assert(fullTag.includes('target="_blank"'), `${relPath}: nav-cta opens in new tab (target="_blank")`);
    assert(fullTag.includes('rel="noopener noreferrer"'), `${relPath}: nav-cta has security rel="noopener noreferrer"`);
    assert(fullTag.includes('ORDER ON FIVERR'), `${relPath}: nav-cta visible text is "ORDER ON FIVERR"`);
    assert(!fullTag.includes('START A PROJECT'), `${relPath}: nav-cta does not contain old label "START A PROJECT"`);
  }
}

// -----------------------------------------------------------------------------
// Test 3: Mobile Drawer CTA Across Applicable Pages
// -----------------------------------------------------------------------------
console.log('\n3. Mobile Drawer CTA Across Applicable Pages');

const drawerPages = [
  'index.html',
  'services.html',
  'founder-story.html',
  'portfolio.html',
  'portfolio-presentations.html',
  'portfolio/presentations/index.html',
  'get-quote.html'
];

for (const relPath of drawerPages) {
  const filePath = path.join(__dirname, relPath);
  const content = fs.readFileSync(filePath, 'utf8');

  const drawerCtaMatch = content.match(/<a[^>]*class="[^"]*drawer-cta[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  assert(drawerCtaMatch !== null, `${relPath}: Mobile drawer contains drawer-cta button`);

  if (drawerCtaMatch) {
    const fullTag = drawerCtaMatch[0];
    assert(fullTag.includes(`href="${EXPECTED_FIVERR_URL}"`), `${relPath}: drawer-cta links to official Fiverr profile`);
    assert(fullTag.includes('target="_blank"'), `${relPath}: drawer-cta opens in new tab`);
    assert(fullTag.includes('rel="noopener noreferrer"'), `${relPath}: drawer-cta has rel="noopener noreferrer"`);
    assert(fullTag.includes('ORDER ON FIVERR'), `${relPath}: drawer-cta visible text is "ORDER ON FIVERR"`);
  }
}

// -----------------------------------------------------------------------------
// Test 4: Footer Social Profile Icons
// -----------------------------------------------------------------------------
console.log('\n4. Footer Social Profile Links & Icons');

for (const relPath of headerPages) {
  const filePath = path.join(__dirname, relPath);
  const content = fs.readFileSync(filePath, 'utf8');

  const socialBlockMatch = content.match(/<div class="footer-social-links"[^>]*>([\s\S]*?)<\/div>/i);
  assert(socialBlockMatch !== null, `${relPath}: Footer contains .footer-social-links`);

  if (socialBlockMatch) {
    const blockContent = socialBlockMatch[1];

    // Fiverr link
    assert(blockContent.includes(`href="${EXPECTED_FIVERR_URL}"`), `${relPath}: Footer has link to Fiverr profile`);
    assert(blockContent.includes('aria-label="Fiverr profile"'), `${relPath}: Fiverr link has accessible aria-label="Fiverr profile"`);
    assert(blockContent.includes('target="_blank"'), `${relPath}: Fiverr link opens in target="_blank"`);
    assert(blockContent.includes('rel="noopener noreferrer"'), `${relPath}: Fiverr link has rel="noopener noreferrer"`);

    // LinkedIn link
    assert(blockContent.includes(`href="${EXPECTED_LINKEDIN_URL}"`), `${relPath}: Footer has link to LinkedIn profile with exact query parameters`);
    assert(blockContent.includes('aria-label="LinkedIn profile"'), `${relPath}: LinkedIn link has accessible aria-label="LinkedIn profile"`);
    assert(blockContent.includes('target="_blank"'), `${relPath}: LinkedIn link opens in target="_blank"`);
    assert(blockContent.includes('rel="noopener noreferrer"'), `${relPath}: LinkedIn link has rel="noopener noreferrer"`);

    // SVGs
    const svgCount = (blockContent.match(/<svg/gi) || []).length;
    assert(svgCount === 2, `${relPath}: Exactly two SVG brand icons present (Fiverr and LinkedIn)`);

    // No duplicate social blocks
    const blockOccurrences = (content.match(/class="footer-social-links"/gi) || []).length;
    assert(blockOccurrences === 1, `${relPath}: Exactly one .footer-social-links group present`);
  }
}

// -----------------------------------------------------------------------------
// Test 5: Live HTTP Server Verification
// -----------------------------------------------------------------------------
console.log('\n5. Live Server HTTP Verification');
try {
  const routesToTest = ['/', '/services', '/founder-story', '/portfolio', '/get-quote'];
  for (const route of routesToTest) {
    const res = await fetch(`http://localhost:8090${route}`);
    assert(res.status === 200, `Live server ${route} returns HTTP 200`);
    const html = await res.text();
    assert(html.includes('ORDER ON FIVERR'), `Live server ${route} serves "ORDER ON FIVERR"`);
    assert(html.includes(EXPECTED_FIVERR_URL), `Live server ${route} serves Fiverr profile URL`);
    assert(html.includes(EXPECTED_LINKEDIN_URL), `Live server ${route} serves LinkedIn profile URL with query params`);
  }
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
