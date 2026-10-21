/* ============================================================================
   MENÜ  —  vezérlő (GSAP)
   ----------------------------------------------------------------------------
   Jobb-felső hamburger → sarokból kinyíló panel. A mechanika a
   pensatori-irrazionali.com header-menüjéből visszafejtve, tiszta
   GSAP-timeline-ként újraépítve. Markup: index.html <header id="header">;
   stílus: assets/css/menu-brand.css.

   A GSAP-ot az oldal már betölti (5902_gsap.min.js) — ezt UTÁNA, `defer`-rel.
   A menüpontok NEM <a href>-ek (hogy a Pjax ne kapja el őket), hanem
   data-scrollto attribútumot használnak: a sima görgetést az app2.js _T()
   kezeli (ugyanaz a mechanizmus, mint a régi Septiembre-menünél).
   ============================================================================ */
(function () {
  var gsap = window.gsap;
  if (!gsap) return;

  var root    = document.getElementById('site-menu');
  if (!root) return;
  var toggle  = root.querySelector('.sm-toggle');
  var panel   = root.querySelector('.sm-panel');
  var overlay = root.querySelector('.sm-overlay');
  var links   = root.querySelectorAll('.sm-link');
  var lines   = root.querySelectorAll('.sm-line');
  var socialTitle = root.querySelectorAll('.sm-social-title');
  var socialLinks = root.querySelectorAll('.sm-social a');

  var open = false;
  var tl = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function panelWidth() {
    var w = window.innerWidth;
    if (w < 768)  return (w - 40) + 'px';
    if (w < 1024) return '384px';
    return Math.min(480, Math.round(w * 0.32)) + 'px';
  }
  function panelHeight() {
    return Math.round(window.innerHeight * 0.92) + 'px';
  }

  function setOpen(v) {
    if (v === open) return;
    open = v;

    root.classList.toggle('is-open', v);
    toggle.setAttribute('aria-expanded', String(v));
    toggle.setAttribute('aria-label', v ? 'Menü bezárása' : 'Menü megnyitása');
    panel.setAttribute('aria-hidden', String(!v));
    if (v) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');

    if (tl) tl.kill();
    tl = gsap.timeline();

    if (v) {
      overlay.style.pointerEvents = 'auto';
      panel.style.pointerEvents = 'auto';

      if (reduce) {
        gsap.set(panel,   { width: panelWidth(), height: panelHeight() });
        gsap.set(overlay, { opacity: 1 });
        gsap.set([links, socialLinks, socialTitle], { opacity: 1, y: 0 });
        gsap.set(lines,   { scaleX: 1 });
        return;
      }

      tl.set(links,       { y: '-2rem', opacity: 0 }, 0)
        .set([socialLinks, socialTitle], { y: '-2rem', opacity: 0 }, 0)
        .set(lines,        { scaleX: 0 }, 0)
        .fromTo(overlay,   { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0)
        .to(panel,         { width: panelWidth(), height: panelHeight(), duration: 0.6, ease: 'power3.inOut' }, 0)
        .to(links,         { y: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: 'power2.out' }, 0.18)
        .to(lines,         { scaleX: 1, stagger: 0.05, ease: 'power2.out' }, 0.3)
        .to([socialTitle, socialLinks], { y: 0, opacity: 1, stagger: 0.05, duration: 0.4 }, 0.4);
    } else {
      if (reduce) {
        gsap.set(panel, { width: '44px', height: '44px' });
        gsap.set(overlay, { opacity: 0 });
        overlay.style.pointerEvents = 'none';
        panel.style.pointerEvents = 'none';
        return;
      }
      tl.to([links, socialLinks, socialTitle], { y: '-2rem', opacity: 0, stagger: 0.04, duration: 0.28 }, 0)
        .to(panel,   { width: '44px', height: '44px', duration: 0.5, ease: 'power3.inOut' }, 0.05)
        .to(overlay, { opacity: 0, duration: 0.4 }, 0)
        .set(lines,  { scaleX: 0 })
        .set([overlay, panel], { pointerEvents: 'none' });
    }
  }

  toggle.addEventListener('click', function () { setOpen(!open); });
  overlay.addEventListener('click', function () { setOpen(false); });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) setOpen(false);
  });

  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener('click', function () {
      setOpen(false);
      // A data-scrollto görgetést normál esetben az app2.js _T() intézi (a link
      // ekkor kap egy .js-running class-t). Ha valamiért nem kötötte be, van
      // tartalék: a globális window.ScrollToGsap (ugyanaz az Xn függvény).
      if (!a.classList.contains('js-running') && typeof window.ScrollToGsap === 'function') {
        window.ScrollToGsap(a.getAttribute('data-scrollto'), 0, 1.1, 1);
      }
    });
    // billentyűzet: Enter / Space → kattintás (a _T() csak click-re köt)
    a.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.click(); }
    });
  });

  // nyitott menü közben ablakméret-váltás: panel újraméretezése
  var rt;
  window.addEventListener('resize', function () {
    if (!open || reduce) return;
    clearTimeout(rt);
    rt = setTimeout(function () {
      gsap.to(panel, { width: panelWidth(), height: panelHeight(), duration: 0.25, ease: 'power2.out' });
    }, 120);
  });
})();
