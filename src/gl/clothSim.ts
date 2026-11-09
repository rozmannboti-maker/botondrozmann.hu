// A light spring-grid simulation of taut cloth.
// Every node of the vertex grid has a z offset (along the sheet's normal) and a velocity.
// Nodes are tied to their neighbours by springs (Laplacian → the wave spreads), pulled back
// to flat (shape recovery) and damped. External forces: inertia when the sheet speeds up or
// brakes, and the cursor's touch.
import { PHYS } from "./physics";

const SUBSTEP = 1 / 120;

export interface Motion {
  ax: number;
  ay: number;
  az: number;
}

export interface Touch {
  u: number;
  v: number;
  strength: number;
  sigma: number;
}

export class ClothSim {
  readonly nx: number;
  readonly ny: number;
  readonly z: Float32Array;
  readonly v: Float32Array;
  readonly f: Float32Array;
  readonly grad: Float32Array;
  // node coordinates relative to the centre, [-1..1]
  readonly rx: Float32Array;
  readonly ry: Float32Array;
  sleeping = true;
  acc = 0;

  constructor(nx: number, ny: number) {
    this.nx = nx;
    this.ny = ny;
    const n = nx * ny;
    this.z = new Float32Array(n);
    this.v = new Float32Array(n);
    this.f = new Float32Array(n);
    this.grad = new Float32Array(n * 2);
    this.rx = new Float32Array(n);
    this.ry = new Float32Array(n);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        this.rx[k] = (i / (nx - 1)) * 2 - 1;
        this.ry[k] = (j / (ny - 1)) * 2 - 1;
      }
    }
  }

  /**
   * @param dt     frame time, s
   * @param motion the sheet's acceleration in px/s² (local axes)
   * @param touch  the cursor's touch, or null
   * @param w      sheet width, px
   * @param h      sheet height, px
   * @returns true while the surface moves
   */
  step(dt: number, motion: Motion, touch: Touch | null, w: number, h: number): boolean {
    const { nx, ny, z, v, f, rx, ry } = this;
    const n = nx * ny;
    const hasMotion = Math.abs(motion.ax) + Math.abs(motion.ay) + Math.abs(motion.az) > 40;
    const hasTouch = touch !== null && touch.strength > 0.5;

    if (this.sleeping && !hasMotion && !hasTouch) return false;
    this.sleeping = false;

    // --- external forces (constant within the frame)
    // Inertia: the leading edge lags more than the trailing one; the signed square
    // gives a bend rather than a plain tilt.
    const kA = PHYS.inertia;
    const ax = motion.ax * kA;
    const ay = motion.ay * kA;
    const az = motion.az * kA;
    for (let k = 0; k < n; k++) {
      const x = rx[k];
      const y = ry[k];
      f[k] = -(ax * x * Math.abs(x) + ay * y * Math.abs(y)) - az * (x * x + y * y) * 0.5;
    }
    if (touch !== null && hasTouch) {
      const cx = touch.u * 2 - 1;
      const cy = touch.v * 2 - 1;
      // sigma in px → normalised axes
      const sx = (touch.sigma / w) * 2;
      const sy = (touch.sigma / h) * 2;
      const isx = 1 / (2 * sx * sx);
      const isy = 1 / (2 * sy * sy);
      for (let k = 0; k < n; k++) {
        const dx = rx[k] - cx;
        const dy = ry[k] - cy;
        const e = dx * dx * isx + dy * dy * isy;
        if (e < 9) f[k] -= touch.strength * Math.exp(-e);
      }
    }

    // --- fixed substeps (stable at any frame rate)
    this.acc += Math.min(dt, 1 / 20);
    let steps = 0;
    const STIFF = PHYS.stiffness;
    const RESTORE = PHYS.recovery;
    const DAMP = PHYS.damping;
    while (this.acc >= SUBSTEP && steps < 6) {
      this.acc -= SUBSTEP;
      steps++;
      for (let j = 0; j < ny; j++) {
        const jm = j > 0 ? -nx : nx;
        const jp = j < ny - 1 ? nx : -nx;
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i;
          const im = i > 0 ? -1 : 1;
          const ip = i < nx - 1 ? 1 : -1;
          const lap = z[k + im] + z[k + ip] + z[k + jm] + z[k + jp] - 4 * z[k];
          const a = STIFF * lap - RESTORE * z[k] - DAMP * v[k] + f[k];
          v[k] += a * SUBSTEP;
        }
      }
      for (let k = 0; k < n; k++) z[k] += v[k] * SUBSTEP;
    }

    // --- gradient for the shading + check whether it settled
    let maxZ = 0;
    let maxV = 0;
    const g = this.grad;
    const dxp = (w / (nx - 1)) * 2;
    const dyp = (h / (ny - 1)) * 2;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const l = i > 0 ? z[k - 1] : z[k];
        const r = i < nx - 1 ? z[k + 1] : z[k];
        const b = j > 0 ? z[k - nx] : z[k];
        const t = j < ny - 1 ? z[k + nx] : z[k];
        g[k * 2] = (r - l) / dxp;
        g[k * 2 + 1] = (t - b) / dyp;
        const az2 = Math.abs(z[k]);
        const av = Math.abs(v[k]);
        if (az2 > maxZ) maxZ = az2;
        if (av > maxV) maxV = av;
      }
    }
    // fully settled → perfectly flat, and sleep
    if (!hasMotion && !hasTouch && maxZ < 0.03 && maxV < 0.08) {
      z.fill(0);
      v.fill(0);
      g.fill(0);
      this.sleeping = true;
    }
    return true;
  }

  reset() {
    this.z.fill(0);
    this.v.fill(0);
    this.grad.fill(0);
    this.sleeping = true;
  }
}
