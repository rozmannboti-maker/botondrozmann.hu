// A klónozott hero "szellemszöveg" (.invisible-text) a saját pin-spacere (.text-spacer)
// GSAP-transzformja miatt (ami transzformált ősként containing blockot ad a fixre pinnelt
// szellemszövegnek) elcsúszik a látható "Rozmann" felirattól. Ez az eltolódás NEM állandó:
// ahogy görgetsz, a kép (és vele a szellemszöveg alap-pozíciója) folyamatosan mozog, ezért
// egyszeri, betöltéskori korrekció nem elég — minden képkockán újra kell számolni, amíg a
// hero szekció látható.
(function () {
  const visibleSelector = '.container-text .text-septiembre';
  const ghostSelector = '.invisible-text';
  let rafId = null;
  let running = false;

  function currentTranslate(el) {
    const cs = getComputedStyle(el);
    if (cs.transform === 'none') return { x: 0, y: 0 };
    try {
      const m = new DOMMatrixReadOnly(cs.transform);
      return { x: m.m41, y: m.m42 };
    } catch (e) {
      return { x: 0, y: 0 };
    }
  }

  function alignGhostText() {
    const visible = document.querySelector(visibleSelector);
    const ghost = document.querySelector(ghostSelector);
    if (!visible || !ghost) return;

    const vr = visible.getBoundingClientRect();
    const gr = ghost.getBoundingClientRect();
    if (gr.width === 0 || gr.height === 0) return;

    // A jelenleg alkalmazott saját eltolást is figyelembe vesszük, hogy a nyers (el nem
    // tolt) pozícióból számoljunk — így a korrekció nem "reszket" képkockáról képkockára.
    const cur = currentTranslate(ghost);
    const rawLeft = gr.left - cur.x;
    const rawTop = gr.top - cur.y;

    const dx = vr.left - rawLeft;
    const dy = vr.top - rawTop;
    ghost.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function loop() {
    if (!running) return;
    alignGhostText();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    loop();
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  function init() {
    const heroIntro = document.querySelector('.home-intro');
    if (!heroIntro) {
      // Ha valamiért nincs meg a szekció, biztos ami biztos, fusson folyamatosan.
      start();
      return;
    }
    // Csak amíg a hero ténylegesen látható a viewportban — utána nincs értelme
    // minden képkockán számolgatni.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) start();
        else stop();
      });
    }, { threshold: 0 });
    observer.observe(heroIntro);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
