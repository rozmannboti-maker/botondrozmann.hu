import type { Shift } from "../gl/engine";

// Cinematic chromatic aberration: an SVG filter (components/AberrationDefs) whose parameters
// the engine updates every frame from the cursor's speed (no React state).
//
// Chain: split into R / G / B → R and B part along the direction of the jerk and smear along
// it (like a camera's motion blur) → recombine with screen (white again where they overlap)
// → a trail behind the motion and a soft glow (bloom).
// At rest the filter is removed entirely: the type is perfectly sharp and white.

export const CA_FILTER_ID = "ca-cinematic";

/** Applies a shift { x, y } (the jerk vector, px) to the filter's nodes. */
export function createAberrationController(target: HTMLElement | null, maxShift = 6): (shift: Shift) => void {
  const filter = document.getElementById(CA_FILTER_ID);
  if (!filter || !target) return () => {};
  const q = (k: string) => {
    const el = filter.querySelector(`[data-ca="${k}"]`);
    if (!el) throw new Error(`filter node ${k} missing`);
    return el;
  };
  const n = {
    rOff: q("r-off"),
    gOff: q("g-off"),
    bOff: q("b-off"),
    rBlur: q("r-blur"),
    gBlur: q("g-blur"),
    bBlur: q("b-blur"),
    trailOff: q("trail-off"),
    trailBlur: q("trail-blur"),
    trailA: q("trail-a"),
    glow: q("glow"),
    glowA: q("glow-a"),
  };
  let on = false;
  const f = (v: number) => v.toFixed(2);
  const set = (el: Element, attr: string, v: string) => el.setAttribute(attr, v);
  return ({ x, y }) => {
    let m = Math.hypot(x, y);
    if (m < 0.05) {
      if (on) {
        target.style.filter = "";
        on = false;
      }
      return;
    }
    if (!on) {
      target.style.filter = `url(#${CA_FILTER_ID})`;
      on = true;
    }
    // soft saturation: the channels never leave the letter, even on a hard jerk
    const sat = maxShift * Math.tanh(m / maxShift);
    const ux = x / m;
    const uy = y / m;
    const dx = ux * sat;
    const dy = uy * sat;
    m = sat;
    set(n.rOff, "dx", f(dx));
    set(n.rOff, "dy", f(dy));
    set(n.gOff, "dx", f(dx * 0.2));
    set(n.gOff, "dy", f(dy * 0.2));
    set(n.bOff, "dx", f(-dx * 0.8));
    set(n.bOff, "dy", f(-dy * 0.8));
    // a directional smear along the jerk, almost no blur across it
    const bx = Math.abs(ux) * m * 0.7 + 0.15;
    const by = Math.abs(uy) * m * 0.7 + 0.15;
    set(n.rBlur, "stdDeviation", `${f(bx)} ${f(by)}`);
    set(n.bBlur, "stdDeviation", `${f(bx)} ${f(by)}`);
    set(n.gBlur, "stdDeviation", `${f(bx * 0.3)} ${f(by * 0.3)}`);
    // the trail behind the motion
    set(n.trailOff, "dx", f(-dx * 2.6));
    set(n.trailOff, "dy", f(-dy * 2.6));
    set(n.trailBlur, "stdDeviation", `${f(bx * 3)} ${f(by * 3)}`);
    set(n.trailA, "slope", f(Math.min(m / maxShift, 1) * 0.28));
    // bloom
    set(n.glow, "stdDeviation", f(1 + m * 0.9));
    set(n.glowA, "slope", f(Math.min(m / maxShift, 1) * 0.45));
  };
}
