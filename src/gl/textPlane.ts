import * as THREE from "three";
import { textVertex, textFragment } from "./shaders";

// A line of the hero type as a plane in the 3D scene (z = 0, 1 unit = 1 px).
// The DOM element with its CSS type is the source of truth: we measure it and redraw its
// runs (Geist / Instrument Serif) into a canvas texture at the device pixel ratio, so the
// type stays crisp and the ribbon can still pass both in front of it and behind it.
export class TextPlane {
  readonly el: HTMLElement;
  readonly canvas = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
  readonly material: THREE.ShaderMaterial;
  readonly geometry = new THREE.PlaneGeometry(1, 1);
  readonly mesh: THREE.Mesh;
  baseX = 0;
  baseY = 0;
  offIn = 0; // start offset: the line fully off screen

  constructor(el: HTMLElement) {
    this.el = el;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.material = new THREE.ShaderMaterial({
      vertexShader: textVertex,
      fragmentShader: textFragment,
      transparent: true,
      depthWrite: false,
      // depth test: the far part of the ribbon passes behind the type, the near loop in front
      depthTest: true,
      uniforms: { uMap: { value: this.texture }, uColor: { value: new THREE.Color("#0f0f0f") }, uOpacity: { value: 1 } },
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 10;
  }

  layout(W: number, H: number, dpr: number, color: string) {
    const el = this.el;
    const rect = el.getBoundingClientRect();
    const pad = Math.ceil(rect.height * 0.25);
    const cw = Math.ceil(rect.width) + pad * 2;
    const ch = Math.ceil(rect.height) + pad * 2;
    this.canvas.width = Math.ceil(cw * dpr);
    this.canvas.height = Math.ceil(ch * dpr);
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";

    // each span is drawn in its own font at its exact DOM position
    el.querySelectorAll("span").forEach((sp) => {
      const cs = getComputedStyle(sp);
      const r = sp.getBoundingClientRect();
      const text = sp.textContent ?? "";
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      ctx.letterSpacing = cs.letterSpacing;
      const m = ctx.measureText(text);
      const asc = m.fontBoundingBoxAscent;
      const desc = m.fontBoundingBoxDescent;
      const baseline = r.top + (r.height - (asc + desc)) / 2 + asc;
      ctx.fillText(text, r.left - Math.round(rect.left) + pad, baseline - Math.round(rect.top) + pad);
    });
    this.texture.needsUpdate = true;

    this.mesh.scale.set(cw, ch, 1);
    // the plane's centre in world coordinates (screen centre = 0, 0)
    this.baseX = Math.round(rect.left) - pad + cw / 2 - W / 2;
    this.baseY = H / 2 - (Math.round(rect.top) - pad + ch / 2);
    this.mesh.position.set(this.baseX, this.baseY, 0);
    (this.material.uniforms.uColor.value as THREE.Color).set(color);
  }

  dispose() {
    this.texture.dispose();
    this.material.dispose();
    this.geometry.dispose();
  }
}
