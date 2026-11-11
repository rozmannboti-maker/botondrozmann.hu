import * as THREE from "three";
import { RibbonCurve } from "./ribbonCurve";
import { ProjectCanvas, disposeShared, type CardVideo, type PickHit } from "./projectCanvas";
import { TextPlane } from "./textPlane";
import { computeLayout, type Layout } from "./layout";
import { T, range, clamp, lerp, easeOutCubic, smooth } from "./timeline";
import { PHYS } from "./physics";
import { WorkSphere, type PointerN } from "./workSphere";

const FOV = 30;
const MAX_DPR = 2;

// a deterministic "random" for the cards' entry composition
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

type From = "left" | "right" | "top" | "bottom";
interface Entry {
  from: From;
  order: number;
}

// where each grid card flies in from (by cell index) and in which order
const ENTRY_DESKTOP: Entry[] = [
  { from: "left", order: 0 }, { from: "top", order: 2 }, { from: "right", order: 1 }, { from: "right", order: 3 },
  { from: "left", order: 4 }, { from: "bottom", order: 6 }, { from: "bottom", order: 5 }, { from: "right", order: 7 },
  { from: "left", order: 8 }, { from: "bottom", order: 10 }, { from: "bottom", order: 9 }, { from: "right", order: 11 },
];
// portrait 3 × 4: the side columns come from their side, the middle one from above / below
const ENTRY_PORTRAIT: Entry[] = Array.from({ length: 12 }, (_, i) => {
  const c = i % 3;
  const r = Math.floor(i / 3);
  const from: From = c === 0 ? "left" : c === 2 ? "right" : r < 2 ? "top" : "bottom";
  return { from, order: r * 3 + [0, 2, 1][c] };
});

export interface HeroState {
  enter: number;
  exit: number;
  subO: number;
  subY: number;
  /** ribbon progress (0..1) reached by the load intro, so the works peek in before any scroll */
  peek: number;
}

export interface Shift {
  x: number;
  y: number;
}

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  /** the hero lines' container: gets --base-off (the lines' baseline offset) */
  heroRoot: HTMLElement;
  /** DOM sources of the WebGL type: line 1, line 2, the subheading */
  heroLines: HTMLElement[];
  images: string[];
  videos: (CardVideo | null)[];
  sphereImages: string[];
  /** the one scroll progress, 0..1 */
  getProgress: () => number;
  /** the CSS --u in px */
  getUnit: () => number;
  onHover: (i: number | null) => void;
  navLogo: HTMLElement;
  /** the headlines' enter / exit progress from the GSAP master timeline */
  hero: HeroState;
  onAberration: (shift: Shift) => void;
  /** resolves once the fonts the type is drawn with have loaded */
  fonts: Promise<unknown>;
}

interface Mouse {
  x: number;
  y: number;
  inside: boolean;
  overUI: boolean;
  moved: boolean;
  isMouse: boolean;
}

export class Engine {
  private readonly o: EngineOptions;
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 10, 20000);
  private readonly curve = new RibbonCurve();
  cards: ProjectCanvas[] = [];
  private readonly textPlanes: TextPlane[];
  private readonly mouse: Mouse = { x: -1e4, y: -1e4, inside: false, overUI: false, moved: false, isMouse: true };
  private readonly hero: HeroState;
  private pickFrame = 0;
  private lastPick: PickHit | null = null;
  private hovered: number | null = null;
  private lastS = -1;
  private dirty = true;
  private ready = false;
  private disposed = false;
  private scrollVel = 0;
  private flex = 0;
  private readonly timer = new THREE.Timer();
  private raf = 0;
  // Takarékmód (2026-11-11): ha a gép a képkockákat lassan rajzolja (nincs videókártya, szoftveres
  // WebGL, pl. a PageSpeed tesztgépe), az állandó szalag-hullámzás minden képkockája hosszú feladat
  // lenne és megakasztaná az oldalt. Ilyenkor a jelenet csak görgetés / érintés után rajzol (még
  // ~1,5 mp-ig, hogy a mozgás lecsengjen). Normál telefonon és gépen ez sosem kapcsol be.
  private lowPower = false;
  private frameCosts: number[] = [];
  private awakeUntil = 0;
  private lastDrawn = 0;
  private lastInput = 0;

  W = 1;
  H = 1;
  dpr = 1;
  layout: Layout = computeLayout(1, 1, 1, false);
  private ribbonH = 1;
  private ribbonW = 1;
  private ribbonGap = 1;

  private textures: THREE.Texture[] = [];
  private sphereTextures: THREE.Texture[] = [];
  private sphere: WorkSphere | null = null;
  private finalOn = false;
  private caPrev: { x: number; y: number } | null = null;
  private readonly ca: Shift = { x: 0, y: 0 };
  private caLastX = 0;
  private caLastY = 0;

  // GPU picking
  private pickFloat = true;
  private pickScale = 1;
  private pickTarget: THREE.WebGLRenderTarget | null = null;
  private pickBuf: Float32Array | Uint8Array = new Float32Array(4);
  private pbo: WebGLBuffer | null = null;
  private pickFence: WebGLSync | null = null;
  private pickAge = 0;

  private readonly onResizeBound = () => this.resize();
  private readonly onMoveBound = (e: PointerEvent) => this.onPointer(e);
  private readonly onLeaveBound = (e: PointerEvent) => {
    // a touch "leaves" when the finger lifts: keep its point (a tap acts as hover)
    if (e.pointerType === "mouse") this.mouse.inside = false;
  };

  constructor(o: EngineOptions) {
    this.o = o;
    this.canvas = o.canvas;
    this.hero = o.hero;
    this.renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.textPlanes = o.heroLines.map((el) => new TextPlane(el));
    // The hero type lives in the same 3D scene at z = 0. The ribbon's path only crosses that
    // depth at the sides, clear of the letters (see RibbonCurve), so the ribbon passes behind
    // the type and in front of it without cutting through a line.
    this.textPlanes.forEach((t) => this.scene.add(t.mesh));
    this.renderer.autoClear = false;

    window.addEventListener("resize", this.onResizeBound);
    window.addEventListener("pointermove", this.onMoveBound, { passive: true });
    window.addEventListener("pointerdown", this.onMoveBound, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.onLeaveBound);
  }

  private onPointer(e: PointerEvent) {
    const m = this.mouse;
    m.x = e.clientX;
    m.y = e.clientY;
    m.inside = true;
    m.moved = true;
    m.isMouse = e.pointerType === "mouse";
    this.lastInput = performance.now();
    // over UI buttons / links the sheets under them don't react
    const t = e.target;
    m.overUI = t instanceof Element && t.closest("a,button") !== null;
  }

  async init() {
    const loader = new THREE.TextureLoader();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const textures = await Promise.all(this.o.images.map((src) => loader.loadAsync(src)));
    if (this.disposed) return;
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, maxAniso);
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
    });
    // upload the textures now: no flicker when they first show
    textures.forEach((t) => this.renderer.initTexture(t));
    this.textures = textures;
    this.setupPicking();
    // the final section's sphere: the 12 textures are here, 11 more works load in the
    // background and don't hold up the first screen
    void this.loadSphere(loader, maxAniso);
    this.o.navLogo.style.opacity = "1";
    this.cards = textures.map((t, i) => {
      const c = new ProjectCanvas(i, t, this.curve, this.o.videos[i] ?? null);
      c.pickMaterial.uniforms.uPickScale.value = this.pickScale;
      this.scene.add(c.mesh);
      return c;
    });
    await this.o.fonts;
    if (this.disposed) return;
    this.resize();
    this.renderer.compile(this.scene, this.camera);
    this.ready = true;
    this.timer.update();
    this.loop();
  }

  // ---------------------------------------------------------------- GPU picking
  // Instead of a Raycaster over CPU geometry: the ribbon is laid out along the curve and
  // deformed in the vertex shader, so the point under the cursor comes from the GPU — the
  // same shader rendered into a 1 × 1 target through setViewOffset.
  private setupPicking() {
    const r = this.renderer;
    const float = r.extensions.has("EXT_color_buffer_float");
    this.pickFloat = float;
    this.pickScale = float ? 1 : 1 / 255;
    this.pickTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: float ? THREE.FloatType : THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      generateMipmaps: false,
    });
    this.pickBuf = float ? new Float32Array(4) : new Uint8Array(4);
  }

  private pick() {
    const m = this.mouse;
    if (!m.inside || m.overUI || !this.pickTarget) return;
    const r = this.renderer;
    const cam = this.camera;
    const texts = this.textPlanes.map((t) => t.mesh.visible);
    this.textPlanes.forEach((t) => {
      t.mesh.visible = false;
    });
    const sphereVis = this.sphere ? this.sphere.group.visible : false;
    if (this.sphere) this.sphere.group.visible = false;
    this.cards.forEach((c) => {
      c.mesh.material = c.pickMaterial;
    });
    cam.setViewOffset(this.W, this.H, m.x, m.y, 1, 1);
    r.setRenderTarget(this.pickTarget);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene, cam);
    // non-blocking read: readPixels into a PBO + a fence, polled over the next frames.
    // A fresh buffer per pick: refilling the same one makes Chrome log a performance warning
    // on every pick ("READ-usage buffer was written, then fenced, but written again").
    const gl = r.getContext() as WebGL2RenderingContext;
    this.pbo = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, 16, gl.STREAM_READ);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, this.pickFloat ? gl.FLOAT : gl.UNSIGNED_BYTE, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this.pickFence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    this.pickAge = 0;
    gl.flush();
    r.setRenderTarget(null);
    cam.clearViewOffset();
    this.cards.forEach((c) => {
      c.mesh.material = c.material;
    });
    this.textPlanes.forEach((t, i) => {
      t.mesh.visible = texts[i];
    });
    if (this.sphere) this.sphere.group.visible = sphereVis;
  }

  /** take the pick result once the GPU is done (or we waited long enough) */
  private pollPick() {
    if (!this.pickFence) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    this.pickAge++;
    const st = gl.getSyncParameter(this.pickFence, gl.SYNC_STATUS);
    if (st !== gl.SIGNALED && this.pickAge < 4) return;
    gl.deleteSync(this.pickFence);
    this.pickFence = null;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.pickBuf);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.deleteBuffer(this.pbo);
    this.pbo = null;
    this.lastPick = this.decodePick(this.pickBuf);
  }

  private decodePick(b: Float32Array | Uint8Array): PickHit | null {
    if (!this.mouse.inside || this.mouse.overUI) return null;
    const k = this.pickFloat ? 1 : 1 / 255;
    const id = Math.round(b[0]) - 1;
    if (id < 0 || id >= this.cards.length) return null;
    return { id, u: b[1] * k, v: b[2] * k };
  }

  /** picking not every frame: only when something moved under the cursor */
  private maybePick(sceneMoved: boolean) {
    this.pollPick();
    if (!this.mouse.inside || this.mouse.overUI) {
      this.lastPick = null;
      return null;
    }
    this.pickFrame++;
    if (!this.pickFence && (this.mouse.moved || sceneMoved || this.pickFrame % 3 === 0)) {
      this.mouse.moved = false;
      this.pick();
    }
    return this.lastPick;
  }

  private async loadSphere(loader: THREE.TextureLoader, maxAniso: number) {
    try {
      const more = await Promise.all(this.o.sphereImages.map((src) => loader.loadAsync(src)));
      if (this.disposed) {
        more.forEach((t) => t.dispose());
        return;
      }
      more.forEach((t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, maxAniso);
        this.renderer.initTexture(t);
      });
      this.sphereTextures = more;
      this.sphere = new WorkSphere([...this.textures, ...more]);
      this.sphere.layout(this.W, this.H, this.layout.portrait);
      this.scene.add(this.sphere.group);
    } catch (e) {
      console.warn("sphere images failed to load", e);
    }
  }

  resize() {
    if (this.disposed) return;
    const stage = this.canvas.parentElement ?? document.documentElement;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    this.W = W;
    this.H = H;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(W, H, false);
    // camera: the plane z = 0 matches the screen exactly (1 unit = 1 px)
    const D = H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    this.camera.aspect = W / H;
    this.camera.position.set(0, 0, D);
    this.camera.near = 10;
    this.camera.far = D * 6;
    this.camera.updateProjectionMatrix();

    const portrait = W <= H;
    this.layout = computeLayout(W, H, this.o.getUnit(), portrait);
    const root = document.documentElement;
    root.style.setProperty("--grid-left", `${this.layout.left}px`);
    root.style.setProperty("--grid-right", `${W - this.layout.left - this.layout.gridW}px`);

    // portrait screens: the curve's x shares refer to a wider frame, the sheets are smaller
    this.curve.build(portrait ? W * 1.2 : W, H);
    this.sphere?.layout(W, H, portrait);
    // ribbon: sheet height relative to the screen, 16:10 like the works
    this.ribbonH = portrait ? Math.min(H * 0.215, W * 0.34) : H * 0.215;
    this.ribbonW = this.ribbonH * 1.6;
    this.ribbonGap = this.ribbonH * (0.01 / 0.215);

    this.layoutText();
    this.dirty = true;
  }

  private layoutText() {
    const [line1] = this.o.heroLines;
    // where the lines' baseline sits in their box: the CSS puts the baseline on the design's
    // value with it (top = baseline − --base-off)
    const first = line1.querySelector("span");
    if (first) {
      const cs = getComputedStyle(first);
      const ctx = document.createElement("canvas").getContext("2d");
      if (ctx) {
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const m = ctx.measureText(first.textContent ?? "");
        const r = first.getBoundingClientRect();
        const base = r.top + (r.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
        this.o.heroRoot.style.setProperty("--base-off", `${base - line1.getBoundingClientRect().top}px`);
      }
    }
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#0f0f0f";
    this.textPlanes.forEach((t) => t.layout(this.W, this.H, this.dpr, ink));
    // start offsets: each line fully past the screen edge (+ a margin)
    const [l1, l2] = this.textPlanes;
    const margin = this.W * 0.04;
    if (l1) l1.offIn = -(l1.baseX + l1.mesh.scale.x / 2 + this.W / 2 + margin);
    if (l2) l2.offIn = this.W / 2 - l2.baseX + l2.mesh.scale.x / 2 + margin;
  }

  setTheme() {
    if (!this.ready) return;
    this.layoutText();
    this.dirty = true;
  }

  // ---------------------------------------------------------------- frame
  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 1 / 20);
    const s = clamp(this.o.getProgress(), 0, 1) * T.total;
    const ds = this.lastS < 0 ? 0 : s - this.lastS;
    const changed = Math.abs(ds) > 1e-6;
    this.lastS = s;
    this.scrollVel += ((dt > 0 ? ds / dt : 0) - this.scrollVel) * 0.12;

    const now = performance.now();
    if (changed || this.dirty || now - this.lastInput < 100) this.awakeUntil = now + 1500;
    if (this.lowPower && now > this.awakeUntil) return; // takarékmód: nyugalomban nem rajzol

    const active = this.update(s, dt);
    if (changed || active || this.dirty) {
      this.renderFrame();
      this.dirty = false;
      // a rajzolás valódi ára a képkocka végén jelentkezik: két egymást követő rajzolt képkocka közti
      // idő mutatja meg (normál gépen ~16 ms, szoftveres WebGL-lel 50–100+ ms)
      if (!this.lowPower && this.lastDrawn > 0) {
        const costs = this.frameCosts;
        costs.push(now - this.lastDrawn);
        if (costs.length > 10) costs.shift();
        if (costs.length === 10 && costs.filter((c) => c > 45).length >= 6) this.lowPower = true;
      }
      this.lastDrawn = now;
    } else this.lastDrawn = 0;
  };

  /** the headline layer, then the ribbon / sheets over it */
  private renderFrame() {
    const r = this.renderer;
    r.setRenderTarget(null);
    r.clear();
    r.render(this.scene, this.camera);
  }

  private pointerN(): PointerN | null {
    const m = this.mouse;
    return m.inside ? { x: (m.x / this.W) * 2 - 1, y: (m.y / this.H) * 2 - 1 } : null;
  }

  // ---------------------------------------------------------------- final
  // Once the blinds close, the canvas rises above them (under the final text): the grid's
  // sheets hide and a spinning sphere of the works fills the background.
  private updateFinal(s: number, dt: number) {
    const on = s > T.blinds[1] - 0.02;
    if (on !== this.finalOn) {
      this.finalOn = on;
      this.canvas.style.zIndex = on ? "25" : "";
    }
    const m = this.mouse;

    // the headline's chromatic aberration: from the cursor's speed, easing back to white
    const px = this.caPrev ? m.x - this.caPrev.x : 0;
    const py = this.caPrev ? m.y - this.caPrev.y : 0;
    this.caPrev = { x: m.x, y: m.y };
    const vx = dt > 0 ? px / dt : 0;
    const vy = dt > 0 ? py / dt : 0;
    const ca = this.ca;
    // threshold: only a sharp jerk; slow moves leave the type alone (and taps never count)
    const sp = Math.hypot(vx, vy);
    const g = sp > 900 && m.isMouse ? (sp - 900) / sp : 0;
    const k = this.layout.u;
    const tx = on ? THREE.MathUtils.clamp(vx * g * 0.006, -12, 12) * k : 0;
    const ty = on ? THREE.MathUtils.clamp(vy * g * 0.006, -12, 12) * k : 0;
    // fast response to a jerk, a smooth return to white
    const up = Math.hypot(tx, ty) > Math.hypot(ca.x, ca.y);
    const f = 1 - Math.exp(-dt * (up ? 18 : 4.5));
    ca.x += (tx - ca.x) * f;
    ca.y += (ty - ca.y) * f;
    if (Math.abs(ca.x) < 0.02 && Math.abs(ca.y) < 0.02) {
      ca.x = 0;
      ca.y = 0;
    }
    if (ca.x !== this.caLastX || ca.y !== this.caLastY) {
      this.caLastX = ca.x;
      this.caLastY = ca.y;
      this.o.onAberration(ca);
    }

    if (!this.sphere) return false;
    const fade = smooth(range(s, [T.blinds[1] - 0.05, T.final[1]]));
    return this.sphere.update(dt, on ? fade : 0, this.pointerN(), this.W, this.H);
  }

  private update(s: number, dt: number) {
    const { W, H, layout } = this;
    let active = this.updateFinal(s, dt);

    // --- A: the type slides in from the edges toward each other, then parts further.
    //     enter / exit are GSAP tweens of the master timeline.
    const { enter, exit, subO, subY } = this.hero;
    const travel = W * 1.15;
    const [l1, l2, sub] = this.textPlanes;
    if (sub) {
      // the subheading: rises with its opacity (GSAP tweens)
      sub.mesh.position.y = sub.baseY - subY * 30 * layout.u;
      sub.material.uniforms.uOpacity.value = subO;
      sub.mesh.visible = subO > 0.003;
    }
    if (l1) {
      l1.mesh.position.x = l1.baseX + (1 - enter) * l1.offIn + travel * exit;
      l1.mesh.visible = enter > 0 && exit < 1;
    }
    if (l2) {
      l2.mesh.position.x = l2.baseX + (1 - enter) * l2.offIn - travel * exit;
      l2.mesh.visible = enter > 0 && exit < 1;
    }
    const k = layout.u;

    // --- B/C: the ribbon
    const inGrid = s >= T.grid[0];
    if (!inGrid) {
      // the load intro parks the ribbon at `peek`; scrolling carries it on from there (no dead zone)
      const rp = this.hero.peek + (1 - this.hero.peek) * range(s, T.ribbon);
      const step = this.ribbonW + this.ribbonGap;
      const ribbonLen = this.cards.length * step;
      // a soft start and exit, linear to the scroll in the middle
      const e = lerp(rp, smooth(rp), 0.35);
      const head = e * (this.curve.length + ribbonLen + H * 0.2);
      // the "sail" from the scroll speed, easing out
      const targetFlex = clamp(this.scrollVel * H * 0.025, -H * 0.03, H * 0.03);
      this.flex += (targetFlex - this.flex) * (1 - Math.exp(-dt * 5));
      if (Math.abs(this.flex) < 0.01) this.flex = 0;
      else active = true;
      const visible = rp > 0 && rp < 1;
      this.cards.forEach((c, i) => {
        const s0 = head - (i + 1) * step + this.ribbonGap;
        c.setRibbon(s0, this.ribbonW, this.ribbonH, this.flex, this.curve.length);
        c.mesh.visible = visible;
      });
      // cursor → the exact ribbon sheet under it (perspective and turn included)
      const hit = visible ? this.maybePick(true) : null;
      this.cards.forEach((c, i) => {
        c.setPointer(hit && hit.id === i ? hit : null, dt, k);
        // a constant ripple + stronger wind on hover
        const wind = c.updateWind(dt, visible ? PHYS.windRibbonIdle * k : 0, PHYS.windRibbonHover * k);
        const sim = c.simulate(dt);
        if (visible && (wind || sim)) active = true;
        if (c.updateVideo(dt, false)) active = true;
      });
      this.setHover(null);
      return active;
    }

    // --- D/E: the grid assembles from separate sheets
    const gp = range(s, T.grid);
    const DUR = 0.46;
    const ENTRY = layout.portrait ? ENTRY_PORTRAIT : ENTRY_DESKTOP;
    const last = ENTRY.length - 1;
    // the sheets react to the cursor in flight already, before they settle in the grid
    const interactive = gp > 0 && s < T.blinds[0] + 0.25;
    let hoverIdx: number | null = null;

    this.cards.forEach((c, i) => {
      const cell = layout.cells[i];
      const { w, h } = cell;
      const tx = cell.cx - W / 2;
      const ty = H / 2 - cell.cy;
      const en = ENTRY[i];
      const delay = (en.order / last) * (1 - DUR);
      // gp ≥ 1 → every sheet exactly in place (no float error on the last card)
      const t = gp >= 1 ? 1 : clamp((gp - delay) / DUR);
      const e = easeOutCubic(t);

      // start point past the screen edge + depth
      const r1 = rnd(i, 1) - 0.5;
      const r2 = rnd(i, 2) - 0.5;
      const r3 = rnd(i, 3) - 0.5;
      let sx = tx;
      let sy = ty;
      if (en.from === "left") {
        sx = -W / 2 - w * 0.9 - W * 0.12;
        sy = ty + r1 * H * 0.5;
      }
      if (en.from === "right") {
        sx = W / 2 + w * 0.9 + W * 0.12;
        sy = ty + r1 * H * 0.5;
      }
      if (en.from === "bottom") {
        sy = -H / 2 - h * 0.9 - H * 0.15;
        sx = tx + r1 * W * 0.3;
      }
      if (en.from === "top") {
        sy = H / 2 + h * 0.9 + H * 0.15;
        sx = tx + r1 * W * 0.3;
      }
      const sz = -H * (0.25 + 0.35 * rnd(i, 4));
      // control point: a smooth arc, not a straight line
      const cx = lerp(sx, tx, 0.55) + r2 * W * 0.18;
      const cy = lerp(sy, ty, 0.55) + r3 * H * 0.22;
      const cz = sz * 0.35;
      const u = 1 - e;
      const x = u * u * sx + 2 * u * e * cx + e * e * tx;
      const y = u * u * sy + 2 * u * e * cy + e * e * ty;
      const z = u * u * sz + 2 * u * e * cz;
      // rotation along the path, fading out at the final position
      const kr = Math.pow(1 - e, 1.6);
      const rx = (rnd(i, 5) - 0.5) * 0.9 * kr;
      const ry = (en.from === "left" ? 0.55 : en.from === "right" ? -0.55 : (rnd(i, 6) - 0.5) * 0.6) * kr;
      const rz = (rnd(i, 7) - 0.5) * 0.35 * kr;

      // exactly in the cell at rest
      if (t >= 1) c.setGridPose(tx, ty, 0, 0, 0, 0, w, h, dt);
      else c.setGridPose(x, y, z, rx, ry, rz, w, h, dt);
      c.mesh.visible = t > 0 && !this.finalOn;
      // the ribbon's wind fades as the sheet nears its cell → 0 in place
      c.flight = Math.pow(1 - e, 1.3);
      c.moving = t > 0 && t < 1;
    });

    const anyMoving = this.cards.some((c) => c.moving);
    const hit = interactive ? this.maybePick(anyMoving) : null;
    this.cards.forEach((c, i) => {
      const on = hit !== null && hit.id === i;
      // the project caption and the pointer cursor: only for cards that have settled
      if (on && !c.moving) hoverIdx = i;
      c.setPointer(on ? hit : null, dt, k);
      const wind = c.updateWind(dt, PHYS.windRibbonIdle * k * c.flight, PHYS.windGridHover * k);
      const sim = c.simulate(dt);
      if (wind || sim || c.touch.strength > 0 || c.moving || c.tilt.x !== 0 || c.tilt.y !== 0) active = true;
    });
    // the bridge: between the caption's top and the grid, across the grid's width, the hovered work stays
    // hovered, so the cursor can travel up to the caption's "See full" pill
    const m = this.mouse;
    const onBridge = m.inside && m.x >= layout.left && m.x <= layout.left + layout.gridW && m.y >= layout.captionTop && m.y < layout.top;
    if (hoverIdx === null && interactive && onBridge && this.hovered !== null) hoverIdx = this.hovered;
    // the hovered card plays its template's preview
    this.cards.forEach((c, i) => {
      if (c.updateVideo(dt, i === hoverIdx && !this.finalOn)) active = true;
    });
    this.setHover(hoverIdx);
    return active;
  }

  private setHover(i: number | null) {
    if (i === this.hovered) return;
    this.hovered = i;
    document.body.style.cursor = i === null ? "" : "pointer";
    this.o.onHover(i);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResizeBound);
    window.removeEventListener("pointermove", this.onMoveBound);
    window.removeEventListener("pointerdown", this.onMoveBound);
    document.documentElement.removeEventListener("pointerleave", this.onLeaveBound);
    document.body.style.cursor = "";
    this.cards.forEach((c) => c.dispose());
    this.textures.forEach((t) => t.dispose());
    this.sphereTextures.forEach((t) => t.dispose());
    this.sphere?.dispose();
    this.textPlanes.forEach((t) => t.dispose());
    this.curve.dispose();
    this.pickTarget?.dispose();
    if (this.pbo) (this.renderer.getContext() as WebGL2RenderingContext).deleteBuffer(this.pbo);
    disposeShared();
    this.timer.dispose();
    this.renderer.dispose();
  }
}
