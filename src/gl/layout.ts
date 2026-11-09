// Geometry of the project grid in screen pixels. The WebGL world is built so that
// 1 world unit = 1 CSS px in the plane z = 0.
// Desktop: 4 × 3 between the hover info and the footer. Portrait: 3 × 4 (phone layout).
export const ASPECT = 1.6; // the works are 1440 × 900

export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export interface Layout {
  W: number;
  H: number;
  u: number;
  portrait: boolean;
  cols: number;
  rows: number;
  gap: number;
  captionTop: number; // the hover caption's top, px
  cardW: number;
  cardH: number;
  left: number;
  top: number;
  gridW: number;
  gridH: number;
  cells: Cell[];
}

// design values in u (1 u = 1 px of the 1440 × 900 layout, or of the 390-wide phone layout)
const DESKTOP = { cols: 4, rows: 3, gap: 12, top: 216, bottom: 132, side: 20, caption: 118 };
const PORTRAIT = { cols: 3, rows: 4, gap: 8, top: 214, bottom: 232, side: 20, caption: 92 };

export function computeLayout(W: number, H: number, u: number, portrait: boolean): Layout {
  const d = portrait ? PORTRAIT : DESKTOP;
  const { cols, rows } = d;
  const gap = d.gap * u;
  const areaTop = d.top * u;
  const areaBottom = H - d.bottom * u; // 40 px above the footer
  let h = (areaBottom - areaTop - gap * (rows - 1)) / rows;
  let w = h * ASPECT;
  const maxW = (W - 2 * d.side * u - gap * (cols - 1)) / cols;
  if (w > maxW) {
    w = maxW;
    h = w / ASPECT;
  }
  const gridW = cols * w + (cols - 1) * gap;
  const gridH = rows * h + (rows - 1) * gap;
  const left = Math.round((W - gridW) / 2);
  const top = Math.round(areaTop + (areaBottom - areaTop - gridH) / 2);
  const cells: Cell[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = left + c * (w + gap);
    const y = top + r * (h + gap);
    cells.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
  }
  return { W, H, u, portrait, cols, rows, gap, captionTop: d.caption * u, cardW: w, cardH: h, left, top, gridW, gridH, cells };
}
