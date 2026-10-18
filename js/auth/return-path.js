/**
 * Asnat Khan Studio — Return Path & Checkout State Preservation
 * 
 * Safely validates redirect targets after authentication to prevent open-redirect vulnerabilities.
 * Preserves non-sensitive checkout package selections across login and registration flows.
 */

// Approved internal destinations for customer redirection
const ALLOWED_DESTINATION_PREFIXES = [
  '/checkout',
  '/order',
  '/order-confirmation',
  '/admin',
  '/services',
  '/get-quote',
  '/founder-story',
  '/index.html',
  '/'
];

/**
 * Sanitizes and validates a candidate return URL.
 * Rejects external URLs, protocol-relative URLs, javascript: schemas, and unapproved routes.
 * 
 * @param {string|null} candidateUrl - The candidate redirect path
 * @param {string} defaultUrl - Safe default fallback URL
 * @returns {string} - Verified safe relative path
 */
export function sanitizeReturnUrl(candidateUrl, defaultUrl = '/checkout') {
  if (!candidateUrl || typeof candidateUrl !== 'string') {
    return defaultUrl;
  }

  const trimmed = candidateUrl.trim();

  // Reject empty or protocol-relative or external schemes
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return defaultUrl;
  }

  // Reject control chars or javascript/data schemes
  if (/[\x00-\x1F\x7F]|javascript:|data:|vbscript:/i.test(trimmed)) {
    return defaultUrl;
  }

  try {
    // Parse pathname using dummy base
    const parsed = new URL(trimmed, 'https://asnatkhan.internal');
    const pathname = parsed.pathname;

    const isAllowed = ALLOWED_DESTINATION_PREFIXES.some(prefix => {
      if (prefix === '/') {
        return pathname === '/' || pathname === '/index.html';
      }
      return pathname === prefix || pathname.startsWith(prefix + '/') || pathname.endsWith(prefix + '.html');
    });

    if (!isAllowed) {
      return defaultUrl;
    }

    // Return the relative path + search query (excluding sensitive params)
    const safeSearchParams = new URLSearchParams();
    parsed.searchParams.forEach((val, key) => {
      // Disallow any sensitive keys
      if (!['password', 'token', 'secret', 'key', 'auth'].includes(key.toLowerCase())) {
        safeSearchParams.append(key, val);
      }
    });

    const searchStr = safeSearchParams.toString();
    return parsed.pathname + (searchStr ? '?' + searchStr : '');
  } catch (err) {
    return defaultUrl;
  }
}

/**
 * Reads return destination from current query params or fallback.
 * Checks for ?returnUrl= or ?redirect= or ?next=
 * 
 * @param {string} defaultUrl
 * @returns {string}
 */
export function getReturnUrlFromLocation(defaultUrl = '/checkout') {
  if (typeof window === 'undefined') return defaultUrl;

  const urlParams = new URLSearchParams(window.location.search);
  const candidate = urlParams.get('returnUrl') || urlParams.get('redirect') || urlParams.get('next');
  const pkg = urlParams.get('pkg') || urlParams.get('packageId');

  let sanitized = sanitizeReturnUrl(candidate, defaultUrl);

  // If a package is specified in the current URL and not yet present in sanitized returnUrl
  if (pkg && !sanitized.includes('pkg=') && !sanitized.includes('packageId=')) {
    const separator = sanitized.includes('?') ? '&' : '?';
    sanitized = `${sanitized}${separator}pkg=${encodeURIComponent(pkg)}`;
  }

  return sanitized;
}

/**
 * Builds a cross-link between auth pages (e.g. from /login to /register or /forgot-password)
 * preserving safe returnUrl and package selection without data loss.
 * 
 * @param {string} targetAuthPage - e.g. '/register' or '/login' or '/forgot-password'
 * @returns {string} - Target URL with preserved context
 */
export function buildAuthCrossLink(targetAuthPage) {
  if (typeof window === 'undefined') return targetAuthPage;

  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get('returnUrl') || urlParams.get('redirect') || urlParams.get('next');
  const pkg = urlParams.get('pkg') || urlParams.get('packageId');

  const newParams = new URLSearchParams();
  if (returnUrl) {
    newParams.set('returnUrl', sanitizeReturnUrl(returnUrl));
  }
  if (pkg) {
    newParams.set('pkg', pkg);
  }

  const queryStr = newParams.toString();
  return queryStr ? `${targetAuthPage}?${queryStr}` : targetAuthPage;
}
