import * as THREE from "three";

// The ribbon's path. x in shares of the screen width, y in shares of the height (up +),
// z in shares of the height (+ toward the camera; the camera sits at z ≈ 1.87).
//  1. rises from far down-left, small, under the text;
//  2. sweeps right in a wide arc and turns toward the viewer;
//  3. loops right at the camera (×2 scale): the sheets cover the whole hero;
//  4. the second turn goes deep, up and out past the top-right corner.
const POINTS: readonly (readonly [number, number, number])[] = [
  [-0.75, -1.7, -2.0],
  [-0.48, -0.78, -1.9],
  [-0.16, -0.44, -1.7],
  [0.2, -0.3, -1.25],
  [0.44, -0.18, -0.55],
  [0.36, -0.05, 0.4],
  [0.0, 0.0, 1.02],
  [-0.34, 0.08, 0.68],
  [-0.46, 0.17, -0.05],
  [-0.3, 0.3, -0.62],
  [0.02, 0.48, -0.98],
  [0.34, 0.66, -1.2],
  [0.66, 0.88, -1.4],
  [1.1, 1.35, -1.6],
];
export const CURVE_SAMPLES = 512;

// 512 × 3 float texture: row 0 = position, 1 = the sheet's "up", 2 = tangent.
export class RibbonCurve {
  readonly data = new Float32Array(CURVE_SAMPLES * 3 * 4);
  readonly texture: THREE.DataTexture;
  length = 1;

  constructor() {
    this.texture = new THREE.DataTexture(this.data, CURVE_SAMPLES, 3, THREE.RGBAFormat, THREE.FloatType);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
  }

  /** @param sx width the x shares refer to (the screen width; wider on portrait screens) */
  build(sx: number, H: number) {
    const pts = POINTS.map(([x, y, z]) => new THREE.Vector3(x * sx, y * H, z * H));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
    this.length = curve.getLength();
    const N = CURVE_SAMPLES;
    const P: THREE.Vector3[] = [];
    const Tn: THREE.Vector3[] = [];
    const U: THREE.Vector3[] = [];
    const view = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u).normalize();
      // the sheet's "up" = world up made orthogonal to the tangent: on the loop the ribbon
      // behaves like a cylinder with a vertical axis, and the works never turn upside down.
      const worldUp = new THREE.Vector3(0, 1, 0).addScaledVector(t, -t.y);
      // a little "facing the camera" gives a soft roll on the diagonals
      const toCam = new THREE.Vector3().crossVectors(view, t);
      if (toCam.dot(worldUp) < 0) toCam.negate();
      const up =
        worldUp.lengthSq() > 1e-3
          ? worldUp.normalize().multiplyScalar(0.78).addScaledVector(toCam.normalize(), 0.22)
          : toCam;
      up.addScaledVector(t, -up.dot(t)).normalize();
      if (i > 0 && up.dot(U[i - 1]) < 0) up.negate();
      P.push(p);
      Tn.push(t);
      U.push(up);
    }
    // smooth the up vectors so the ribbon never twists sharply
    for (let pass = 0; pass < 6; pass++) {
      for (let i = 1; i < N - 1; i++) {
        U[i].add(U[i - 1]).add(U[i + 1]).multiplyScalar(1 / 3);
        U[i].addScaledVector(Tn[i], -U[i].dot(Tn[i])).normalize();
      }
    }
    const d = this.data;
    for (let i = 0; i < N; i++) {
      d.set([P[i].x, P[i].y, P[i].z, 1], i * 4); // row 0
      d.set([U[i].x, U[i].y, U[i].z, 0], (N + i) * 4); // row 1
      d.set([Tn[i].x, Tn[i].y, Tn[i].z, 0], (2 * N + i) * 4); // row 2
    }
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}
