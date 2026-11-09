// ─────────────────────────────────────────────────────────────
//  Cloth parameters. All values are in design pixels of the
//  1440 × 900 layout; other sizes scale them automatically.
//  Tune the effect here.
// ─────────────────────────────────────────────────────────────
export const PHYS = {
  // ── Spring grid of the cloth (ClothSim) ──
  stiffness: 2600, // springs between neighbouring nodes → wave speed and tautness
  recovery: 30, // pull back to flat
  damping: 7.2, // damping (lower → rings longer)
  inertia: 0.04, // surface response to the sheet speeding up / braking on its way into the grid

  // ── Cursor ──
  forceRadius: 0.17, // radius of the touch, share of the sheet width
  forceStrength: 1900, // base touch force (cursor at rest)
  velocityInfluence: 2.2, // extra force per px/s of cursor speed
  maxForce: 7000, // force cap for very fast moves

  // ── Wind (vertex shader, smooth noise) ──
  windRibbonIdle: 2.4, // px: constant ripple of the ribbon without hover
  windRibbonHover: 10, // px: extra ribbon amplitude on hover
  windGridHover: 11, // px: wind amplitude on a hovered grid card
  windEdgeFreedom: 0.55, // how much freer the edges are than the centre (0 = same)
  windSpeed: 0.42, // speed of the waves across the surface
  windGustFromCursor: 0.9, // wind boost around the cursor

  // ── hoverIntensity ──
  hoverIn: 2.4, // wind ramp-up on hover (1/s)
  hoverOut: 1.1, // wind fade after the cursor leaves (1/s)
  speedBoost: 0.00045, // short wave boost from fast cursor moves

  // ── Fold shading (makes the deformation readable head-on) ──
  shadeGain: 2.0, // strength of the fold light (0 = none)
} as const;
