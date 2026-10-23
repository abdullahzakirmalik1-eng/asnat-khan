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
   03. FULL-SCREEN LIGHTBOX MODAL (INTERACTIVE FULL-PAGE SCROLL)
   -------------------------------------------------------------------------- */
function initPortfolioLightbox() {
  const modal = document.getElementById('portfolio-lightbox');
  const backdrop = document.getElementById('lightbox-backdrop');
  const closeBtn = document.getElementById('lightbox-close-btn');
  const titleEl = document.getElementById('lightbox-project-title');
  const metaEl = document.getElementById('lightbox-project-meta');
  const tagsEl = document.getElementById('lightbox-project-tags');
  const domainText = document.getElementById('lightbox-domain-text');
  const liveLink = document.getElementById('lightbox-live-link');
  const browserUrl = document.getElementById('lightbox-browser-url');
  const progressBar = document.getElementById('lightbox-progress-bar');
  const tourBtn = document.getElementById('lightbox-tour-btn');
  const scrollCue = document.getElementById('lightbox-scroll-cue');
  const topBtn = document.getElementById('lightbox-top-btn');

  const btnDesktop = document.getElementById('lightbox-btn-desktop');
  const btnMobile = document.getElementById('lightbox-btn-mobile');
  const browserFrame = document.getElementById('lightbox-browser-frame');
  const phoneFrame = document.getElementById('lightbox-phone-frame');
  const desktopViewport = document.getElementById('lightbox-scroll-viewport');
  const phoneViewport = document.getElementById('lightbox-phone-viewport');
  const previewImg = document.getElementById('lightbox-preview-img');
  const phoneImg = document.getElementById('lightbox-phone-img');

  if (!modal || !previewImg) return;

  let activeDesktopSrc = '';
  let activeMobileSrc = '';
  let activeMode = 'desktop';
  let isTouring = false;
  let tourAnimationId = null;

  const getActiveViewport = () => (activeMode === 'mobile') ? phoneViewport : desktopViewport;

  // Update progress bar & scroll indicator cues
  const updateScrollProgress = () => {
    const vp = getActiveViewport();
    if (!vp) return;

    const maxScroll = vp.scrollHeight - vp.clientHeight;
    const currentScroll = vp.scrollTop;
    const progress = maxScroll > 0 ? (currentScroll / maxScroll) * 100 : 0;

    if (progressBar) {
      progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }

    // Scroll cue visibility
    if (scrollCue) {
      if (currentScroll > 40) {
        scrollCue.classList.add('hidden');
      } else {
        scrollCue.classList.remove('hidden');
      }
    }

    // Back to top button visibility
    if (topBtn) {
      if (currentScroll > 320) {
        topBtn.classList.add('visible');
      } else {
        topBtn.classList.remove('visible');
      }
    }
  };

  // Auto-tour animation
  const stopAutoTour = () => {
    isTouring = false;
    if (tourAnimationId) {
      cancelAnimationFrame(tourAnimationId);
      tourAnimationId = null;
    }
    if (tourBtn) {
      tourBtn.classList.remove('is-active');
      const playIcon = tourBtn.querySelector('.tour-play-icon');
      const pauseIcon = tourBtn.querySelector('.tour-pause-icon');
      const textSpan = tourBtn.querySelector('span');
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (textSpan) textSpan.textContent = 'Auto Tour';
    }
  };

  const startAutoTour = () => {
    const vp = getActiveViewport();
    if (!vp) return;

    isTouring = true;
    if (tourBtn) {
      tourBtn.classList.add('is-active');
      const playIcon = tourBtn.querySelector('.tour-play-icon');
      const pauseIcon = tourBtn.querySelector('.tour-pause-icon');
      const textSpan = tourBtn.querySelector('span');
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
      if (textSpan) textSpan.textContent = 'Pause Tour';
    }

    const scrollSpeed = 1.75; // Pixels per frame for luxurious, readable glide

    const stepTour = () => {
      if (!isTouring) return;
      const currentVp = getActiveViewport();
      if (!currentVp) {
        stopAutoTour();
        return;
      }

      const maxScroll = currentVp.scrollHeight - currentVp.clientHeight;
      if (currentVp.scrollTop >= maxScroll - 2) {
        // Reached bottom - pause tour smoothly
        stopAutoTour();
        return;
      }

      currentVp.scrollTop += scrollSpeed;
      updateScrollProgress();
      tourAnimationId = requestAnimationFrame(stepTour);
    };

    tourAnimationId = requestAnimationFrame(stepTour);
  };

  const toggleAutoTour = () => {
    if (isTouring) {
      stopAutoTour();
    } else {
      startAutoTour();
    }
  };

  // Switch between Desktop browser and Mobile phone chassis
  const switchDeviceMode = (mode) => {
    stopAutoTour();
    activeMode = mode;

    if (mode === 'mobile') {
      if (browserFrame) browserFrame.style.display = 'none';
      if (phoneFrame) phoneFrame.style.display = 'flex';
      if (btnMobile) btnMobile.classList.add('active');
      if (btnDesktop) btnDesktop.classList.remove('active');
      if (phoneImg && activeMobileSrc) {
        phoneImg.src = activeMobileSrc;
      }
      setTimeout(updateScrollProgress, 50);
    } else {
      if (phoneFrame) phoneFrame.style.display = 'none';
      if (browserFrame) browserFrame.style.display = 'flex';
      if (btnDesktop) btnDesktop.classList.add('active');
      if (btnMobile) btnMobile.classList.remove('active');
      if (previewImg && activeDesktopSrc) {
        previewImg.src = activeDesktopSrc;
      }
      setTimeout(updateScrollProgress, 50);
    }
  };

  const openLightbox = (card) => {
    const name = card.getAttribute('data-name') || 'Case Study';
    const catBadge = card.querySelector('.card-category-badge')?.innerText || 'Client Work';
    const tierPill = card.querySelector('.card-tier-pill')?.innerText || '';
    const tags = Array.from(card.querySelectorAll('.card-tag')).map(t => t.innerText).join(' · ');
    const domain = (card.querySelector('.frame-url')?.innerText || '').trim();

    activeDesktopSrc = card.getAttribute('data-desktop') || '';
    activeMobileSrc = card.getAttribute('data-mobile') || '';

    // Inherit current device view from card
    const cardIsMobile = card.querySelector('.card-viewport')?.classList.contains('is-mobile-view');
    activeMode = cardIsMobile ? 'mobile' : 'desktop';

    if (titleEl) titleEl.innerText = name;
    if (metaEl) metaEl.innerText = `${catBadge} ${tierPill ? '· ' + tierPill : ''}`;
    if (tagsEl) tagsEl.innerText = tags;
    if (domainText) domainText.innerText = domain || 'Live Production';
    if (browserUrl) browserUrl.innerText = domain ? `https://${domain}` : 'https://asnatkhan.com/showcase';

    if (liveLink) {
      if (domain) {
        liveLink.href = `https://${domain}`;
        liveLink.style.display = 'inline-flex';
      } else {
        liveLink.style.display = 'none';
      }
    }

    // Set images with onload callbacks for dynamic scroll recalculation
    if (previewImg && activeDesktopSrc) {
      previewImg.onload = () => updateScrollProgress();
      previewImg.src = activeDesktopSrc;
    }
    if (phoneImg && activeMobileSrc) {
      phoneImg.onload = () => updateScrollProgress();
      phoneImg.src = activeMobileSrc;
    }

    // Reset viewports to top
    if (desktopViewport) desktopViewport.scrollTop = 0;
    if (phoneViewport) phoneViewport.scrollTop = 0;
    if (progressBar) progressBar.style.width = '0%';
    if (scrollCue) scrollCue.classList.remove('hidden');
    if (topBtn) topBtn.classList.remove('visible');

    stopAutoTour();
    switchDeviceMode(activeMode);

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus active viewport for immediate keyboard accessibility (PageDown, DownArrow)
    setTimeout(() => {
      const vp = getActiveViewport();
      if (vp) vp.focus();
    }, 100);
  };

  const closeLightbox = () => {
    stopAutoTour();
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // Scroll listeners on both viewports
  if (desktopViewport) {
    desktopViewport.addEventListener('scroll', updateScrollProgress, { passive: true });
    // If user interacts with scroll while tour is running, stop tour gently
    desktopViewport.addEventListener('wheel', () => { if (isTouring) stopAutoTour(); }, { passive: true });
    desktopViewport.addEventListener('touchstart', () => { if (isTouring) stopAutoTour(); }, { passive: true });
  }

  if (phoneViewport) {
    phoneViewport.addEventListener('scroll', updateScrollProgress, { passive: true });
    phoneViewport.addEventListener('wheel', () => { if (isTouring) stopAutoTour(); }, { passive: true });
    phoneViewport.addEventListener('touchstart', () => { if (isTouring) stopAutoTour(); }, { passive: true });
  }

  // Auto-tour button click
  if (tourBtn) {
    tourBtn.addEventListener('click', toggleAutoTour);
  }

  // Back to top button click
  if (topBtn) {
    topBtn.addEventListener('click', () => {
      stopAutoTour();
      const vp = getActiveViewport();
      if (vp) {
        vp.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // Device switcher buttons
  if (btnDesktop) {
    btnDesktop.addEventListener('click', () => switchDeviceMode('desktop'));
  }
  if (btnMobile) {
    btnMobile.addEventListener('click', () => switchDeviceMode('mobile'));
  }

  // Click triggers on cards (both direct and container delegation)
  const cardsContainer = document.getElementById('portfolio-cards-container');
  if (cardsContainer) {
    cardsContainer.addEventListener('click', (e) => {
      // Ignore clicks on device switcher buttons or inquiry links
      if (e.target.closest('.device-switcher') || e.target.closest('.card-inquire-link')) return;

      const card = e.target.closest('.portfolio-card');
      if (!card) return;

      if (e.target.closest('[data-action="open-lightbox"]') || 
          e.target.closest('.card-viewport') || 
          e.target.closest('.card-inspect-trigger')) {
        openLightbox(card);
      }
    });
  }

  // Close handlers
  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (backdrop) backdrop.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'Home') {
      e.preventDefault();
      const vp = getActiveViewport();
      if (vp) vp.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}
