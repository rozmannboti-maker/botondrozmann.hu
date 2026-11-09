// A névjegykártya (2026-11-09): kattintásra felrepül a kamera elé, és kattintható elérhetőségeket mutat.
// A kártya arca Botond saját névjegy-képe; a linkek fölé átlátszó HTML-mezők kerülnek pontosan
// ugyanoda (CardCopy.spots), így a 3D kártya és a kattintható felület fedi egymást.
import * as THREE from "three";
import "../styles/contact-card.css";

export type CardCopy = {
  name: string;
  role: string;
  dialogLabel: string;
  close: string;
  // a Botond által tervezett kártya képei (01-Sajat-Brand/Kepek/Rozmann Botond névjegykártya)
  faceLight: string;
  faceDark: string;
  aspect: number; // szélesség / magasság
  spots: Hotspot[];
};

// Egy link helye a kártyán, a kártya szélességének / magasságának arányában.
export type Hotspot = { label: string; href: string; x: number; y: number; w: number; h: number; external: boolean };

const DURATION = 0.85; // s, a repülés ideje
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const FACE_CAMERA = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);

export class ContactCard {
  progress = 0; // 0: az asztalon, 1: a kamera előtt
  private target = 0;
  private hover = 0;
  private hoverTarget = 0;
  private restPos: THREE.Vector3;
  private restQuat: THREE.Quaternion;
  private stack: THREE.Object3D;
  private stackPos: THREE.Vector3;
  private stackQuat: THREE.Quaternion;
  private away: THREE.Vector3;
  private dim: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private layer: HTMLDivElement;
  private box: HTMLDivElement;
  private closeBtn: HTMLButtonElement;
  private shown = false;
  private lastFocus: Element | null = null;
  private tmp = { p: new THREE.Vector3(), q: new THREE.Quaternion(), pq: new THREE.Quaternion(), fwd: new THREE.Vector3(), ndc: new THREE.Vector2() };
  private ray = new THREE.Raycaster();

  private card: THREE.Mesh;
  private hitTargets: THREE.Object3D[];
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private onChange: (open: boolean) => void;

  constructor(
    card: THREE.Mesh,
    hitTargets: THREE.Object3D[],
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    copy: CardCopy,
    onChange: (open: boolean) => void,
  ) {
    this.card = card;
    this.hitTargets = hitTargets;
    this.camera = camera;
    this.canvas = canvas;
    this.onChange = onChange;
    this.restPos = card.position.clone();
    this.restQuat = card.quaternion.clone();
    // A kártyacsomag (fehér + fekete) együtt emelkedik, ha fölé viszed az egeret.
    this.stack = card.parent!;
    this.stackPos = this.stack.position.clone();
    this.stackQuat = this.stack.quaternion.clone();
    // A fehér kártya a fekete alól oldalra csúszik ki, mielőtt felemelkedik.
    const other = hitTargets.find((t) => t !== card);
    this.away = other ? card.position.clone().sub(other.position).setY(0).normalize() : new THREE.Vector3(-1, 0, 0);

    // Elsötétítő sík közvetlenül a kártya mögött: a jelenet háttérbe húzódik.
    this.dim = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0x0a0908, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    );
    this.dim.visible = false;
    this.dim.renderOrder = 5;
    camera.add(this.dim);

    // A kattintható réteg
    const spots: Hotspot[] = card.userData.hotspots ?? [];
    this.layer = document.createElement("div");
    this.layer.className = "cc-layer";
    this.layer.hidden = true;
    const backdrop = document.createElement("div");
    backdrop.className = "cc-backdrop";
    backdrop.addEventListener("click", () => this.close());
    this.box = document.createElement("div");
    this.box.className = "cc-card";
    this.box.setAttribute("role", "dialog");
    this.box.setAttribute("aria-modal", "true");
    this.box.setAttribute("aria-label", copy.dialogLabel);
    this.box.tabIndex = -1; // a megnyitás után ide kerül a fókusz (gyűrű nélkül)
    const heading = document.createElement("p");
    heading.className = "cc-sr";
    heading.textContent = `${copy.name}, ${copy.role}`;
    this.box.appendChild(heading);
    spots.forEach((sp) => {
      const a = document.createElement("a");
      a.className = "cc-hot";
      a.href = sp.href;
      a.textContent = sp.label;
      if (sp.external) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      Object.assign(a.style, { left: `${sp.x * 100}%`, top: `${sp.y * 100}%`, width: `${sp.w * 100}%`, height: `${sp.h * 100}%` });
      this.box.appendChild(a);
    });
    this.closeBtn = document.createElement("button");
    this.closeBtn.type = "button";
    this.closeBtn.className = "cc-close";
    this.closeBtn.setAttribute("aria-label", copy.close);
    // rajzolt ikon: a betűjel (×) a betű alapvonala miatt nem ül pontosan középen (2026-11-09)
    this.closeBtn.innerHTML =
      '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    this.closeBtn.addEventListener("click", () => this.close());
    this.box.appendChild(this.closeBtn);
    this.layer.append(backdrop, this.box);
    document.body.appendChild(this.layer);
    window.addEventListener("keydown", this.onKey);
  }

  get isOpen() {
    return this.target === 1;
  }

  // A kártyák egyike van-e a sugár útjában (a raycaster már be van állítva).
  hit(raycaster: THREE.Raycaster) {
    return raycaster.intersectObjects(this.hitTargets, false).length > 0;
  }

  setHover(on: boolean) {
    this.hoverTarget = on ? 1 : 0;
  }

  open() {
    if (this.target === 1) return;
    this.target = 1;
    this.hoverTarget = 0;
    this.lastFocus = document.activeElement;
    this.layer.hidden = false;
    this.layer.classList.remove("is-closing");
    this.onChange(true);
  }

  close() {
    if (this.target === 0) return;
    this.target = 0;
    this.shown = false;
    this.layer.classList.remove("is-ready");
    this.layer.classList.add("is-closing");
    if (this.lastFocus instanceof HTMLElement) this.lastFocus.focus({ preventScroll: true });
    this.onChange(false);
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this.isOpen) {
      e.preventDefault();
      this.close();
    }
  };

  // Képkockánként; true, ha mozgott valami (újra kell rajzolni).
  update(dt: number, w: number, h: number) {
    const before = this.progress + this.hover;
    const step = dt / DURATION;
    this.progress = this.target ? Math.min(1, this.progress + step) : Math.max(0, this.progress - step);
    this.hover = damp(this.hover, this.hoverTarget, 10, dt);
    if (Math.abs(this.hover - this.hoverTarget) < 1e-3) this.hover = this.hoverTarget;
    // Két szakasz: előbb kicsúszik a fekete kártya alól (az asztal síkjában), utána repül.
    const SLIDE = 0.3;
    const a = ease(Math.min(1, this.progress / SLIDE));
    const e = ease(Math.max(0, (this.progress - SLIDE) / (1 - SLIDE)));
    const { p, q, pq, fwd, ndc } = this.tmp;

    // Egérrel fölötte a két kártya együtt emelkedik meg és billen felénk.
    this.stack.position.copy(this.stackPos);
    this.stack.position.y += 0.025 * this.hover;
    this.stack.quaternion.copy(this.stackQuat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.08 * this.hover));

    const restP = this.restPos.clone().addScaledVector(this.away, 0.36 * a);
    const restQ = this.restQuat;

    if (this.progress <= 0) {
      this.card.position.copy(this.restPos);
      this.card.quaternion.copy(this.restQuat);
      this.dim.visible = false;
      if (!this.layer.hidden && this.target === 0) this.layer.hidden = true;
      return before !== this.progress + this.hover;
    }

    // Cél: a képernyő közepén, a kamera felé fordulva, adott pixelszélességben.
    const card = this.card.geometry as THREE.BoxGeometry;
    const W = card.parameters.width, D = card.parameters.depth;
    const widthPx = Math.min(w * 0.86, h * 0.52 * (W / D), 640);
    const vt = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const depth = (W * h) / (2 * vt * widthPx);
    this.camera.updateMatrixWorld();
    ndc.set(0, 0);
    this.ray.setFromCamera(ndc, this.camera);
    this.camera.getWorldDirection(fwd);
    const along = depth / this.ray.ray.direction.dot(fwd);
    p.copy(this.ray.ray.origin).addScaledVector(this.ray.ray.direction, along);
    q.copy(this.camera.quaternion).multiply(FACE_CAMERA);

    // világból a kártya szülőjének terébe
    const parent = this.card.parent!;
    parent.updateMatrixWorld();
    parent.worldToLocal(p);
    parent.getWorldQuaternion(pq);
    q.premultiply(pq.invert());

    // Repülés: ív felfelé és egy kis pördülés útközben.
    this.card.position.lerpVectors(restP, p, e);
    this.card.position.y += Math.sin(Math.PI * e) * 0.35;
    this.card.quaternion.slerpQuaternions(restQ, q, e);
    this.card.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(Math.PI * e) * -0.6));

    // A kártya a kamera előtt egyenletes fényt kap, hogy jól olvasható legyen.
    const mats = this.card.material as THREE.Material[];
    const face = mats[2] as THREE.MeshStandardMaterial;
    face.emissiveIntensity = 0.95 * e;

    // Elsötétítés a kártya mögött
    const dd = depth + 0.25;
    this.dim.visible = true;
    this.dim.position.set(0, 0, -dd);
    this.dim.scale.set(dd * vt * 2 * (w / h) * 3, dd * vt * 2 * 3, 1);
    this.dim.material.opacity = 0.62 * e;

    // A kattintható mezők a kártya pontos helyére, ha megérkezett.
    if (this.progress >= 1 && !this.shown) {
      this.shown = true;
      const r = this.canvas.getBoundingClientRect();
      Object.assign(this.box.style, {
        left: `${r.left + r.width / 2}px`,
        top: `${r.top + r.height / 2}px`,
        width: `${widthPx}px`,
        height: `${(widthPx * D) / W}px`,
      });
      this.layer.classList.add("is-ready");
      this.box.focus({ preventScroll: true });
    }
    if (this.shown) {
      const r = this.canvas.getBoundingClientRect();
      this.box.style.left = `${r.left + r.width / 2}px`;
      this.box.style.top = `${r.top + r.height / 2}px`;
      this.box.style.width = `${widthPx}px`;
      this.box.style.height = `${(widthPx * D) / W}px`;
      this.box.style.setProperty("--cc-pad", `${(widthPx * 9) / 1050}px`);
    }
    return before !== this.progress + this.hover;
  }

  dispose() {
    window.removeEventListener("keydown", this.onKey);
    this.layer.remove();
    this.camera.remove(this.dim);
    this.dim.geometry.dispose();
    this.dim.material.dispose();
  }
}
