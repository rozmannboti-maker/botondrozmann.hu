import gsap from "gsap";

// The first screen's intro (on time, not on scroll):
// 1) header → 2) the note line by line, top to bottom →
// 3) socials: the label first, then the buttons left to right, rising from transparent.
// The start states are set at once (under the loader), so nothing blinks.
export function setupIntro(nav: HTMLElement, footer: HTMLElement) {
  // the header logo isn't part of it
  const navItems = Array.from(nav.querySelectorAll<HTMLElement>("[data-nav-item]"));
  const noteLines = footer.querySelectorAll<HTMLElement>("[data-note-line]");
  const label = footer.querySelector<HTMLElement>("[data-visit]");
  const buttons = Array.from(footer.querySelectorAll<HTMLElement>("[data-social]"));

  gsap.set(navItems, { autoAlpha: 0, y: -14 });
  gsap.set(noteLines, { yPercent: 105 });
  gsap.set(label, { autoAlpha: 0, yPercent: 60 });
  gsap.set(buttons, { autoAlpha: 0, yPercent: 60 });

  return function play(delay = 0) {
    const tl = gsap.timeline({ delay, defaults: { ease: "power3.out" } });
    tl.to(navItems, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0)
      .to(noteLines, { yPercent: 0, duration: 0.9, stagger: 0.09 }, 0.45)
      .to(label, { autoAlpha: 1, yPercent: 0, duration: 0.7 }, 0.95)
      .to(buttons, { autoAlpha: 1, yPercent: 0, duration: 0.7, stagger: 0.1 }, 1.12);
    // after the intro, drop the inline opacity: the buttons' hover states come from the CSS
    tl.add(() => {
      gsap.set([...navItems, ...buttons], { clearProps: "opacity,visibility" });
    });
    return tl;
  };
}
