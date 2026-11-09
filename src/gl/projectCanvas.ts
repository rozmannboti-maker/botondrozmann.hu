import * as THREE from "three";
import { ClothSim, type Touch } from "./clothSim";
import { cardVertex, cardFragment, pickFragment } from "./shaders";
import { PHYS } from "./physics";
import type { RibbonCurve } from "./ribbonCurve";

export const SEG_X = 40;
export const SEG_Y = 25;

let sharedBase: THREE.PlaneGeometry | null = null;
function getBase() {
  // One subdivided plane for every card: position / uv / index are shared,
  // only the cloth's displacement attributes are per card.
  if (!sharedBase) sharedBase = new THREE.PlaneGeometry(1, 1, SEG_X, SEG_Y);
  return sharedBase;
}

const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const ONE = new THREE.Vector3(1, 1, 1);
const WIND_HOME = new THREE.Vector2(0.94, 0.34).normalize();

export interface PickHit {
  id: number;
  u: number;
  v: number;
}

/** The template's preview loop, played on a hovered grid card. */
export interface CardVideo {
  src: string;
  start: number; // s: the loop's frame that matches the poster
}

export class ProjectCanvas {
  readonly index: number;
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.ShaderMaterial;
  readonly pickMaterial: THREE.ShaderMaterial;
  readonly mesh: THREE.Mesh;
  readonly sim = new ClothSim(SEG_X + 1, SEG_Y + 1);
  private readonly dispAttr: THREE.BufferAttribute;
  private readonly gradAttr: THREE.BufferAttribute;

  // the sheet's kinematics in grid mode
  readonly pos = new THREE.Vector3();
  readonly prevPos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  readonly prevVel = new THREE.Vector3();
  readonly accel = new THREE.Vector3();
  readonly rot = new THREE.Vector3(); // base rotation from the flight path
  readonly tilt = new THREE.Vector2(); // tilt from speed (smoothed)
  hasPrev = false;

  // the cursor
  readonly touch: Touch = { u: 0.5, v: 0.5, strength: 0, sigma: 40 };
  touchTarget = 0;
  lastU = 0.5;
  lastV = 0.5;
  cursorSpeed = 0;

  // wind: hoverIntensity 0..1, flow direction, accumulated drift of the waves
  hoverI = 0;
  boost = 0;
  windT: number;
  readonly windDir = WIND_HOME.clone();
  readonly windTarget = WIND_HOME.clone();
  windAmp = 0;
  readonly size = new THREE.Vector2(100, 62.5);
  k = 1;

  // set by the engine in grid mode
  flight = 1;
  moving = false;

  // preview loop (grid cards only)
  private readonly videoSrc: CardVideo | null;
  private video: HTMLVideoElement | null = null;
  private videoTex: THREE.VideoTexture | null = null;
  private videoReady = false;
  private videoWanted = false;
  mix = 0;

  constructor(index: number, texture: THREE.Texture, curve: RibbonCurve, video: CardVideo | null = null) {
    this.index = index;
    this.videoSrc = video;
    this.windT = index * 1.7;
    const base = getBase();
    const geo = new THREE.BufferGeometry();
    geo.setIndex(base.index);
    geo.setAttribute("position", base.attributes.position);
    geo.setAttribute("uv", base.attributes.uv);
    const n = (SEG_X + 1) * (SEG_Y + 1);
    this.dispAttr = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    this.gradAttr = new THREE.BufferAttribute(new Float32Array(n * 2), 2).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aDisp", this.dispAttr);
    geo.setAttribute("aGrad", this.gradAttr);
    this.geometry = geo;

    this.material = new THREE.ShaderMaterial({
      vertexShader: cardVertex,
      fragmentShader: cardFragment,
      side: THREE.DoubleSide,
      uniforms: {
        uMode: { value: 0 },
        uMap: { value: texture },
        uVideo: { value: null },
        uMix: { value: 0 },
        uCurve: { value: curve.texture },
        uCurveN: { value: curve.texture.image.width },
        uCurveLen: { value: 1 },
        uS0: { value: -1e5 },
        uSLen: { value: 100 },
        uRH: { value: 100 },
        uFlex: { value: 0 },
        uSize: { value: new THREE.Vector2(100, 62.5) },
        uWind: { value: 0 },
        uTime: { value: 0 },
        uSeed: { value: index * 3.173 + 0.71 },
        uWindOff1: { value: new THREE.Vector2() },
        uWindOff2: { value: new THREE.Vector2() },
        uTouch: { value: new THREE.Vector4(0.5, 0.5, 0, 0.2) },
        uEdgeFree: { value: PHYS.windEdgeFreedom },
        uGust: { value: PHYS.windGustFromCursor },
        uShadeGain: { value: PHYS.shadeGain },
      },
    });
    // the pick material shares the same uniform objects → the same geometry on the GPU
    this.pickMaterial = new THREE.ShaderMaterial({
      vertexShader: cardVertex,
      fragmentShader: pickFragment,
      side: THREE.DoubleSide,
      uniforms: { ...this.material.uniforms, uPickId: { value: index + 1 }, uPickScale: { value: 1 } },
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  setRibbon(s0: number, sLen: number, h: number, flex: number, curveLen: number) {
    const u = this.material.uniforms;
    u.uMode.value = 0;
    u.uS0.value = s0;
    u.uSLen.value = sLen;
    u.uRH.value = h;
    u.uFlex.value = flex;
    u.uCurveLen.value = curveLen;
    u.uSize.value.set(sLen, h);
    this.size.set(sLen, h);
    this.hasPrev = false;
    this.vel.set(0, 0, 0);
    this.accel.set(0, 0, 0);
  }

  /** The sheet's pose in the grid: position (px world), rotation from the flight path */
  setGridPose(x: number, y: number, z: number, rx: number, ry: number, rz: number, w: number, h: number, dt: number) {
    const u = this.material.uniforms;
    u.uMode.value = 1;
    u.uSize.value.set(w, h);
    this.size.set(w, h);
    this.pos.set(x, y, z);
    this.rot.set(rx, ry, rz);

    // speed and acceleration from the real motion (the scroll is smoothed by Lenis)
    if (this.hasPrev && dt > 0) {
      const vx = (x - this.prevPos.x) / dt;
      const vy = (y - this.prevPos.y) / dt;
      const vz = (z - this.prevPos.z) / dt;
      this.vel.x += (vx - this.vel.x) * 0.5;
      this.vel.y += (vy - this.vel.y) * 0.5;
      this.vel.z += (vz - this.vel.z) * 0.5;
      const ax = (this.vel.x - this.prevVel.x) / dt;
      const ay = (this.vel.y - this.prevVel.y) / dt;
      const az = (this.vel.z - this.prevVel.z) / dt;
      const lim = 30000;
      this.accel.x += (THREE.MathUtils.clamp(ax, -lim, lim) - this.accel.x) * 0.35;
      this.accel.y += (THREE.MathUtils.clamp(ay, -lim, lim) - this.accel.y) * 0.35;
      this.accel.z += (THREE.MathUtils.clamp(az, -lim, lim) - this.accel.z) * 0.35;
    } else {
      this.vel.set(0, 0, 0);
      this.accel.set(0, 0, 0);
    }
    this.prevVel.copy(this.vel);
    this.prevPos.copy(this.pos);
    this.hasPrev = true;

    // X / Y tilt from the speed, with inertia
    const k = 0.00009;
    const tx = THREE.MathUtils.clamp(this.vel.y * k, -0.22, 0.22);
    const ty = THREE.MathUtils.clamp(-this.vel.x * k, -0.22, 0.22);
    const sm = 1 - Math.exp(-dt * 7);
    this.tilt.x += (tx - this.tilt.x) * sm;
    this.tilt.y += (ty - this.tilt.y) * sm;
    if (Math.abs(this.tilt.x) < 1e-5) this.tilt.x = 0;
    if (Math.abs(this.tilt.y) < 1e-5) this.tilt.y = 0;
    if (Math.abs(this.accel.x) + Math.abs(this.accel.y) + Math.abs(this.accel.z) < 1 && this.vel.lengthSq() < 0.01) {
      this.accel.set(0, 0, 0);
      this.vel.set(0, 0, 0);
    }

    tmpE.set(rx + this.tilt.x, ry + this.tilt.y, rz);
    tmpQ.setFromEuler(tmpE);
    this.mesh.matrix.compose(this.pos, tmpQ, ONE);
    this.mesh.matrixWorld.copy(this.mesh.matrix);
  }

  /**
   * The cursor over the sheet.
   * @param uv uv in [0..1] (v bottom-up) from GPU picking, or null
   * @param k  design-pixel scale (the force in px doesn't depend on the resolution)
   */
  setPointer(uv: PickHit | null, dt: number, k: number) {
    this.k = k;
    const w = this.size.x;
    const h = this.size.y;
    if (uv) {
      const du = (uv.u - this.lastU) * w;
      const dv = (uv.v - this.lastV) * h;
      const fresh = this.touchTarget === 0;
      const sp = fresh ? 0 : Math.hypot(du, dv) / Math.max(dt, 1e-3);
      this.cursorSpeed += (Math.min(sp, 6000) - this.cursorSpeed) * 0.3;
      // moving the cursor turns the wind's flow and gives a short gust
      if (!fresh && sp > 30) {
        const len = Math.hypot(du, dv) || 1;
        this.windTarget.set(this.windDir.x * 0.4 + du / len, this.windDir.y * 0.4 + dv / len).normalize();
        this.boost = Math.min(1, Math.max(this.boost, sp * PHYS.speedBoost));
      }
      this.lastU = uv.u;
      this.lastV = uv.v;
      // the touch point follows the cursor with a little inertia
      const f = 1 - Math.exp(-dt * 18);
      if (fresh) {
        this.touch.u = uv.u;
        this.touch.v = uv.v;
      }
      this.touch.u += (uv.u - this.touch.u) * f;
      this.touch.v += (uv.v - this.touch.v) * f;
      this.touchTarget = Math.min(PHYS.forceStrength + this.cursorSpeed * PHYS.velocityInfluence, PHYS.maxForce) * k;
    } else {
      this.touchTarget = 0;
      this.cursorSpeed = 0;
    }
    // the touch force rises fast and falls softer
    const f2 = 1 - Math.exp(-dt * (this.touchTarget > this.touch.strength ? 12 : 6));
    this.touch.strength += (this.touchTarget - this.touch.strength) * f2;
    if (this.touch.strength < 0.5 * k) this.touch.strength = 0;
    this.touch.sigma = w * PHYS.forceRadius;
  }

  /**
   * Wind. hoverIntensity grows smoothly on hover and fades after the cursor leaves.
   * @param base  amplitude without hover, px (> 0 on the ribbon, 0 in the grid)
   * @param hover extra amplitude at hoverIntensity = 1, px
   * @returns true while the surface moves
   */
  updateWind(dt: number, base: number, hover: number) {
    const hovering = this.touchTarget > 0;
    const rate = hovering ? PHYS.hoverIn : PHYS.hoverOut;
    this.hoverI += ((hovering ? 1 : 0) - this.hoverI) * (1 - Math.exp(-dt * rate));
    if (!hovering && this.hoverI < 0.002) this.hoverI = 0;
    this.boost *= Math.exp(-dt * 1.6);
    if (this.boost < 0.002) this.boost = 0;

    // the flow turns smoothly toward the cursor's direction
    const fd = 1 - Math.exp(-dt * 1.4);
    this.windDir.lerp(this.windTarget, fd).normalize();
    // without the cursor the flow slowly returns to its base direction
    if (!hovering) this.windTarget.lerp(WIND_HOME, fd * 0.3).normalize();

    const hi = this.hoverI * this.hoverI * (3 - 2 * this.hoverI);
    const amp = base + hover * hi * (1 + 0.6 * this.boost);
    this.windAmp = amp < 0.01 ? 0 : amp;
    const u = this.material.uniforms;
    u.uWind.value = this.windAmp;
    if (this.windAmp > 0) {
      // the drift accumulates → speed / direction change without phase jumps
      const v = PHYS.windSpeed * (1 + 0.8 * this.boost) * dt;
      const d = this.windDir;
      u.uWindOff1.value.x += d.x * v;
      u.uWindOff1.value.y += d.y * v;
      // a second wave at ~40°, faster
      u.uWindOff2.value.x += (d.x * 0.77 - d.y * 0.64) * v * 1.5;
      u.uWindOff2.value.y += (d.x * 0.64 + d.y * 0.77) * v * 1.5;
      this.windT += dt * (1 + 0.5 * this.boost);
      u.uTime.value = this.windT;
    }
    // local gust at the cursor: touch strength 0..1
    const tz = this.touch.strength > 0 ? Math.min(1, this.touch.strength / (PHYS.forceStrength * this.k)) : 0;
    u.uTouch.value.set(this.touch.u, this.touch.v, tz, PHYS.forceRadius * (this.size.x / this.size.y) * 1.6);
    return this.windAmp > 0;
  }

  simulate(dt: number) {
    const w = this.size.x;
    const h = this.size.y;
    const active = this.sim.step(
      dt,
      { ax: this.accel.x, ay: this.accel.y, az: this.accel.z },
      this.touch.strength > 0 ? this.touch : null,
      w,
      h,
    );
    if (active) this.uploadSim();
    return active;
  }

  private uploadSim() {
    // PlaneGeometry numbers its rows top-down, the simulation bottom-up: flip the rows
    const nx = SEG_X + 1;
    const ny = SEG_Y + 1;
    const d = this.dispAttr.array as Float32Array;
    const g = this.gradAttr.array as Float32Array;
    const z = this.sim.z;
    const sg = this.sim.grad;
    for (let j = 0; j < ny; j++) {
      const src = j * nx;
      const dst = (ny - 1 - j) * nx;
      for (let i = 0; i < nx; i++) {
        d[dst + i] = z[src + i];
        g[(dst + i) * 2] = sg[(src + i) * 2];
        g[(dst + i) * 2 + 1] = sg[(src + i) * 2 + 1];
      }
    }
    this.dispAttr.needsUpdate = true;
    this.gradAttr.needsUpdate = true;
  }

  /**
   * The preview loop: plays while the card is hovered, crossfading over the poster.
   * It starts on the poster's frame and goes back there once it has faded out.
   * @returns true while the loop shows (the frame must be redrawn)
   */
  updateVideo(dt: number, want: boolean) {
    if (!this.videoSrc) return false;
    if (want && !this.video) this.createVideo(this.videoSrc);
    const video = this.video;
    if (!video) return false;
    if (want && !this.videoWanted && video.paused) {
      this.videoReady = false;
      video.currentTime = this.videoSrc.start;
      video.play().catch(() => {});
      // the first frame after the seek is on screen → crossfade
      const ready = () => {
        this.videoReady = true;
      };
      if (typeof video.requestVideoFrameCallback === "function") video.requestVideoFrameCallback(ready);
      else video.addEventListener("playing", ready, { once: true });
    }
    this.videoWanted = want;
    const target = want && this.videoReady ? 1 : 0;
    this.mix += (target - this.mix) * (1 - Math.exp(-dt * 9));
    if (Math.abs(target - this.mix) < 0.002) this.mix = target;
    if (this.mix === 0 && !want && !video.paused) video.pause();
    const u = this.material.uniforms;
    u.uMix.value = this.mix;
    u.uVideo.value = this.mix > 0 ? this.videoTex : null;
    return this.mix > 0;
  }

  private createVideo({ src }: CardVideo) {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;
    this.video = video;
    this.videoTex = new THREE.VideoTexture(video);
    this.videoTex.colorSpace = THREE.SRGBColorSpace;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.pickMaterial.dispose();
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.load();
    }
    this.videoTex?.dispose();
  }
}

export function disposeShared() {
  if (sharedBase) {
    sharedBase.dispose();
    sharedBase = null;
  }
}
