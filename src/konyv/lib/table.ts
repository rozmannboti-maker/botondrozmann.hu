// A black lacquered oak table: a solid top of a few wide boards glued edge to
// edge, running its full length, with rounded edges and the dark room beyond.
// The wood is generated once on the GPU into two textures — colour, and data
// (R = height for bump, G = roughness) — by modelling each board as sawn from
// a log: growth rings are distances from the log's pith, so they arch into
// "cathedrals" where the cut passes close to it and run straight elsewhere.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const WOOD = /* glsl */ `
  varying vec2 vUv;
  uniform int uMode;
  uniform float uPlanks;
  uniform vec2 uTile;          // texture size in world units (along grain, across)
  uniform float uJoints;       // 1 = floor-style end joints, 0 = full-length boards

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  // Value noise repeating every 'period' cells, so the tile wraps seamlessly.
  float vnoise(vec2 p, vec2 period) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(mod(i, period));
    float b = hash12(mod(i + vec2(1.0, 0.0), period));
    float c = hash12(mod(i + vec2(0.0, 1.0), period));
    float d = hash12(mod(i + vec2(1.0, 1.0), period));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p, vec2 period) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += a * vnoise(p, period); p *= 2.0; period *= 2.0; a *= 0.5; }
    return s / 0.9375;
  }

  void main() {
    const float TAU = 6.2831853;
    float across = vUv.y * uPlanks;
    float pid = floor(across);                 // plank index
    float pv = fract(across);                  // 0..1 across the plank
    float plankW = uTile.y / uPlanks;
    float r0 = hash12(vec2(pid, 1.7)), r1 = hash12(vec2(pid, 2.9));
    float r2 = hash12(vec2(pid, 4.1)), r3 = hash12(vec2(pid, 6.3));
    float r4 = hash12(vec2(pid, 8.7)), r5 = hash12(vec2(pid, 9.9));

    float L = fract(vUv.x + r0);               // along the grain, 0..1, wraps
    float y = (pv - 0.5) * plankW;             // across, world units

    // --- growth rings: distance from the pith of the log this board came from
    float pith = (r1 - 0.5) * plankW * 2.4;    // off the board → straight grain
    float depth = 0.04 + r2 * 0.22
      + 0.05 * sin(TAU * (L + r3))             // log taper / sweep (periodic)
      + 0.03 * (fbm(vec2(L * 3.0, pid * 5.0), vec2(3.0, 1e4)) - 0.5);
    float dy = y - pith + 0.018 * (fbm(vec2(L * 8.0, y * 5.0 + pid * 3.0), vec2(8.0, 1e4)) - 0.5);
    float radius = sqrt(dy * dy + depth * depth);
    float density = 34.0 + r4 * 18.0;          // rings per unit
    float rr = radius * density
      + 1.2 * fbm(vec2(L * 16.0, y * 24.0 + pid), vec2(16.0, 1e4))     // uneven ring widths
      + 0.6 * sin(radius * 9.0 + r5 * TAU);
    float f = fract(rr);
    float late = smoothstep(0.52, 0.9, f) * (1.0 - smoothstep(0.95, 1.0, f));
    float early = 1.0 - late;

    // --- pores (open in the earlywood, where the black stain sinks in) and fibres
    float pn = vnoise(vec2(L * 700.0, y * 640.0 + pid * 37.0), vec2(700.0, 1e5));
    float pores = smoothstep(0.68, 0.94, pn) * (0.25 + 0.75 * early);
    float fiber = vnoise(vec2(L * 160.0, y * 420.0 + pid * 11.0), vec2(160.0, 1e5));
    float drift = fbm(vec2(L * 4.0, y * 3.0 + pid * 2.0), vec2(4.0, 1e4));   // slow colour drift

    // --- seams between planks and staggered end joints
    // Glued joints between boards: a hairline, not a floorboard groove.
    float edge = min(pv, 1.0 - pv) * plankW;   // world units to the nearest seam
    float seam = (1.0 - smoothstep(0.0004, 0.0016, edge)) * 0.7;
    float bevel = (1.0 - smoothstep(0.0, 0.004, edge)) * 0.4;
    float jd = abs(fract(L - r3 + 0.5) - 0.5) * uTile.x;
    float joint = (1.0 - smoothstep(0.0008, 0.0026, jd)) * step(0.3, r5) * uJoints;

    // --- colour: ebonised oak, latewood lifting faintly out of the black
    vec3 earlyCol = vec3(0.0064, 0.0053, 0.0046);
    vec3 lateCol  = vec3(0.0230, 0.0186, 0.0153);
    vec3 col = mix(earlyCol, lateCol, late);
    col *= 0.9 + 0.2 * fiber;
    col *= 0.8 + 0.4 * drift;
    col *= 0.78 + 0.44 * r2;                   // plank-to-plank tone
    col = mix(col, vec3(0.0026, 0.0022, 0.0019), pores * 0.55);
    col *= 1.0 - seam * 0.92;
    col *= 1.0 - joint * 0.9;

    // --- surface: raised latewood, sunken pores, grooves at the seams
    float height = 0.62 + late * 0.07 + fiber * 0.02 - pores * 0.16 - seam * 0.6 - joint * 0.5 - bevel * 0.14;
    float rough = clamp(0.36 + early * 0.12 + pores * 0.35 + seam * 0.4 + (1.0 - drift) * 0.06, 0.0, 1.0);
    gl_FragColor = uMode == 0 ? vec4(col, 1.0) : vec4(height, rough, 0.0, 1.0);
  }
`;

function bake(
  renderer: THREE.WebGLRenderer,
  { width, height, planks, tile, anisotropy }: { width: number; height: number; planks: number; tile: THREE.Vector2; anisotropy: number },
) {
  const options = {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    anisotropy,
  };
  const color = new THREE.WebGLRenderTarget(width, height, options);
  const data = new THREE.WebGLRenderTarget(width, height, options);
  const material = new THREE.ShaderMaterial({
    uniforms: { uMode: { value: 0 }, uPlanks: { value: planks }, uTile: { value: tile }, uJoints: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: WOOD,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const camera = new THREE.Camera();
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(color);
  renderer.render(scene, camera);
  material.uniforms.uMode.value = 1;
  renderer.setRenderTarget(data);
  renderer.render(scene, camera);
  renderer.setRenderTarget(prev);
  material.dispose();
  return { color: color.texture, data: data.texture };
}

// Tabletop: length along x, depth along z, top surface at y = 0.
// The front edge sits well behind the viewer, so even tall phone screens only see wood.
export const TABLE = { length: 8, depth: 6.6, thickness: 0.16, front: 4.5 };

export function createTable(renderer: THREE.WebGLRenderer, { anisotropy = 8, pxPerUnit = 400 } = {}) {
  const { length, depth, thickness, front } = TABLE;
  // Texture covers the top exactly (no tiling): ~512 px per unit, less on phones / small GPUs.
  if (renderer.capabilities.maxTextureSize < 8192) pxPerUnit = Math.min(pxPerUnit, 256);
  const tile = new THREE.Vector2(length, depth);
  const { color, data } = bake(renderer, {
    width: Math.round(length * pxPerUnit), height: Math.round(depth * pxPerUnit), planks: 5, tile, anisotropy,
  });

  // Stained wood under a satin lacquer: the clear coat catches the lamp as a
  // soft reflection while the open grain beneath stays matte.
  const top = new THREE.MeshPhysicalMaterial({
    map: color,
    roughnessMap: data,
    bumpMap: data,
    bumpScale: 1.4,
    roughness: 1,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.32,
  });
  const side = new THREE.MeshPhysicalMaterial({
    color: 0x0d0b0a, roughness: 0.55, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.3,
  });

  const group = new THREE.Group();
  const slab = new THREE.Mesh(new RoundedBoxGeometry(length, thickness, depth, 4, 0.03), [side, side, top, side, side, side]);
  slab.position.set(0, -thickness / 2, front - depth / 2);
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  // The room's floor far below: only the lamp's spill beyond the table edge shows.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x1a1817, roughness: 0.95, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4.6;
  floor.receiveShadow = true;
  group.add(floor);
  return group;
}
