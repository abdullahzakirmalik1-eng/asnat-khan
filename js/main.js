/**
 * Asnat Khan — Premium Personal Digital Studio Homepage
 * Interactive & Accessibility Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initMobileDrawer();
  initNavDropdowns();
  initScrollSpy();
  initScrollReveals();
  initReviewCarousel();
  initReviewLightbox();
  initProjectModal();
  initFaqAccordion();
  initQuotePage();
  initWhatsAppFloatingButton();
});

/* --------------------------------------------------------------------------
   01. STICKY HEADER & SCROLL DETECTION
   -------------------------------------------------------------------------- */
function initStickyHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* --------------------------------------------------------------------------
   02. MOBILE DRAWER NAVIGATION
   -------------------------------------------------------------------------- */
function initMobileDrawer() {
  const toggleBtn = document.getElementById('nav-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('drawer-close');
  const backdrop = document.getElementById('drawer-backdrop');
  const drawerLinks = document.querySelectorAll('.drawer-link');

  if (!toggleBtn || !drawer) return;

  const openDrawer = () => {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  drawerLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });
}

/* --------------------------------------------------------------------------
   02B. PORTFOLIO NAVIGATION DROPDOWNS (DESKTOP & MOBILE DRAWER)
   -------------------------------------------------------------------------- */
function initNavDropdowns() {
  // Desktop Caret Toggle
  const dropdownItems = document.querySelectorAll('.nav-item-dropdown');
  dropdownItems.forEach(item => {
    const caret = item.querySelector('.nav-dropdown-caret');
    if (!caret) return;

    caret.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = item.classList.toggle('is-open');
      caret.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  // Close desktop dropdown on outside click or Escape
  document.addEventListener('click', (e) => {
    dropdownItems.forEach(item => {
      if (!item.contains(e.target)) {
        item.classList.remove('is-open');
        const caret = item.querySelector('.nav-dropdown-caret');
        if (caret) caret.setAttribute('aria-expanded', 'false');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdownItems.forEach(item => {
        item.classList.remove('is-open');
        const caret = item.querySelector('.nav-dropdown-caret');
        if (caret) caret.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Mobile Drawer Submenu Dropdown Toggle
  const drawerDropdownToggles = document.querySelectorAll('.drawer-dropdown-toggle');
  drawerDropdownToggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !isExpanded ? 'true' : 'false');

      const parentItem = btn.closest('.drawer-item-dropdown');
      if (parentItem) {
        const submenu = parentItem.querySelector('.drawer-submenu');
        if (submenu) {
          submenu.classList.toggle('is-open', !isExpanded);
        }
      }
    });
  });
}

/* --------------------------------------------------------------------------
   03. SCROLL SPY & ACTIVE NAV HIGHLIGHT
   -------------------------------------------------------------------------- */
function initScrollSpy() {
  if (
    document.body.classList.contains('page-founder-story') || 
    document.body.classList.contains('page-services') || 
    document.body.classList.contains('page-get-quote') ||
    document.body.classList.contains('page-portfolio') ||
    document.body.classList.contains('page-portfolio-presentations')
  ) {
    // Keep active navigation item stable on dedicated subpages
    return;
  }

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const drawerLinks = document.querySelectorAll('.drawer-link');

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });

        drawerLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, {
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  });

  sections.forEach(section => observer.observe(section));
}

/* --------------------------------------------------------------------------
   04. SCROLL REVEAL ANIMATIONS
   -------------------------------------------------------------------------- */
function initScrollReveals() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal-item');

  if (prefersReducedMotion || !revealItems.length) {
    revealItems.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  document.body.classList.add('js-ready');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.1
  });

  revealItems.forEach((el, index) => {
    el.style.transitionDelay = `${(index % 4) * 80}ms`;
    observer.observe(el);
  });
}

/* --------------------------------------------------------------------------
   05. AUTHENTIC REVIEW SCREENSHOTS CAROUSEL
   -------------------------------------------------------------------------- */
function initReviewCarousel() {
  const slides = document.querySelectorAll('.review-slide');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const dots = document.querySelectorAll('.dot-btn');
  const carouselContainer = document.getElementById('reviews-carousel');

  if (!slides.length) return;

  let currentIndex = 0;

  const showSlide = (index) => {
    if (index < 0) {
      currentIndex = slides.length - 1;
    } else if (index >= slides.length) {
      currentIndex = 0;
    } else {
      currentIndex = index;
    }

    slides.forEach((slide, i) => {
      if (i === currentIndex) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    dots.forEach((dot, i) => {
      if (i === currentIndex) {
        dot.classList.add('active');
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.classList.remove('active');
        dot.removeAttribute('aria-current');
      }
    });
  };

  if (prevBtn) {
    prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.getAttribute('data-index'), 10);
      showSlide(idx);
    });
  });

  // Touch Swipe Support for Mobile
  if (carouselContainer) {
    let startX = 0;
    let endX = 0;

    carouselContainer.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    carouselContainer.addEventListener('touchend', (e) => {
      endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          showSlide(currentIndex + 1); // swipe left -> next
        } else {
          showSlide(currentIndex - 1); // swipe right -> prev
        }
      }
    }, { passive: true });
  }
}

/* --------------------------------------------------------------------------
   06. REVIEW SCREENSHOT LIGHTBOX
   -------------------------------------------------------------------------- */
function initReviewLightbox() {
  const lightbox = document.getElementById('review-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const closeBtn = document.getElementById('lightbox-close');
  const backdrop = document.getElementById('lightbox-backdrop');
  const triggers = document.querySelectorAll('.review-img-trigger');

  if (!lightbox || !lightboxImg) return;

  const openLightbox = (src) => {
    lightboxImg.src = src;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => {
      lightboxImg.src = '';
    }, 200);
  };

  triggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const fullSrc = trigger.getAttribute('data-full');
      if (fullSrc) openLightbox(fullSrc);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (backdrop) backdrop.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) {
      closeLightbox();
    }
  });
}

/* --------------------------------------------------------------------------
   07. PROJECT INQUIRY MODAL ("START A PROJECT →")
   -------------------------------------------------------------------------- */
function initProjectModal() {
  const modal = document.getElementById('project-modal');
  const closeBtn = document.getElementById('project-modal-close');
  const backdrop = document.getElementById('project-modal-backdrop');
  const triggers = document.querySelectorAll('.open-project-modal');

  if (!modal) return;

  const openModal = (selectedPackage = '') => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // If a package was selected from pricing cards, pre-fill / check the corresponding option
    if (selectedPackage) {
      const detailsField = modal.querySelector('#project-details');
      if (detailsField && (!detailsField.value || detailsField.value.startsWith('Selected Package:'))) {
        detailsField.value = `Selected Package: ${selectedPackage.toUpperCase()}\n\nPlease share your timeline and any specific requirements: `;
      }
      const checkboxes = modal.querySelectorAll('input[name="services"]');
      if (checkboxes.length) {
        if (selectedPackage === 'basic' || selectedPackage === 'standard' || selectedPackage === 'ecommerce') {
          checkboxes.forEach(cb => {
            if (cb.value === 'complete') cb.checked = true;
          });
        }
      }
    }

    const firstInput = modal.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 150);
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  triggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pkg = btn.getAttribute('data-package') || '';
      openModal(pkg);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  window.handleProjectSubmit = function(form) {
    const statusBox = document.getElementById('form-status');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>TRANSMITTING...</span>';
    }

    setTimeout(() => {
      if (statusBox) {
        statusBox.classList.add('success');
        statusBox.textContent = "Thank you! Your project inquiry has been received. Asnat Khan will review your scope and follow up within a few hours.";
      }
      form.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>INQUIRY SENT</span>';
      }
    }, 800);
  };
}

/* --------------------------------------------------------------------------
   08. FAQ ACCORDION ENGINE
   -------------------------------------------------------------------------- */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-accordion details');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const summary = item.querySelector('summary');
    if (!summary) return;

    summary.addEventListener('click', (e) => {
      // Optional smooth auto-close of other accordion items for clean focus
      if (!item.hasAttribute('open')) {
        faqItems.forEach(other => {
          if (other !== item && other.hasAttribute('open')) {
            other.removeAttribute('open');
          }
        });
      }
    });
  });
}

/* --------------------------------------------------------------------------
   09. GET QUOTE PAGE ENGINE (.page-get-quote)
   -------------------------------------------------------------------------- */
function initQuotePage() {
  const quoteForm = document.getElementById('quote-form');
  if (!quoteForm) return;

  const stepPanels = document.querySelectorAll('.form-step-panel');
  const progressItems = document.querySelectorAll('.progress-step-item');
  const progressBtns = document.querySelectorAll('.progress-step-btn');
  const errorBanner = document.getElementById('quote-error-banner');
  const errorMessage = document.getElementById('quote-error-message');
  const errorRetryBtn = document.getElementById('error-retry-btn');
  const successPanel = document.getElementById('quote-success-panel');
  const submitBtn = document.getElementById('submit-quote-btn');
  const formCard = document.getElementById('quote-form-card');

  let currentStep = 1;
  let maxStepReached = 1;

  // Pre-fill package or project type from URL query string (e.g. ?package=standard)
  const urlParams = new URLSearchParams(window.location.search);
  const pkgParam = urlParams.get('package');
  if (pkgParam) {
    const pkgInput = quoteForm.querySelector(`input[name="package"][value="${pkgParam.toLowerCase()}"]`);
    if (pkgInput) {
      pkgInput.checked = true;
      const card = pkgInput.closest('.package-option-card');
      if (card) {
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');
      }
    }
  }

  const typeParam = urlParams.get('type');
  if (typeParam) {
    const typeInput = quoteForm.querySelector(`input[name="projectType"][value="${typeParam.toLowerCase()}"]`);
    if (typeInput) {
      typeInput.checked = true;
      const card = typeInput.closest('.quote-card-option');
      if (card) {
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');
      }
    }
  }

  // Radio card single-select controller
  function setupRadioCards(selector) {
    const cards = quoteForm.querySelectorAll(selector);
    cards.forEach(card => {
      const radio = card.querySelector('input[type="radio"]');
      if (!radio) return;

      const updateState = () => {
        cards.forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');
        radio.checked = true;
      };

      card.addEventListener('click', (e) => {
        updateState();
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          updateState();
        }
      });
    });
  }

  setupRadioCards('.quote-card-option');
  setupRadioCards('.package-option-card');
  setupRadioCards('.budget-pill-card');
  setupRadioCards('.timeline-pill-card');

  // Checkbox pills controller
  const checkPills = quoteForm.querySelectorAll('.quote-pill-check');
  checkPills.forEach(pill => {
    const checkbox = pill.querySelector('input[type="checkbox"]');
    if (!checkbox) return;

    const toggle = () => {
      checkbox.checked = !checkbox.checked;
      if (checkbox.checked) {
        pill.classList.add('selected');
        pill.setAttribute('aria-checked', 'true');
      } else {
        pill.classList.remove('selected');
        pill.setAttribute('aria-checked', 'false');
      }
    };

    pill.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });

    pill.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
    });
  });

  // Step Validation
  function validateStep(step) {
    if (step === 1) {
      const nameField = document.getElementById('quote-name');
      const emailField = document.getElementById('quote-email');
      const nameError = document.getElementById('name-error');
      const emailError = document.getElementById('email-error');
      let valid = true;

      if (!nameField.value.trim()) {
        nameField.classList.add('input-error');
        nameError.textContent = 'Please enter your name.';
        valid = false;
      } else {
        nameField.classList.remove('input-error');
        nameError.textContent = '';
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailField.value.trim() || !emailRegex.test(emailField.value.trim())) {
        emailField.classList.add('input-error');
        emailError.textContent = 'Please enter a valid email address.';
        valid = false;
      } else {
        emailField.classList.remove('input-error');
        emailError.textContent = '';
      }

      return valid;
    }

    if (step === 4) {
      const confirmBox = document.getElementById('quote-confirm');
      const confirmError = document.getElementById('confirm-error');
      if (!confirmBox.checked) {
        confirmError.textContent = 'Please confirm that your provided information is accurate.';
        return false;
      } else {
        confirmError.textContent = '';
      }
    }

    return true;
  }

  // Realtime cleanup of errors on input
  const nameInput = document.getElementById('quote-name');
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      if (nameInput.value.trim()) {
        nameInput.classList.remove('input-error');
        const err = document.getElementById('name-error');
        if (err) err.textContent = '';
      }
    });
  }

  const emailInput = document.getElementById('quote-email');
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(emailInput.value.trim())) {
        emailInput.classList.remove('input-error');
        const err = document.getElementById('email-error');
        if (err) err.textContent = '';
      }
    });
  }

  const confirmBox = document.getElementById('quote-confirm');
  if (confirmBox) {
    confirmBox.addEventListener('change', () => {
      if (confirmBox.checked) {
        const err = document.getElementById('confirm-error');
        if (err) err.textContent = '';
      }
    });
  }

  // Step Navigation
  function goToStep(targetStep) {
    if (targetStep < 1 || targetStep > 4) return;

    if (targetStep > currentStep) {
      if (!validateStep(currentStep)) return;
    }

    currentStep = targetStep;
    if (currentStep > maxStepReached) {
      maxStepReached = currentStep;
    }

    // Panels visibility
    stepPanels.forEach(panel => {
      const pStep = parseInt(panel.getAttribute('data-step'), 10);
      if (pStep === currentStep) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Progress navigation items
    progressItems.forEach(item => {
      const iStep = parseInt(item.getAttribute('data-step'), 10);
      const btn = item.querySelector('.progress-step-btn');
      item.classList.remove('active', 'completed');
      if (iStep === currentStep) {
        item.classList.add('active');
        if (btn) btn.removeAttribute('disabled');
      } else if (iStep < currentStep) {
        item.classList.add('completed');
        if (btn) btn.removeAttribute('disabled');
      } else if (iStep <= maxStepReached) {
        if (btn) btn.removeAttribute('disabled');
      } else {
        if (btn) btn.setAttribute('disabled', 'true');
      }
    });

    // Scroll to top of card on step change
    if (formCard) {
      const topOffset = formCard.getBoundingClientRect().top + window.pageYOffset - 90;
      if (window.scrollY > topOffset) {
        window.scrollTo({ top: topOffset, behavior: 'smooth' });
      }
    }
  }

  // Next / Prev button listeners
  quoteForm.querySelectorAll('.next-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.getAttribute('data-target'), 10);
      goToStep(target);
    });
  });

  quoteForm.querySelectorAll('.prev-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.getAttribute('data-target'), 10);
      goToStep(target);
    });
  });

  // Progress Bar click listeners
  progressBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.getAttribute('data-step-target'), 10);
      if (target <= maxStepReached || target < currentStep) {
        goToStep(target);
      }
    });
  });

  // Retry Button on error banner
  if (errorRetryBtn) {
    errorRetryBtn.addEventListener('click', () => {
      if (errorBanner) errorBanner.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>REQUEST MY QUOTE</span><span class="btn-arrow" aria-hidden="true">→</span>';
      }
    });
  }

  // Form Submission
  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateStep(1) || !validateStep(4)) {
      if (!validateStep(1)) goToStep(1);
      return;
    }

    if (errorBanner) errorBanner.style.display = 'none';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>TRANSMITTING...</span>';
    }

    const formData = new FormData(quoteForm);
    const selectedServices = Array.from(quoteForm.querySelectorAll('input[name="services"]:checked')).map(cb => cb.value);

    const payload = {
      name: formData.get('name') || '',
      email: formData.get('email') || '',
      business: formData.get('business') || '',
      website: formData.get('website') || '',
      projectType: formData.get('projectType') || 'Not specified',
      services: selectedServices,
      description: formData.get('description') || '',
      package: formData.get('package') || 'Not specified',
      budget: formData.get('budget') || 'Not specified',
      timeline: formData.get('timeline') || 'Not specified',
      submittedAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        quoteForm.style.display = 'none';
        const progressNav = document.querySelector('.form-progress-nav');
        if (progressNav) progressNav.style.display = 'none';
        if (successPanel) {
          successPanel.style.display = 'block';
          successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        throw new Error('Server returned ' + response.status);
      }
    } catch (err) {
      // Direct Supabase fallback
      if (typeof window !== 'undefined' && window.submitQuoteDirectly) {
        try {
          const directSuccess = await window.submitQuoteDirectly(payload);
          if (directSuccess) {
            quoteForm.style.display = 'none';
            const progressNav = document.querySelector('.form-progress-nav');
            if (progressNav) progressNav.style.display = 'none';
            if (successPanel) {
              successPanel.style.display = 'block';
              successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
          }
        } catch (directErr) {
          console.warn('Direct Supabase submission attempt:', directErr);
        }
      }

      if (window.location.protocol === 'file:') {
        quoteForm.style.display = 'none';
        const progressNav = document.querySelector('.form-progress-nav');
        if (progressNav) progressNav.style.display = 'none';
        if (successPanel) {
          successPanel.style.display = 'block';
          successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      if (errorBanner) {
        errorBanner.style.display = 'flex';
        if (errorMessage) {
          errorMessage.textContent = 'Something went wrong while sending your request. Please check your details and try again.';
        }
        errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>REQUEST MY QUOTE</span><span class="btn-arrow" aria-hidden="true">→</span>';
      }
    }
  });
}

/* --------------------------------------------------------------------------
   10. FLOATING WHATSAPP CONTACT BUTTON
   -------------------------------------------------------------------------- */
function initWhatsAppFloatingButton() {
  if (typeof window !== 'undefined' && typeof window.initWhatsAppFloatingButton === 'function' && window.initWhatsAppFloatingButton !== initWhatsAppFloatingButton) {
    window.initWhatsAppFloatingButton();
    return;
  }

  // Prevent execution on admin or customer dashboard layouts
  const body = document.body;
  if (
    !body ||
    body.classList.contains('admin-body') ||
    body.classList.contains('page-admin') ||
    body.classList.contains('page-order-confirmation') ||
    document.getElementById('admin-sidebar') ||
    document.querySelector('.admin-layout') ||
    document.getElementById('confirmation-view') ||
    document.getElementById('dashboard-paused-banner')
  ) {
    return;
  }

  if (typeof window !== 'undefined' && window.location) {
    const path = (window.location.pathname || '').toLowerCase();
    if (path.startsWith('/admin') || path.includes('order-confirmation')) {
      return;
    }
  }

  // Do not duplicate if button already exists in DOM
  if (document.getElementById('whatsapp-float-btn')) return;

  const phone = '447848180022';
  const message = 'Hi! I’m interested in your website services. Could you please help me get started?';
  const destinationUrl = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);

  const wrap = document.createElement('aside');
  wrap.className = 'whatsapp-float-wrap';
  wrap.setAttribute('aria-label', 'WhatsApp quick contact');

  const link = document.createElement('a');
  link.href = destinationUrl;
  link.className = 'whatsapp-float-btn';
  link.id = 'whatsapp-float-btn';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  link.setAttribute('aria-label', 'Chat with us on WhatsApp');

  const tooltip = document.createElement('span');
  tooltip.className = 'whatsapp-float-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.setAttribute('aria-hidden', 'true');
  tooltip.textContent = 'Chat with us on WhatsApp';

  const iconSpan = document.createElement('span');
  iconSpan.className = 'whatsapp-float-icon';
  iconSpan.setAttribute('aria-hidden', 'true');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '28');
  svg.setAttribute('height', '28');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('whatsapp-icon-svg');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'
  );
  svg.appendChild(path);
  iconSpan.appendChild(svg);

  link.appendChild(tooltip);
  link.appendChild(iconSpan);
  wrap.appendChild(link);

  document.body.appendChild(wrap);
}



