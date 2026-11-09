// One scale for the whole scene, in scroll "screens" (1 = 100vh of scrolling).
// WebGL and the DOM tweens both read the same progress → s.
export const T = {
  total: 3.55,
  logo: [0.0, 0.6], // the glass logo flies from the centre into the header
  logoFade: [0.6, 0.85], // it dissolves and the flat logo shows in its place
  heroIn: [0.0, 1.4], // A1: the headlines slide in from the edges
  heroOut: [2.25, 3.25], // A2: after the pause (ribbon at the camera) they part
  ribbon: [0.05, 3.55], // B+C: the ribbon rises, loops at the camera, turns again and leaves
  grid: [3.55, 5.0], // D: the grid assembles
  hold: [5.0, 5.5], // E: interactive grid
  blinds: [5.5, 6.35], // F: blinds
  final: [6.2, 6.8], // G: the final section reveals
} as const satisfies Record<string, number | readonly [number, number]>;

export type Span = readonly [number, number];

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const range = (s: number, [a, b]: Span) => clamp((s - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
