(function () {
  'use strict';

  /* ============================================================
     THEME (dark / light) — persisted in localStorage
     ============================================================ */

  const root      = document.documentElement;
  const toggleBtn = document.getElementById('modeToggle');

  const saved = localStorage.getItem('rb-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved ?? (prefersDark ? 'dark' : 'light');

  applyTheme(initial);

  toggleBtn.addEventListener('click', function () {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('rb-theme', next);
  });

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    toggleBtn.setAttribute('aria-pressed', String(isDark));
    toggleBtn.setAttribute('aria-label', isDark ? 'Váltás világos módra' : 'Váltás sötét módra');
  }


  /* ============================================================
     MOBILE NAVIGATION
     ============================================================ */

  const burger     = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (burger && mobileMenu) {
    burger.addEventListener('click', toggleMenu);

    // Close when a link is clicked
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        burger.focus();
      }
    });

    // Close when clicking outside (on overlay area — if ever applicable)
    document.addEventListener('click', function (e) {
      if (
        burger.getAttribute('aria-expanded') === 'true' &&
        !mobileMenu.contains(e.target) &&
        !burger.contains(e.target)
      ) {
        closeMenu();
      }
    });
  }

  function toggleMenu() {
    const isOpen = burger.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  }

  function openMenu() {
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Menü bezárása');
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus first link
    const firstLink = mobileMenu.querySelector('a');
    if (firstLink) firstLink.focus();
  }

  function closeMenu() {
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Menü megnyitása');
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }


  /* ============================================================
     NAV SCROLL STATE
     ============================================================ */

  const siteNav = document.getElementById('siteNav');

  if (siteNav) {
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;';
    document.body.prepend(sentinel);

    new IntersectionObserver(
      function (entries) {
        siteNav.classList.toggle('scrolled', !entries[0].isIntersecting);
      },
      { threshold: 0 }
    ).observe(sentinel);
  }


  /* ============================================================
     SCROLL REVEAL (Intersection Observer — no GSAP needed here)
     Elements with [data-reveal] animate in when they enter viewport.
     ============================================================ */

  const revealEls = document.querySelectorAll('[data-reveal]');

  if (revealEls.length) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReduced) {
      revealEls.forEach(function (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.style.transitionDelay = el.dataset.delay || '0ms';
      });

      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.style.opacity = '1';
              entry.target.style.transform = 'translateY(0)';
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      revealEls.forEach(function (el) { revealObserver.observe(el); });
    }
  }

})();
