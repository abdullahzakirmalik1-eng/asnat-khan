/**
 * Comprehensive Website Performance & Core Web Vitals Optimization Test Suite
 * Validates Image Delivery, WebP Equivalency, Layout Shift Prevention,
 * Non-blocking Assets, HTTP Caching, and Gzip Compression.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import sharp from 'sharp';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function request(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers
    }, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer.toString('utf8'),
          rawLength: buffer.length
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  console.log('====================================================');
  console.log('TEST SUITE: WEBSITE-WIDE PERFORMANCE OPTIMIZATION');
  console.log('====================================================\n');

  // ---------------------------------------------------------------------------
  // 1. IMAGE OPTIMIZATION & FIDELITY INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('1. Image Optimization & Quality Retention Verification');

  const assetsDir = 'assets';
  let totalOrigBytes = 0;
  let totalWebpBytes = 0;
  let webpCount = 0;

  function scanImages(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanImages(fullPath);
      } else if (entry.name.endsWith('.webp')) {
        const base = entry.name.slice(0, -5);
        let orig = path.join(dir, base + '.png');
        if (!fs.existsSync(orig)) orig = path.join(dir, base + '.jpg');
        if (fs.existsSync(orig)) {
          totalOrigBytes += fs.statSync(orig).size;
          totalWebpBytes += fs.statSync(fullPath).size;
          webpCount++;
        }
      }
    }
  }

  scanImages(assetsDir);

  assert(webpCount >= 50, `At least 50 WebP variants generated (found ${webpCount})`);
  const savingsPct = ((1 - totalWebpBytes / totalOrigBytes) * 100).toFixed(1);
  const savedMB = ((totalOrigBytes - totalWebpBytes) / (1024 * 1024)).toFixed(2);
  console.log(`    Original media: ${(totalOrigBytes / (1024 * 1024)).toFixed(2)} MB -> WebP media: ${(totalWebpBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`    Total savings: ${savedMB} MB (${savingsPct}%)`);
  assert(parseFloat(savingsPct) > 75.0, `Bandwidth savings exceed 75% without resolution downscaling (achieved ${savingsPct}%)`);

  // Verify dimension parity for sample critical images
  const sampleChecks = [
    { orig: 'assets/images/asnat-khan-portrait.png', webp: 'assets/images/asnat-khan-portrait.webp' },
    { orig: 'assets/images/portfolio/presentations/presentation-01-elevate.png', webp: 'assets/images/portfolio/presentations/presentation-01-elevate.webp' },
    { orig: 'assets/images/portfolio/dieuxskin-desktop.png', webp: 'assets/images/portfolio/dieuxskin-desktop.webp' },
    { orig: 'assets/images/portfolio/raycast-desktop.png', webp: 'assets/images/portfolio/raycast-desktop.webp' }
  ];

  for (const sample of sampleChecks) {
    const metaOrig = await sharp(sample.orig).metadata();
    const metaWebp = await sharp(sample.webp).metadata();
    assert(
      metaOrig.width === metaWebp.width && metaOrig.height === metaWebp.height,
      `${path.basename(sample.orig)} maintains identical pixel resolution (${metaOrig.width}x${metaOrig.height})`
    );
  }

  // ---------------------------------------------------------------------------
  // 2. HTML PICTURE TAGS & LAYOUT SHIFT (CLS) DEFENSES
  // ---------------------------------------------------------------------------
  console.log('\n2. HTML Responsive Markup & Cumulative Layout Shift (CLS) Controls');

  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert(indexHtml.includes('<picture>'), 'index.html contains <picture> tags');
  assert(indexHtml.includes('assets/images/asnat-khan-portrait.webp'), 'index.html hero portrait serves WebP variant');
  assert(indexHtml.includes('fetchpriority="high"'), 'index.html hero portrait prioritizes LCP with fetchpriority="high"');
  assert(indexHtml.includes('decoding="async"'), 'index.html hero portrait has decoding="async"');
  assert(indexHtml.includes('width="1185"') && indexHtml.includes('height="1327"'), 'index.html hero portrait has explicit width and height dimensions to prevent CLS');
  assert(indexHtml.includes('review-apostlewelsh.webp'), 'index.html review 1 serves WebP');
  assert(indexHtml.includes('review-paul-johno.webp'), 'index.html review 2 serves WebP');
  assert(indexHtml.includes('review-tintintin.webp'), 'index.html review 3 serves WebP');

  const founderHtml = fs.readFileSync('founder-story.html', 'utf8');
  assert(founderHtml.includes('assets/images/asnat-khan-portrait.webp'), 'founder-story.html serves portrait WebP variant');
  assert(founderHtml.includes('width="1185"') && founderHtml.includes('height="1327"'), 'founder-story.html portrait has explicit width and height');

  const presHtml = fs.readFileSync('portfolio-presentations.html', 'utf8');
  assert(presHtml.includes('presentation-01-elevate.webp'), 'portfolio-presentations.html serves WebP for slide 1');
  assert(presHtml.includes('presentation-12-powerpoint-deck.webp'), 'portfolio-presentations.html serves WebP for slide 12');
  assert(presHtml.includes('loading="eager" fetchpriority="high"'), 'portfolio-presentations.html prioritizes slide 1 LCP with eager + fetchpriority="high"');
  assert(presHtml.includes('width="1536"') && presHtml.includes('height="1024"'), 'portfolio-presentations.html slides have explicit width and height');

  const portHtml = fs.readFileSync('portfolio.html', 'utf8');
  assert(portHtml.includes('dieuxskin-desktop.webp'), 'portfolio.html cards serve WebP source');
  assert(portHtml.includes('id="lightbox-preview-picture"'), 'portfolio.html lightbox desktop contains picture element');
  assert(portHtml.includes('id="lightbox-phone-picture"'), 'portfolio.html lightbox phone contains picture element');
  assert(portHtml.includes('width="1440"') && portHtml.includes('height="900"'), 'portfolio.html card images declare explicit dimensions');

  // ---------------------------------------------------------------------------
  // 3. NON-BLOCKING JAVASCRIPT & SCRIPT DEFERRAL
  // ---------------------------------------------------------------------------
  console.log('\n3. Non-blocking Scripts & Render-blocking Prevention');

  assert(indexHtml.includes('<script defer src="js/main.js"></script>'), 'index.html loads main.js with defer');
  assert(portHtml.includes('<script defer src="js/main.js"></script>'), 'portfolio.html loads main.js with defer');
  assert(portHtml.includes('<script defer src="js/portfolio.js"></script>'), 'portfolio.html loads portfolio.js with defer');
  assert(presHtml.includes('<script defer src="js/main.js"></script>'), 'portfolio-presentations.html loads main.js with defer');
  assert(presHtml.includes('<script defer src="js/presentations.js"></script>'), 'portfolio-presentations.html loads presentations.js with defer');

  const servicesHtml = fs.readFileSync('services.html', 'utf8');
  assert(servicesHtml.includes('<script defer src="js/main.js"></script>'), 'services.html loads main.js with defer');

  const quoteHtml = fs.readFileSync('get-quote.html', 'utf8');
  assert(quoteHtml.includes('<script defer src="js/main.js"></script>'), 'get-quote.html loads main.js with defer');

  // ---------------------------------------------------------------------------
  // 4. LIVE SERVER DELIVERY, COMPRESSION & CACHING
  // ---------------------------------------------------------------------------
  console.log('\n4. Live Server HTTP Compression, Caching, and Headers');

  // Stylesheet with gzip
  const cssRes = await request('http://localhost:8090/css/styles.css', { 'Accept-Encoding': 'gzip' });
  assert(cssRes.statusCode === 200, 'HTTP GET /css/styles.css returns 200 OK');
  assert(cssRes.headers['content-encoding'] === 'gzip', 'styles.css served with Content-Encoding: gzip');
  assert(cssRes.headers['cache-control'] && cssRes.headers['cache-control'].includes('public'), 'styles.css includes public caching header');
  assert(cssRes.rawLength < 45000, `styles.css wire transfer size compressed to ${(cssRes.rawLength / 1024).toFixed(1)} KB (down from 225 KB raw)`);

  // WebP Image
  const imgRes = await request('http://localhost:8090/assets/images/asnat-khan-portrait.webp');
  assert(imgRes.statusCode === 200, 'HTTP GET /assets/images/asnat-khan-portrait.webp returns 200 OK');
  assert(imgRes.headers['content-type'] === 'image/webp', 'asnat-khan-portrait.webp served with Content-Type: image/webp');
  assert(imgRes.headers['cache-control'] && imgRes.headers['cache-control'].includes('immutable'), 'Static image served with immutable Cache-Control');
  assert(imgRes.rawLength < 250000, `asnat-khan-portrait.webp transfer size is ${(imgRes.rawLength / 1024).toFixed(1)} KB (down from 1.7 MB PNG)`);

  // HTML Page
  const homeRes = await request('http://localhost:8090/');
  assert(homeRes.statusCode === 200, 'HTTP GET / returns 200 OK');
  assert(homeRes.headers['cache-control'] && homeRes.headers['cache-control'].includes('must-revalidate'), 'HTML root served with fresh revalidation caching');

  // Vercel config
  const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const hasStaticCache = vercelJson.headers.some(h => h.source === '/assets/(.*)' && h.headers.some(hdr => hdr.value.includes('immutable')));
  assert(hasStaticCache, 'vercel.json specifies immutable caching for /assets/(.*)');

  // ---------------------------------------------------------------------------
  // 5. PALETTE & BRAND INVARIANT CHECK
  // ---------------------------------------------------------------------------
  console.log('\n5. Design Token Compliance (Strict Prohibited Gold Check)');
  const stylesCss = fs.readFileSync('css/styles.css', 'utf8');
  assert(!stylesCss.includes('#D4AF37'), 'Zero occurrences of forbidden color #D4AF37 in styles.css');
  assert(!indexHtml.includes('#D4AF37'), 'Zero occurrences of forbidden color #D4AF37 in index.html');
  assert(!portHtml.includes('#D4AF37'), 'Zero occurrences of forbidden color #D4AF37 in portfolio.html');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
})();
