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
    el.setAttribute("aria-label", (el.textContent ?? "").replace(/\s+/g, " ").trim());
    const parts = el.innerHTML.split(/(<br\s*\/?>)/i);
    el.innerHTML = parts
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

  const frame = () => {
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
  frame();
}
