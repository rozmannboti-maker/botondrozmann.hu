// A Szolgáltatások lista alatti kártya-szekció vezérlője (fromanother.love "Our team"
// mechanikája, vanilla átirat: Saját projektek/.../inspirációk/szolgáltatás szekcióhoz).
// Stílus: public/assets/css/svc-stack.css
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

let started = false;

export function initSvcStack() {
  if (started) return;
  const root = document.getElementById("svc");
  if (!root) return;
  started = true;

  // szavakra bontás (az eredeti SplitText-et utánozza)
  root.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
    // a felolvasó a teljes mondatot egy rejtett szövegből kapja (az aria-label <p>-n nem megengedett)
    const full = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const parts = el.innerHTML.split(/(<br\s*\/?>)/i);
    el.innerHTML = `<span class="svc-sr">${full}</span>` + parts
      .map((p) =>
        /^<br/i.test(p)
          ? p
          : p
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .map((w) => `<span class="word" aria-hidden="true">${w}</span>`)
              .join(" "),
      )
      .join("");
  });

  // bevezető cím: elmosódottból éles, amikor láthatóvá válik
  const intro = root.querySelector<HTMLElement>(".svc-intro")!;
  intro.querySelectorAll<HTMLElement>(".word").forEach((w, i) => (w.style.transitionDelay = i * 0.12 + "s"));
  new IntersectionObserver(([e]) => intro.classList.toggle("is-in", e.isIntersecting), { threshold: 0.35 }).observe(intro);

  const stack = root.querySelector<HTMLElement>(".svc-stack")!;
  const content = root.querySelector<HTMLElement>(".svc-content")!;
  const cards = [...root.querySelectorAll<HTMLElement>(".svc-card")];
  const descs = [...root.querySelectorAll<HTMLElement>(".svc-desc-item")].map((item) => ({
    head: item.querySelector<HTMLElement>("h3")!,
    words: [...item.querySelectorAll<HTMLElement>("p .word")],
  }));
  const strip = root.querySelector<HTMLElement>(".svc-counter-strip")!;
  const n = cards.length;

  let target = 0;
  let progress = 0;
  let lastY = window.scrollY;
  let velocity = 0;
  let lastDigit = -1;
  let visible = false;
  let raf = 0;

  const readScroll = () => {
    const r = stack.getBoundingClientRect();
    target = clamp(-r.top / (r.height - window.innerHeight));
  };

  // ---- telefon: lapozós mód (2026-11-11) ----
  // 767 px alatt nincs görgetés-vezérelt mozgás: nyilak, pöttyök és ujjal húzás lapoz.
  const mq = window.matchMedia("(max-width: 767px)");
  let mobile = mq.matches;
  let index = 0;
  const prevBtn = root.querySelector<HTMLButtonElement>('.svc-arrow[data-dir="-1"]')!;
  const nextBtn = root.querySelector<HTMLButtonElement>('.svc-arrow[data-dir="1"]')!;
  const dotsEl = root.querySelector<HTMLElement>(".svc-dots")!;
  const dots = descs.map((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `${i + 1}. szolgáltatás: ${d.head.textContent ?? ""}`);
    b.innerHTML = "<span></span>";
    b.addEventListener("click", () => go(i));
    dotsEl.appendChild(b);
    return b;
  });

  // a lapozóban a kártyák képernyőn kívül várnak: a lusta betöltés miatt lapozáskor üresek lennének
  const eagerImages = () => cards.forEach((c) => c.querySelector("img")?.setAttribute("loading", "eager"));
  const showIndex = () => {
    eagerImages();
    cards.forEach((c, i) => {
      const on = i === index;
      c.style.setProperty("--rel-pos", String(i - index));
      c.style.setProperty("--active", on ? "1" : "0");
      c.style.setProperty("--o", on ? "1" : "0.3");
      c.style.setProperty("--g", on ? "0%" : "100%");
      c.setAttribute("aria-hidden", on ? "false" : "true");
    });
    descs.forEach(({ head, words }, i) => {
      const o = i === index ? "1" : "0";
      head.style.opacity = o;
      words.forEach((w) => (w.style.opacity = o));
    });
    dots.forEach((d, i) => d.setAttribute("aria-current", String(i === index)));
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === n - 1;
  };
  const go = (i: number) => {
    index = Math.max(0, Math.min(n - 1, i));
    showIndex();
  };
  prevBtn.addEventListener("click", () => go(index - 1));
  nextBtn.addEventListener("click", () => go(index + 1));

  // ujjal húzás a kártyán: csak a vízszintes mozdulat lapoz, a függőleges görgetés marad
  const cardsEl = root.querySelector<HTMLElement>(".svc-cards")!;
  let sx = 0, sy = 0, tracking = false;
  cardsEl.addEventListener("touchstart", (e) => {
    if (!mobile) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });
  cardsEl.addEventListener("touchend", (e) => {
    if (!mobile || !tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(index + (dx < 0 ? 1 : -1));
  }, { passive: true });

  mq.addEventListener("change", () => {
    mobile = mq.matches;
    if (mobile) showIndex();
    else {
      cards.forEach((c) => c.removeAttribute("aria-hidden"));
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }
  });

  const frame = () => {
    if (mobile) {
      raf = 0;
      return;
    }
    readScroll();
    progress += (target - progress) * 0.1; // simítás
    const dy = window.scrollY - lastY;
    lastY = window.scrollY;
    velocity += (clamp(dy, -60, 60) - velocity) * 0.15;
    content.style.setProperty("--scroll-velocity", velocity.toFixed(2));

    const active = progress * (n - 1);
    cards.forEach((c, i) => {
      const rel = i - active;
      const d = clamp(Math.abs(rel));
      c.style.setProperty("--rel-pos", rel.toFixed(4));
      c.style.setProperty("--active", (1 - d).toFixed(3));
      c.style.setProperty("--o", (1 - 0.7 * d).toFixed(3));
      c.style.setProperty("--g", (d * 100).toFixed(1) + "%");
    });

    descs.forEach(({ head, words }, i) => {
      const t = clamp(1 - Math.abs(active - i) * 2.2); // 1 = ez az aktív elem
      head.style.opacity = t.toFixed(3);
      const N = words.length;
      words.forEach((w, k) => (w.style.opacity = clamp((t - (k / N) * 0.5) / 0.5).toFixed(3)));
    });

    const digit = Math.round(active) + 1;
    if (digit !== lastDigit) {
      strip.style.transform = `translateY(${-digit * 0.9}em)`;
      lastDigit = digit;
    }

    raf = visible ? requestAnimationFrame(frame) : 0;
  };

  // csak akkor fut a képkocka-ciklus, amikor a szekció a képernyőn van
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) {
      readScroll();
      progress = target;
      lastY = window.scrollY;
      raf = requestAnimationFrame(frame);
    }
  }).observe(stack);

  readScroll();
  progress = target;
  if (mobile) showIndex();
  else frame();
}
