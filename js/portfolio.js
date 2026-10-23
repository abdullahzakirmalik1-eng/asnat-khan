/**
 * Asnat Khan — Portfolio Showcase Interactive Controller
 * Handles Category Filtering, Real-Time Search, Live Device Switcher & Lightbox Inspection
 */

document.addEventListener('DOMContentLoaded', () => {
  initPortfolioFilters();
  initDeviceSwitchers();
  initPortfolioLightbox();
});

/* --------------------------------------------------------------------------
   01. CATEGORY FILTERING & REAL-TIME SEARCH
   -------------------------------------------------------------------------- */
function initPortfolioFilters() {
  const filterBtns = document.querySelectorAll('.portfolio-filter-btn');
  const searchInput = document.getElementById('portfolio-search');
  const cards = document.querySelectorAll('.portfolio-card');
  const emptyState = document.getElementById('portfolio-empty');
  const resetBtn = document.getElementById('reset-filter-btn');

  if (!cards.length) return;

  let currentCategory = 'all';
  let currentSearchQuery = '';

  const applyFilters = () => {
    let visibleCount = 0;

    cards.forEach(card => {
      const category = card.getAttribute('data-category');
      const name = (card.getAttribute('data-name') || '').toLowerCase();
      const tags = (card.getAttribute('data-tags') || '').toLowerCase();
      const textContent = card.innerText.toLowerCase();

      const matchesCategory = (currentCategory === 'all' || category === currentCategory);
      const matchesSearch = !currentSearchQuery || 
        name.includes(currentSearchQuery) || 
        tags.includes(currentSearchQuery) || 
        textContent.includes(currentSearchQuery);

      if (matchesCategory && matchesSearch) {
        card.style.display = '';
        card.classList.add('is-revealed');
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (emptyState) {
      if (visibleCount === 0) {
        emptyState.classList.add('show');
      } else {
        emptyState.classList.remove('show');
      }
    }
  };

  // Filter Buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      currentCategory = btn.getAttribute('data-filter') || 'all';
      applyFilters();
    });
  });

  // Search Input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  // Reset Button in Empty State
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentCategory = 'all';
      currentSearchQuery = '';
      if (searchInput) searchInput.value = '';
      filterBtns.forEach(b => {
        if (b.getAttribute('data-filter') === 'all') {
          b.classList.add('active');
          b.setAttribute('aria-selected', 'true');
        } else {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        }
      });
      applyFilters();
    });
  }
}

/* --------------------------------------------------------------------------
   02. DEVICE SWITCHERS (DESKTOP / MOBILE PREVIEWS ON CARDS)
   -------------------------------------------------------------------------- */
function initDeviceSwitchers() {
  const cards = document.querySelectorAll('.portfolio-card');

  cards.forEach(card => {
    const switcher = card.querySelector('.device-switcher');
    const viewport = card.querySelector('.card-viewport');
    const img = viewport ? viewport.querySelector('img') : null;
    const desktopSrc = card.getAttribute('data-desktop');
    const mobileSrc = card.getAttribute('data-mobile');

    if (!switcher || !viewport || !img || !desktopSrc || !mobileSrc) return;

    const btns = switcher.querySelectorAll('.device-btn');

    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.getAttribute('data-mode');

        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (mode === 'mobile') {
          viewport.classList.add('is-mobile-view');
          img.src = mobileSrc;
        } else {
          viewport.classList.remove('is-mobile-view');
          img.src = desktopSrc;
        }
      });
    });
  });
}

/* --------------------------------------------------------------------------
   03. FULL-SCREEN LIGHTBOX MODAL
   -------------------------------------------------------------------------- */
function initPortfolioLightbox() {
  const modal = document.getElementById('portfolio-lightbox');
  const backdrop = document.getElementById('lightbox-backdrop');
  const closeBtn = document.getElementById('lightbox-close-btn');
  const titleEl = document.getElementById('lightbox-project-title');
  const metaEl = document.getElementById('lightbox-project-meta');
  const tagsEl = document.getElementById('lightbox-project-tags');
  const previewImg = document.getElementById('lightbox-preview-img');
  const bodyEl = document.getElementById('lightbox-body');
  const btnDesktop = document.getElementById('lightbox-btn-desktop');
  const btnMobile = document.getElementById('lightbox-btn-mobile');

  if (!modal || !previewImg) return;

  let activeDesktopSrc = '';
  let activeMobileSrc = '';
  let activeMode = 'desktop';

  const openLightbox = (card) => {
    const name = card.getAttribute('data-name') || 'Case Study';
    const catBadge = card.querySelector('.card-category-badge')?.innerText || 'Client Work';
    const tierPill = card.querySelector('.card-tier-pill')?.innerText || '';
    const tags = Array.from(card.querySelectorAll('.card-tag')).map(t => t.innerText).join(' · ');

    activeDesktopSrc = card.getAttribute('data-desktop') || '';
    activeMobileSrc = card.getAttribute('data-mobile') || '';

    // Inherit current device mode from card if mobile was active
    const cardIsMobile = card.querySelector('.card-viewport')?.classList.contains('is-mobile-view');
    activeMode = cardIsMobile ? 'mobile' : 'desktop';

    if (titleEl) titleEl.innerText = name;
    if (metaEl) metaEl.innerText = `${catBadge} ${tierPill ? '· ' + tierPill : ''}`;
    if (tagsEl) tagsEl.innerText = tags;

    updateLightboxImage();

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const updateLightboxImage = () => {
    if (activeMode === 'mobile' && activeMobileSrc) {
      previewImg.src = activeMobileSrc;
      if (bodyEl) bodyEl.classList.add('is-mobile');
      if (btnMobile) btnMobile.classList.add('active');
      if (btnDesktop) btnDesktop.classList.remove('active');
    } else {
      previewImg.src = activeDesktopSrc;
      if (bodyEl) bodyEl.classList.remove('is-mobile');
      if (btnDesktop) btnDesktop.classList.add('active');
      if (btnMobile) btnMobile.classList.remove('active');
    }
  };

  const closeLightbox = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // Click triggers on cards
  const cards = document.querySelectorAll('.portfolio-card');
  cards.forEach(card => {
    const triggerElements = card.querySelectorAll('[data-action="open-lightbox"]');
    triggerElements.forEach(el => {
      el.addEventListener('click', () => openLightbox(card));
    });
  });

  // Lightbox device toggles
  if (btnDesktop) {
    btnDesktop.addEventListener('click', () => {
      activeMode = 'desktop';
      updateLightboxImage();
    });
  }
  if (btnMobile) {
    btnMobile.addEventListener('click', () => {
      activeMode = 'mobile';
      updateLightboxImage();
    });
  }

  // Close handlers
  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (backdrop) backdrop.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeLightbox();
    }
  });
}
