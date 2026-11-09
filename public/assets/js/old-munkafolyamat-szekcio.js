/* ============================================================================
   MUNKAFOLYAMAT-SZEKCIÓ  —  vezérlő (GSAP + ScrollTrigger)
   ----------------------------------------------------------------------------
   Görgetés-vezérelt köríves lépés-animáció. A hear.ai „Think Different"
   szekció mechanikájának tiszta újraépítése; vázlat + részletes doksi:
   ../../komponens-vazlatok/munkafolyamat-szekcio.html

   A GSAP-ot és a ScrollTrigger-t az oldal már betölti (5902_gsap.min.js,
   37406_ScrollTrigger.min.js) — ezt a fájlt UTÁNUK, `defer`-rel kell betölteni.
   A Lenis-görgetés és a ScrollTrigger már össze van kötve a 92265_index.js-ben.
   ============================================================================ */
(function () {
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) {}

  var section = document.getElementById('mf-section');
  if (!section) return;

  /* ==================== SZERKESZTHETŐ: a lépések ====================
     Hangnem (Hangnem-es-Stilus.md): egyenes, konkrét, első személy, nincs
     szuperlatívusz / sürgetés. TETSZŐLEGES számú lépés lehet — a kör, a
     csomópontok, a görgetési hossz és a lépés-határok mind ebből számolódnak. */
  var STEPS = [
    { title: 'Ingyenes konzultáció',
      text: 'Kezdésként egy kb. félórás, ingyenes beszélgetés. Átbeszéljük, mire lenne szükséged, és nagyjából merre induljunk el — hogy mindkettőnknek legyen egy tiszta képe a projektről.' },
    { title: 'Felmérés',
      text: 'Végigvesszük a részleteket — tartalom, funkciók, arculat, határidő —, ezt egy második konzultáción zárjuk le. A végén pontosan tudjuk, mit építünk, és miért.' },
    { title: 'Tervezés és fejlesztés',
      text: 'Egyedi dizájnt tervezek, és sablon nélkül, kódból építem meg. Közben végig látod a haladást — nincsenek eltűnt hetek.' },
    { title: 'Élesítés és utókövetés',
      text: 'Élesítés, SEO-alapok, betanítás. Az átadás után két hét ingyenes finomhangolás, később igény szerint karbantartás.' }
  ];
  /* ================================================================ */

  var N       = STEPS.length;
  var SPACING = 60;   /* fok két szomszédos csomópont között a köríven (hangolható) */

  var circle   = document.getElementById('mf-circle');
  var starWrap = document.getElementById('mf-star');
  var needle   = document.getElementById('mf-needle');
  var textWrap = document.getElementById('mf-text');
  var titleEl  = document.getElementById('mf-title');
  var descEl   = document.getElementById('mf-desc');
  var nodesBox = document.getElementById('mf-nodes');

  /* a görgetési hossz a lépésszámhoz igazodik (CSS: calc((--mf-count + 1) * 100vh)) */
  section.style.setProperty('--mf-count', N);

  /* csomópontok generálása a STEPS-ből */
  var nodes = STEPS.map(function (_, i) {
    var el = document.createElement('div');
    el.className = 'mf-node';
    el.innerHTML = '<span>' + (i + 1) + '</span>';
    nodesBox.appendChild(el);
    return el;
  });

  var k, P, M, V;              // geometria
  var W = 0;                   // aktív lépés indexe (0..N-1)
  var stepTarget = 0;          // a görgetésből jövő cél-lépcső
  var state = { y: 0 };        // animált lépés-érték, lépcsőnként 0,5 mp alatt beáll

  function computeGeom() {
    var w = window.innerWidth, h = window.innerHeight;
    var isM = w < 1024;                       // mobil
    var isT = w >= 1024 && w < 1440;          // tablet
    var isS = !isM && h > 0 && h < 1050;      // alacsony viewport (nem mobil)
    var E = Math.min(w, 1600);
    k = isM ? 0.625 * E : isS ? 0.32 * E : isT ? 0.45 * E : 0.425 * E;
    P = k + (isM ? 80 : isS ? 55 : isT ? 70 : 120);
    M = isM ? 80 : isS ? 60 : isT ? 90 : 140;
    V = h * (isM ? 0.18 : isS ? 0.09 : isT ? 0.1 : 0.13) + P;
  }

  function polar(angleDeg) {
    var th = angleDeg * Math.PI / 180;
    return { x: P * Math.cos(th), y: V + P * Math.sin(th) };
  }

  /* az i. csomópont a tetőponton (-90°), ha s === i; a gyűrű lépésenként SPACING fokot fordul */
  function nodeAngle(i, s) { return -90 + (i - s) * SPACING; }

  /* csomópont-átlátszóság: a tetőpont közelében látszik, a kör hátulján eltűnik */
  function nodeOpacity(angleDeg) {
    var d = ((angleDeg + 90) % 360 + 540) % 360 - 180;
    d = Math.abs(d);
    return d <= 70 ? 1 : d >= 135 ? 0 : 1 - (d - 70) / 65;
  }

  /* csillag/tű: csak „beállt" (egész s) állapotban látszik */
  function starOpacity(s) {
    var dn = Math.abs(s - Math.round(s));
    return dn <= 0.06 ? 1 : dn >= 0.34 ? 0 : 1 - (dn - 0.06) / 0.28;
  }

  function render() {
    var s = state.y;

    circle.style.width  = (2 * k) + 'px';
    circle.style.height = (2 * k) + 'px';
    circle.style.top    = (V - k) + 'px';

    starWrap.style.top     = (V - k + M) + 'px';
    starWrap.style.opacity = starOpacity(s);
    needle.style.height    = (P - k + M + 10) + 'px';

    textWrap.style.top = (V - k + M + 50) + 'px';

    nodes.forEach(function (node, i) {
      var ang = nodeAngle(i, s);
      var p = polar(ang);
      node.style.transform = 'translate(-50%,-50%) translate(' + p.x + 'px, ' + p.y + 'px) rotate(' + (ang + 90) + 'deg)';
      node.style.opacity   = nodeOpacity(ang);
      node.classList.toggle('is-active', i === W);
    });
  }

  function updateActiveStep() {
    var w = Math.min(N - 1, Math.max(0, Math.round(state.y)));
    if (w !== W) {
      W = w;
      titleEl.textContent = STEPS[W].title;
      descEl.textContent  = STEPS[W].text;
      gsap.fromTo([titleEl, descEl],
        { opacity: 0, filter: 'blur(14px)', y: 12 },
        { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.9, ease: 'power2.out', stagger: 0.12 });
    }
  }

  /* init */
  computeGeom();
  titleEl.textContent = STEPS[0].title;
  descEl.textContent  = STEPS[0].text;
  render();

  window.addEventListener('resize', function () {
    computeGeom(); render(); ScrollTrigger.refresh();
  });

  var st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    pin: '#mf-section .mf-sticky',   /* ScrollTrigger pin (position:fixed alatta) — a
                                        #circle-gallery is így pinel ezen az oldalon */
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onRefresh: function () { computeGeom(); render(); },
    onUpdate: function (self) {
      if (!gestureLocked) boundary = Math.round(self.progress * (N - 1));   // szinkronban tart szabad görgetésnél
      /* a sáv N-1 közre oszlik (N pozíció = N lépés): korábban N közre, így az utolsó
         pozíció ugyanazt a lépést mutatta, mint az előző, és ez egy "üres" görgetést
         jelentett előre a végén és visszafelé az elején (2026-11-02) */
      var t = Math.round(self.progress * (N - 1));   // melyik lépcső a cél
      if (t !== stepTarget) {
        stepTarget = t;
        gsap.to(state, {
          y: t,
          duration: 0.5,
          ease: 'power1.inOut',
          onUpdate: function () { updateActiveStep(); render(); }
        });
      }
    }
  });

  /* ---- egy görgetés = egy lépés ----------------------------------------
     A trackpad lendület-görgetése (macOS momentum scroll) egyetlen fizikai
     mozdulatból is kb. 1-2 másodpercig tartó, folyamatos wheel-esemény
     sorozatot küld, csökkenő delta-val. Egy fix, az animáció hosszához
     kötött zárolás (pl. 0,7 mp) ezt NEM fedi le — a lendület vége a
     zárolás feloldása UTÁN is küld eseményeket, amik újabb lépést
     indítanak, így egy fizikai mozdulat több lépést ugrik. Ráadásul a
     Lenis saját (bubble-fázisú) wheel-figyelője MINDIG előbb futott le,
     mint a mienk — így a zárolt eseményeket akkor is feldolgozta, amikor
     mi csak `preventDefault()`-oltuk őket, és a saját belső animációs
     célját ettől függetlenül tovább tolta.
     Ehelyett a "gesztus" hosszát magukból az eseményekből ismerjük fel, a
     PIN-állapottól FÜGGETLENÜL is — enélkül a szekcióba lépéskor a belépést
     okozó mozdulat hátralévő lendülete azonnal "új" mozdulatnak tűnt, és
     rögtön eggyel tovább is lépett (2. lépésre ugrott, ahelyett hogy az
     1.-en maradt volna). Ha egy mozdulat MÁR fut, amikor a szekció
     pinelté válik, azt a mozdulatot eleve kizárjuk a lépés-indításból —
     csak egy, a pinelés UTÁN ténylegesen ÚJONNAN induló mozdulat léptethet.
     Amíg érkeznek wheel-események (akár csak 160 ms-onként), ugyanannak a
     mozdulatnak tekintjük őket. Csak akkor tekintjük lezártnak a
     mozdulatot, ha ~160 ms-ig semmilyen wheel-esemény nem jön, vagy
     legkésőbb ~1,8 mp után mindenképp (biztonsági felső korlát). A
     tényleges dokumentum-görgetést eközben mi visszük végig lépésenként
     pontosan egy `stepScrollY(...)` távolsággal, a Lenis `scrollTo`-jával
     (ld. window.lenis, 92265_index.js). ------------------------------------ */
  var GESTURE_IDLE_MS = 160;   // ennyi csendet várunk, mielőtt lezártnak tekintjük a mozdulatot
  var GESTURE_MAX_MS  = 1800;  // biztonsági felső korlát, ha sosem áll le a wheel-esemény-folyam

  var boundary       = Math.round(st.progress * (N - 1));   // 0..N-1 — a jelenlegi "rács"-pozíció = a lépés indexe
  var inGesture       = false;   // fut-e éppen egy összefüggő wheel-esemény-sorozat (pin-állapottól függetlenül)
  var gestureLocked  = false;    // ez a mozdulat már felhasználta a lépését (vagy eleve pin előtt kezdődött, ezért kizárt)
  var gestureExiting = false;    // ez a mozdulat a szekció szélén kilép — innentől NEM szabad blokkolni a hátralévő eseményeit
  var idleTimer      = null;
  var maxTimer       = null;

  function stepScrollY(t) {
    return st.start + (t / (N - 1)) * (st.end - st.start);
  }

  function endGesture() {
    inGesture = false;
    gestureLocked = false;
    gestureExiting = false;
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    if (maxTimer)  { clearTimeout(maxTimer);  maxTimer  = null; }
  }

  function onWheel(e) {
    var dir = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
    if (!dir) return;

    if (!inGesture) {
      inGesture = true;
      gestureLocked = !st.isActive;   // ha még nincs pinelve — ez a mozdulat belépő-lendület, sosem léptethet
      gestureExiting = false;
      maxTimer = setTimeout(endGesture, GESTURE_MAX_MS);
    }
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(endGesture, GESTURE_IDLE_MS);

    if (!st.isActive) return;              // szekció nincs pinelve — natív görgetés

    if (gestureLocked) {
      if (gestureExiting) return;          // kilépő mozdulat — a hátralévő eseményeit is natívan
                                            /* engedjük át, különben egyetlen apró scroll-tick után
                                               a lendület maradéka teljesen elnyelődik, és csak sok
                                               külön próbálkozással lehet átjutni a szekció szélén */
      e.preventDefault();
      e.stopImmediatePropagation();        // a Lenis saját wheel-figyelője ne is lássa —
                                            /* különben az ő belső animate-célja is tovább
                                               mozdulna ettől az eseménytől, a mi zárolásunk
                                               ellenére (ld. lejjebb, capture:true) */
      return;
    }

    var next = boundary + dir;
    if (next < 0 || next > N - 1) { gestureLocked = true; gestureExiting = true; return; }   // a szekció szélén — natív kilépő görgetés engedve, a mozdulat hátralévő része is

    var lenisApi = window.lenis;
    if (!lenisApi) return;                 // Lenis még nem tölt be — natív fallback

    e.preventDefault();
    e.stopImmediatePropagation();          // ne a Lenis saját delta-akkumulálása vigye a scrollt,
                                            /* hanem kizárólag a mi stepScrollY(...)-hoz hívott
                                               scrollTo-nk — ld. lejjebb, capture:true */
    boundary = next;
    gestureLocked = true;

    lenisApi.scrollTo(stepScrollY(boundary), {
      duration: 0.6,
      easing: function (t) { return 1 - Math.pow(1 - t, 3); }
    });
  }

  /* capture:true — a mi figyelőnknek a Lenis saját (bubble-fázisú, capture nélküli) wheel-
     figyelője ELŐTT kell lefutnia, különben a stopImmediatePropagation() elkésne: a Lenis
     addig már feldolgozta volna a nyers deltát, és a saját belső animációs célját már
     odébb tolta volna, a mi zárolásunktól függetlenül. */
  window.addEventListener('wheel', onWheel, { passive: false, capture: true });

  /* ---- SCRUB VÁLTOZAT (folyamatos mozgás a lépcsős helyett) --------------
     Cseréld a fenti ScrollTrigger.create(...) hívást erre:

     ScrollTrigger.create({
       trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.6,
       onUpdate: function (self) {
         state.y = self.progress * (N - 1);   // 0..N-1 folyamatosan
         updateActiveStep(); render();
       }
     });
  ----------------------------------------------------------------------- */

  /* debug hook: window.__mf.set(0..N-1) */
  window.__mf = {
    state: state,
    set: function (v) {
      gsap.killTweensOf(state);
      state.y = v; stepTarget = Math.round(v);
      updateActiveStep(); render();
    }
  };
})();
