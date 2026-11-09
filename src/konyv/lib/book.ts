// The book: two rigid hardcover boards and N flexible sheets hinged on the spine.
//
// Book space: the book lies flat on the XZ plane, spine along Z at x = 0,
// unturned pages to the right (+x), turned pages to the left (-x), Y is up.
// Every hinged item (cover, sheets, back cover) has a turn progress p in [0, 1]
// where 0 is flat on the right and 1 is flat on the left.
import * as THREE from "three";
import type { VideoPage } from "./media";

const SEG_X = 44; // sheet segments across the page (bend resolution)
const SEG_Z = 12; // sheet segments along the spine (twist resolution)
const CURL = 1.15; // how far the free edge leads the spine mid-turn (rad)
const DRAG_CURL = 1.35;
const TWIST = 0.45; // the corner nearest the hand leads the rest of the edge
const HOVER_LIFT = 0.3; // corner peel when hovering a page (rad)
const COVER_HOVER = 0.13; // cover opening a crack on hover (rad)
const GUTTER_RISE = 0.13; // resting pages lift out of the spine, then settle (rad)
const GUTTER_SPAN = 0.3; // fraction of the page width the rise spans
const MIN_GAP = 0.12; // min seconds between consecutive page starts
const TURN = { cover: 1.2, sheet: 1.1, jump: 0.95, stagger: 0.09, release: 0.75 }; // seconds

const OVERHANG = 0.026; // board overhang past the pages
const BOARD = 0.024; // board thickness
const GAP = 0.0065; // sheet spacing

const PI = Math.PI;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
type Ease = (t: number) => number;
const easeInOut: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut: Ease = (t) => 1 - Math.pow(1 - t, 3);
const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export type FaceSpec = { map: THREE.Texture } | { video: VideoPage };
export type SheetSpec = { front: FaceSpec; back: FaceSpec };
export type Covers = {
  frontOuter: THREE.Texture;
  frontInner: THREE.Texture;
  backInner: THREE.Texture;
  backOuter: THREE.Texture;
};

type ItemBase = {
  k: number;
  p: number;
  from: number;
  to: number;
  t0: number;
  dur: number;
  dir: number;
  ease: Ease;
  active: boolean;
  dragging: boolean;
  curl: number;
  twistSign: number;
  hover: number;
  hoverTarget: number;
  hoverDir: number;
  dirty: boolean;
  moving: boolean;
};
type CoverItem = ItemBase & { kind: "cover"; pivot: THREE.Group; board: THREE.Mesh };
type SheetItem = ItemBase & {
  kind: "sheet";
  geo: THREE.BufferGeometry;
  front: THREE.Mesh;
  back: THREE.Mesh;
};
type Item = CoverItem | SheetItem;
type Face = { material: THREE.MeshStandardMaterial; video: VideoPage | null; id: number };

const newItem = (k: number): ItemBase => ({
  k, p: 0, from: 0, to: 0, t0: 0, dur: 1, dir: 1, ease: easeInOut,
  active: false, dragging: false, curl: CURL, twistSign: 1,
  hover: 0, hoverTarget: 0, hoverDir: 1, dirty: true, moving: false,
});

// Printed-magazine finish: ink never reaches pure black, paper never pure
// white, a whisper of paper grain, and (on sheets) a shaded gutter.
// Needs material.bumpMap = paper texture.
function printFinish(material: THREE.MeshStandardMaterial, gutter: boolean) {
  material.onBeforeCompile = (shader) => {
    let ink =
      "\nvec3 paper = vec3(0.955 + 0.06 * (texture2D(bumpMap, vBumpMapUv).r - 0.5));" +
      "\ndiffuseColor.rgb = mix(vec3(0.014), paper, diffuseColor.rgb);";
    if (gutter) {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aSpine;\nvarying float vSpine;")
        .replace("#include <uv_vertex>", "#include <uv_vertex>\nvSpine = aSpine;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vSpine;");
      ink += "\ndiffuseColor.rgb *= mix(0.5, 1.0, smoothstep(0.0, 0.085, vSpine));";
    }
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>${ink}`);
  };
  material.customProgramCacheKey = () => (gutter ? "print-gutter" : "print");
}

function pageMaterial(
  map: THREE.Texture,
  paper: THREE.Texture,
  gutter: boolean,
  extra: THREE.MeshStandardMaterialParameters = {},
) {
  const m = new THREE.MeshStandardMaterial({
    map, roughnessMap: paper, bumpMap: paper, bumpScale: 0.45,
    roughness: 0.78, metalness: 0, ...extra,
  });
  printFinish(m, gutter);
  return m;
}

export class Book {
  readonly W: number;
  readonly H = 1;
  readonly Wc: number;
  readonly Hc: number;
  readonly N: number;
  readonly NI: number;
  readonly T: number;
  readonly root = new THREE.Group(); // yaw
  readonly inner = new THREE.Group(); // keeps the visible part centred
  readonly items: Item[] = [];
  target = 0; // number of items turned = current spread

  private readonly paper: THREE.Texture;
  private readonly faces: Face[] = [];
  private drag: { it: Item; dir: number; x0: number; samples: { t: number; p: number }[] } | null = null;
  private lastStart = { dir: 0, t: -Infinity };
  private blockR!: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private blockL!: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private spine!: THREE.Mesh;

  constructor({ aspect, sheets, covers, edge, paper }: {
    aspect: number; // page width / height (16/10)
    sheets: SheetSpec[];
    covers: Covers;
    edge: THREE.Texture; // paper-edge texture
    paper: THREE.Texture; // magazine-paper grain (R height, G roughness)
  }) {
    this.W = aspect;
    this.Wc = this.W + OVERHANG;
    this.Hc = this.H + OVERHANG * 2;
    this.N = sheets.length;
    this.NI = this.N + 2;
    this.T = 2 * BOARD + (this.N + 1) * GAP;
    this.paper = paper;
    this.root.add(this.inner);

    this.buildCover(0, covers.frontOuter, covers.frontInner);
    sheets.forEach((spec, j) => this.buildSheet(j, spec));
    this.buildCover(this.NI - 1, covers.backInner, covers.backOuter);
    this.buildBlocks(edge);
    this.buildSpine();
    this.items.forEach((it) => this.apply(it));
    this.updateStructure();
  }

  // Aspect of a cover board face, for drawing cover / endpaper art.
  static boardAspect(aspect: number) {
    return (aspect + OVERHANG) / (1 + OVERHANG * 2);
  }

  // Cover-cloth turn-in around the endpapers, as fractions of a board face.
  static turnIn(aspect: number) {
    const m = OVERHANG + 0.012;
    return { x: m / (aspect + OVERHANG), y: m / (1 + OVERHANG * 2) };
  }

  // Resting heights: right stack (p = 0), mirrored about T/2 on the left.
  yRight(k: number) {
    if (k === 0) return this.T - BOARD / 2;
    if (k === this.NI - 1) return BOARD / 2;
    return BOARD + (this.N - (k - 1)) * GAP;
  }

  yLeft(k: number) {
    return this.T - this.yRight(k);
  }

  get frontCover() {
    return (this.items[0] as CoverItem).board;
  }

  get openness() {
    return this.items[0].p * (1 - this.items[this.NI - 1].p);
  }

  // ---------------------------------------------------------------- building

  private buildCover(k: number, topMap: THREE.Texture, bottomMap: THREE.Texture) {
    const { Wc, Hc, T } = this;
    const isFront = k === 0;

    bottomMap.center.set(0.5, 0.5);
    bottomMap.rotation = PI; // -Y face is seen after the board flips over
    // Black laminated board outside, magazine paper inside.
    const board = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.5, metalness: 0 });
    const outer = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 0.42, metalness: 0 });
    const inside = (map: THREE.Texture) => pageMaterial(map, this.paper, false);
    const top = isFront ? outer(topMap) : inside(topMap);
    const bottom = isFront ? inside(bottomMap) : outer(bottomMap);

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(Wc, BOARD, Hc), [board, board, top, bottom, board, board]);
    mesh.position.set(Wc / 2, isFront ? T / 2 - BOARD / 2 : -(T / 2 - BOARD / 2), 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const pivot = new THREE.Group();
    pivot.position.set(0, T / 2, 0);
    pivot.add(mesh);
    this.inner.add(pivot);
    this.items[k] = { ...newItem(k), kind: "cover", pivot, board: mesh };
  }

  private buildSheet(j: number, spec: SheetSpec) {
    const { W } = this;
    const nx = SEG_X + 1, nz = SEG_Z + 1, count = nx * nz;

    const position = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const normal = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const uvF = new Float32Array(count * 2), uvB = new Float32Array(count * 2), spine = new Float32Array(count);
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        const i = iz * nx + ix, u = ix / SEG_X, v = 1 - iz / SEG_Z;
        uvF.set([u, v], i * 2);
        uvB.set([1 - u, v], i * 2); // back face is read mirrored once flipped
        spine[i] = u;
      }
    }
    const index: number[] = [];
    for (let iz = 0; iz < SEG_Z; iz++) {
      for (let ix = 0; ix < SEG_X; ix++) {
        const a = iz * nx + ix, b = a + 1, c = a + nx, d = c + 1;
        index.push(a, c, b, b, c, d);
      }
    }
    const spineAttr = new THREE.BufferAttribute(spine, 1);
    const make = (uv: Float32Array) => {
      const geo = new THREE.BufferGeometry();
      geo.setIndex(index);
      geo.setAttribute("position", position);
      geo.setAttribute("normal", normal);
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      geo.setAttribute("aSpine", spineAttr);
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), W + 0.2);
      return geo;
    };
    const geoF = make(uvF), geoB = make(uvB);

    const material = (face: FaceSpec, side: THREE.Side, id: number) => {
      const video = "video" in face ? face.video : null;
      const map = video ? video.map : (face as { map: THREE.Texture }).map;
      const m = pageMaterial(map, this.paper, true, { side, shadowSide: THREE.DoubleSide });
      this.faces.push({ material: m, video, id });
      return m;
    };
    const front = new THREE.Mesh(geoF, material(spec.front, THREE.FrontSide, j * 2));
    const back = new THREE.Mesh(geoB, material(spec.back, THREE.BackSide, j * 2 + 1));
    back.castShadow = false;
    for (const m of [front, back]) {
      m.frustumCulled = false;
      this.inner.add(m);
    }
    this.items[j + 1] = { ...newItem(j + 1), kind: "sheet", geo: geoF, front, back };
  }

  private buildBlocks(edge: THREE.Texture) {
    const make = () => {
      const map = edge.clone();
      map.needsUpdate = true;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.inner.add(mesh);
      return mesh;
    };
    this.blockR = make();
    this.blockL = make();
  }

  private buildSpine() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.5 });
    this.spine = new THREE.Mesh(new THREE.BoxGeometry(BOARD, this.T, this.Hc), mat);
    this.spine.castShadow = true;
    this.inner.add(this.spine);
  }

  // --------------------------------------------------------------- shaping

  private deform(it: SheetItem) {
    const { W, H } = this;
    const pos = it.geo.attributes.position.array as Float32Array;
    const p = it.p, dir = it.dir;
    const bend = Math.sin(PI * p) * it.curl;
    const hover = it.hover * HOVER_LIFT;
    const root = this.yRight(it.k) + (this.yLeft(it.k) - this.yRight(it.k)) * p;
    const rest = GUTTER_RISE * (p < 0.5 ? 1 : -1) * (1 - smoothstep(0, 0.12, Math.min(p, 1 - p)));
    const ds = W / SEG_X;
    let i = 0;
    for (let iz = 0; iz <= SEG_Z; iz++) {
      const zn = iz / SEG_Z - 0.5; // -0.5 far edge … +0.5 near edge
      const corner = zn * it.twistSign;
      const z = zn * H;
      let x = 0, y = root;
      pos[i++] = 0; pos[i++] = y; pos[i++] = z;
      for (let ix = 1; ix <= SEG_X; ix++) {
        const s = (ix - 0.5) / SEG_X; // 0 at the spine … 1 at the free edge
        let a = PI * p + dir * (
          bend * (Math.pow(s, 1.6) - 0.38 + TWIST * corner * s) +
          hover * smoothstep(0.4, 1, s) * (0.65 + 0.7 * corner)
        );
        a = a < 0 ? 0 : a > PI ? PI : a;
        // Rise then settle back to the stack: the angle integrates to zero.
        if (s < GUTTER_SPAN) a += rest * Math.cos((PI * s) / GUTTER_SPAN);
        x += Math.cos(a) * ds;
        y += Math.sin(a) * ds;
        pos[i++] = x; pos[i++] = y; pos[i++] = z;
      }
    }
    it.geo.attributes.position.needsUpdate = true;
    it.geo.computeVertexNormals();
  }

  private apply(it: Item) {
    it.moving = (it.p > 0 && it.p < 1) || it.hover > 0.002;
    if (it.kind === "cover") {
      const a = PI * it.p + it.hoverDir * it.hover * COVER_HOVER;
      it.pivot.rotation.z = Math.min(PI, Math.max(0, a));
      return;
    }
    if (it.hover > 0.002 && !it.active && !it.dragging) it.dir = it.hoverDir;
    this.deform(it);
    // Only a lifted sheet casts; resting sheets just receive (no self-shadow acne).
    it.front.castShadow = it.moving;
    it.front.receiveShadow = !it.moving;
    it.back.receiveShadow = !it.moving;
  }

  // Top resting sheet on each side (hovered/moving sheets don't count).
  private restingTop() {
    let right = -1, left = -1;
    for (let k = 1; k <= this.N; k++) {
      const it = this.items[k];
      if (it.moving) continue;
      if (it.p <= 0 && right < 0) right = k;
      if (it.p >= 1) left = k;
    }
    return { right, left };
  }

  private updateStructure() {
    const { W, H, Wc, T } = this;
    const pF = this.items[0].p, pB = this.items[this.NI - 1].p;
    this.inner.position.x = -(Wc / 2) * (1 - pF) + (Wc / 2) * pB;

    // Paper blocks under the top resting sheet of each side.
    const { right, left } = this.restingTop();
    const place = (mesh: Book["blockR"], k: number, sign: number) => {
      const top = k > 0 ? (sign > 0 ? this.yRight(k) : this.yLeft(k)) - GAP * 0.5 : 0;
      const h = top - BOARD;
      mesh.visible = h > GAP * 0.4;
      if (!mesh.visible) return;
      const w = W - 0.008;
      mesh.scale.set(w, h, H - 0.004);
      mesh.position.set(sign * (0.006 + w / 2), BOARD + h / 2, 0);
      mesh.material.map?.repeat.set(1, Math.max(1, Math.round(h / GAP)));
    };
    place(this.blockR, right, 1);
    place(this.blockL, left, -1);

    // Sheets buried inside a block are skipped entirely.
    for (let k = 1; k <= this.N; k++) {
      const it = this.items[k] as SheetItem;
      const show = it.moving || k === right || k === left;
      it.front.visible = it.back.visible = show;
    }

    // Spine: upright beside the closed book, flat under the gutter when open.
    const phi = (PI * (pF + pB)) / 2, cos = Math.abs(Math.cos(phi));
    this.spine.rotation.z = phi;
    this.spine.position.set(-(BOARD / 2) * Math.cos(phi), (BOARD / 2) * 0.9 * (1 - cos) + (T / 2) * cos, 0);
  }

  // ------------------------------------------------------------ navigation

  private animate(it: Item, to: number, now: number, delay = 0, dur?: number, ease: Ease = easeInOut) {
    if (it.p === to && !it.active) return;
    const dir = to > it.p ? 1 : -1;
    let t0 = now + delay;
    if (this.lastStart.dir === dir && t0 < this.lastStart.t + MIN_GAP) t0 = this.lastStart.t + MIN_GAP;
    this.lastStart = { dir, t: t0 };
    const base = dur ?? (it.kind === "cover" ? TURN.cover : TURN.sheet);
    Object.assign(it, {
      from: it.p, to, t0, dir, ease, active: true, curl: CURL,
      dur: base * Math.max(0.4, Math.abs(to - it.p)),
    });
  }

  goTo(n: number, now: number) {
    n = Math.max(0, Math.min(this.NI, n));
    if (n === this.target || this.drag) return false;
    const jump = Math.abs(n - this.target) > 1;
    const dur = jump ? TURN.jump : undefined;
    let delay = 0;
    if (n > this.target) {
      for (let k = this.target; k < n; k++, delay += jump ? TURN.stagger : 0) this.animate(this.items[k], 1, now, delay, dur);
    } else {
      for (let k = this.target - 1; k >= n; k--, delay += jump ? TURN.stagger : 0) this.animate(this.items[k], 0, now, delay, dur);
    }
    this.target = n;
    return true;
  }

  // Snap to a spread without animating (deep links).
  jump(n: number) {
    this.target = Math.max(0, Math.min(this.NI, n));
    this.items.forEach((it, k) => {
      Object.assign(it, { p: k < this.target ? 1 : 0, active: false, dirty: true });
    });
  }

  setHover(k: number, amount = 0, dir = 1) {
    this.items.forEach((it, i) => {
      it.hoverTarget = i === k ? amount : 0;
      if (i === k) {
        it.hoverDir = dir;
        it.twistSign = 1;
      }
    });
  }

  beginDrag(k: number, dir: number, x0: number, z0: number, now: number) {
    const it = this.items[k];
    if (!it || it.active || this.drag) return false;
    this.setHover(-1);
    Object.assign(it, { dragging: true, dir, curl: DRAG_CURL, twistSign: z0 >= 0 ? 1 : -1 });
    const min = this.W * 0.35;
    this.drag = { it, dir, x0: dir > 0 ? Math.max(x0, min) : Math.min(x0, -min), samples: [{ t: now, p: it.p }] };
    return true;
  }

  dragTo(x: number, now: number) {
    const d = this.drag;
    if (!d) return;
    const r = Math.max(-1, Math.min(1, x / d.x0));
    const q = Math.acos(r) / PI;
    d.it.p = d.dir > 0 ? q : 1 - q;
    d.it.dirty = true;
    d.samples.push({ t: now, p: d.it.p });
    while (d.samples.length > 2 && now - d.samples[0].t > 0.12) d.samples.shift();
  }

  endDrag(now: number) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    const { it } = d;
    const s0 = d.samples[0], s1 = d.samples[d.samples.length - 1];
    const v = s1.t > s0.t ? (s1.p - s0.p) / (s1.t - s0.t) : 0; // progress per second
    const toLeft = v > 0.9 || (v > -0.9 && it.p > 0.5);
    it.dragging = false;
    this.animate(it, toLeft ? 1 : 0, now, 0, TURN.release, easeOut);
    it.curl = DRAG_CURL;
    this.target = toLeft ? it.k + 1 : it.k;
  }

  get busy() {
    return !!this.drag || this.items.some((it) => it.active);
  }

  // ------------------------------------------------------------ per frame

  // Returns true when anything moved or a page's texture changed.
  update(now: number, dt: number) {
    let changed = false;
    for (const it of this.items) {
      if (it.active && !it.dragging) {
        const t = (now - it.t0) / it.dur;
        if (t >= 0) {
          it.p = it.from + (it.to - it.from) * it.ease(clamp01(t));
          if (t >= 1) {
            it.p = it.to;
            it.active = false;
          }
          it.dirty = true;
        }
      }
      const h = Math.abs(it.hoverTarget - it.hover) < 1e-3 ? it.hoverTarget : damp(it.hover, it.hoverTarget, 9, dt);
      if (h !== it.hover) {
        it.hover = h;
        it.dirty = true;
      }
      if (it.dirty) {
        it.dirty = false;
        this.apply(it);
        changed = true;
      }
    }
    this.updateStructure();
    for (const f of this.faces) {
      if (f.video && f.material.map !== f.video.map) {
        f.material.map = f.video.map;
        f.material.needsUpdate = true;
        changed = true;
      }
    }
    return changed;
  }

  // Face ids (sheet j: front 2j, back 2j+1) that can currently be seen.
  visibleFaces() {
    const ids = new Set<number>();
    const { right, left } = this.restingTop();
    for (let k = 1; k <= this.N; k++) {
      if (this.items[k].moving) {
        ids.add((k - 1) * 2);
        ids.add((k - 1) * 2 + 1);
      }
    }
    // A closed board hides the stack beneath it.
    const front = this.items[0], back = this.items[this.NI - 1];
    if (right > 0 && (front.p > 0 || front.hover > 0.002)) ids.add((right - 1) * 2);
    if (left > 0 && (back.p < 1 || back.hover > 0.002)) ids.add((left - 1) * 2 + 1);
    return ids;
  }

  // Face ids on spread s: left = back of item s-1, right = front of item s.
  spreadFaces(s: number) {
    const ids: number[] = [];
    if (s - 1 >= 1 && s - 1 <= this.N) ids.push((s - 2) * 2 + 1);
    if (s >= 1 && s <= this.N) ids.push((s - 1) * 2);
    return ids;
  }

  // Face id of the page lying on one side (+1 right, -1 left) of the spread, or -1.
  faceOn(side: number) {
    const k = side > 0 ? this.target : this.target - 1;
    if (k < 1 || k > this.N) return -1;
    return (k - 1) * 2 + (side > 0 ? 0 : 1);
  }

  // Footprint of the book along x in book space (for hit-testing & shadow).
  footprint() {
    const pF = this.items[0].p, pB = this.items[this.NI - 1].p;
    return { left: -this.Wc * pF, right: this.Wc * (1 - pB) };
  }

  dispose() {
    this.root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    });
  }
}
