import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { T } from "../gl/timeline";

gsap.registerPlugin(ScrollTrigger);

export interface ScrollController {
  state: { progress: number };
  tl: gsap.core.Timeline;
  lenis: Lenis;
  refresh: () => void;
  destroy: () => void;
}

// The one source of progress: Lenis smooths the native scroll, ScrollTrigger turns it into
// progress 0..1 and scrubs the DOM master timeline. WebGL reads the same state.progress
// every frame.
export function createScrollController(spacer: HTMLElement, onUpdate: (s: number) => void): ScrollController {
  const state = { progress: 0 };
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  // the master timeline, T.total "screens" long
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  tl.set({}, {}, T.total);

  const st = ScrollTrigger.create({
    trigger: spacer,
    start: "top top",
    end: "bottom bottom",
    animation: tl,
    scrub: true,
    onUpdate: (self) => {
      state.progress = self.progress;
      onUpdate(self.progress * T.total);
    },
  });

  return {
    state,
    tl,
    lenis,
    refresh: () => ScrollTrigger.refresh(),
    destroy() {
      st.kill();
      tl.kill();
      gsap.ticker.remove(tick);
      lenis.destroy();
    },
  };
}
