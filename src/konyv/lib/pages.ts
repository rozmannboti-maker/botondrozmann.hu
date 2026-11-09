// Printed (non-video) surfaces of the book, drawn on canvases:
// cover, contents, closing page, back cover, paper edges and the contact shadow.
import * as THREE from "three";

const PAPER = "#f3f2ee";
const INK = "#111111";
const MUTED = "#8a8984";
const RULE = "#dcdad3";
const CLOTH = "#0b0b0b"; // cover cloth turned in around the endpapers
// Két betűtípus az egész oldalon (2026-11-09): címek Instrument Serif, minden más Helvetica Neue.
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = '"Instrument Serif", Georgia, serif';
const TEX_W = 2048;
const LOGO_PX = 8; // logo canvases: pixels per SVG unit

export type Brand = {
  bg: string; // cover colour
  logo: HTMLCanvasElement; // the full logo, white on transparent
  mark: HTMLCanvasElement; // the round mark alone
  cover?: HTMLImageElement; // kész borítókép (2048 × 1325); ha nincs, a név kerül a borítóra
};

export type PrintCopy = {
  works: string; // "Selected works · 2026"
  backCover: string; // "Selected works — 2026"
  contents: string;
  count: (n: number) => string; // "21 cases"
  pick: string; // "Select a case to jump to it"
  site: string; // "quillon.studio"
  fin: string;
  thanks: string;
};

export type ContentsEntry = { title: string; tag: string };
type Frame = { turnIn: { x: number; y: number }; spine: "left" | "right" };

export async function loadFonts() {
  const specs = ['400 40px "Instrument Serif"', 'italic 400 40px "Instrument Serif"'];
  await Promise.all(specs.map((s) => document.fonts.load(s))).catch(() => {});
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function context(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return ctx;
}

function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function tint(src: HTMLCanvasElement, color: string) {
  const c = canvas(src.width, src.height);
  const ctx = context(c);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

// The logo SVGs rasterised once (white on transparent), so the pages, cards and
// pencil can tint and reuse them.
export async function loadBrand({ logo, mark, bg, cover }: { logo: string; mark: string; bg: string; cover?: string }): Promise<Brand> {
  const raster = (img: HTMLImageElement) => {
    const c = canvas(Math.ceil(img.naturalWidth * LOGO_PX), Math.ceil(img.naturalHeight * LOGO_PX));
    context(c).drawImage(img, 0, 0, c.width, c.height);
    return c;
  };
  const [l, m, c] = await Promise.all([loadImage(logo), loadImage(mark), cover ? loadImage(cover).catch(() => undefined) : undefined]);
  return { bg, logo: raster(l), mark: raster(m), cover: c };
}

function setSpacing(ctx: CanvasRenderingContext2D, em: number) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = em ? `${em}em` : "0px";
}

function mono(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color = MUTED, align: CanvasTextAlign = "left") {
  ctx.font = `400 ${size}px ${SANS}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  setSpacing(ctx, 0.12);
  ctx.fillText(text.toUpperCase(), x, y);
  setSpacing(ctx, 0);
}

function drawLogo(ctx: CanvasRenderingContext2D, logo: HTMLCanvasElement, color: string, x: number, y: number, h: number, align: "left" | "center" | "right" = "left") {
  const w = (logo.width / logo.height) * h;
  const dx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.drawImage(tint(logo, color), dx, y, w, h);
  return w;
}

// Inside of a board: black cover cloth turned in around the outer edges, the
// endpaper glued right up to the spine edge. Returns the paper rectangle.
function endpaper(ctx: CanvasRenderingContext2D, w: number, h: number, { turnIn, spine }: Frame) {
  const mx = Math.round(w * turnIn.x), my = Math.round(h * turnIn.y);
  ctx.fillStyle = CLOTH;
  ctx.fillRect(0, 0, w, h);
  const r = { x: spine === "left" ? 0 : mx, y: my, w: w - mx, h: h - my * 2 };
  ctx.fillStyle = PAPER;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  return r;
}

// Front cover. 2026-11-06: logó helyett a név, a főoldal hero-címének párosításával
// ("Rozmann" egyenes, "Botond." dőlt Instrument Serif), alatta a kiadás-sor.
export function coverTexture({ bg, cover }: Brand, aspect: number, copy: PrintCopy) {
  const c = canvas(TEX_W, Math.round(TEX_W / aspect));
  const ctx = context(c);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  // 2026-11-07: a Figmában készült borító (RB – Könyvborító, sötét változat), ha betöltődött
  if (cover) {
    ctx.drawImage(cover, 0, 0, c.width, c.height);
    return texture(c);
  }
  const size = 190;
  ctx.fillStyle = "#f1ece6";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  setSpacing(ctx, -0.02);
  const first = "Rozmann ", last = "Botond.";
  ctx.font = `400 ${size}px ${SERIF}`;
  const w1 = ctx.measureText(first).width;
  ctx.font = `italic 400 ${size}px ${SERIF}`;
  const w2 = ctx.measureText(last).width;
  const x = (c.width - w1 - w2) / 2, y = c.height / 2 + size * 0.28;
  ctx.font = `400 ${size}px ${SERIF}`;
  ctx.fillText(first, x, y);
  ctx.font = `italic 400 ${size}px ${SERIF}`;
  ctx.fillText(last, x + w1, y);
  setSpacing(ctx, 0);
  mono(ctx, copy.works, c.width / 2, c.height - 110, 24, "#8a857d", "center");
  return texture(c);
}

export function backCoverTexture({ mark, bg }: Brand, aspect: number, copy: PrintCopy) {
  const c = canvas(TEX_W, Math.round(TEX_W / aspect));
  const ctx = context(c);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  drawLogo(ctx, mark, "#ffffff", c.width / 2, c.height / 2 - 66, 132, "center");
  mono(ctx, copy.backCover, c.width / 2, c.height - 110, 24, "#6d6d6a", "center");
  return texture(c);
}

// Inside front cover. Redrawn on hover so entries can highlight.
// Up to 7 rows per column: the tag sits under the title; more rows: compact, the tag at the row's end.
export class ContentsPage {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  hover = -1;
  private readonly entries: ContentsEntry[];
  private readonly logo: HTMLCanvasElement;
  private readonly frame: Frame;
  private readonly copy: PrintCopy;
  private hits: { x: number; y: number; w: number; h: number; index: number }[] = [];

  constructor(entries: ContentsEntry[], logo: HTMLCanvasElement, copy: PrintCopy, aspect: number, frame: Frame) {
    this.entries = entries;
    this.logo = logo;
    this.copy = copy;
    this.frame = frame;
    this.canvas = canvas(TEX_W, Math.round(TEX_W / aspect));
    this.texture = texture(this.canvas);
    this.draw(-1);
  }

  draw(hover: number) {
    this.hover = hover;
    const c = this.canvas, ctx = context(c);
    const r = endpaper(ctx, c.width, c.height, this.frame);
    const W = r.w, H = r.h, pad = 110;
    ctx.save();
    ctx.translate(r.x, r.y);

    drawLogo(ctx, this.logo, INK, pad, pad - 5, 48);
    mono(ctx, this.copy.works, W - pad, pad + 32, 24, MUTED, "right");
    ctx.fillStyle = RULE;
    ctx.fillRect(pad, pad + 78, W - pad * 2, 2);

    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.font = `400 136px ${SERIF}`; // cím: Instrument Serif
    setSpacing(ctx, -0.01);
    ctx.fillText(this.copy.contents, pad - 6, pad + 260);
    setSpacing(ctx, 0);
    mono(ctx, this.copy.count(this.entries.length), pad, pad + 330, 24);

    const listX = 780, cols = 2, gap = 70;
    const rows = Math.ceil(this.entries.length / cols);
    const compact = rows > 7;
    const colW = (W - pad - listX - gap) / cols;
    const top = pad + 150, bottom = H - pad - 70;
    const rowH = (bottom - top) / rows;
    this.hits = [];

    this.entries.forEach((entry, i) => {
      const col = Math.floor(i / rows), row = i % rows;
      const x = listX + col * (colW + gap), y = top + row * rowH;
      const on = i === hover;
      ctx.fillStyle = on ? INK : RULE;
      ctx.fillRect(x, y, colW, on ? 3 : 2);
      if (compact) {
        mono(ctx, String(i + 1).padStart(2, "0"), x, y + 47, 22, on ? INK : MUTED);
        ctx.fillStyle = INK;
        ctx.font = `400 46px ${SERIF}`; // a munka neve: cím
        setSpacing(ctx, 0);
        ctx.fillText(entry.title, x + 78, y + 50);
        setSpacing(ctx, 0);
        if (on) mono(ctx, "→", x + colW, y + 49, 30, INK, "right");
        else if (entry.tag) mono(ctx, entry.tag, x + colW, y + 46, 19, MUTED, "right");
      } else {
        mono(ctx, String(i + 1).padStart(2, "0"), x, y + 58, 22, on ? INK : MUTED);
        ctx.fillStyle = INK;
        ctx.font = `400 52px ${SERIF}`; // a munka neve: cím
        setSpacing(ctx, 0);
        ctx.fillText(entry.title, x + 78, y + 64);
        setSpacing(ctx, 0);
        if (entry.tag) mono(ctx, entry.tag, x + 80, y + 102, 19);
        if (on) mono(ctx, "→", x + colW, y + 62, 30, INK, "right");
      }
      this.hits.push({ x: r.x + x, y: r.y + y, w: colW, h: rowH, index: i });
    });

    mono(ctx, this.copy.site, pad, H - pad + 10, 22);
    mono(ctx, this.copy.pick, W - pad, H - pad + 10, 22, MUTED, "right");
    ctx.restore();
    this.texture.needsUpdate = true;
  }

  hitTest(u: number, v: number) {
    const x = u * this.canvas.width, y = v * this.canvas.height;
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    return h ? h.index : -1;
  }
}

export function closingTexture({ logo }: Brand, copy: PrintCopy, aspect: number, frame?: Frame) {
  const c = canvas(TEX_W, Math.round(TEX_W / aspect));
  const ctx = context(c);
  let W = c.width, H = c.height;
  const pad = 110;
  if (frame) {
    const r = endpaper(ctx, W, H, frame);
    ({ w: W, h: H } = r);
    ctx.translate(r.x, r.y);
  } else {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
  }
  mono(ctx, copy.works, pad, pad + 32, 24);
  mono(ctx, copy.fin, W - pad, pad + 32, 24, MUTED, "right");
  ctx.fillStyle = RULE;
  ctx.fillRect(pad, pad + 78, W - pad * 2, 2);
  drawLogo(ctx, logo, INK, W / 2, H / 2 - 68, 126, "center");
  mono(ctx, copy.thanks, W / 2, H / 2 + 140, 26, MUTED, "center");
  ctx.fillStyle = RULE;
  ctx.fillRect(pad, H - pad - 50, W - pad * 2, 2);
  mono(ctx, copy.site, W / 2, H - pad + 10, 24, INK, "center");
  return texture(c);
}

export function blankTexture(aspect: number, frame: Frame) {
  const c = canvas(1024, Math.round(1024 / aspect));
  endpaper(context(c), c.width, c.height, frame);
  return texture(c);
}

// Coated magazine stock: R = grain height (bump), G = roughness. Tileable.
export function paperTexture() {
  const s = 512;
  const c = canvas(s, s);
  const ctx = context(c);
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const grain = (Math.random() - 0.5) * 38;
    img.data[i * 4] = 128 + grain;
    img.data[i * 4 + 1] = 140 + grain * 0.5 + (Math.random() - 0.5) * 16;
    img.data[i * 4 + 2] = 128;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // Faint fibres, drawn wrapped so the tile stays seamless.
  ctx.lineWidth = 1;
  for (let f = 0; f < 420; f++) {
    const x = Math.random() * s, y = Math.random() * s;
    const a = Math.random() * Math.PI, len = 8 + Math.random() * 26;
    const dx = Math.cos(a) * len, dy = Math.sin(a) * len;
    const bend = (Math.random() - 0.5) * 10;
    ctx.strokeStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    for (let ox = -s; ox <= s; ox += s) {
      for (let oy = -s; oy <= s; oy += s) {
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.quadraticCurveTo(x + ox + dx / 2 + bend, y + oy + dy / 2 - bend, x + ox + dx, y + oy + dy);
        ctx.stroke();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2.2, 1.4);
  return t;
}

// Stacked paper seen from the side: one faint line per sheet.
export function edgeTexture() {
  const c = canvas(4, 32);
  const ctx = context(c);
  ctx.fillStyle = "#f4f2ec";
  ctx.fillRect(0, 0, 4, 32);
  ctx.fillStyle = "#d4d0c6";
  ctx.fillRect(0, 28, 4, 4);
  const t = texture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Soft contact shadow that grounds the book (the shadow map handles the rest).
export function blobTexture() {
  const c = canvas(512, 256);
  const ctx = context(c);
  ctx.shadowColor = "rgba(0,0,0,1)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetX = 2000;
  ctx.fillStyle = "#000";
  ctx.fillRect(56 - 2000, 48, 400, 160);
  return texture(c);
}
