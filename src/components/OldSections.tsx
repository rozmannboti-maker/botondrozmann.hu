import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import html from "../old/old-sections.html?raw";
import { initOldSections } from "../old/old-sections";
import menuHtml from "../old/site-menu.html?raw";
import { initSiteMenu } from "../old/site-menu";
import { initSvcStack } from "../old/svc-stack";

// A régi oldal (botondrozmann.hu) hero utáni szekciói: Rólam, Munkáim, Szolgáltatások,
// Galéria, Kapcsolat, Lábléc. A CSS #old-site alá van szűkítve (public/assets/css/old-*.css).
export function OldSections() {
  useEffect(() => {
    const boot = () => {
      initOldSections();
      initSiteMenu();
      initSvcStack();
      // más oldalról (pl. a /referenciak/ menüjéből) érkezve: a címben lévő szekcióra görget
      const hashTarget = location.hash.length > 1 ? document.querySelector(location.hash) : null;
      if (hashTarget) {
        // kétszer: a képek betöltése és a pin-ek újraszámolása után a szekció helye még elcsúszhat
        const jump = () => {
          ScrollTrigger.refresh();
          (window as Window & { __scroll?: { lenis: { scrollTo: (t: Element, o?: object) => void } } }).__scroll?.lenis.scrollTo(hashTarget, { immediate: true });
        };
        window.setTimeout(jump, 400);
        window.setTimeout(jump, 1400);
      }
      // a fejléc "Beszéljünk" gombja a terrakotta Kapcsolat fölött sötétre vált
      // 2026-11-04: a terrakotta kör (#contact-blob) már a szekció előtt kitágul a gomb alá,
      // ezért nem a #contact teteje, hanem a kör tényleges helyzete dönt
      const nav = document.querySelector("header");
      const btn = nav?.querySelector("a");
      const blob = document.getElementById("contact-blob");
      const wrap = document.getElementById("contact-blob-wrap");
      if (nav && btn && blob && wrap) {
        let onAccent = false;
        const check = () => {
          const b = btn.getBoundingClientRect();
          const c = blob.getBoundingClientRect();
          const r = c.width / 2;
          const inside = r > 0 && Math.hypot(b.left + b.width / 2 - (c.left + r), b.top + b.height / 2 - (c.top + c.height / 2)) < r;
          // a kört a #contact-blob-wrap vágja; a végén ez húzódik fel a világos lábléc fölül,
          // ott újra a terrakotta gomb kell
          const w = wrap.getBoundingClientRect();
          const cy = b.top + b.height / 2;
          // a wrap csak a lábléc-átmenetnél kap magasságot és vág (addig 0 magas, a kör túllóg rajta)
          const clipped = w.height > 0 && (cy < w.top || cy > w.bottom);
          const next = inside && !clipped;
          if (next !== onAccent) {
            onAccent = next;
            nav.setAttribute("data-on-accent", String(next));
          }
        };
        // képkockánként (a kör a scrub-timeline-tól ugyanabban a tickben kapja a méretét, egy
        // görgetés-eseményhez kötött ellenőrzés néha még az előző állapotot látta)
        ScrollTrigger.create({
          trigger: "#contact",
          start: "top bottom+=100%",
          end: "bottom top",
          onToggle: (self) => {
            if (self.isActive) gsap.ticker.add(check);
            else gsap.ticker.remove(check);
            check();
          },
        });
      }
      // 2026-11-04: a Munkafolyamat („Így dolgozom.”) szekció kivéve, a scriptje
      // (public/assets/js/old-munkafolyamat-szekcio.js) nem töltődik be. A fájlok a lemezen maradtak.
    };
    // a rb-oldal fő effektje hozza létre a window.__scroll-t
    const t = window.setInterval(() => {
      if ((window as Window & { __scroll?: unknown }).__scroll) {
        window.clearInterval(t);
        boot();
      }
    }, 50);
    return () => window.clearInterval(t);
  }, []);
  return (
    <>
      <div id="old-site" style={{ marginTop: "-50vh" }} dangerouslySetInnerHTML={{ __html: html }} />
      {/* a régi oldal menüje (#site-menu, fixed); a fejléc Menü gombja nyitja */}
      <div dangerouslySetInnerHTML={{ __html: menuHtml }} />
    </>
  );
}
