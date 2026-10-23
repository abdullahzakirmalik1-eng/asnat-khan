/**
 * Asnat Khan Studio — Presentation Design Exhibition
 * Scroll-Triggered Progressive Reveal Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  initPresentationReveals();
});

function initPresentationReveals() {
  const frames = document.querySelectorAll('.presentation-mockup-frame');
  if (!frames || frames.length === 0) return;

  // Respect user preference for reduced motion
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    frames.forEach(frame => frame.classList.add('is-revealed'));
    return;
  }

  // Graceful fallback if IntersectionObserver is unsupported
  if (!('IntersectionObserver' in window)) {
    frames.forEach(frame => frame.classList.add('is-revealed'));
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -6% 0px',
    threshold: 0.12
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  frames.forEach((frame, index) => {
    // Eagerly reveal the first frame on load for an immediate polished impression
    if (index === 0) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          frame.classList.add('is-revealed');
        }, 80);
      });
    } else {
      observer.observe(frame);
    }
  });

  // Safety fallback: guarantee no frame stays hidden if user scrolls quickly or if observer is delayed
  setTimeout(() => {
    frames.forEach(frame => {
      if (!frame.classList.contains('is-revealed')) {
        frame.classList.add('is-revealed');
      }
    });
  }, 2800);
}
