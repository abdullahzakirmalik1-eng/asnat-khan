import fs from 'fs';
import path from 'path';

// Helper to replace once with error verification
function replaceExact(content, search, replacement, desc) {
  if (!content.includes(search)) {
    console.warn(`Warning: Target snippet not found for: ${desc}`);
    return content;
  }
  return content.replace(search, replacement);
}

// -----------------------------------------------------------------------------
// 1. Optimize portfolio.html
// -----------------------------------------------------------------------------
let portfolioHtml = fs.readFileSync('portfolio.html', 'utf8');

// Lightbox desktop and phone frames
const oldLightboxDesktop = `<div class="lightbox-scroll-viewport" id="lightbox-scroll-viewport" tabindex="0" role="region" aria-label="Scrollable Website Preview">
            <img src="" alt="High-Resolution Full Website Preview" id="lightbox-preview-img" class="full-scroll-img">
          </div>`;
const newLightboxDesktop = `<div class="lightbox-scroll-viewport" id="lightbox-scroll-viewport" tabindex="0" role="region" aria-label="Scrollable Website Preview">
            <picture id="lightbox-preview-picture">
              <source type="image/webp" id="lightbox-preview-webp" srcset="">
              <img src="" alt="High-Resolution Full Website Preview" id="lightbox-preview-img" class="full-scroll-img">
            </picture>
          </div>`;
portfolioHtml = replaceExact(portfolioHtml, oldLightboxDesktop, newLightboxDesktop, 'portfolio.html lightbox desktop');

const oldLightboxPhone = `<div class="lightbox-phone-viewport" id="lightbox-phone-viewport" tabindex="0" role="region" aria-label="Scrollable Mobile Website Preview">
            <img src="" alt="High-Resolution Mobile Website Preview" id="lightbox-phone-img" class="full-scroll-img">
          </div>`;
const newLightboxPhone = `<div class="lightbox-phone-viewport" id="lightbox-phone-viewport" tabindex="0" role="region" aria-label="Scrollable Mobile Website Preview">
            <picture id="lightbox-phone-picture">
              <source type="image/webp" id="lightbox-phone-webp" srcset="">
              <img src="" alt="High-Resolution Mobile Website Preview" id="lightbox-phone-img" class="full-scroll-img">
            </picture>
          </div>`;
portfolioHtml = replaceExact(portfolioHtml, oldLightboxPhone, newLightboxPhone, 'portfolio.html lightbox phone');

// Wrap card images with <picture class="card-picture">
let portfolioCardMatches = 0;
portfolioHtml = portfolioHtml.replace(
  /<div class="card-viewport"([^>]*)>\s*<img src="(assets\/images\/portfolio\/[^"]+)" alt="([^"]+)" loading="lazy">\s*<div class="card-viewport-overlay">/g,
  (match, vpAttrs, imgSrc, alt) => {
    portfolioCardMatches++;
    const webpSrc = imgSrc.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    // Default desktop presentation dimensions for cards
    return `<div class="card-viewport"${vpAttrs}>
              <picture class="card-picture">
                <source type="image/webp" srcset="${webpSrc}">
                <img src="${imgSrc}" alt="${alt}" width="1440" height="900" loading="lazy" decoding="async">
              </picture>
              <div class="card-viewport-overlay">`;
  }
);

// Scripts defer
portfolioHtml = replaceExact(portfolioHtml, '<script src="js/main.js"></script>', '<script defer src="js/main.js"></script>', 'portfolio.html main.js defer');
portfolioHtml = replaceExact(portfolioHtml, '<script src="js/portfolio.js"></script>', '<script defer src="js/portfolio.js"></script>', 'portfolio.html portfolio.js defer');

fs.writeFileSync('portfolio.html', portfolioHtml, 'utf8');
console.log(`portfolio.html: wrapped ${portfolioCardMatches} card images in WebP picture elements.`);


// -----------------------------------------------------------------------------
// 2. Optimize portfolio-presentations.html & portfolio/presentations/index.html
// -----------------------------------------------------------------------------
function optimizePresentationsHtml(filePath) {
  let presHtml = fs.readFileSync(filePath, 'utf8');
  let presMatches = 0;

  // Replace each presentation mockup frame image
  presHtml = presHtml.replace(
    /<div class="presentation-mockup-frame" data-index="(\d+)">\s*<img\s+src="([^"]+)"\s+alt="([^"]+)"\s+width="153[56]"\s+height="1024"\s+(loading="[^"]+")\s+(fetchpriority="[^"]+"\s+)?(decoding="[^"]+"\s+)?class="presentation-mockup-img"\s*>\s*<\/div>/g,
    (match, idx, imgSrc, alt, loadingAttr, fetchPriorityAttr) => {
      presMatches++;
      const webpSrc = imgSrc.replace(/\.png$/i, '.webp');
      const isEager = parseInt(idx, 10) === 1;
      const loading = isEager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
      return `<div class="presentation-mockup-frame" data-index="${idx}">
        <picture>
          <source type="image/webp" srcset="${webpSrc}">
          <img 
            src="${imgSrc}" 
            alt="${alt}" 
            width="1536" 
            height="1024" 
            ${loading} 
            decoding="async" 
            class="presentation-mockup-img"
          >
        </picture>
      </div>`;
    }
  );

  presHtml = replaceExact(presHtml, '<script src="js/main.js"></script>', '<script defer src="js/main.js"></script>', `${filePath} main.js defer`);
  presHtml = replaceExact(presHtml, '<script src="js/presentations.js"></script>', '<script defer src="js/presentations.js"></script>', `${filePath} presentations.js defer`);

  fs.writeFileSync(filePath, presHtml, 'utf8');
  console.log(`${filePath}: wrapped ${presMatches} presentation mockups in WebP picture elements.`);
}

optimizePresentationsHtml('portfolio-presentations.html');
optimizePresentationsHtml('portfolio/presentations/index.html');


// -----------------------------------------------------------------------------
// 3. Optimize index.html
// -----------------------------------------------------------------------------
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Hero portrait
const oldHeroPortrait = `<div class="portrait-frame">
              <img 
                src="assets/images/asnat-khan-portrait.png" 
                alt="Asnat Khan — Professional Website Design and Development Lead" 
                class="hero-portrait-img"
                width="1185" 
                height="1327"
                loading="eager"
                decoding="async">
            </div>`;
const newHeroPortrait = `<div class="portrait-frame">
              <picture>
                <source type="image/webp" srcset="assets/images/asnat-khan-portrait.webp">
                <img 
                  src="assets/images/asnat-khan-portrait.png" 
                  alt="Asnat Khan — Professional Website Design and Development Lead" 
                  class="hero-portrait-img"
                  width="1185" 
                  height="1327"
                  loading="eager"
                  fetchpriority="high"
                  decoding="async">
              </picture>
            </div>`;
indexHtml = replaceExact(indexHtml, oldHeroPortrait, newHeroPortrait, 'index.html hero portrait');

// Review screenshots
const reviews = [
  { file: 'review-apostlewelsh.jpg', alt: 'Direct feedback from client apostlewelsh praising communication, aesthetic execution and turn-around time', w: 1080, h: 263 },
  { file: 'review-paul-johno.jpg', alt: 'Authentic 5-star review from paul_johno highlighting professional direction and creative standard', w: 1080, h: 206 },
  { file: 'review-tintintin.jpg', alt: 'Review from tintintin praising responsive layout delivery and exceptional service quality', w: 1080, h: 216 }
];

for (const r of reviews) {
  const oldReviewSnippet = `<img \n                      src="assets/images/${r.file}" \n                      alt="${r.alt}" \n                      class="review-proof-img" \n                      loading="lazy">`;
  const newReviewSnippet = `<picture>
                      <source type="image/webp" srcset="assets/images/${r.file.replace('.jpg', '.webp')}">
                      <img 
                        src="assets/images/${r.file}" 
                        alt="${r.alt}" 
                        class="review-proof-img" 
                        width="${r.w}" 
                        height="${r.h}" 
                        loading="lazy" 
                        decoding="async">
                    </picture>`;
  indexHtml = replaceExact(indexHtml, oldReviewSnippet, newReviewSnippet, `index.html ${r.file}`);
}

indexHtml = replaceExact(indexHtml, '<script src="js/main.js"></script>', '<script defer src="js/main.js"></script>', 'index.html main.js defer');
fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('index.html: optimized hero portrait and review images.');


// -----------------------------------------------------------------------------
// 4. Optimize founder-story.html
// -----------------------------------------------------------------------------
let founderHtml = fs.readFileSync('founder-story.html', 'utf8');

const oldFounderPortrait = `<div class="founder-portrait-frame">
              <div class="portrait-aura" aria-hidden="true"></div>
              <img 
                src="assets/images/asnat-khan-portrait.png" 
                alt="Asnat Khan — Founder &amp; Studio Lead" 
                class="founder-portrait-img"
                width="1185" 
                height="1327"
                loading="lazy">
              <div class="founder-portrait-caption">`;
const newFounderPortrait = `<div class="founder-portrait-frame">
              <div class="portrait-aura" aria-hidden="true"></div>
              <picture>
                <source type="image/webp" srcset="assets/images/asnat-khan-portrait.webp">
                <img 
                  src="assets/images/asnat-khan-portrait.png" 
                  alt="Asnat Khan — Founder &amp; Studio Lead" 
                  class="founder-portrait-img"
                  width="1185" 
                  height="1327"
                  loading="lazy"
                  decoding="async">
              </picture>
              <div class="founder-portrait-caption">`;
founderHtml = replaceExact(founderHtml, oldFounderPortrait, newFounderPortrait, 'founder-story.html portrait');
founderHtml = replaceExact(founderHtml, '<script src="js/main.js"></script>', '<script defer src="js/main.js"></script>', 'founder-story.html main.js defer');
fs.writeFileSync('founder-story.html', founderHtml, 'utf8');
console.log('founder-story.html: optimized portrait and script deferral.');


// -----------------------------------------------------------------------------
// 5. Defer scripts across remaining pages
// -----------------------------------------------------------------------------
const otherPages = [
  'services.html',
  'get-quote.html',
  'terms-and-conditions.html',
  'privacy-policy.html',
  'ownership-statement.html',
  'cancellation-return-refund-policy.html',
  'cart.html',
  'checkout.html',
  'order.html',
  'login.html',
  'register.html',
  'forgot-password.html',
  'reset-password.html',
  'verify-email.html'
];

for (const page of otherPages) {
  if (!fs.existsSync(page)) continue;
  let pageHtml = fs.readFileSync(page, 'utf8');
  let changed = false;

  if (pageHtml.includes('<script src="js/main.js"></script>')) {
    pageHtml = pageHtml.replace('<script src="js/main.js"></script>', '<script defer src="js/main.js"></script>');
    changed = true;
  }
  if (pageHtml.includes('<script src="js/whatsapp-button.js"></script>')) {
    pageHtml = pageHtml.replace('<script src="js/whatsapp-button.js"></script>', '<script defer src="js/whatsapp-button.js"></script>');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(page, pageHtml, 'utf8');
    console.log(`${page}: added script defer.`);
  }
}

console.log('Optimization script completed successfully!');
