// @ts-nocheck
// A régi oldal (botondrozmann.hu) menüje: menu-brand.js, a pensatori-irrazionali.com mechanikája
// (sarokból kinyíló panel). Átírva: a fejléc "Menü" gombja nyitja (window.__siteMenu.toggle),
// a menüpontok a rb-oldal Lenis-ével görgetnek.
import gsap from "gsap";

let started = false;
export function initSiteMenu() {
  if (started) return;
  const root = document.getElementById("site-menu");
  if (!root) return;
  started = true;
  const toggle = root.querySelector(".sm-toggle");
  const panel = root.querySelector(".sm-panel");
  const overlay = root.querySelector(".sm-overlay");
  const links = root.querySelectorAll(".sm-link");
  const lines = root.querySelectorAll(".sm-line");
  const socialTitle = root.querySelectorAll(".sm-social-title");
  const socialLinks = root.querySelectorAll(".sm-social a");

  let open = false;
  let tl = null;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const panelWidth = () => {
    const w = window.innerWidth;
    if (w < 768) return w - 40 + "px";
    if (w < 1024) return "384px";
    return Math.min(480, Math.round(w * 0.32)) + "px";
  };
  const panelHeight = () => Math.round(window.innerHeight * 0.92) + "px";

  // 2026-11-04: a panel a fejléc "Menü" gombjából nyílik ki és oda záródik vissza:
  // annak a jobb felső sarkához igazodik, és annak a méretéről indul
  const menuBtn = () => document.querySelector('header [aria-controls="sm-panel"]');
  const fromBtn = () => {
    const b = menuBtn()?.getBoundingClientRect();
    if (!b || !b.width) return { width: "44px", height: "44px" };
    const pos = { top: b.top + "px", right: window.innerWidth - b.right + "px" };
    gsap.set([panel, toggle], pos);
    return { width: b.width + "px", height: b.height + "px" };
  };

  function setOpen(v) {
    if (v === open) return;
    open = v;
    root.classList.toggle("is-open", v);
    toggle.setAttribute("aria-expanded", String(v));
    toggle.setAttribute("aria-label", v ? "Menü bezárása" : "Menü megnyitása");
    panel.setAttribute("aria-hidden", String(!v));
    if (v) panel.removeAttribute("inert");
    else panel.setAttribute("inert", "");

    if (tl) tl.kill();
    tl = gsap.timeline();

    if (v) {
      overlay.style.pointerEvents = "auto";
      panel.style.pointerEvents = "auto";
      panel.style.visibility = "visible";
      const start = fromBtn();
      if (reduce) {
        gsap.set(panel, { width: panelWidth(), height: panelHeight() });
        gsap.set(overlay, { opacity: 1 });
        gsap.set([links, socialLinks, socialTitle], { opacity: 1, y: 0 });
        gsap.set(lines, { scaleX: 1 });
        return;
      }
      tl.set(links, { y: "-2rem", opacity: 0 }, 0)
        .set([socialLinks, socialTitle], { y: "-2rem", opacity: 0 }, 0)
        .set(lines, { scaleX: 0 }, 0)
        .fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0)
        .fromTo(panel, start, { width: panelWidth(), height: panelHeight(), duration: 0.6, ease: "power3.inOut" }, 0)
        .to(links, { y: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: "power2.out" }, 0.18)
        .to(lines, { scaleX: 1, stagger: 0.05, ease: "power2.out" }, 0.3)
        .to([socialTitle, socialLinks], { y: 0, opacity: 1, stagger: 0.05, duration: 0.4 }, 0.4);
    } else {
      const end = fromBtn();
      if (reduce) {
        gsap.set(panel, end);
        gsap.set(overlay, { opacity: 0 });
        overlay.style.pointerEvents = "none";
        panel.style.pointerEvents = "none";
        panel.style.visibility = "hidden";
        return;
      }
      tl.to([links, socialLinks, socialTitle], { y: "-2rem", opacity: 0, stagger: 0.04, duration: 0.28 }, 0)
        .to(panel, { ...end, duration: 0.5, ease: "power3.inOut" }, 0.05)
        .to(overlay, { opacity: 0, duration: 0.4 }, 0)
        .set(lines, { scaleX: 0 })
        .set([overlay, panel], { pointerEvents: "none" })
        .set(panel, { visibility: "hidden" });
    }
  }

  toggle.addEventListener("click", () => setOpen(!open));
  overlay.addEventListener("click", () => setOpen(false));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
  });

  links.forEach((a) => {
    a.addEventListener("click", () => {
      setOpen(false);
      // 2026-11-06: a "Referenciák" pont a könyves aloldalra visz (data-goto)
      const goto = a.getAttribute("data-goto");
      if (goto) {
        location.href = goto;
        return;
      }
      const target = document.querySelector(a.getAttribute("data-scrollto"));
      // más oldalról (pl. /referenciak/) a főoldal adott szekciójára visz; ott az OldSections görget oda
      if (!target) {
        location.href = "/" + a.getAttribute("data-scrollto");
        return;
      }
      const lenis = window.__scroll?.lenis;
      if (target && lenis) lenis.scrollTo(target, { duration: Number(a.dataset.duration) || 1.1 });
      else target?.scrollIntoView({ behavior: "smooth" });
    });
    a.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        a.click();
      }
    });
  });

  let rt;
  window.addEventListener("resize", () => {
    if (!open || reduce) return;
    clearTimeout(rt);
    rt = setTimeout(() => {
      gsap.to(panel, { width: panelWidth(), height: panelHeight(), duration: 0.25, ease: "power2.out" });
    }, 120);
  });

  window.__siteMenu = { toggle: () => setOpen(!open), open: () => setOpen(true), close: () => setOpen(false) };
}
