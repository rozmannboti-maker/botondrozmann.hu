/* ============================================================================
   SZOLGÁLTATÁS-SZEKCIÓ ("átlós pálya")  —  vezérlő (GSAP + ScrollTrigger)
   ----------------------------------------------------------------------------
   Görgetés-vezérelt kép-átmenet: minden kép egyetlen folytonos átlós pályán
   halad át a képernyőn — jobbra-lentről (kicsi, szürkeárnyalatos, belép) →
   a középre (nagy, éles, teljes szín) → balra-fentre (kicsi, szürkeárnyalatos,
   kilép). Vázlat + részletes doksi:
   ../../komponens-vazlatok/szolgaltatas-szekcio-filmcsik.html

   A GSAP-ot és a ScrollTrigger-t az oldal már betölti (5902_gsap.min.js,
   37406_ScrollTrigger.min.js) — ezt a fájlt UTÁNUK, `defer`-rel kell betölteni.
   A Lenis-görgetés és a ScrollTrigger már össze van kötve a 92265_index.js-ben.
   ============================================================================ */
(function () {
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) {}

  var section = document.getElementById('fc-section');
  if (!section) return;

  var mediaBox = document.getElementById('fc-media');
  var descBox  = document.getElementById('fc-desc-stack');
  var navBox   = document.getElementById('fc-nav');
  var digit0   = document.getElementById('fc-digit-0');
  var digit1   = document.getElementById('fc-digit-1');
  var indexN   = document.getElementById('fc-index-n');

  /* ==================== SZERKESZTHETŐ: a szolgáltatások ====================
     A 01-Sajat-Brand/Weboldal-Szolgaltatas-Szovegek.md 2. szakaszának (a 8
     szolgáltatás, "a forgó körből") jóváhagyott, végleges szövege. `swatch` =
     a placeholder-kártya háttérszíne — cseréld `.fc-media-item img`-re
     valódi képekkel, amikor lesz mihez. TETSZŐLEGES darabszámra
     bővíthető/szűkíthető. */
  var SERVICES = [
    { label: '01', swatch: '#8C3B2A', title: 'Bemutatkozó weboldal', desc: 'Egyedi kódolt vagy WordPress oldal, ami eladja a vállalkozásod — nem sablon, nem Elementor.' },
    { label: '02', swatch: '#5B6B54', title: 'WordPress egyedi téma', desc: 'Saját PHP-téma, amit magad is tudsz szerkeszteni és bővíteni, felesleges plugin-teher nélkül.' },
    { label: '03', swatch: '#3C4A5C', title: 'Webshop', desc: 'Shopify, WooCommerce vagy teljesen egyedi webshop — a termékstruktúrától a fizetésig végiggondolva.' },
    { label: '04', swatch: '#6E5A3C', title: 'Márkaépítés', desc: 'Logó, színpaletta, tipográfia és sablonok — egységes arculat, ami minden felületen működik.' },
    { label: '05', swatch: '#4A5A6E', title: 'Időpontfoglaló rendszer', desc: 'Beépített foglalási felület: a látogató maga foglal időpontot, automatikus visszaigazolással.' },
    { label: '06', swatch: '#6E4A5A', title: 'Tartalom és képek', desc: 'Szövegezés és saját stílusú, AI-generált képek — ha nincs kész anyagod, benne van az árban.' },
    { label: '07', swatch: '#5A6E4A', title: 'SEO-alapok', desc: 'Meta címek, Open Graph, sitemap és sebességoptimalizálás — hogy a Google is megtaláljon.' },
    { label: '08', swatch: '#4A4A4A', title: 'Karbantartás', desc: 'Havidíjas apró javítások és módosítások, plusz 2 hét ingyenes finomhangolás minden projekt után.' }
  ];
  /* ======================================================================= */

  var N = SERVICES.length;

  /* --- odométer-csíkok --- */
  function buildDigitStrip(container) {
    var strip = document.createElement('div');
    strip.className = 'fc-digit-strip';
    for (var i = 0; i < 10; i++) {
      var s = document.createElement('span');
      s.textContent = i;
      strip.appendChild(s);
    }
    container.appendChild(strip);
    return strip;
  }
  var digit0Strip = buildDigitStrip(digit0);
  var digit1Strip = buildDigitStrip(digit1);
  function setCounter(label) {
    digit0Strip.style.transform = 'translateY(-' + (Number(label[0]) * 10) + '%)';
    digit1Strip.style.transform = 'translateY(-' + (Number(label[1]) * 10) + '%)';
  }

  section.style.setProperty('--fc-count', N);

  /* --- a "nagy" középső képek (mind egymáson, a fc-media dobozban — az
     átlós pályán ebből a nyugalmi pozícióból animálnak el JS-transzformmal) --- */
  var mediaItems = SERVICES.map(function (svc) {
    var el = document.createElement('div');
    el.className = 'fc-media-item';
    el.innerHTML = '<div class="fc-media-item-inner"><div class="fc-media-fill" style="background:' + svc.swatch + '">' + svc.title + '</div></div>';
    mediaBox.appendChild(el);
    return el;
  });

  /* --- szöveg: cím (vastag) + leírás, szavanként span-ekre bontva --- */
  var descItems = SERVICES.map(function (svc) {
    var el = document.createElement('div');
    el.className = 'fc-desc';
    var titleSpan = '<span class="fc-title word">' + svc.title + '</span>';
    var descWords = svc.desc.split(' ').map(function (w) { return '<span class="word">' + w + '</span>'; }).join(' ');
    el.innerHTML = titleSpan + '<br>' + descWords;
    descBox.appendChild(el);
    return { el: el, words: [].slice.call(el.querySelectorAll('.word')) };
  });

  /* --- nav pöttyök --- */
  var dots = SERVICES.map(function () {
    var b = document.createElement('div');
    b.className = 'fc-dot';
    navBox.appendChild(b);
    return b;
  });

  /* --- segédfüggvények --- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* --- az átlós pálya erőssége — a kép SAJÁT (nyugalmi) méretéből számolva,
     nem a viewportból. Ha a lépésenkénti eltolás (ampX,ampY) ugyanolyan
     arányú, mint a kép saját szélessége/magassága, a képközéppontokat
     összekötő egyenes pontosan a kép saját átlójának irányával esik egybe
     — ez az a "tengely, ami átlósan átmegy a képeken".
     GAP_FACTOR: mivel a méret nem lineárisan, hanem `dist^2.4` ease-in
     görbével csökken (lásd render() lejjebb), a legszűkebb pillanat NEM
     ott van, amikor egy kép pont középen van, hanem PONTOSAN két lépés
     között félúton (pos = i+0.5) — ekkor mindkét szomszédos kép még
     ~91,5%-os méretű. Ennél a levezetett (0.9147) küszöbnél kisebb
     GAP_FACTOR-nál a képek átlógnának egymásba; 1.0 kényelmes (~9%)
     biztonsági ráhagyással garantáltan sosem lóg át semmilyen pozíción. --- */
  var GAP_FACTOR = 1.0;
  var ampX = 0, ampY = 0;
  function computeAmplitude() {
    var rect = mediaBox.getBoundingClientRect();
    ampX = rect.width * GAP_FACTOR;
    ampY = rect.height * GAP_FACTOR;
  }

  function render(pos) {
    // pos: 0..N-1, folytonos "hol tartunk" érték

    mediaItems.forEach(function (el, i) {
      var rel = pos - i; // <0: már elmúlt (balra-fent tart); 0: pont középen; >0: még hátravan (jobbra-lent van)
      var dist = clamp(Math.abs(rel), 0, 1);

      // pozíció: LINEÁRISAN mozog a rel-lel; rel<0 (i>pos, még hátravan) →
      // jobbra-lent (+tx,+ty); rel>0 (i<pos, már elmúlt) → balra-fent (-tx,-ty)
      var tx = -rel * ampX;
      var ty = -rel * ampY;

      // méret/opacity/szürkeárnyalat: ERŐS ease-in — sokáig közel marad a
      // "teljes" állapothoz, csak a pálya vége felé csökken/nő rohamosan
      var ease = Math.pow(dist, 2.4);
      var scale = lerp(1, 0.55, ease);
      var opacity = lerp(1, 0.12, ease);
      var gray = lerp(0, 100, Math.pow(dist, 1.6));

      el.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
      el.style.opacity = opacity;
      el.style.filter = gray > 0.5 ? 'grayscale(' + gray + '%)' : 'none';
      // a középponthoz közelebbi kép mindig felülre kerül, hogy az egymást
      // keresztező be-/kilépő képek ne takarják el a fókuszban lévőt
      el.style.zIndex = String(Math.round(1000 - dist * 100));
    });

    descItems.forEach(function (item, i) {
      var rel = i - pos;
      var reveal = clamp(1 - Math.abs(rel), 0, 1);
      var n = item.words.length;
      var spread = 0.6;
      item.words.forEach(function (w, wi) {
        var start = (wi / n) * (1 - spread);
        var t = clamp((reveal - start) / spread, 0, 1);
        w.style.opacity = t;
        w.style.filter = 'blur(' + ((1 - t) * 6) + 'px)';
      });
    });

    var active = clamp(Math.round(pos), 0, N - 1);
    dots.forEach(function (d, i) { d.classList.toggle('is-active', i === active); });
    var label = SERVICES[active].label;
    setCounter(label);
    indexN.textContent = label;
  }

  computeAmplitude();
  render(0);

  /* ScrollTrigger `pin` (NEM position:sticky — a body-n lévő globális
     overflow-y:auto miatt az itt nem menne, ua. tanulság, mint a
     munkafolyamat-szekciónál). */
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    pin: '#fc-section .fc-sticky',
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onRefresh: computeAmplitude,
    onUpdate: function (self) {
      render(self.progress * (N - 1));
    }
  });

  window.addEventListener('resize', function () {
    computeAmplitude();
    ScrollTrigger.refresh();
  });
})();
