/**
 * Asnat Khan — Floating WhatsApp Contact Button Component
 * Reusable, accessible, and responsive component for public pages
 */

(function () {
  'use strict';

  const CONFIG = {
    phone: '447848180022',
    message: 'Hi! I’m interested in your website services. Could you please help me get started?',
    accessibleLabel: 'Chat with us on WhatsApp',
    tooltipText: 'Chat with us on WhatsApp'
  };

  /**
   * Determine if current page is an admin or customer dashboard view
   */
  function isExcludedPage() {
    if (typeof document === 'undefined') return true;

    const body = document.body;
    if (!body) return false;

    // Check body class indicators
    if (
      body.classList.contains('admin-body') ||
      body.classList.contains('page-admin') ||
      body.classList.contains('page-order-confirmation')
    ) {
      return true;
    }

    // Check admin or customer dashboard unique elements
    if (
      document.getElementById('admin-sidebar') ||
      document.querySelector('.admin-layout') ||
      document.getElementById('confirmation-view') ||
      document.getElementById('dashboard-paused-banner')
    ) {
      return true;
    }

    // Check path for admin or order-confirmation
    if (typeof window !== 'undefined' && window.location) {
      const path = (window.location.pathname || '').toLowerCase();
      if (
        path.startsWith('/admin') ||
        path.includes('order-confirmation')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Builds the official WhatsApp SVG icon element
   */
  function createWhatsAppIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '28');
    svg.setAttribute('height', '28');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('whatsapp-icon-svg');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    // Official WhatsApp vector outline
    path.setAttribute(
      'd',
      'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'
    );
    svg.appendChild(path);
    return svg;
  }

  /**
   * Initializes and injects the floating WhatsApp button
   */
  function initWhatsAppFloatingButton() {
    // Prevent execution on excluded pages
    if (isExcludedPage()) return;

    // Do not add if already exists in DOM
    if (document.getElementById('whatsapp-float-btn')) return;

    // Destination URL with digits-only phone and URL-encoded message
    const destinationUrl =
      'https://wa.me/' +
      CONFIG.phone +
      '?text=' +
      encodeURIComponent(CONFIG.message);

    // Wrapper container
    const wrap = document.createElement('aside');
    wrap.className = 'whatsapp-float-wrap';
    wrap.setAttribute('aria-label', 'WhatsApp quick contact');

    // Interactive button link
    const link = document.createElement('a');
    link.href = destinationUrl;
    link.className = 'whatsapp-float-btn';
    link.id = 'whatsapp-float-btn';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.setAttribute('aria-label', CONFIG.accessibleLabel);

    // Discreet tooltip for desktop hover/focus
    const tooltip = document.createElement('span');
    tooltip.className = 'whatsapp-float-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.textContent = CONFIG.tooltipText;

    // Icon wrapper
    const iconSpan = document.createElement('span');
    iconSpan.className = 'whatsapp-float-icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.appendChild(createWhatsAppIcon());

    link.appendChild(tooltip);
    link.appendChild(iconSpan);
    wrap.appendChild(link);

    document.body.appendChild(wrap);
  }

  // Expose globally for modular usage
  if (typeof window !== 'undefined') {
    window.initWhatsAppFloatingButton = initWhatsAppFloatingButton;
  }

  // Auto-initialize when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWhatsAppFloatingButton);
    } else {
      initWhatsAppFloatingButton();
    }
  }
})();
