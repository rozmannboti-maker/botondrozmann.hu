import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Navigation } from "./components/Navigation";
import { Hero } from "./components/Hero";
import { PortraitHero } from "./components/PortraitHero";
import { OldSections } from "./components/OldSections";
import { Footer } from "./components/Footer";
import { HoverInfo } from "./components/HoverInfo";
import { createScrollController } from "./lib/scroll";
import { setupIntro } from "./lib/intro";
import { Engine, type HeroState } from "./gl/engine";
import { T } from "./gl/timeline";
import { works, sphereExtras, posterUrl, posterWidth, videoUrl } from "./data/projects";
import styles from "./App.module.css";

type Theme = "light" | "dark";

const loadFonts = () =>
  Promise.all([
    document.fonts.load('italic 400 1em "Instrument Serif"'),
  ]);

// the type + ribbon hero is the default; ?hero=portre brings the portrait variant back
const PORTRAIT_HERO = new URLSearchParams(location.search).get("hero") === "portre";

export default function App() {
  const [hovered, setHovered] = useState<number | null>(null);
  const theme: Theme = PORTRAIT_HERO ? "dark" : "light";
  const [ready, setReady] = useState(false);
  const spacerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLHeadingElement>(null);
  const line2Ref = useRef<HTMLParagraphElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    const spacer = spacerRef.current;
    const probe = probeRef.current;
    const stage = stageRef.current;
    const nav = navRef.current;
    const heroRoot = heroRef.current;
    const line1 = line1Ref.current;
    const line2 = line2Ref.current;
    const sub = subRef.current;
    const footer = footerRef.current;
    if (!spacer || !probe || !stage || !nav || !heroRoot || !line1 || !line2 || !sub || !footer) return;
    const navLogo = nav.querySelector<HTMLElement>("[data-nav-logo]");
    const visit = footer.querySelector<HTMLElement>("[data-visit-slide]");
    const amp = footer.querySelector<HTMLElement>("[data-amp]");
    const subscribe = footer.querySelector<HTMLElement>("[data-sub]");
    if (!navLogo || !visit || !amp || !subscribe) return;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    let alive = true;

    // a fresh canvas per mount (StrictMode mounts twice; a WebGL context isn't reused)
    const canvas = document.createElement("canvas");
    canvas.className = styles.gl;
    sub.after(canvas);

    const portraitEl = document.getElementById("portrait-hero");
    if (portraitEl) document.documentElement.setAttribute("data-ptop", "");
    let navInverted = false;
    let stageGone = false;
    const scroll = createScrollController(spacer, (s) => {
      if (portraitEl) {
        // the portrait stays fully visible (type included) while the ribbon crosses it; it fades only as the grid assembles
        const out = Math.min(1, Math.max(0, (s - T.grid[0]) / 0.9));
        portraitEl.style.setProperty("--out", out.toFixed(3));
        document.documentElement.toggleAttribute("data-ptop", out < 0.55);
      }
      // the stage is done once the ribbon has left: hide it so the old sections scroll over a clean page
      const gone = s >= T.total - 0.001;
      if (gone !== stageGone) {
        stageGone = gone;
        stage.style.visibility = gone ? "hidden" : "visible";
      }
    });
    scroll.lenis.on("scroll", ({ scroll: y }: { scroll: number }) => {
      // past the stage the page is light again: the header is not on the black section any more
      if (y > spacer.offsetHeight - window.innerHeight * 0.5 && navInverted) {
        navInverted = false;
        nav.dataset.inverted = "false";
      }
    });
    const tl = scroll.tl;
    // for debugging and tests: window.__scroll.lenis.scrollTo(y, { immediate: true })
    (window as Window & { __scroll?: typeof scroll }).__scroll = scroll;

    // the headlines slide in from the edges toward each other → a pause while the ribbon
    // passes the camera → they part. WebGL reads heroState every frame.
    const heroState: HeroState = { enter: 0, exit: 0, subO: 0, subY: 1, peek: 0 };
    let playIntro: (delay?: number) => gsap.core.Timeline = () => gsap.timeline();
    const ctx = gsap.context(() => {
      // ---------- the DOM part of the one timeline (positions in "screens") ----------
      tl.fromTo(heroState, { exit: 0 }, { exit: 1, duration: T.heroOut[1] - T.heroOut[0], ease: "power1.in", immediateRender: false }, T.heroOut[0]);
      // the subheading: rises with its opacity, in step with the headlines
      // and leaves upward when the lines start to part
      tl.fromTo(heroState, { subO: 1, subY: 0 }, { subO: 0, subY: -1.3, duration: 0.45, ease: "power1.in", immediateRender: false }, T.heroOut[0] + 0.1);

      // footer: only its hero state is used now (the grid state it used to slide into is gone)
      gsap.set(visit, { "--slide": 1 });
      gsap.set([amp, subscribe], { opacity: 0, yPercent: 60 });

      // the first screen's intro: start states now, played when the loader goes
      playIntro = setupIntro(nav, footer);
    });

    // ---------- WebGL ----------
    const getUnit = () => probe.getBoundingClientRect().width / 100;
    const pw = posterWidth();
    let engine: Engine | null = null;
    const start = () => {
      if (!alive) return;
      setReady(true);
      scroll.refresh();
      ctx.add(() => playIntro(0.25));
      // the hero plays on time, not on scroll: the visitor sees the headline and the works at once
      if (!PORTRAIT_HERO) ctx.add(() => {
        gsap.fromTo(heroState, { enter: 0 }, { enter: 1, duration: 1.5, ease: "power3.out", delay: 0.3 });
        gsap.fromTo(heroState, { subO: 0, subY: 1 }, { subO: 1, subY: 0, duration: 0.9, ease: "power2.out", delay: 1.0 });
        gsap.to(heroState, { peek: 0.33, duration: 2.6, ease: "power2.out", delay: 0.8 });
      });
    };
    // no WebGL (the renderer throws right away) or a failed load: the DOM shows the type itself
    new Promise<Engine>((resolve) => {
      engine = new Engine({
        canvas,
        heroRoot,
        heroLines: [line1, line2],
        images: works.map((w) => posterUrl(w.slug, pw)),
        videos: works.map((w) => (w.video ? { src: videoUrl(w.slug), start: w.start } : null)),
        sphereImages: sphereExtras.map((slug) => posterUrl(slug, pw)),
        getProgress: () => scroll.state.progress,
        getUnit,
        onHover: setHovered,
        navLogo,
        hero: heroState,
        onAberration: () => {},
        fonts: loadFonts(),
      });
      engineRef.current = engine;
      if (import.meta.env.DEV) (window as Window & { __engine?: Engine }).__engine = engine;
      resolve(engine);
    })
      .then((e) => e.init())
      .then(start)
      .catch((err: unknown) => {
        console.error(err);
        document.documentElement.classList.add("no-webgl");
        navLogo.style.opacity = "1";
        start();
      });

    const onResize = () => scroll.refresh();
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      ctx.revert();
      engine?.dispose();
      engineRef.current = null;
      scroll.destroy();
      canvas.remove();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    engineRef.current?.setTheme();
  }, [theme]);

  return (
    <>
      <div className={`${styles.loader} ${ready ? styles.done : ""}`} />
      <Navigation ref={navRef} />
      <main className={styles.stage} ref={stageRef}>
        {PORTRAIT_HERO && <PortraitHero ready={ready} />}
        <Hero rootRef={heroRef} line1Ref={line1Ref} line2Ref={line2Ref} subRef={subRef} />
        {/* the WebGL canvas goes here (created by the effect) */}
        <HoverInfo hovered={hovered} works={works} />
        <Footer ref={footerRef} />
      </main>
      <div className={styles.spacer} ref={spacerRef} style={{ height: `${(T.total + 1) * 100}vh` }} />
      <OldSections />
      <div className={styles.probe} ref={probeRef} aria-hidden="true" />
    </>
  );
}
