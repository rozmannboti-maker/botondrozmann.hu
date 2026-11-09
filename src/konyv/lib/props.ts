// Things on the table around the book: a cappuccino with its saucer and spoon,
// a pencil, a couple of business cards and a succulent. All modelled here, at
// the book's scale (1 unit ≈ the book's depth, about 22 cm).
import * as THREE from "three";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import type { Brand } from "./pages";

export type PropCopy = { site: string; pencil: string };

const TAU = Math.PI * 2;
const v2 = (pts: number[][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function canvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  draw(ctx, w, h);
  return c;
}

function texture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function tinted(src: HTMLCanvasElement, color: string) {
  return canvas(src.width, src.height, (ctx, w, h) => {
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  });
}

function shadowed<T extends THREE.Object3D>(obj: T) {
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return obj;
}

// --------------------------------------------------------------- lighting

// A dark studio with a warm softbox where the lamp is: gives ceramic, steel and
// brass believable reflections that agree with the scene's light.
function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x030303);
  const room = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: 0x15130f, side: THREE.BackSide }));
  room.position.y = 5;
  env.add(room);
  const panel = (color: number, strength: number, size: [number, number], pos: [number, number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(0xfff1e2, 9, [2.2, 2.2], [-2.0, 6.3, -1.3]);   // the lamp
  panel(0xfff4e8, 0.32, [16, 16], [0, 9, 0]);           // soft ceiling glow, so metal reads as metal
  panel(0xffeedd, 0.8, [6, 3], [5, 3, 5]);              // room bounce, front-right
  panel(0xaabbe0, 0.5, [6, 2], [3, 2, -7]);             // cool rim
  const table = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({ color: 0x0b0908 }));
  table.rotation.x = -Math.PI / 2;
  env.add(table);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const map = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  return map;
}

// Soft contact shadow textures (round and rectangular).
let roundBlob: THREE.CanvasTexture | undefined, rectBlob: THREE.CanvasTexture | undefined;
function blobs() {
  roundBlob ??= texture(canvas(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.55, "rgba(0,0,0,0.75)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }));
  rectBlob ??= texture(canvas(256, 256, (ctx) => {
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetX = 1000;
    ctx.fillStyle = "#000";
    ctx.fillRect(40 - 1000, 40, 176, 176);
  }));
}
function contactShadow(kind: "round" | "rect", w: number, d: number, opacity: number) {
  blobs();
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: kind === "round" ? roundBlob : rectBlob, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.0012;
  m.renderOrder = -1;
  return m;
}

// ------------------------------------------------------------- cappuccino

type P2 = [number, number];
function cubic(p0: P2, p1: P2, p2: P2, p3: P2, n: number) {
  const c = new THREE.CubicBezierCurve(new THREE.Vector2(...p0), new THREE.Vector2(...p1), new THREE.Vector2(...p2), new THREE.Vector2(...p3));
  return c.getPoints(n).map((p) => [p.x, p.y]);
}

// Speckled stoneware glaze; the bottom `clay` share of the profile is bare clay.
function stoneware(clay: number) {
  return texture(canvas(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#ece6dc";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {             // gentle mottling
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? "120,100,80" : "255,252,245"},0.035)`;
      ctx.beginPath();
      ctx.arc(rand(0, w), rand(0, h), rand(20, 90), 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 1400; i++) {           // iron speckles
      ctx.fillStyle = `rgba(${Math.round(rand(60, 110))},${Math.round(rand(48, 80))},${Math.round(rand(36, 60))},${rand(0.35, 0.85)})`;
      ctx.beginPath();
      ctx.arc(rand(0, w), rand(0, h), Math.random() < 0.9 ? rand(0.4, 1.1) : rand(1.2, 2.2), 0, TAU);
      ctx.fill();
    }
    const g = ctx.createLinearGradient(0, h, 0, h * (1 - clay));
    g.addColorStop(0, "#c4ab8d");
    g.addColorStop(0.8, "#c9b192");
    g.addColorStop(1, "rgba(201,177,146,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, h * (1 - clay) - 2, w, h * clay + 2);
  }));
}

function latteArt() {
  return texture(canvas(512, 512, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    g.addColorStop(0, "#9a6236");
    g.addColorStop(0.7, "#7c4a26");
    g.addColorStop(0.92, "#5e3519");
    g.addColorStop(1, "#3e220f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Microfoam heart with a pulled-through tail.
    if ("filter" in ctx) ctx.filter = "blur(3px)";
    ctx.fillStyle = "#f1e4cf";
    ctx.beginPath();
    ctx.moveTo(cx, cy + 120);
    ctx.bezierCurveTo(cx - 190, cy + 10, cx - 150, cy - 150, cx - 40, cy - 120);
    ctx.bezierCurveTo(cx - 10, cy - 110, cx, cy - 80, cx, cy - 70);
    ctx.bezierCurveTo(cx, cy - 80, cx + 10, cy - 110, cx + 40, cy - 120);
    ctx.bezierCurveTo(cx + 150, cy - 150, cx + 190, cy + 10, cx, cy + 120);
    ctx.fill();
    // The pour's tail: a faint, tapering trace out of the point.
    ctx.fillStyle = "rgba(241,228,207,0.55)";
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 110);
    ctx.quadraticCurveTo(cx, cy + 160, cx + 1, cy + 175);
    ctx.quadraticCurveTo(cx + 3, cy + 150, cx + 3, cy + 110);
    ctx.fill();
    ctx.filter = "none";
    ctx.globalAlpha = 0.25;                    // foam texture
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? "#3a1f0e" : "#fff6e8";
      ctx.fillRect(rand(0, w), rand(0, h), 1.2, 1.2);
    }
  }));
}

function teaspoon(steel: THREE.Material) {
  const group = new THREE.Group();
  // Handle: tapered strap, extruded with a soft bevel, rising from the bowl.
  const s = new THREE.Shape();
  s.moveTo(0, -0.006);
  s.quadraticCurveTo(0.2, -0.01, 0.34, -0.017);
  s.absarc(0.34, 0, 0.017, -Math.PI / 2, Math.PI / 2, false);
  s.quadraticCurveTo(0.2, 0.01, 0, 0.006);
  s.closePath();
  const handle = new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0016, bevelSize: 0.0016, bevelSegments: 3, curveSegments: 24 });
  handle.rotateX(-Math.PI / 2);
  const p = handle.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setY(i, p.getY(i) + 0.017 * Math.pow(1 - THREE.MathUtils.clamp(x / 0.36, 0, 1), 1.6));
  }
  handle.computeVertexNormals();
  group.add(new THREE.Mesh(handle, steel));
  // Bowl: a shallow half-ellipsoid shell.
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16, 0, TAU, Math.PI / 2, Math.PI / 2), steel);
  bowl.scale.set(0.052, 0.017, 0.032);
  bowl.position.set(-0.048, 0.019, 0);
  group.add(bowl);
  return group;
}

function cappuccino(env: THREE.Texture) {
  const footPts = [[0, 0.004], [0.066, 0.002], [0.074, 0], [0.083, 0.002], [0.087, 0.012]];
  const outer = cubic([0.089, 0.016], [0.128, 0.026], [0.176, 0.12], [0.178, 0.29], 22);
  const lip = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const a = (i / 6) * Math.PI;
    return [0.1725 + 0.0055 * Math.cos(a), 0.29 + 0.0055 * Math.sin(a)];
  });
  const inner = cubic([0.166, 0.29], [0.164, 0.13], [0.118, 0.045], [0.07, 0.034], 18);
  const profile = [...footPts, ...outer.slice(1), ...lip.slice(1), ...inner.slice(1), [0.03, 0.03], [0, 0.03]];
  const clay = (footPts.length - 1) / (profile.length - 1);

  const glaze = new THREE.MeshPhysicalMaterial({
    map: stoneware(clay), roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, envMap: env, envMapIntensity: 0.9,
  });
  const group = new THREE.Group();

  // Saucer.
  const saucerPts = [[0, 0.004], [0.11, 0.002], [0.118, 0], [0.128, 0.003], [0.135, 0.009],
    ...cubic([0.14, 0.011], [0.2, 0.018], [0.27, 0.028], [0.315, 0.046], 14).slice(1),
    [0.318, 0.05], [0.314, 0.054], [0.307, 0.052],
    ...cubic([0.3, 0.046], [0.26, 0.03], [0.19, 0.022], [0.13, 0.021], 12).slice(1), [0, 0.021]];
  const saucerGlaze = glaze.clone();
  saucerGlaze.map = stoneware(5 / (saucerPts.length - 1));
  group.add(new THREE.Mesh(new THREE.LatheGeometry(v2(saucerPts), 96), saucerGlaze));

  const cup = new THREE.Group();
  cup.position.y = 0.021;
  cup.add(new THREE.Mesh(new THREE.LatheGeometry(v2(profile), 96), glaze));

  // Strap handle: a swept tube, flattened across.
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.155, 0.235, 0), new THREE.Vector3(0.205, 0.252, 0), new THREE.Vector3(0.243, 0.215, 0),
    new THREE.Vector3(0.236, 0.14, 0), new THREE.Vector3(0.19, 0.098, 0), new THREE.Vector3(0.13, 0.085, 0),
  ]);
  const tube = new THREE.TubeGeometry(path, 64, 0.0135, 20, false);
  tube.scale(1, 1, 0.62);
  cup.add(new THREE.Mesh(tube, glaze));

  // Coffee with a little meniscus where it meets the glaze.
  const coffee = new THREE.Mesh(
    new THREE.LatheGeometry(v2([[0.159, 0.253], [0.152, 0.249], [0.12, 0.248], [0, 0.248]]), 96),
    new THREE.MeshPhysicalMaterial({ roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.18, envMap: env, envMapIntensity: 0.6 }),
  );
  const art = latteArt();
  // Lathe UVs run around the cup; give the surface top-down UVs for the art.
  const uv = coffee.geometry.attributes.uv, cp = coffee.geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + cp.getX(i) / 0.32, 0.5 - cp.getZ(i) / 0.32);
  coffee.material.map = art;
  cup.add(coffee);
  group.add(cup);

  const steel = new THREE.MeshPhysicalMaterial({ color: 0xe4e4e2, metalness: 1, roughness: 0.16, envMap: env, envMapIntensity: 2.2, side: THREE.DoubleSide });
  // Resting along a chord of the saucer in front of the cup, handle up on the rim.
  const spoon = teaspoon(steel);
  spoon.position.set(-0.11, 0.041, 0.205);
  spoon.rotation.set(0, 0, 0.035);
  group.add(spoon);

  shadowed(group);
  group.add(contactShadow("round", 0.78, 0.78, 0.55));
  return group;
}

// ------------------------------------------------------------------ pencil

// Surface of revolution around +x: radius(x, θ) per ring. θ = 0 is straight up;
// v runs so text on the top face reads upright from above.
type Extra = (x: number, th: number, r: number) => { color: number[]; rough: number };
function sweptX(xs: number[], segs: number, radius: (x: number, th: number) => number, extra?: Extra) {
  const pos: number[] = [], uvs: number[] = [], col: number[] = [], rough: number[] = [], idx: number[] = [];
  const x0 = xs[0], x1 = xs[xs.length - 1];
  xs.forEach((x, i) => {
    for (let j = 0; j <= segs; j++) {
      const th = Math.PI - (TAU * j) / segs;
      const r = radius(x, th);
      pos.push(x, r * Math.cos(th), r * Math.sin(th));
      uvs.push((x - x0) / (x1 - x0), j / segs);
      if (extra) {
        const e = extra(x, th, r);
        col.push(...e.color);
        rough.push(e.rough);
      }
      if (i > 0 && j < segs) {
        const a = (i - 1) * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  if (extra) {
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("aRough", new THREE.Float32BufferAttribute(rough, 1));
  }
  g.setIndex(idx);
  return toCreasedNormals(g, Math.PI / 5);
}

const range = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

function pencil(env: THREE.Texture, copy: PropCopy) {
  const R = 0.0175, AP = R * Math.cos(Math.PI / 6);
  const hex = (th: number) => {
    const t = ((((th + Math.PI / 6) % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3)) - Math.PI / 6;
    return AP / Math.cos(t);
  };
  const BODY0 = -0.345, SHARP = 0.312, LEAD = 0.408, TIP = 0.43;
  const group = new THREE.Group();

  // Body: black lacquer with the name foil-stamped on the top face.
  // Same layout twice: the colour map (gold on black) and the metalness map.
  const foil = (isColor: boolean) => canvas(2048, 384, (ctx, w, h) => {
    ctx.fillStyle = isColor ? "#131313" : "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "500 30px Inter, system-ui, sans-serif";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0.32em";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isColor ? "#c8a65e" : "#ffffff";
    ctx.fillText(copy.pencil, w * 0.16, h / 2);
    ctx.fillText("HB", w * 0.62, h / 2);
  });
  const body = new THREE.Mesh(
    sweptX(range(BODY0, SHARP, 2), 72, (_x, th) => hex(th)),
    new THREE.MeshPhysicalMaterial({
      map: texture(foil(true)), metalnessMap: texture(foil(false), false), metalness: 1,
      roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15, envMap: env, envMapIntensity: 1,
    }),
  );
  group.add(body);

  // Sharpened end: the cone cuts the hex, leaving the classic scalloped edge.
  const cone = (x: number) => (x < LEAD
    ? THREE.MathUtils.lerp(R * 1.02, 0.0042, (x - SHARP) / (LEAD - SHARP))
    : THREE.MathUtils.lerp(0.0042, 0.0004, (x - LEAD) / (TIP - LEAD)));
  const tipXs = [...range(SHARP, LEAD, 60), ...range(LEAD, TIP, 8).slice(1)];
  const tip = new THREE.Mesh(
    sweptX(tipXs, 72, (x, th) => Math.min(hex(th), cone(x)), (x, th) => {
      if (x >= LEAD) return { color: [0.045, 0.045, 0.05], rough: 0.4 };          // graphite
      if (hex(th) <= cone(x) + 1e-5) return { color: [0.008, 0.008, 0.008], rough: 0.3 }; // paint
      const grain = 0.92 + 0.08 * Math.sin(x * 900 + th * 3);
      return { color: [0.62 * grain, 0.41 * grain, 0.25 * grain], rough: 0.85 };   // cedar
    }),
    new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, envMap: env, envMapIntensity: 0.8 }),
  );
  tip.material.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aRough;\nvarying float vRough;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRough = aRough;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vRough;")
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = vRough;");
  };
  group.add(tip);

  // Crimped brass ferrule and a rounded eraser.
  const FER0 = -0.397, FER1 = BODY0 + 0.002;
  const ferrule = (x: number) => {
    const t = (x - FER0) / (FER1 - FER0);
    const crimp = [0.18, 0.3, 0.7, 0.82].reduce((s, c) => s + Math.exp(-(((t - c) / 0.035) ** 2)), 0);
    return AP * 1.03 - 0.0009 * crimp - 0.0012 * (Math.exp(-((t / 0.04) ** 2)) + Math.exp(-(((1 - t) / 0.04) ** 2)));
  };
  group.add(new THREE.Mesh(
    sweptX(range(FER0, FER1, 80), 48, ferrule),
    new THREE.MeshPhysicalMaterial({ color: 0xc9a35a, metalness: 1, roughness: 0.26, envMap: env, envMapIntensity: 1.6 }),
  ));
  const ER0 = -0.433, ER1 = FER0 + 0.002, RE = AP * 0.94;
  group.add(new THREE.Mesh(
    sweptX(range(ER0, ER1, 30), 48, (x) => {
      const d = (x - ER0) / 0.009;
      return d >= 1 ? RE : RE * Math.sqrt(Math.max(0, 1 - (1 - d) ** 2));
    }),
    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 }),
  ));

  group.position.y = AP;
  const holder = new THREE.Group();
  holder.add(shadowed(group));
  const sh = contactShadow("rect", 0.9, 0.07, 0.6);
  holder.add(sh);
  return holder;
}

// ---------------------------------------------------------- business cards

function businessCards(brand: Brand, paper: THREE.Texture, env: THREE.Texture, copy: PropCopy) {
  const W = 0.39, D = 0.235, T = 0.0045;
  const mono = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) => {
    ctx.font = "500 22px \"JetBrains Mono\", ui-monospace, monospace";
    ctx.fillStyle = color;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0.14em";
    ctx.fillText(text.toUpperCase(), x, y);
  };
  const logo = (ctx: CanvasRenderingContext2D, color: string, cx: number, cy: number, height: number) => {
    const lw = (brand.logo.width / brand.logo.height) * height;
    ctx.drawImage(tinted(brand.logo, color), cx - lw / 2, cy - height / 2, lw, height);
  };

  // Matte black stock with a spot-gloss logo (roughness map: logo is smooth).
  const blackFace = new THREE.MeshPhysicalMaterial({
    map: texture(canvas(840, 506, (ctx, w, h) => {
      ctx.fillStyle = "#0b0b0b";
      ctx.fillRect(0, 0, w, h);
      logo(ctx, "#f4f2ee", w / 2, h / 2, 57);
    })),
    roughnessMap: texture(canvas(840, 506, (ctx, w, h) => {
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(0, 0, w, h);
      logo(ctx, "#202020", w / 2, h / 2, 57);
    }), false),
    roughness: 1, envMap: env, envMapIntensity: 0.6,
  });
  const whiteFace = new THREE.MeshStandardMaterial({
    map: texture(canvas(840, 506, (ctx, w, h) => {
      ctx.fillStyle = "#f2f0ea";
      ctx.fillRect(0, 0, w, h);
      const mh = 43, mw = (brand.mark.width / brand.mark.height) * mh;
      ctx.drawImage(tinted(brand.mark, "#111111"), 61.5, 61.5, mw, mh);
      mono(ctx, copy.site, 60, h - 64, "#111111");
    })),
    bumpMap: paper, bumpScale: 0.6, roughness: 0.85,
  });
  const blackEdge = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.9 });
  const whiteEdge = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.9 });
  const card = (face: THREE.Material, edge: THREE.Material, backColor: number) => new THREE.Mesh(
    new THREE.BoxGeometry(W, T, D),
    [edge, edge, face, new THREE.MeshStandardMaterial({ color: backColor, roughness: 0.9 }), edge, edge],
  );

  const group = new THREE.Group();
  const white = card(whiteFace, whiteEdge, 0xf2f0ea);
  white.position.set(-0.035, T / 2, 0.03);
  white.rotation.y = 0.32;
  const black = card(blackFace, blackEdge, 0x0b0b0b);
  black.position.set(0.02, T * 1.5 + 0.0004, -0.02);
  black.rotation.y = 0.08;
  group.add(white, black);
  shadowed(group);
  const sh = contactShadow("rect", 0.5, 0.36, 0.5);
  sh.rotation.z = 0.2;
  group.add(sh);
  return group;
}

// ------------------------------------------------------------------- plant

function concreteTexture() {
  return canvas(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#9a9690";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {            // cloudy cement
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? "70,66,62" : "200,196,190"},0.05)`;
      ctx.beginPath();
      ctx.arc(rand(0, w), rand(0, h), rand(10, 70), 0, TAU);
      ctx.fill();
    }
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
    for (let i = 0; i < 520; i++) {            // air-bubble pits
      const x = rand(0, w), y = rand(0, h), r = Math.random() < 0.88 ? rand(0.5, 1.4) : rand(1.4, 2.6);
      ctx.fillStyle = "rgba(35,33,31,0.85)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(220,216,210,0.35)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(x + 0.4, y + 0.4, r + 0.6, 0, TAU);
      ctx.stroke();
    }
  });
}

// A fleshy echeveria leaf: base at the origin, pointing +z; pale at the base,
// blue-green through the blade, blushing pink at the tip and margins.
function leafGeometry() {
  const g = new THREE.SphereGeometry(0.5, 28, 18);
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const base = new THREE.Color(0xb9c9a3), blade = new THREE.Color(0x86a8a0), blush = new THREE.Color(0xc58a8e);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const s = z + 0.5;                                             // 0 base … 1 tip
    const w = Math.pow(Math.sin(Math.PI * Math.min(1, s * 0.86 + 0.14)), 0.7) * (1 - 0.15 * s);
    const tipPoint = s > 0.9 ? 1 - (s - 0.9) * 4 : 1;              // short mucro
    x *= w * tipPoint;
    const top = y > 0;
    y = y * w * (top ? 0.75 : 1.05);
    if (top) y -= 0.55 * x * x;                                     // cupped upper face
    else y -= 0.18 * (0.25 - x * x) * w;                            // keel below
    y += 0.22 * s * s;                                              // curls upward
    p.setXYZ(i, x, y, s);
    c.copy(base).lerp(blade, THREE.MathUtils.smoothstep(s, 0.05, 0.45));
    const edge = THREE.MathUtils.smoothstep(Math.abs(x) / Math.max(0.05, w * 0.5), 0.75, 1);
    c.lerp(blush, Math.max(THREE.MathUtils.smoothstep(s, 0.78, 1) * 0.85, edge * 0.35 * s));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function succulent() {
  const group = new THREE.Group();
  const con = concreteTexture();
  const concrete = new THREE.MeshStandardMaterial({
    map: texture(con), bumpMap: texture(con, false), bumpScale: 1.2, roughness: 0.93,
  });
  const potPts = [[0, 0.003], [0.12, 0.002], [0.135, 0], [0.152, 0.004], [0.162, 0.018],
    [0.168, 0.14], [0.171, 0.235], [0.171, 0.25], [0.168, 0.258], [0.161, 0.26], [0.155, 0.254],
    [0.152, 0.235], [0.149, 0.2], [0, 0.2]];
  group.add(new THREE.Mesh(new THREE.LatheGeometry(v2(potPts), 72), concrete));

  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.15, 48), new THREE.MeshStandardMaterial({ color: 0x1b1511, roughness: 1 }));
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.214;
  group.add(soil);

  // Gravel top dressing.
  const stones = 170;
  const gravel = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 2),
    new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    stones,
  );
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const tones = [0x9b968e, 0xc9c3b8, 0x6f6b66, 0xb3a999, 0x85807a];
  for (let i = 0; i < stones; i++) {
    const a = rand(0, TAU), r = Math.sqrt(rand(0.03, 1)) * 0.142;
    const size = rand(0.006, 0.013);
    ps.set(Math.cos(a) * r, 0.216 + size * 0.4, Math.sin(a) * r);
    sc.set(size * rand(0.9, 1.4), size * rand(0.55, 0.8), size * rand(0.8, 1.2));
    q.setFromEuler(e.set(rand(-0.3, 0.3), rand(0, TAU), rand(-0.3, 0.3)));
    gravel.setMatrixAt(i, m.compose(ps, q, sc));
    gravel.setColorAt(i, new THREE.Color(tones[i % tones.length]));
  }
  group.add(gravel);

  // Rosette: golden-angle spiral, flat outer leaves rising to an upright heart.
  const leaf = leafGeometry();
  const waxy = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.5, sheen: 0.7, sheenColor: new THREE.Color(0xdbe6e2), sheenRoughness: 0.55,
  });
  const rosette = new THREE.Group();
  rosette.position.y = 0.212;
  const N = 34;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);                                          // 0 outer … 1 heart
    const mesh = new THREE.Mesh(leaf, waxy);
    const len = THREE.MathUtils.lerp(0.158, 0.045, Math.pow(t, 0.85));
    mesh.scale.set(len * THREE.MathUtils.lerp(0.5, 0.62, t), len * THREE.MathUtils.lerp(0.34, 0.45, t), len);
    mesh.rotation.x = -THREE.MathUtils.degToRad(THREE.MathUtils.lerp(12, 74, Math.pow(t, 0.9)) + rand(-3, 3));
    const holder = new THREE.Group();
    holder.rotation.y = i * 2.39996 + rand(-0.05, 0.05);
    holder.position.y = t * 0.035;
    holder.add(mesh);
    rosette.add(holder);
  }
  group.add(rosette);
  shadowed(group);
  group.add(contactShadow("round", 0.46, 0.46, 0.6));
  return group;
}

// ---------------------------------------------------------------- arrange

export function createProps({ brand, paper, renderer, copy }: { brand: Brand; paper: THREE.Texture; renderer: THREE.WebGLRenderer; copy: PropCopy }) {
  const env = studioEnvironment(renderer);
  const group = new THREE.Group();

  const cup = cappuccino(env);
  cup.position.set(2.08, 0, -0.78);
  cup.rotation.y = -0.6;

  const plant = succulent();
  plant.position.set(-2.12, 0, -0.68);

  const pen = pencil(env, copy);
  pen.position.set(-2.02, 0, 0.42);
  pen.rotation.y = 1.05;

  const cards = businessCards(brand, paper, env, copy);
  cards.position.set(2.06, 0, 0.36);
  cards.rotation.y = -0.18;

  group.add(cup, plant, pen, cards);
  return group;
}
