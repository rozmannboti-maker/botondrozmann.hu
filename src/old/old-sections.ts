// @ts-nocheck
// A régi oldal (botondrozmann.hu, 92265_index.js) hero UTÁNI szekcióinak vezérlője. A hero-intró,
// a saját Lenis és a reveal-szekvencia kimaradt: a rb-oldal Lenis-ét használja (window.__scroll.lenis).
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
let started = false;
export function initOldSections() {
  if (started) return;
  started = true;
  const lenis = window.__scroll.lenis;
  window.lenis = lenis; window.gsap = gsap; window.ScrollTrigger = ScrollTrigger;
  const isMobile = navigator.maxTouchPoints > 1;
  const isMobileViewport = () => (document.documentElement.clientWidth || window.innerWidth) <= 768;
  window.getCharHTML = function (ch) {
    if (ch === ' ') return '&nbsp;';
    if (ch === '🡲' || ch === '🡺') return '<svg style="width: 1.25em; height: 1.25em; vertical-align: -0.25em;" viewBox="0 0 84 85" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11 38H54L37 21H51L73 43L51 65H37L54 48H11Z"/></svg>';
    if (ch === '🡼') return '<svg style="width: 1.25em; height: 1.25em; vertical-align: -0.25em;" viewBox="0 0 84 85" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-135 42 42.5)"><path d="M11 38H54L37 21H51L73 43L51 65H37L54 48H11Z"/></g></svg>';
    if (ch === '🞣') return '<svg style="width: 0.9em; height: 0.9em; vertical-align: -0.1em; transform: translateY(-0.1em);" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z"/></svg>';
    return ch;
  };
  window.getCharHTML = window.getCharHTML || function (ch) { return ch === " " ? "&nbsp;" : ch; };
document.querySelectorAll('.chr-hover[data-chr]').forEach(el => {
  const text = el.dataset.chr;
  [...text].forEach((ch, i) => {
    const wrap = document.createElement('span');
    wrap.className = 'ch-wrap';
    wrap.style.setProperty('--i', i);
    const top = document.createElement('span');
    top.className = 'ch-top';
    top.innerHTML = window.getCharHTML(ch);
    const bot = document.createElement('span');
    bot.className = 'ch-bot';
    bot.innerHTML = window.getCharHTML(ch);
    wrap.appendChild(top);
    wrap.appendChild(bot);
    el.appendChild(wrap);
  });
});

const chrHoverTl = gsap.timeline({ paused: true });
document.querySelectorAll('.chr-hover').forEach((el, elIdx) => {
  el.querySelectorAll('.ch-top').forEach((ch, i) => {
    const pos = elIdx * 0.08 + i * 0.03;
    chrHoverTl.fromTo(ch,
      { clipPath: 'inset(100% 0 0 0)', immediateRender: false },
      { clipPath: 'inset(0 0 0 0)', duration: 0.7, ease: 'power3.out' },
      pos
    );
  });
});
chrHoverTl.progress(1);
function setupAboutSection() {
  const aboutText = document.getElementById('about-text');
  const photoWrap = document.getElementById('about-photo-wrap');

  
  function wrapWords(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
      const words = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      words.forEach(w => {
        if (/^\s+$/.test(w)) {
          frag.appendChild(document.createTextNode(w));
        } else if (w) {
          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = w;
          frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  }
  const aboutSub = document.getElementById('about-sub');
  const aboutVersion = document.querySelector('.about-version');
  const aboutIcon = aboutVersion.querySelector('svg');
  if (aboutIcon) {
    aboutIcon.classList.add('word');
  }
  wrapWords(aboutText);
  wrapWords(aboutVersion);

  if (isMobile) {
    [...aboutText.querySelectorAll('.word'), ...aboutVersion.querySelectorAll('.word')].forEach(w => { w.style.filter = 'none'; });
  }

  [...aboutText.querySelectorAll('.word'), ...aboutVersion.querySelectorAll('.word')].forEach(word => {
    gsap.to(word, {
      opacity: 1,
      ...(isMobile ? {} : { filter: 'blur(0px)' }),
      ease: 'none',
      scrollTrigger: {
        trigger: word,
        start: 'top 75%',
        end: 'top 60%',
        scrub: true,
      },
    });
  });

  gsap.set(aboutSub, isMobile ? { opacity: 0 } : { opacity: 0, filter: 'blur(12px)' });
  gsap.to(aboutSub, {
    opacity: 1,
    ...(isMobile ? {} : { filter: 'blur(0px)' }),
    ease: 'none',
    scrollTrigger: {
      trigger: aboutSub,
      start: 'top 80%',
      end: 'top 60%',
      scrub: true,
    },
  });

  
  const photo = photoWrap.querySelector('.about-photo');
  function initPhotoScroll() {
    /* A parallax-mozgás a kép TELJES képernyőn-tartózkodási idejére húzódik (amíg
       egyáltalán látszik valamennyire) — ez helyes, folyamatos háttér-mozgásnak. Az
       elmosás-eltüntetés viszont KORÁBBAN a photoWrap SAJÁT (fentebbi: top:35vh
       abszolút pozíciójú) helyzetéhez volt kötve — mivel a photoWrap jóval FELJEBB
       ül, mint a szöveg alsó sorai/az about-sub bekezdés, a kép sajátjelen
       geometriája szerint felmérve VAGY jóval KORÁBBAN, VAGY (az eredeti, teljes
       "top bottom → bottom top" tartományon) jóval KÉSŐBB tisztult ki, mint a
       szöveg — sosem esett egybe vele. A megbízható szinkronhoz nem a photoWrap
       saját helyzetét, hanem UGYANAZT a trigger-elemet és start/end-et használjuk,
       mint az about-sub (a legalul, legkésőbb megjelenő szövegblokk) saját
       reveal-je — így a kép pontosan akkorra tisztul ki, amikor az összes szöveg
       már látszik. */
    gsap.fromTo(photo, { y: '-50%' }, {
      y: '50%',
      ease: 'none',
      scrollTrigger: {
        trigger: photoWrap,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    gsap.fromTo(photo, { opacity: 0, filter: 'blur(20px)' }, {
      opacity: 1,
      filter: 'blur(0px)',
      ease: 'none',
      scrollTrigger: {
        trigger: aboutSub,
        start: 'top 80%',
        end: 'top 60%',
        scrub: true,
      },
    });
  }
  if (photo.decode) {
    photo.decode().then(initPhotoScroll).catch(initPhotoScroll);
  } else {
    photo.onload = initPhotoScroll;
    if (photo.complete) initPhotoScroll();
  }

  setupProjectsSection();
}

function setupProjectsSection() {
  const items = document.querySelectorAll('.proj-item');
  const card = document.getElementById('proj-card');
  const cover = document.getElementById('proj-cover');
  const dateEl = document.getElementById('proj-date');
  const preview = document.getElementById('proj-preview');
  let currentIdx = -1;
  gsap.set(card, { opacity: 0 });

  
  const _coverCache = [];
  items.forEach(item => {
    if (!item.dataset.img) return;
    const img = new Image();
    img.src = item.dataset.img;
    if (img.decode) img.decode().catch(() => { });
    _coverCache.push(img);
  });

  
  const projectsEl = document.getElementById('projects');
  ScrollTrigger.create({
    trigger: projectsEl,
    start: 'top 80%',
    // az előnézet az utolsó referenciával együtt megy el (nem a szekció aljával, ami a vonal
    // miatt jóval lejjebb van): amint az utolsó sor a képernyő közepe fölé gördül, elhalványul
    endTrigger: items[items.length - 1],
    end: 'center 35%',
    onEnter: () => { preview.classList.add('visible'); _projectsVisible = true; },
    onLeave: () => { preview.classList.remove('visible'); _projectsVisible = false; },
    onEnterBack: () => { preview.classList.add('visible'); _projectsVisible = true; },
    onLeaveBack: () => { preview.classList.remove('visible'); _projectsVisible = false; },
  });

  
  const itemQuickX = [...items].map(item =>
    gsap.quickTo(item, 'x', { duration: 0.6, ease: 'power2.out' })
  );
  let _projectsVisible = false;

  
  items.forEach((item, i) => {
    item.addEventListener('click', () => {
      if (item.classList.contains('active')) {
        openProject(item.dataset.id, item);
      } else {
        activateProject(i);
        
        let docTop = 0, el = item;
        while (el) { docTop += el.offsetTop; el = el.offsetParent; }
        lenis.scrollTo(docTop - window.innerHeight / 2 + item.offsetHeight / 2, { duration: 1.2 });
      }
    });
  });
  cover.addEventListener('click', () => {
    if (currentIdx >= 0) openProject(items[currentIdx].dataset.id, items[currentIdx]);
  });

  function onProjectsScroll() {
    if (!_projectsVisible) {
      if (currentIdx >= 0) deactivateAll();
      return;
    }
    const cy = window.innerHeight / 2;
    const halfH = window.innerHeight / 2;
    let closestIdx = -1, closestDist = Infinity;
    items.forEach((item, i) => {
      const rect = item.getBoundingClientRect();
      const itemCy = rect.top + rect.height / 2;
      const dist = Math.abs(itemCy - cy);
      
      itemQuickX[i](Math.min(dist / halfH, 1) * 80);
      
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
    });
    if (closestIdx >= 0 && closestDist < window.innerHeight * 0.45) {
      activateProject(closestIdx);
    } else {
      deactivateAll();
    }
  }
  lenis.on('scroll', onProjectsScroll);
  onProjectsScroll();

  function deactivateAll() {
    if (currentIdx >= 0) items[currentIdx].classList.remove('active');
    currentIdx = -1;
    gsap.to(card, { opacity: 0, duration: 0.25, ease: 'power2.in' });
  }

  function activateProject(i) {
    if (i === currentIdx) return;
    if (currentIdx >= 0) items[currentIdx].classList.remove('active');
    items[i].classList.add('active');

    // képe nem minden referenciának van (pl. a még nem publikus Walter Group): ilyenkor az
    // előnézet-kártya rejtve marad, nem egy törött kép jelenik meg
    const hasImg = !!items[i].dataset.img;
    if (currentIdx === -1) {

      if (hasImg) cover.src = items[i].dataset.img;
      dateEl.textContent = items[i].dataset.date;
      gsap.to(card, { opacity: hasImg ? 1 : 0, duration: 0.4, ease: 'power2.out' });
    } else {

      gsap.to(card, {
        opacity: 0,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => {
          if (!hasImg) return;
          cover.src = items[i].dataset.img;
          dateEl.textContent = items[i].dataset.date;
          gsap.to(card, { opacity: 1, duration: 0.3, ease: 'power2.out' });
        },
      });
    }
    currentIdx = i;
  }

  const projCursor = document.getElementById('proj-cursor');
  const qCursorX = gsap.quickTo(projCursor, 'left', { duration: 0.35, ease: 'power3.out' });
  const qCursorY = gsap.quickTo(projCursor, 'top', { duration: 0.35, ease: 'power3.out' });
  let _tiltTargetRY = 0, _tiltTargetRX = 0, _tiltRY = 0, _tiltRX = 0;
  
  let _detTiltTargetRY = 0, _detTiltTargetRX = 0, _detTiltRY = 0, _detTiltRX = 0;

  cover.addEventListener('mouseenter', () => {
    projCursor.classList.add('active');
  });

  cover.addEventListener('mouseleave', () => {
    projCursor.classList.remove('active');
  });

  
  let _cachedSelImg = null;

  
  document.addEventListener('mousemove', (e) => {
    
    if (_projectsVisible) {
      qCursorX(e.clientX);
      qCursorY(e.clientY);
    }
    
    if (_projectsVisible) {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      
      
      const ry = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      const rx = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
      _tiltTargetRY = ry * 6;
      _tiltTargetRX = -rx * 5;
    }

    if (projectOpen && _cachedSelImg) {
      var sr = _cachedSelImg.getBoundingClientRect();
      var scx = sr.left + sr.width / 2;
      var scy = sr.top + sr.height / 2;
      const dry = Math.max(-1, Math.min(1, (e.clientX - scx) / (sr.width / 2)));
      const drx = Math.max(-1, Math.min(1, (e.clientY - scy) / (sr.height / 2)));
      _detTiltTargetRY = dry * 8;
      _detTiltTargetRX = -drx * 6;
    }
  });

  
  gsap.ticker.add(() => {
    if (_projectsVisible) {
      _tiltRY += (_tiltTargetRY - _tiltRY) * 0.12;
      _tiltRX += (_tiltTargetRX - _tiltRX) * 0.12;
      card.style.transform = 'rotateY(' + _tiltRY.toFixed(2) + 'deg) rotateX(' + _tiltRX.toFixed(2) + 'deg)';
    }
    if (projectOpen && _cachedSelImg) {
      _detTiltRY += (_detTiltTargetRY - _detTiltRY) * 0.1;
      _detTiltRX += (_detTiltTargetRX - _detTiltRX) * 0.1;
      _cachedSelImg.style.transform = 'rotateY(' + _detTiltRY.toFixed(2) + 'deg) rotateX(' + _detTiltRX.toFixed(2) + 'deg)';
    }
  });

  
  items.forEach(item => {
    ScrollTrigger.create({
      trigger: item,
      start: 'top 52%',
      end: 'bottom 48%',
      onEnter: () => lenis && lenis.options && (lenis.options.lerp = 0.04),
      onLeave: () => lenis && lenis.options && (lenis.options.lerp = 0.06),
      onEnterBack: () => lenis && lenis.options && (lenis.options.lerp = 0.04),
      onLeaveBack: () => lenis && lenis.options && (lenis.options.lerp = 0.06),
    });
  });

  
  const linePath = document.getElementById('fluid-line');
  const lineLen = linePath.getTotalLength();

  
  gsap.set(linePath, { strokeDasharray: lineLen, strokeDashoffset: lineLen });

  
  gsap.to(linePath, {
    strokeDashoffset: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: '#projects',
      start: 'top 70%',
      // ugyanúgy, mint a lukebaffait.fr-en: a rajzolás a szekció aljáig tart, puha utókövetéssel
      end: 'bottom 20%',
      scrub: 1,
    },
  });

  
  ; (function () {
    if (isMobileViewport()) return; 

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    
    (function buildSlices() {
      var SLICES = 10;
      var imgW = Math.min(Math.max(120, vw * 0.14), 210);
      var imgH = imgW * 10 / 16; // a hero-poszterek 16:10-esek (az eredeti sablon 3:2 volt)
      
      var orbitR = (vw * 0.34 + 500) / 2; 
      var bendRad = imgW / orbitR;
      var cylR = orbitR;
      var sliceW = imgW / SLICES;
      var totalBendDeg = bendRad * 180 / Math.PI;
      var stepDeg = totalBendDeg / SLICES;

      document.querySelectorAll('.cg-img').forEach(function (img) {
        var src = img.getAttribute('src');
        var wrapper = document.createElement('div');
        wrapper.className = 'cg-img';

        for (var s = 0; s < SLICES; s++) {
          var sl = document.createElement('div');
          sl.className = 'cg-slice';
          var displayW = sliceW + 1.5; 
          sl.style.width = displayW.toFixed(1) + 'px';
          sl.style.left = '50%';
          sl.style.marginLeft = (-displayW / 2).toFixed(1) + 'px';
          sl.style.backgroundImage = 'url(' + src + ')';
          sl.style.backgroundSize = imgW.toFixed(1) + 'px ' + imgH.toFixed(1) + 'px';
          sl.style.backgroundPosition = (-s * sliceW).toFixed(1) + 'px 0';
          sl.style.transformOrigin = '50% 50% ' + (-cylR).toFixed(1) + 'px';
          var angle = (s - (SLICES - 1) / 2) * stepDeg;
          sl.style.transform = 'rotateY(' + angle.toFixed(2) + 'deg)';
          wrapper.appendChild(sl);
        }

        img.parentNode.replaceChild(wrapper, img);
      });
    })();

    const cgImgs = gsap.utils.toArray('.cg-img');
    const cgPhrase = document.getElementById('cg-phrase');
    const count = cgImgs.length;

    
    (function wrapPhraseWords(el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      var textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach(function (node) {
        var words = node.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        words.forEach(function (w) {
          if (/^\s+$/.test(w)) {
            frag.appendChild(document.createTextNode(w));
          } else if (w) {
            var span = document.createElement('span');
            span.className = 'word';
            span.textContent = w;
            frag.appendChild(span);
          }
        });
        node.parentNode.replaceChild(frag, node);
      });
    })(cgPhrase);
    var cgPhraseWords = gsap.utils.toArray('#cg-phrase .word');

    
    const rx = vw * 0.34;
    const rz = 500;
    const tiltY = vw <= 768 ? 80 : 180;

    
    var entryAngle = Math.PI / 2;
    var offX = vw * 0.85;

    function getPos(t) {
      if (t <= 0.12) {
        
        var p = t / 0.12;
        return {
          x: -offX * (1 - p),    
          y: tiltY,
          z: rz * p,             
          rotY: 0                
        };
      }
      if (t <= 0.88) {
        
        var p = (t - 0.12) / 0.76;
        var angle = entryAngle - p * Math.PI * 2;
        var x = Math.cos(angle) * rx;
        var z = Math.sin(angle) * rz;

        
        var ry = p * Math.PI * 2;

        return {
          x: x,
          y: (z / rz) * tiltY,
          z: z,
          rotY: ry
        };
      }
      
      var p = (t - 0.88) / 0.12;
      return {
        x: offX * p,             
        y: tiltY,
        z: rz * (1 - p),         
        rotY: Math.PI * 2        
      };
    }

    var stagger = 0.09;
    var totalRange = 1 + stagger * (count - 1);

    cgImgs.forEach(function (img) { img.style.opacity = '0'; });

    ScrollTrigger.create({
      trigger: '#circle-gallery',
      start: 'top top',
      end: 'bottom bottom',
      pin: '#circle-gallery-pin',
      onUpdate: function (self) {
        var progress = self.progress;

        cgImgs.forEach(function (img, i) {
          var imgT = progress * totalRange - i * stagger;

          if (imgT <= 0 || imgT >= 1) {
            img.style.opacity = '0';
            return;
          }

          var alpha = 1;
          if (imgT < 0.06) alpha = imgT / 0.06;
          else if (imgT > 0.94) alpha = (1 - imgT) / 0.06;

          var pos = getPos(imgT);
          var rotDeg = (pos.rotY * 180 / Math.PI).toFixed(1);

          img.style.transform =
            'translate3d(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px,' + pos.z.toFixed(1) + 'px)' +
            ' rotateY(' + rotDeg + 'deg)';
          img.style.opacity = alpha;
          img.style.zIndex = Math.round(pos.z + 600);
        });

        
        var phraseStart = 0.25;
        var phraseEnd = 0.75;
        var travelY = 200; 

        if (progress < phraseStart || progress > phraseEnd) {
          cgPhrase.style.opacity = '0';
        } else {
          var globalP = (progress - phraseStart) / (phraseEnd - phraseStart);
          
          var yOffset = travelY * (0.5 - globalP); 
          cgPhrase.style.transform = 'translateY(' + yOffset.toFixed(1) + 'px)';

          
          var revealEnd = 0.4;
          cgPhraseWords.forEach(function (w, wi) {
            if (globalP < revealEnd) {
              var revealP = globalP / revealEnd;
              var wordT = revealP * (cgPhraseWords.length + 4) - wi;
              var wP = Math.max(0, Math.min(1, wordT / 3));
              w.style.opacity = wP;
              w.style.filter = 'blur(' + (8 * (1 - wP)).toFixed(1) + 'px)';
            } else {
              w.style.opacity = '1';
              w.style.filter = 'blur(0px)';
            }
          });

          
          var alpha = 1;
          if (globalP < 0.1) alpha = globalP / 0.1;
          else if (globalP > 0.75) alpha = (1 - globalP) / 0.25;
          cgPhrase.style.opacity = alpha;
        }
      }
    });
  })();

  
  ; (function () {
    var timeline = document.getElementById('scroll-timeline');
    var bar = document.getElementById('st-bar');
    var label = document.getElementById('st-label');
    var pctEl = document.getElementById('scroll-pct');

    var sections = [
      { id: 'about', name: 'About' },
      { id: 'projects', name: 'Projects' },
      { id: 'circle-gallery', name: 'Gallery' },
      { id: 'contact', name: 'Contact' },
    ].filter(function (sec) {
      if (sec.id === 'circle-gallery' && isMobileViewport()) return false;
      return true;
    });

    var scrollY0 = window.scrollY || window.pageYOffset;
    var zoneTop = document.getElementById(sections[0].id).getBoundingClientRect().top + scrollY0;
    var lastEl = document.getElementById(sections[sections.length - 1].id);
    var zoneBottom = lastEl.getBoundingClientRect().top + lastEl.offsetHeight + scrollY0;
    var zoneH = zoneBottom - zoneTop;

    
    var segEls = [];
    sections.forEach(function (sec) {
      var el = document.getElementById(sec.id);
      var elTop = el.getBoundingClientRect().top + scrollY0;
      sec.top = elTop;
      sec.bottom = elTop + el.offsetHeight;
      sec.ratio = el.offsetHeight / zoneH;

      var seg = document.createElement('div');
      seg.className = 'st-seg';
      seg.style.flex = sec.ratio.toFixed(4);
      seg.title = sec.name;
      var fill = document.createElement('div');
      fill.className = 'st-seg-fill';
      seg.appendChild(fill);
      bar.appendChild(seg);
      seg.addEventListener('click', (function (targetId) {
        return function () {
          var target = document.getElementById(targetId);
          if (!target) return;
          if (typeof lenis !== 'undefined' && lenis && lenis.scrollTo) {
            lenis.scrollTo(target, { offset: 0, duration: 1.2 });
          } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        };
      })(sec.id));
      segEls.push({ seg: seg, fill: fill });
    });

    ScrollTrigger.create({
      trigger: '#' + sections[0].id,
      start: 'top bottom',
      endTrigger: '#' + sections[sections.length - 1].id,
      end: 'bottom bottom',
      onUpdate: function (self) {
        var progress = self.progress;

        
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        var pageP = docH > 0 ? Math.round((window.scrollY / docH) * 100) : 0;
        pctEl.textContent = '(' + pageP + ')';

        if (progress <= 0 || progress >= 0.90) {
          timeline.classList.remove('visible');
          pctEl.classList.remove('visible');
          timeline.style.opacity = '';
          pctEl.style.opacity = '';
          return;
        }
        timeline.classList.add('visible');
        pctEl.classList.add('visible');

        var activeIdx = 0;
        var cumul = 0;
        for (var i = 0; i < sections.length; i++) {
          var segStart = cumul;
          var segEnd = cumul + sections[i].ratio;

          if (progress < segEnd) {
            
            var inner = (progress - segStart) / sections[i].ratio;
            segEls[i].fill.style.height = (Math.min(1, Math.max(0, inner)) * 100).toFixed(1) + '%';
            activeIdx = i;
            
            for (var j = i + 1; j < sections.length; j++) {
              segEls[j].fill.style.height = '0%';
            }
            break;
          } else {
            
            segEls[i].fill.style.height = '100%';
          }
          cumul = segEnd;
        }

        label.textContent = sections[activeIdx].name;
        label.style.top = (progress * 100).toFixed(1) + '%';
      }
    });
  })();

  
  ; (function () {
    var groups = document.querySelectorAll('.skill-group');
    if (!groups.length) return;


    var firstBody = groups[0].querySelector('.skill-body');
    firstBody.style.height = firstBody.scrollHeight + 'px';

    groups.forEach(function (group) {
      group.querySelector('.skill-header').addEventListener('click', function () {
        if (group.classList.contains('open')) return; 

        
        groups.forEach(function (g) {
          if (g.classList.contains('open')) {
            g.classList.remove('open');
            var body = g.querySelector('.skill-body');
            gsap.to(body, { height: 0, duration: 0.45, ease: 'power3.inOut' });
          }
        });

        
        group.classList.add('open');
        var body = group.querySelector('.skill-body');
        gsap.to(body, {
          height: body.scrollHeight, duration: 0.45, ease: 'power3.inOut',
          onComplete: function () { ScrollTrigger.refresh(); }
        });
      });
    });
  })();

  
  ; (function () {
    var arrow = document.getElementById('skills-arrow');
    if (!arrow) return;

    gsap.fromTo(arrow,
      { xPercent: 0 },
      {
        xPercent: 100,
        x: function () {
          var left = arrow.parentElement;
          var pad = parseFloat(getComputedStyle(left).paddingLeft) + parseFloat(getComputedStyle(left).paddingRight);
          return left.clientWidth - pad - arrow.offsetWidth;
        },
        ease: 'none',
        scrollTrigger: {
          trigger: '#skills',
          start: 'top top',
          endTrigger: '#contact',
          end: 'top center',
          scrub: 0.5,
        }
      }
    );
  })();

  
  ; (function () {
    var blobWrap = document.getElementById('contact-blob-wrap');
    var blob = document.getElementById('contact-blob');
    var title = document.getElementById('contact-title');
    var socials = document.getElementById('contact-socials');
    var mailEl = document.getElementById('contact-mail');
    var dispo = document.getElementById('contact-dispo');
    var frame = document.getElementById('contact-frame');
    var frameImg = document.getElementById('contact-frame-img');
    var dispo2 = document.getElementById('contact-dispo-2');
    var frame2 = document.getElementById('contact-frame-2');
    var frameImg2 = document.getElementById('contact-frame-img-2');
    var stTimeline = document.getElementById('scroll-timeline');
    var pctEl = document.getElementById('scroll-pct');
    if (!blob) return;

    
    document.querySelectorAll('[data-chr-contact]').forEach(function (el) {
      var text = el.getAttribute('data-chr-contact');
      el.removeAttribute('data-chr-contact');
      Array.from(text).forEach(function (ch, i) {
        if (ch === ' ') {
          el.insertAdjacentHTML('beforeend', '<span style="width:0.35em;display:inline-block">&nbsp;</span>');
          return;
        }
        var wrap = document.createElement('span');
        wrap.className = 'ch-wrap';
        wrap.style.setProperty('--i', i);
        const chHTML = window.getCharHTML ? window.getCharHTML(ch) : ch;
        wrap.innerHTML = '<span class="ch-top">' + chHTML + '</span><span class="ch-bot">' + chHTML + '</span>';
        el.appendChild(wrap);
      });
    });

    var contactBg = document.getElementById('contact-bg');

    ScrollTrigger.create({
      trigger: '#contact',
      start: 'top bottom',
      endTrigger: '#footer-transition',
      end: 'bottom bottom',
      onEnter: function () { blobWrap.style.visibility = 'visible'; contactBg.style.display = 'block'; },
      onLeave: function () { blobWrap.style.visibility = 'hidden'; contactBg.style.display = 'none'; },
      onLeaveBack: function () { blobWrap.style.visibility = 'hidden'; contactBg.style.display = 'none'; },
      onEnterBack: function () { blobWrap.style.visibility = 'visible'; contactBg.style.display = 'block'; },
    });
    blobWrap.style.visibility = 'hidden';

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#contact',
        start: 'top bottom',
        end: 'bottom bottom',
        scrub: true,
      }
    });

    
    tl.fromTo(blob,
      { scale: 0 },
      { scale: 1, duration: 0.6, ease: 'none' },
      0
    );

    
    tl.to([stTimeline, pctEl], { opacity: 0, duration: 0.08 }, 0.1);

    
    gsap.set(title, { yPercent: 0, x: function () { return window.innerWidth * 1.1; } });
    tl.to(title, {
      x: 0,
      duration: 0.3,
      ease: 'power3.out'
    }, 0.18);

    
    tl.fromTo(socials,
      { clipPath: 'inset(0 0 100% 0)' },
      { clipPath: 'inset(0 0 0% 0)', duration: 0.2, ease: 'none' },
      0.28
    );

    // 2026-11-05: az "Írj nekem" gomb és az e-mail cím NEM görgetéshez kötve (scrub) tűnik elő:
    // úgy félúton megállva gyakran levágva maradt az alja. A szakasz 36%-ánál egyszerre,
    // CSS-átmenettel jelennek meg (.is-shown), és visszagörgetve tűnnek el.
    var ctaEls = [document.getElementById('contact-cta'), mailEl].filter(Boolean);
    ScrollTrigger.create({
      trigger: '#contact',
      start: 'top bottom',
      end: 'bottom bottom',
      onUpdate: function (self) {
        var on = self.progress > 0.36;
        ctaEls.forEach(function (el) { el.classList.toggle('is-shown', on); });
      },
      onLeave: function () { ctaEls.forEach(function (el) { el.classList.add('is-shown'); }); },
      onLeaveBack: function () { ctaEls.forEach(function (el) { el.classList.remove('is-shown'); }); },
    });

    var pairStart = 0.22;
    var frameDur = 0.65;
    var frameY = function () { return window.innerHeight * 1.1; };
    var frameYEnd = function () { return -window.innerHeight * 1.4; };
    var dispoY = function () { return window.innerHeight * 1.1; };
    var dispoYEnd = function () { return -window.innerHeight * 1.65; };

    
    gsap.set(frame, { yPercent: -50, y: frameY });
    gsap.set(frameImg, { yPercent: -30 });

    tl.to(frame, { y: frameYEnd, duration: frameDur, ease: 'none' }, pairStart);
    tl.to(frameImg, { yPercent: 30, duration: frameDur, ease: 'none' }, pairStart);

    gsap.set(dispo, { yPercent: -50, y: dispoY, opacity: 1, clipPath: 'inset(0% 0 0% 0)' });
    tl.to(dispo, { y: dispoYEnd, duration: frameDur, ease: 'none' }, pairStart);
    tl.to(dispo, { opacity: 0, clipPath: 'inset(100% 0 0% 0)', duration: 0.15, ease: 'power2.in' }, pairStart + 0.45);

    
    gsap.set(frame2, { yPercent: -50, y: function () { return window.innerHeight * 1.3; } });
    gsap.set(frameImg2, { yPercent: -30 });

    tl.to(frame2, { y: frameYEnd, duration: frameDur, ease: 'none' }, pairStart + 0.07);
    tl.to(frameImg2, { yPercent: 30, duration: frameDur, ease: 'none' }, pairStart + 0.07);

    gsap.set(dispo2, { yPercent: -50, y: frameY, opacity: 1, clipPath: 'inset(0% 0 0% 0)' });
    tl.to(dispo2, { y: frameYEnd, duration: frameDur, ease: 'none' }, pairStart);
    tl.to(dispo2, { opacity: 0, clipPath: 'inset(100% 0 0% 0)', duration: 0.15, ease: 'power2.in' }, pairStart + 0.45);
  })();

  
  ; (function () {
    
    var POOL_EMPTY = ' ';
    var POOLS = [
      ' ',
      '·.,',
      ':;`-~^',
      '=+<>?!:;',
      '|/\\()[]{}«»',
      '÷×±≈≠≤≥∞∑∏√∫',
      '¤†‡§¶©®™°¬',
      '%&#$@¥€£¢'
    ];
    
    var seed = 42;
    function rand() { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; }

    function imageToAscii(img, cols) {
      seed = 42;
      var c = document.createElement('canvas');
      var ctx = c.getContext('2d');
      var aspect = img.height / img.width;
      var charAspect = 1.0;
      var rows = Math.round(cols * aspect * charAspect);
      c.width = cols; c.height = rows;
      ctx.drawImage(img, 0, 0, cols, rows);
      var data = ctx.getImageData(0, 0, cols, rows).data;
      var lines = [];
      var poolGrid = [];
      for (var y = 0; y < rows; y++) {
        var line = '';
        var poolRow = [];
        for (var x = 0; x < cols; x++) {
          var i = (y * cols + x) * 4;
          var r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 15) { line += ' '; poolRow.push(-1); continue; }
          var brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          brightness *= (a / 255);
          var pi = Math.floor(brightness * (POOLS.length - 1) * 0.8);
          pi = Math.min(pi, POOLS.length - 1);
          var pool = POOLS[pi];
          line += pool[Math.floor(rand() * pool.length)];
          poolRow.push(pi);
        }
        lines.push(line);
        poolGrid.push(poolRow);
      }
      return { text: lines.join('\n'), poolGrid: poolGrid };
    }

    function setupHover(preEl, poolGrid) {
      var origLines = null;
      var origGrid = null;
      var mxC = -1000, myC = -1000;
      var radius = 2.5;
      var cols = poolGrid[0] ? poolGrid[0].length : 1;
      var rows = poolGrid.length;
      var noise = [];
      var hitTime = [];
      var cellDuration = [];
      for (var ny = 0; ny < rows; ny++) {
        var nr = [], ht = [], cd = [];
        for (var nx = 0; nx < cols; nx++) {
          var h = (Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453 % 1 + 1) % 1;
          nr.push(h * 5 - 2.5);
          ht.push(0);
          cd.push(h > 0.5 ? 200 : 100);
        }
        noise.push(nr);
        hitTime.push(ht);
        cellDuration.push(cd);
      }
      var animating = false;

      function init() {
        origLines = preEl.textContent.split('\n');
        origGrid = origLines.map(function (l) { return l.split(''); });
      }

      preEl.addEventListener('mousemove', function (e) {
        if (!origGrid) init();
        var rect = preEl.getBoundingClientRect();
        var charW = rect.width / cols;
        var charH = rect.height / rows;
        mxC = (e.clientX - rect.left) / charW;
        myC = (e.clientY - rect.top) / charH;
        
        var now = performance.now();
        var maxR = radius + 3;
        var yMin = Math.max(0, Math.floor(myC - maxR));
        var yMax = Math.min(rows - 1, Math.ceil(myC + maxR));
        var xMin = Math.max(0, Math.floor(mxC - maxR));
        var xMax = Math.min(cols - 1, Math.ceil(mxC + maxR));
        for (var y = yMin; y <= yMax; y++) {
          for (var x = xMin; x <= xMax; x++) {
            var dx = x - mxC, dy = y - myC;
            if (dx * dx + dy * dy < (radius + noise[y][x]) * (radius + noise[y][x])) {
              hitTime[y][x] = now;
            }
          }
        }
        if (!animating) { animating = true; tick(); }
      });

      preEl.addEventListener('mouseleave', function () {
        mxC = -1000; myC = -1000;
      });

      function esc(ch) {
        if (ch === '<') return '&lt;';
        if (ch === '>') return '&gt;';
        if (ch === '&') return '&amp;';
        return ch;
      }

      function tick() {
        var now = performance.now();
        var anyActive = false;
        var html = '';
        for (var y = 0; y < rows; y++) {
          for (var x = 0; x < cols; x++) {
            var pi = poolGrid[y][x];
            if (pi < 0) { html += ' '; continue; }
            if (pi === 0) { html += ' '; continue; }
            var elapsed = now - hitTime[y][x];
            if (hitTime[y][x] > 0 && elapsed < cellDuration[y][x]) {
              anyActive = true;
              var idx = (POOLS.length - 1) - pi;
              var pool = POOLS[idx];
              var ch = pool[Math.floor(Math.random() * pool.length)];
              html += '<span style="color:#0a0a0a;background:#ff3b14">' + esc(ch) + '</span>';
            } else {
              html += esc(origGrid[y][x]);
            }
          }
          html += '\n';
        }
        preEl.innerHTML = html;
        if (anyActive) {
          requestAnimationFrame(tick);
        } else {
          animating = false;
          if (origLines) preEl.textContent = origLines.join('\n');
        }
      }
    }

    function loadAndRender(src, targetId, cols) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        var el = document.getElementById(targetId);
        if (el) {
          var result = imageToAscii(img, cols);
          el.textContent = result.text;
          setupHover(el, result.poolGrid);
        }
      };
      img.src = src;
    }

    loadAndRender('assets/images/footer/left.png', 'ascii-left', 80);
    loadAndRender('assets/images/footer/right.png', 'ascii-right', 80);

    
    var asciiLeftWrap = document.querySelector('.footer-ascii.left');
    var asciiRightWrap = document.querySelector('.footer-ascii.right');
    if (asciiLeftWrap && asciiRightWrap) {
      gsap.fromTo(asciiLeftWrap,
        { xPercent: -100 },
        {
          xPercent: 0, ease: 'none',
          scrollTrigger: {
            trigger: '#footer-transition',
            start: 'top bottom+=500',
            end: 'bottom bottom',
            scrub: true,
          }
        }
      );
      gsap.fromTo(asciiRightWrap,
        { xPercent: 100 },
        {
          xPercent: 0, ease: 'none',
          scrollTrigger: {
            trigger: '#footer-transition',
            start: 'top bottom+=500',
            end: 'bottom bottom',
            scrub: true,
          }
        }
      );
    }

    
    var asciiLeftPre = document.getElementById('ascii-left');
    var asciiRightPre = document.getElementById('ascii-right');
    var mx = 0, my = 0, sx = 0, sy = 0;
    var footerVisible = false;
    document.addEventListener('mousemove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    function parallaxLoop() {
      if (!footerVisible) return;
      sx += (mx - sx) * 0.05;
      sy += (my - sy) * 0.05;
      var lx = Math.min(0, sx * -15 - 15);
      var rx = Math.max(0, sx * 15 + 15);
      var py = sy * -10;
      if (asciiLeftPre) asciiLeftPre.style.transform = 'translate(' + lx + 'px, ' + py + 'px)';
      if (asciiRightPre) asciiRightPre.style.transform = 'translate(' + rx + 'px, ' + py + 'px)';
      requestAnimationFrame(parallaxLoop);
    }

    
    document.querySelectorAll('[data-chr-footer]').forEach(function (el) {
      var text = el.getAttribute('data-chr-footer');
      el.removeAttribute('data-chr-footer');
      Array.from(text).forEach(function (ch, i) {
        if (ch === ' ') {
          el.insertAdjacentHTML('beforeend', '<span style="width:0.35em;display:inline-block">&nbsp;</span>');
          return;
        }
        var wrap = document.createElement('span');
        wrap.className = 'ch-wrap';
        wrap.style.setProperty('--i', i);
        const chHTML = window.getCharHTML ? window.getCharHTML(ch) : ch;
        wrap.innerHTML = '<span class="ch-top">' + chHTML + '</span><span class="ch-bot">' + chHTML + '</span>';
        el.appendChild(wrap);
      });
    });

    
    var footerTopChars = document.querySelectorAll('#footer .footer-top .chr-hover .ch-top');
    if (footerTopChars.length) {
      gsap.set(footerTopChars, { clipPath: 'inset(100% 0 0 0)' });
      gsap.to(footerTopChars, {
        clipPath: 'inset(0 0 0 0)',
        ease: 'power3.out',
        stagger: { each: 0.015, from: 'start' },
        scrollTrigger: {
          trigger: '#footer-transition',
          start: 'center bottom+=500',
          end: 'bottom bottom',
          scrub: true,
        }
      });
    }

    
    (function () {
      function rebuildChars(el, keepFirstLetter) {
        var text = el.textContent;
        el.textContent = '';
        var inners = [];
        for (var i = 0; i < text.length; i++) {
          var outer = document.createElement('span');
          outer.style.display = 'inline-block';
          outer.style.overflow = 'hidden';
          outer.style.verticalAlign = 'top';
          outer.style.padding = '0.1em 0.3em';
          outer.style.margin = '-0.1em -0.3em';
          if (keepFirstLetter && i === 0) outer.className = 'first-letter';
          var inner = document.createElement('span');
          inner.style.display = 'inline-block';
          inner.style.willChange = 'transform';
          inner.textContent = text[i];
          outer.appendChild(inner);
          el.appendChild(outer);
          inners.push(inner);
        }
        return inners;
      }
      var lukeEl = document.querySelector('.footer-name-luke');
      var baffaitEl = document.querySelector('.footer-name-baffait');
      var dotEl = document.querySelector('.footer-name-dot');
      if (!lukeEl || !baffaitEl) return;

      var lukeChars = rebuildChars(lukeEl, true);
      var baffaitChars = rebuildChars(baffaitEl, false);
      var dotChars = dotEl ? rebuildChars(dotEl, false) : [];

      
      var ordered = [];
      var lukeRev = lukeChars.slice().reverse();
      var rightSide = baffaitChars.concat(dotChars);
      var maxLen = Math.max(lukeRev.length, rightSide.length);
      for (var i = 0; i < maxLen; i++) {
        if (rightSide[i]) ordered.push(rightSide[i]);
        if (lukeRev[i]) ordered.push(lukeRev[i]);
      }

      gsap.set(ordered, { yPercent: 110 });
      gsap.to(ordered, {
        yPercent: 0,
        ease: 'power3.out',
        stagger: { each: 0.04, from: 'start' },
        scrollTrigger: {
          trigger: '#footer-transition',
          start: 'center bottom+=500',
          end: 'bottom bottom',
          scrub: true,
        }
      });
    })();

    
    var footerEl = document.getElementById('footer');
    ScrollTrigger.create({
      trigger: '#footer-transition',
      start: 'top bottom+=500',
      end: 'bottom bottom',
      onEnter: function () { footerEl.style.visibility = 'visible'; footerVisible = true; parallaxLoop(); },
      onLeave: function () { },
      onEnterBack: function () { footerVisible = true; parallaxLoop(); },
      onLeaveBack: function () { footerEl.style.visibility = 'hidden'; footerVisible = false; },
    });

    
    var contactPin = document.getElementById('contact-pin');
    var contactBlobWrap = document.getElementById('contact-blob-wrap');
    var contactBgEl = document.getElementById('contact-bg');
    var contactSection = document.getElementById('contact');
    var ctTitle = document.getElementById('contact-title');
    var ctSocials = document.getElementById('contact-socials');
    var ctMail = document.getElementById('contact-mail');

    var ftl = gsap.timeline({
      scrollTrigger: {
        trigger: '#footer-transition',
        start: 'top bottom+=550',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: function (self) {
          var p = self.progress;
          if (p > 0.2) {
            contactBgEl.style.display = 'none';
            contactSection.style.pointerEvents = 'none';
          } else {
            contactBgEl.style.display = 'block';
            contactSection.style.pointerEvents = '';
          }
        }
      }
    });

    ftl.set(contactBlobWrap, {
      height: '110vh', overflow: 'hidden',
      borderRadius: '0 0 0px 0px'
    }, 0);

    ftl.to(contactBlobWrap, {
      borderRadius: '0 0 50px 50px',
      duration: 0.15, ease: 'power2.out'
    }, 0);

    ftl.to(contactBlobWrap, {
      y: function () { return -(window.innerHeight * 1.8 + 400); },
      immediateRender: false,
      duration: 1.0, ease: 'none'
    }, 0);

    ftl.to(contactPin, {
      y: '-40vh', pointerEvents: 'none', immediateRender: false,
      duration: 1.0, ease: 'none'
    }, 0);

    ftl.fromTo([ctSocials, ctMail],
      { clipPath: 'inset(0 0 0% 0)' },
      { clipPath: 'inset(0 0 100% 0)', duration: 0.1, ease: 'none' },
      0
    );
    ftl.fromTo(ctTitle,
      { clipPath: 'inset(0 0 0% 0)' },
      { clipPath: 'inset(0 0 100% 0)', duration: 0.25, ease: 'power2.in' },
      0
    );
  })();

  
  const isEn = window.__I18N_LANG === 'en';

  const PROJECTS = {
    'cyberdiag': {
      desc: isEn ? "Showcase website for the CyberDiag app, presenting its features and benefits, and offering download for easy access." : "Site web de présentation de l'application CyberDiag, pour présenter ses fonctionnalités et ses avantages et proposer le téléchargement afin de faciliter son accès.",
      category: isEn ? 'Website' : 'Site Web', year: '2026', tags: ['Gsap', 'Lenis', 'Three.js'],
      images: ['assets/images/projects/CyberDiagWebsite/image1.png', 'assets/images/projects/CyberDiagWebsite/image2.png', 'assets/images/projects/CyberDiagWebsite/image3.png'],
    },
    'anima': {
      desc: isEn ? "Website about animal rights, created to practice web animations with tools like GSAP and Lenis." : "Site web sur la cause animale afin de m'exercer à la création d'animations web avec des outils comme GSAP ou Lenis.",
      category: isEn ? 'Website' : 'Site Web', year: '2026', tags: ['Gsap', 'Lenis'],
      images: ['assets/images/projects/Anima/image1.png', 'assets/images/projects/Anima/image2.png', 'assets/images/projects/Anima/image3.png'],
    },
    'cyberdiag-app': {
      desc: isEn ? "Desktop application designed for SMEs to perform comprehensive cybersecurity diagnostics. Intuitive interface to assess vulnerabilities and provide tailored recommendations." : "Application conçue pour les PME afin de réaliser des diagnostics de cybersécurité complets. Interface intuitive pour évaluer les vulnérabilités et proposer des recommandations personnalisées.",
      category: isEn ? 'Desktop App' : 'Application Desktop', year: '2026', tags: ['Python', 'Gsap', 'Three.js'],
      images: ['assets/images/projects/cyberdiag/image1.png', 'assets/images/projects/cyberdiag/image2.png', 'assets/images/projects/cyberdiag/image3.png'],
    },
    'zenith': {
      desc: isEn ? "Innovative web browser focused on privacy and performance, featuring a built-in ad blocker, optimized tab management, and extensive customization." : "Navigateur web innovant axé sur la confidentialité et la performance, avec bloqueur de publicités intégré, gestion optimisée des onglets et personnalisation poussée.",
      category: isEn ? 'Desktop App' : 'Application Desktop', year: '2026', tags: ['Electron', 'JavaScript', 'Three.js'],
      images: ['assets/images/projects/Zenith/image1.png', 'assets/images/projects/Zenith/image2.png', 'assets/images/projects/Zenith/image3.png'],
    },
    'skymcdb': {
      desc: isEn ? "A powerful and intuitive tool designed to manage, organize, and optimize your Minecraft building projects, developed specifically for builders." : "Un outil puissant et intuitif conçu pour gérer, organiser et optimiser vos projets de construction Minecraft, développé spécifiquement pour les builders.",
      category: isEn ? 'Desktop App' : 'Application Desktop', year: '2024', tags: ['Java', 'JavaFX', 'CSS'],
      images: ['assets/images/projects/skymcdb/image.png', 'assets/images/projects/skymcdb/image2.png', 'assets/images/projects/skymcdb/image3.png', 'assets/images/projects/skymcdb/image4.png'],
    },
    'chromablock': {
      desc: isEn ? "Web adaptation of SkymcDB to reach a wider audience, introducing brand new features for Minecraft builders." : "Adaptation web de SkymcDB, pour élargir l'audience, permettant des fonctionnalités inédites dans le domaine du build Minecraft.",
      category: 'Web Application', year: '2024', tags: ['JavaScript', 'HTML', 'CSS'],
      images: ['assets/images/projects/chromablock/image1.png', 'assets/images/projects/chromablock/image2.png', 'assets/images/projects/chromablock/image3.png'],
    },
    'symphony': {
      desc: isEn ? "Web application allowing users to host and stream their music, as well as discover music published by others on the platform." : "Application web permettant aux utilisateurs d'héberger et lire leurs musiques ainsi que celles publiées par d'autres utilisateurs sur la plateforme.",
      category: 'Web Application', year: '2024', tags: ['Netlify Functions', 'JavaScript', 'HTML/CSS'],
      images: ['assets/images/projects/symphony/image2.png', 'assets/images/projects/symphony/image.png', 'assets/images/projects/symphony/image3.png'],
    },
    'echo': {
      desc: isEn ? "Web interface to interact and chat with a local Artificial Intelligence (Qwen). Smooth and private conversational experience." : "Interface web permettant d'interagir et discuter avec une intelligence artificielle fonctionnant en local (Qwen). Expérience conversationnelle fluide et privée.",
      category: isEn ? 'AI / Web' : 'IA / Web', year: '2024', tags: ['JavaScript', 'HTML/CSS', 'AI Local'],
      images: ['assets/images/projects/echo/image.png'],
    },
  };

  const detailEl = document.getElementById('project-detail');
  const detailTitle = document.getElementById('detail-title');
  const detailTitleWrap = document.getElementById('detail-title-wrap');
  const detailYear = document.getElementById('detail-year');
  const detailDesc = document.getElementById('detail-desc');
  const detailTags = document.getElementById('detail-tags');
  const detailThumbs = document.getElementById('detail-thumbs');
  const detailThumbsInner = document.getElementById('detail-thumbs-inner');
  const detailSelected = document.getElementById('detail-selected');
  const detailGalleryWrap = document.getElementById('detail-gallery-wrap');
  const flyingTitle = document.getElementById('flying-title');
  const pageFade = document.getElementById('page-fade');
  const detailBack = document.getElementById('detail-back');

  let projectOpen = false;
  window._projectOpen = false;
  let _flyingSourceItem = null;
  let _galleryRAF = null;
  let _galleryY = 0, _galleryMaxScroll = 0;
  let _qGalleryY = null;

  let _activeThumbIdx = -1;
  let _thumbImgs = []; 

  
  function updateActiveThumb() {
    if (!projectOpen) return;
    if (!_thumbImgs.length) { _galleryRAF = requestAnimationFrame(updateActiveThumb); return; }
    var thumbsRect = detailThumbs.getBoundingClientRect();
    var cy = thumbsRect.top + thumbsRect.height / 2;
    var closestIdx = 0, closestDist = Infinity;
    for (var i = 0; i < _thumbImgs.length; i++) {
      var rect = _thumbImgs[i].getBoundingClientRect();
      var imgCy = rect.top + rect.height / 2;
      var dist = Math.abs(imgCy - cy);
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
      var distNorm = dist / (thumbsRect.height * 0.45);
      var t = Math.max(0, 1 - distNorm);
      t = t * t * t;
      _thumbImgs[i].style.width = (100 + t * 40) + '%';
    }
    if (closestIdx !== _activeThumbIdx) {
      if (_activeThumbIdx >= 0 && _thumbImgs[_activeThumbIdx]) _thumbImgs[_activeThumbIdx].classList.remove('active');
      _thumbImgs[closestIdx].classList.add('active');
      _activeThumbIdx = closestIdx;
      if (_cachedSelImg) {
        _cachedSelImg.src = _thumbImgs[closestIdx].src;
      }
    }
    _galleryRAF = requestAnimationFrame(updateActiveThumb);
  }

  function openProject(id, clickedItem) {
    const proj = PROJECTS[id];
    if (!proj || projectOpen) return;
    projectOpen = true; window._projectOpen = true;
    _flyingSourceItem = clickedItem;

    history.pushState({ project: id }, '', '#' + id);
    lenis.stop();

    const stTimeline = document.getElementById('scroll-timeline');
    const pctEl = document.getElementById('scroll-pct');
    if (stTimeline) stTimeline.style.setProperty('display', 'none', 'important');
    if (pctEl) pctEl.style.setProperty('display', 'none', 'important');

    const rect = clickedItem.getBoundingClientRect();
    const cs = getComputedStyle(clickedItem);
    const startFontSize = parseFloat(cs.fontSize);
    flyingTitle.textContent = clickedItem.textContent;
    flyingTitle.style.fontSize = startFontSize + 'px';
    flyingTitle.style.lineHeight = cs.lineHeight;
    flyingTitle.style.letterSpacing = cs.letterSpacing;
    flyingTitle.style.paddingTop = cs.paddingTop;
    flyingTitle.style.paddingBottom = cs.paddingBottom;

    
    gsap.set(flyingTitle, { left: rect.left, top: rect.top, opacity: 1, scale: 1, x: 0, y: 0, transformOrigin: 'left top' });

    
    clickedItem.style.visibility = 'hidden';

    
    detailTitle.textContent = clickedItem.textContent;
    detailYear.textContent = proj.year;
    detailDesc.textContent = proj.desc;
    detailTags.innerHTML = proj.tags.map(function (t) { return '<span class="detail-tag">' + t + '</span>'; }).join('');
    
    var allImages = [clickedItem.dataset.img].concat(proj.images);
    detailThumbsInner.innerHTML = allImages.map(function (src) { return '<img src="' + src + '" alt="" decoding="async">'; }).join('');
    detailSelected.innerHTML = '<img src="' + allImages[0] + '" alt="" decoding="async">';
    detailThumbsInner.querySelectorAll('img').forEach(function (img, i) {
      if (img.decode) img.decode().catch(function () { });
      
      img.addEventListener('click', function () {
        if (_activeThumbIdx >= 0 && _thumbImgs[_activeThumbIdx]) _thumbImgs[_activeThumbIdx].classList.remove('active');
        img.classList.add('active');
        _activeThumbIdx = i;
        if (_cachedSelImg) _cachedSelImg.src = img.src;
      });
    });
    _activeThumbIdx = 0;
    _thumbImgs = [].slice.call(detailThumbsInner.querySelectorAll('img'));
    _thumbImgs[0].classList.add('active');
    _cachedSelImg = detailSelected.querySelector('img');
    _galleryY = 0;
    gsap.set(detailThumbsInner, { y: 0 });

    
    var remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    var targetTop = window.innerHeight * 0.22;
    var targetLeft = remPx * 4;
    var targetFontSize = Math.min(Math.max(window.innerWidth * 0.05, remPx * 3), remPx * 5);

    var tl = gsap.timeline();

    
    tl.to(pageFade, { opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 0);

    
    tl.to(flyingTitle, { top: targetTop, left: targetLeft, fontSize: targetFontSize, paddingTop: 0, paddingBottom: 0, duration: 1, ease: 'power3.inOut' }, 0.3);

    
    tl.to(detailEl, { opacity: 1, duration: 0.4, ease: 'power2.out', onStart: function () { detailEl.classList.add('active'); } }, 1.0);

    
    tl.set(flyingTitle, { opacity: 0 }, 1.1);
    tl.set(detailTitleWrap, { opacity: 1 }, 1.1);

    
    tl.to(detailDesc, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.2);
    tl.to(detailTags, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 1.3);
    tl.to(detailBack, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 1.3);

    
    tl.fromTo(detailGalleryWrap, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power3.out' }, 1.2);

    
    tl.add(function () {
      _galleryMaxScroll = Math.max(0, detailThumbsInner.scrollHeight - detailThumbs.clientHeight);
      _qGalleryY = gsap.quickTo(detailThumbsInner, 'y', { duration: 0.8, ease: 'power2.out' });
      _galleryRAF = requestAnimationFrame(updateActiveThumb);
    });
  }

  function closeProject() {
    if (!projectOpen) return;
    projectOpen = false; window._projectOpen = false;
    if (_galleryRAF) { cancelAnimationFrame(_galleryRAF); _galleryRAF = null; }
    _qGalleryY = null;
    history.pushState(null, '', window.location.pathname);

    const stTimeline = document.getElementById('scroll-timeline');
    const pctEl = document.getElementById('scroll-pct');
    if (stTimeline) stTimeline.style.removeProperty('display');
    if (pctEl) pctEl.style.removeProperty('display');

    var tl = gsap.timeline();

    
    tl.to([detailDesc, detailTags, detailBack], { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0);
    tl.to(detailGalleryWrap, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 0);

    
    var dtRect = detailTitle.getBoundingClientRect();
    var dtCs = getComputedStyle(detailTitle);
    flyingTitle.textContent = detailTitle.textContent;
    flyingTitle.style.fontSize = dtCs.fontSize;
    flyingTitle.style.lineHeight = dtCs.lineHeight;
    flyingTitle.style.letterSpacing = dtCs.letterSpacing;
    flyingTitle.style.paddingTop = '0';
    flyingTitle.style.paddingBottom = '0';
    gsap.set(flyingTitle, { left: dtRect.left, top: dtRect.top, opacity: 1, x: 0, y: 0 });
    gsap.set(detailTitleWrap, { opacity: 0 });

    
    tl.to(detailEl, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 0.2);

    
    if (_flyingSourceItem) {
      var itemRect = _flyingSourceItem.getBoundingClientRect();
      var itemCs = getComputedStyle(_flyingSourceItem);
      tl.to(flyingTitle, {
        left: itemRect.left,
        top: itemRect.top,
        fontSize: parseFloat(itemCs.fontSize),
        paddingTop: itemCs.paddingTop,
        paddingBottom: itemCs.paddingBottom,
        duration: 0.9,
        ease: 'power3.inOut',
      }, 0.3);
    }

    
    tl.to(pageFade, { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.5);

    
    tl.add(function () {
      detailEl.classList.remove('active');
      gsap.set([detailTitleWrap, detailDesc, detailTags, detailBack, detailGalleryWrap], { opacity: 0 });
      gsap.set(flyingTitle, { opacity: 0 });
      _activeThumbIdx = -1;
      _thumbImgs = [];
      _cachedSelImg = null;
      if (_flyingSourceItem) {
        _flyingSourceItem.style.visibility = '';
        _flyingSourceItem = null;
      }
      lenis.start();
      ScrollTrigger.refresh();
    });
  }


  detailEl.addEventListener('wheel', function (e) {
    if (!projectOpen) return;
    e.preventDefault();
    var delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    _galleryY = Math.max(-_galleryMaxScroll, Math.min(0, _galleryY - delta));
    if (_qGalleryY) _qGalleryY(_galleryY);
  }, { passive: false });


  var _detailTouchStartY = 0;
  detailEl.addEventListener('touchstart', function (e) {
    if (!projectOpen) return;
    _detailTouchStartY = e.touches[0].clientY;
  }, { passive: true });
  detailEl.addEventListener('touchmove', function (e) {
    if (!projectOpen) return;
    e.preventDefault();
    var y = e.touches[0].clientY;
    var delta = _detailTouchStartY - y;
    _detailTouchStartY = y;
    _galleryY = Math.max(-_galleryMaxScroll, Math.min(0, _galleryY - delta));
    if (_qGalleryY) _qGalleryY(_galleryY);
  }, { passive: false });

  
  detailBack.addEventListener('click', closeProject);
  window.addEventListener('popstate', function () { if (projectOpen) closeProject(); });

  
  function preloadProjectImages() {
    var allSrcs = [];
    
    items.forEach(function (item) { if (item.dataset.img) allSrcs.push(item.dataset.img); });
    
    Object.keys(PROJECTS).forEach(function (id) {
      var imgs = PROJECTS[id].images;
      if (imgs) allSrcs = allSrcs.concat(imgs);
    });
    
    var seen = {};
    allSrcs = allSrcs.filter(function (s) { if (seen[s]) return false; seen[s] = true; return true; });
    
    var idx = 0, batch = 2;
    function loadBatch() {
      for (var j = 0; j < batch && idx < allSrcs.length; j++, idx++) {
        var img = new Image();
        img.decoding = 'async';
        img.src = allSrcs[idx];
      }
      if (idx < allSrcs.length) {
        if (window.requestIdleCallback) requestIdleCallback(loadBatch);
        else setTimeout(loadBatch, 200);
      }
    }
    if (window.requestIdleCallback) requestIdleCallback(loadBatch);
    else setTimeout(loadBatch, 2000);
  }
  
  setTimeout(preloadProjectImages, 4000);
}

  setupAboutSection();
  initAwards();
  ScrollTrigger.refresh();
}
function initAwards() {
  const awardItems = gsap.utils.toArray('.award-item');
  if (awardItems.length > 0) {
    // Egyirányú mechanika (2026-09-21, finomítva 2026-09-23): lefelé
    // görgetve bekapcsol az "active-award" és FIX marad, csak felfelé
    // görgetve kapcsol ki — késleltető puffer-sávval (lásd lent), hogy a
    // cím biztosan látszódjon még egy darabig kiemelve, mielőtt visszavált.
    // A bekapcsolás pontja lejjebb (center+=15%, tehát korábban lefelé
    // görgetve, még mielőtt a sor pontosan középre érne) — a user kérésére
    // a korábbi "top center"-ről ide tolva, hogy hamarabb induljon az
    // animáció. A kikapcsolás pontja ezzel arányosan lejjebb (center+=30%)
    // tolva, hogy a köztük lévő 15%-os puffer-sáv (a késleltetés mértéke)
    // ne csökkenjen.
    awardItems.forEach(item => {
      ScrollTrigger.create({
        trigger: item,
        start: "top center+=15%",
        onEnter: () => item.classList.add('active-award'),
      });
      ScrollTrigger.create({
        trigger: item,
        start: "top center+=30%",
        onLeaveBack: () => item.classList.remove('active-award'),
      });
    });

    // Custom cursor logic: Show project cover when hovering on award items
    const awardCursor = document.createElement('img');
    awardCursor.style.position = 'fixed';
    awardCursor.style.top = '0';
    awardCursor.style.left = '0';
    awardCursor.style.width = '250px';
    awardCursor.style.height = 'auto';
    awardCursor.style.borderRadius = '5px';
    awardCursor.style.pointerEvents = 'none';
    awardCursor.style.zIndex = '99999';
    document.body.appendChild(awardCursor);
    
    // Set initial bounds via GSAP directly
    gsap.set(awardCursor, { xPercent: -50, yPercent: -50, scale: 0.8, opacity: 0 });

    let isAwardHovered = false;

    window.addEventListener('mousemove', (e) => {
      if (isAwardHovered) {
        gsap.set(awardCursor, { x: e.clientX, y: e.clientY });
      }
    });

    awardItems.forEach(item => {
      item.addEventListener('mouseenter', (e) => {
        isAwardHovered = true;
        const imgSrc = item.getAttribute('data-cursor-img');
        if (imgSrc) {
          awardCursor.src = imgSrc;
        }
        gsap.set(awardCursor, { x: e.clientX, y: e.clientY });
        gsap.to(awardCursor, { opacity: 1, scale: 1, duration: 0.3, overwrite: "auto" });
      });
      item.addEventListener('mouseleave', () => {
        isAwardHovered = false;
        gsap.to(awardCursor, { opacity: 0, scale: 0.8, duration: 0.3, overwrite: "auto" });
      });
    });

    // A .award-detail KATTINTÁSRA nyílik/zárul (nem hoverre — a folyamatos
    // hover-mozgás a sor magasságát animálta, ami elcsúsztatta a FENTEBBI
    // ScrollTrigger-ök start/end pozícióit minden egérmozdulatnál). Egyszerre
    // csak egy sor lehet nyitva. A ScrollTrigger.refresh() a lenyílás/
    // becsukódás animációja UTÁN újraszámolja a trigger-pozíciókat, hogy a
    // görgetés-vezérelt .active-award kiemelés ne csússzon szét a megváltozott
    // layout-magasságok miatt.
    awardItems.forEach(item => {
      const row = item.querySelector('.award-item-row');
      const detail = item.querySelector('.award-detail');
      row.addEventListener('click', () => {
        const wasOpen = item.classList.contains('is-detail-open');
        awardItems.forEach(other => other.classList.remove('is-detail-open'));
        if (!wasOpen) item.classList.add('is-detail-open');
      });
      if (detail) {
        detail.addEventListener('transitionend', (e) => {
          if (e.propertyName === 'max-height') ScrollTrigger.refresh();
        });
      }
    });
  }
}
