// A kávé (2026-11-09): kattintásra a csésze felemelkedik, a kamera felé repül és felénk billen,
// „kortyolunk", majd visszaszáll a csészealjra. Kortyonként lejjebb száll a kávé szintje; három korty
// után üres, a következő kattintásra újratöltődik.
import * as THREE from "three";

export type CoffeeParts = {
  cup: THREE.Group;
  coffee: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  saucer: THREE.Mesh;
  arts: { full: THREE.Texture; drunk: THREE.Texture };
  inner: number[][]; // [sugár, magasság] pontok a peremtől lefelé
};

const FULL = 0.248; // a kávé felszínének magassága a csészében (teli)
const LEVELS = [FULL, 0.205, 0.158, 0.098]; // kortyok után; az utolsó: üres (csak egy kis maradék)
const DRINK = 2.1; // s, egy korty teljes ideje
const REFILL = 0.9; // s
const TILT = 0.72; // rad, ennyire billen felénk a csésze
const LIFT = 0.13; // ennyire emelkedik a csészealj fölé, mielőtt elindul
const SCREEN_H = 0.42; // a csésze magassága a képernyő közepén, a képernyőmagasság arányában (2026-11-09)
const CUP_H = 0.31; // a csésze magassága (csészealj nélkül), világegységben

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => ease(clamp01((t - a) / (b - a)));
const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export class CoffeeCup {
  private parts: CoffeeParts;
  private camera: THREE.PerspectiveCamera;
  private ray = new THREE.Raycaster();
  private targets: THREE.Object3D[];
  private sips = 0; // 0..3
  private level = FULL;
  private anim: { kind: "drink" | "refill"; t: number; from: number; to: number } | null = null;
  private hover = 0;
  private hoverTarget = 0;
  private restPos: THREE.Vector3;
  private r0: number;
  private tmp = { a: new THREE.Vector3(), b: new THREE.Vector3(), q: new THREE.Quaternion(), pq: new THREE.Quaternion(), axis: new THREE.Vector3() };

  constructor(parts: CoffeeParts, camera: THREE.PerspectiveCamera) {
    this.parts = parts;
    this.camera = camera;
    this.targets = [parts.cup, parts.saucer];
    this.restPos = parts.cup.position.clone();
    this.r0 = this.radiusAt(FULL);
  }

  get busy() {
    return this.anim !== null;
  }

  hit(raycaster: THREE.Raycaster) {
    return raycaster.intersectObjects(this.targets, true).length > 0;
  }

  setHover(on: boolean) {
    this.hoverTarget = on ? 1 : 0;
  }

  click() {
    if (this.anim) return;
    this.hoverTarget = 0;
    if (this.sips >= LEVELS.length - 1) {
      this.anim = { kind: "refill", t: 0, from: this.level, to: FULL };
    } else {
      this.anim = { kind: "drink", t: 0, from: this.level, to: LEVELS[this.sips + 1] };
    }
  }

  // A csésze belső falának sugara adott magasságban (a profil pontjai között interpolálva).
  private radiusAt(y: number) {
    const pts = this.parts.inner; // felülről lefelé
    for (let i = 1; i < pts.length; i++) {
      const [r1, y1] = pts[i - 1], [r2, y2] = pts[i];
      if (y <= y1 && y >= y2) return r1 + ((y - y1) / (y2 - y1)) * (r2 - r1);
    }
    return pts[pts.length - 1][0];
  }

  private setLevel(y: number) {
    this.level = y;
    const { coffee, arts } = this.parts;
    coffee.position.y = y - FULL;
    const k = this.radiusAt(y) / this.r0;
    coffee.scale.set(k, 1, k);
    const map = y >= FULL - 1e-4 ? arts.full : arts.drunk;
    if (coffee.material.map !== map) {
      coffee.material.map = map;
      coffee.material.needsUpdate = true;
    }
  }

  // Képkockánként; true, ha mozgott valami.
  update(dt: number) {
    const { cup } = this.parts;
    const hoverBefore = this.hover;
    this.hover = damp(this.hover, this.hoverTarget, 10, dt);
    if (Math.abs(this.hover - this.hoverTarget) < 1e-3) this.hover = this.hoverTarget;

    if (!this.anim) {
      cup.position.copy(this.restPos);
      cup.position.y += 0.012 * this.hover; // egérrel fölötte kicsit megemelkedik
      cup.quaternion.identity();
      return hoverBefore !== this.hover;
    }

    const a = this.anim;
    a.t += dt;

    if (a.kind === "refill") {
      // újratöltés: a szint visszaemelkedik, a szív visszakerül
      const k = clamp01(a.t / REFILL);
      this.setLevel(a.from + (a.to - a.from) * ease(k));
      if (k >= 1) {
        this.sips = 0;
        this.setLevel(FULL);
        this.anim = null;
      }
      return true;
    }

    const t = a.t;
    const lift = seg(t, 0, 0.3) * (1 - seg(t, 1.75, DRINK)); // fel a csészealjról, a végén vissza
    const go = seg(t, 0.15, 0.75) * (1 - seg(t, 1.2, 1.85)); // oda a kamerához és vissza
    const sip = seg(t, 0.75, 1.15); // ezalatt fogy a kávé

    // Cél a kamera felé, világkoordinátákban, majd vissza a csésze szülőjének terébe.
    const parent = cup.parent!;
    parent.updateMatrixWorld();
    const { a: rest, b: cam, q, pq, axis } = this.tmp;
    rest.copy(this.restPos);
    parent.localToWorld(rest);
    // A képernyő közepe, olyan mélységben, hogy a csésze a képernyő SCREEN_H részét töltse ki
    // (mint a névjegy: a kamerán át a kép közepére mutató sugár mentén).
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const vt = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    // álló telefonon a magasság 42%-a szélesebb lenne a képernyőnél: ott a szélességhez igazodik
    // (felülről a csésze pereme nagynak hat → a magasság a szélesség ~30%-a)
    const share = Math.min(SCREEN_H, 0.3 * this.camera.aspect);
    const depth = CUP_H / (2 * vt * share);
    const fwd = this.camera.getWorldDirection(new THREE.Vector3());
    cam.copy(this.ray.ray.origin).addScaledVector(this.ray.ray.direction, depth / this.ray.ray.direction.dot(fwd));
    cam.y -= CUP_H * 0.5; // a csésze talppontja: így a csésze közepe kerül a képernyő közepére
    const world = rest.lerp(cam, go);
    world.y += LIFT * lift;
    parent.worldToLocal(world);
    cup.position.copy(world);

    // Billentés: a csésze teteje a kamera felé dől (a vízszintes tengely körül).
    axis.copy(this.camera.position);
    parent.localToWorld(this.tmp.b.copy(this.restPos));
    axis.sub(this.tmp.b).setY(0).normalize();
    axis.crossVectors(new THREE.Vector3(0, 1, 0), axis).normalize();
    q.setFromAxisAngle(axis, TILT * go);
    parent.getWorldQuaternion(pq);
    // local = parent⁻¹ · tilt · parent
    cup.quaternion.copy(pq).invert().multiply(q).multiply(pq);

    this.setLevel(a.from + (a.to - a.from) * sip);

    if (t >= DRINK) {
      this.sips++;
      this.setLevel(a.to);
      cup.position.copy(this.restPos);
      cup.quaternion.identity();
      this.anim = null;
    }
    return true;
  }
}
