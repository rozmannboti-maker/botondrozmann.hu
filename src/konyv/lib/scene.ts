// The 3D scene: a hardcover on a black oak table under a desk lamp, with props around it.
// Renderer, lights, camera, pointer / keyboard / hash navigation and the render-on-demand loop.
import * as THREE from "three";
import { Book, type FaceSpec, type SheetSpec } from "./book";
import { MediaPool, VideoPage } from "./media";
import * as Pages from "./pages";
import { createProps, type PropCopy } from "./props";
import { createTable } from "./table";
import { ContactCard } from "./contactCard";
import { CoffeeCup } from "./coffee";
import { quality } from "./quality";

const ASPECT = 16 / 10; // every page is 16:10, like the videos
// Share of the screen width the open spread would span: wide while the book is
// closed (table and objects in view), then the camera pushes in as it opens.
// a share a NYITOTT könyv (két lap) szélessége a képernyőéhez képest; a csukott könyv ennek a fele.
// 2026-11-11: telefonon a csukott könyv 0.62-vel a képernyő harmadát sem töltötte ki → 1.4 (~70%).
// phoneRead: álló telefonon kinyitva egyszerre egy lap tölti ki a képernyőt (olvasómód, lásd focus).
const SHARE = { closed: 0.56, open: 0.86, phoneClosed: 1.4, phoneOpen: 0.96, phoneRead: 1.95, phoneBelow: 700 };
const ELEVATION = THREE.MathUtils.degToRad(60); // camera angle above the table
const CLOSED_YAW = 0.12; // closed book sits slightly turned
const TILT_YAW = 0.13; // POV orbit range following the mouse (rad)
const TILT_PITCH = 0.07;
const DAMP = { open: 3.5, tilt: 2.5, yaw: 4 }; // per second
const STAGE = { headlineGap: 32, headerGap: 24, bottom: 24, maxClosedTop: 0.55 }; // px, share of the height
const BG = 0x060505;

const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const now = () => performance.now() / 1000;

export type SceneCase = { title: string; tag: string; src: string; poster: string; start: number };

export type SceneOptions = {
  host: HTMLElement; // the canvas is created inside it
  canvasClass: string;
  label: string; // the canvas's aria-label
  hero: HTMLElement; // the headline: the closed book sits below it
  header: HTMLElement; // the open book sits below it
  cases: SceneCase[];
  brand: { logo: string; mark: string; bg: string; cover?: string };
  print: Pages.PrintCopy & PropCopy;
  onReady: () => void;
  onOpenChange: (open: boolean) => void;
};

// Starts the scene; returns a function that stops it and frees the GPU.
export function startScene(o: SceneOptions) {
  let stop: (() => void) | null = null;
  let stopped = false;
  init(o, () => stopped).then(
    (s) => {
      if (stopped) s();
      else stop = s;
    },
    (err) => console.error(err),
  );
  return () => {
    stopped = true;
    stop?.();
  };
}

async function init(o: SceneOptions, cancelled: () => boolean): Promise<() => void> {
  const canvas = document.createElement("canvas");
  canvas.className = o.canvasClass;
  canvas.setAttribute("aria-label", o.label);
  o.host.appendChild(canvas);
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // no POV tilt

  // -------------------------------------------------------------- renderer

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio, quality.maxPixelRatio);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps video colours, rolls off lamp highlights
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const anisotropy = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  const fog = new THREE.Fog(BG, 10, 26);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(21, 1, 0.1, 120);

  const free = () => {
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.geometry.dispose();
      const mats: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      });
    });
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };

  // A desk lamp somewhere above and to the left, out of frame: one warm spot
  // with a soft edge, so the light pools on the book and falls off into the dark.
  const lamp = new THREE.SpotLight(0xfff1e2, 140, 0, 0.56, 0.85, 2);
  lamp.position.set(-2.0, 6.3, -1.3); // behind-left: its gloss sweeps across the pages
  lamp.target.position.set(0.25, 0, -0.15);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
  lamp.shadow.camera.near = 2;
  lamp.shadow.camera.far = 16;
  lamp.shadow.bias = -0.0003;
  lamp.shadow.normalBias = 0.012;
  lamp.shadow.radius = 6;
  scene.add(lamp, lamp.target);

  // Faint bounce so shadows aren't pure black, and a cool rim from behind that
  // keeps the black book from melting into the black table.
  scene.add(new THREE.HemisphereLight(0xd9cbb8, 0x000000, 0.22));
  const rim = new THREE.DirectionalLight(0xaabbe0, 0.35);
  rim.position.set(3, 2.2, -5);
  const fill = new THREE.DirectionalLight(0xffeedd, 0.75); // room bounce on the lamp's far side
  fill.position.set(3.5, 2.5, 3.5);
  scene.add(rim, fill);

  scene.add(createTable(renderer, { anisotropy, pxPerUnit: quality.tablePx }));

  // ---------------------------------------------------------------- assets

  const loaderTex = new THREE.TextureLoader();
  loaderTex.setCrossOrigin("anonymous");
  let brand: Pages.Brand, posters: THREE.Texture[], cardFaces: THREE.Texture[];
  try {
    [brand, posters, cardFaces] = await Promise.all([
      Pages.loadBrand(o.brand),
      Promise.all(o.cases.map((c) => loaderTex.loadAsync(c.poster))),
      Promise.all([o.print.card.faceLight, o.print.card.faceDark].map((src) => loaderTex.loadAsync(src))),
      Pages.loadFonts(),
    ]);
  } catch (err) {
    free();
    throw err;
  }
  if (cancelled()) {
    posters.forEach((t) => t.dispose());
    free();
    return () => {};
  }
  [...posters, ...cardFaces].forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
  });

  const videoPages = o.cases.map((c, i) => new VideoPage(c, posters[i], anisotropy));
  const pool = new MediaPool(videoPages, quality.loadedVideos);

  // -------------------------------------------------------------- the book

  const boardAspect = Book.boardAspect(ASPECT);
  const turnIn = Book.turnIn(ASPECT);
  const contents = new Pages.ContentsPage(o.cases, brand.logo, o.print, boardAspect, { turnIn, spine: "right" });

  const faces: FaceSpec[] = videoPages.map((video) => ({ video }));
  // 2026-11-09: a „Köszönöm, hogy megnézted” záróoldal kivéve (Botond kérése); a hátsó előzék üres.
  const backInner = Pages.blankTexture(boardAspect, { turnIn, spine: "left" });
  // Odd number of cases: an empty paper page closes the last spread.
  if (faces.length % 2) faces.push({ map: Pages.plainTexture(ASPECT) });
  const sheets: SheetSpec[] = [];
  for (let i = 0; i < faces.length; i += 2) sheets.push({ front: faces[i], back: faces[i + 1] });

  const covers = {
    frontOuter: Pages.coverTexture(brand, boardAspect, o.print),
    frontInner: contents.texture,
    backInner,
    backOuter: Pages.backCoverTexture(brand, boardAspect, o.print),
  };
  Object.values(covers).forEach((t) => {
    t.anisotropy = anisotropy;
  });

  const paper = Pages.paperTexture();
  const book = new Book({ aspect: ASPECT, sheets, covers, edge: Pages.edgeTexture(), paper });
  scene.add(book.root);
  const compact = window.innerWidth < SHARE.phoneBelow && window.innerWidth < window.innerHeight;
  const props = createProps({ brand, paper, renderer, copy: o.print, faces: { light: cardFaces[0], dark: cardFaces[1] }, compact });
  scene.add(props);
  scene.add(camera); // az elsötétítő sík a kamerához van kötve
  const card = new ContactCard(props.userData.card, props.userData.cardTargets, camera, canvas, o.print.card, () => {
    pointer.inside = false; // a nézőpont visszaáll középre
    hoveredFace = -1;
    book.setHover(-1);
    invalidate(4);
  });
  const coffee = new CoffeeCup(props.userData.coffee, camera);
  // Csak csukott könyvnél kattinthatók (a névjegy és a kávé).
  const cardEnabled = () => book.target === 0 && !book.busy && book.openness < 0.02 && !card.isOpen;
  const cupEnabled = () => cardEnabled() && !coffee.busy;
  let cardPress: { x: number; y: number; what: "card" | "cup" } | null = null;

  // Olvasómód (2026-11-11): álló telefonon a nyitott könyvből egyszerre egy lap látszik, a kamera
  // a bal (-1) vagy a jobb (+1) lapra áll. Koppintás a képernyő jobb / bal felére vagy vízszintes
  // húzás: előbb a szomszéd lapra lép, a lap végén lapoz.
  let focus = -1;
  let focusX = 0;
  let readPress: { x: number; y: number; entry: number } | null = null;
  const reading = () => size.w < SHARE.phoneBelow && size.w < size.h;
  const bookOpen = () => book.target > 0 && book.target < book.NI;

  // Soft contact shadow where the book meets the wood.
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: Pages.blobTexture(), transparent: true, opacity: 0.7, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.0015;
  book.inner.add(blob);

  // ------------------------------------------------------------ navigation

  // Case i lies on spread n (#n): even cases on the right page, odd ones on the left.
  const caseSpread = (i: number) => (i % 2 === 0 ? i / 2 + 1 : (i + 3) / 2);

  function onSpreadChange() {
    const s = book.target;
    try {
      history.replaceState(null, "", s ? `#${s}` : location.pathname + location.search);
    } catch {
      /* sandboxed frame */
    }
  }

  function go(n: number) {
    const from = book.target;
    if (book.goTo(n, now())) {
      focus = n > from ? -1 : 1; // előre: a bal lapon kezd, vissza: a jobbon
      onSpreadChange();
    }
  }
  // olvasómód: egy lépés előre (+1) vagy vissza (-1)
  function step(dir: number) {
    if (dir > 0 && focus < 0) focus = 1;
    else if (dir < 0 && focus > 0) focus = -1;
    else return go(book.target + dir);
    invalidate(30);
  }

  const onHash = () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (Number.isFinite(n)) go(n);
  };
  const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (window.scrollY > window.innerHeight * 0.5) return; // the book is off screen
    if (card.isOpen) return; // a névjegy van elöl
    if (e.key in keys) {
      e.preventDefault();
      go(book.target + keys[e.key]);
    }
  };
  window.addEventListener("hashchange", onHash);
  window.addEventListener("keydown", onKey);

  // ----------------------------------------------------------- interaction

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const inv = new THREE.Matrix4();
  const pointer: { x: number; y: number; inside: boolean; event: PointerEvent | null } = { x: 0, y: 0, inside: false, event: null };
  let press: { x: number; y: number; side: number; hit: THREE.Vector3; entry: number; moved: boolean; dragging: boolean } | null = null;
  let hoveredFace = -1;

  // Pointer → point on the book's top plane, in book space.
  function toBook(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    inv.copy(book.inner.matrixWorld).invert();
    const ray = raycaster.ray.clone().applyMatrix4(inv);
    plane.constant = -book.T;
    return ray.intersectPlane(plane, new THREE.Vector3());
  }

  function sideAt(hit: THREE.Vector3 | null) {
    if (!hit || Math.abs(hit.z) > book.Hc / 2 + 0.05) return 0;
    const fp = book.footprint();
    if (hit.x < fp.left - 0.05 || hit.x > fp.right + 0.05) return 0;
    return hit.x >= 0 ? 1 : -1;
  }

  // Which contents entry is under the pointer (uses the ray from toBook).
  function contentsEntry() {
    if (book.target !== 1 || book.busy) return -1;
    const hit = raycaster.intersectObject(book.frontCover, false)[0];
    if (!hit || hit.face?.materialIndex !== 3 || !hit.uv) return -1;
    return contents.hitTest(1 - hit.uv.x, hit.uv.y);
  }

  function updateHover(e: PointerEvent) {
    const hit = toBook(e);
    const overCard = cardEnabled() && card.hit(raycaster);
    const overCup = !overCard && cupEnabled() && coffee.hit(raycaster);
    card.setHover(overCard);
    coffee.setHover(overCup);
    if (overCard || overCup) {
      hoveredFace = -1;
      book.setHover(-1);
      canvas.style.cursor = "pointer";
      return;
    }
    const side = sideAt(hit);
    const entry = side < 0 ? contentsEntry() : -1;
    if (entry !== contents.hover) {
      contents.draw(entry);
      invalidate();
    }

    // Hovering a page plays its video; nearing the outer edge peels the corner.
    hoveredFace = side && !book.busy ? book.faceOn(side) : -1;
    if (hit && side && entry < 0 && !book.busy) {
      const k = side > 0 ? book.target : book.target - 1;
      const edge = Math.min(1, Math.abs(hit.x) / book.W);
      const lift = book.items[k]?.kind === "cover"
        ? 0.3 + 0.7 * THREE.MathUtils.smoothstep(edge, 0.3, 0.95)
        : THREE.MathUtils.smoothstep(edge, 0.62, 0.97);
      if (k >= 0 && k < book.NI && lift > 0) book.setHover(k, lift, side);
      else book.setHover(-1);
    } else book.setHover(-1);

    canvas.style.cursor = entry >= 0 ? "pointer" : side ? "grab" : "default";
  }

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const hit = toBook(e);
    if (reading() && bookOpen() && !card.isOpen) {
      readPress = { x: e.clientX, y: e.clientY, entry: focus < 0 ? contentsEntry() : -1 };
      return;
    }
    if (cardEnabled() && card.hit(raycaster)) {
      cardPress = { x: e.clientX, y: e.clientY, what: "card" };
      return;
    }
    if (cupEnabled() && coffee.hit(raycaster)) {
      cardPress = { x: e.clientX, y: e.clientY, what: "cup" };
      return;
    }
    const side = sideAt(hit);
    if (!side || !hit) return;
    press = { x: e.clientX, y: e.clientY, side, hit, entry: side < 0 ? contentsEntry() : -1, moved: false, dragging: false };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointer */
    }
  };

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    pointer.inside = true;
    pointer.event = e;
    if (!press) return;

    if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
      press.moved = true;
      const k = press.side > 0 ? book.target : book.target - 1;
      press.dragging = book.beginDrag(k, press.side, press.hit.x, press.hit.z, now());
      if (press.dragging) {
        canvas.style.cursor = "grabbing";
        hoveredFace = -1;
      }
    }
    if (press.dragging) {
      const hit = toBook(e);
      if (hit) book.dragTo(hit.x, now());
    }
  };

  const onUp = (e: PointerEvent) => {
    if (readPress) {
      const dx = e.clientX - readPress.x, dy = e.clientY - readPress.y;
      const entry = readPress.entry;
      readPress = null;
      if (book.busy) return;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);
      else if (Math.hypot(dx, dy) < 10) {
        if (entry >= 0) {
          const i = entry;
          go(caseSpread(i));
          focus = i % 2 === 0 ? 1 : -1; // páros eset a jobb lapon, páratlan a balon
        } else step(e.clientX > size.w / 2 ? 1 : -1);
      }
      return;
    }
    if (cardPress) {
      const tap = Math.hypot(e.clientX - cardPress.x, e.clientY - cardPress.y) < 8;
      const what = cardPress.what;
      cardPress = null;
      if (tap && what === "card" && cardEnabled()) card.open();
      if (tap && what === "cup" && cupEnabled()) coffee.click();
      return;
    }
    if (!press) return;
    if (press.dragging) {
      book.endDrag(now());
      onSpreadChange();
    } else if (!press.moved) {
      if (press.entry >= 0) go(caseSpread(press.entry));
      else go(book.target + press.side);
    }
    press = null;
  };

  const onLeave = () => {
    pointer.inside = false;
    card.setHover(false);
    coffee.setHover(false);
    hoveredFace = -1;
    if (!press) book.setHover(-1);
  };

  const onVisibility = () => {
    if (document.hidden) pool.suspend();
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVisibility);

  // ---------------------------------------------------------------- layout

  // The book lives in a "stage": below the headline while closed, and the whole
  // area under the header once open (the headline fades out). The camera's view
  // offset slides it there.
  let size = { w: 0, h: 0 };
  let bounds = { closedTop: 0, openTop: 0 };
  let viewShift = NaN;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    if (w === size.w && h === size.h) return;
    size = { w, h };
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const heroBottom = o.hero.offsetTop + o.hero.offsetHeight;
    const headerBottom = o.header.getBoundingClientRect().bottom;
    bounds = {
      closedTop: Math.min(h * STAGE.maxClosedTop, heroBottom + STAGE.headlineGap),
      openTop: headerBottom + STAGE.headerGap,
    };
    viewShift = NaN;
    invalidate();
  }
  // The headline reflows once its web font arrives: measure again.
  document.fonts.ready.then(() => {
    size = { w: 0, h: 0 };
  });

  const target = new THREE.Vector3();
  const tilt = { yaw: 0, pitch: 0 };
  const lastCam = new THREE.Vector3(Infinity, 0, 0);
  let open = 0;

  function placeCamera(dt: number) {
    open = damp(open, book.openness, DAMP.open, dt);
    const { w, h } = size;
    const vt = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const read = reading();
    const share = w < SHARE.phoneBelow
      ? THREE.MathUtils.lerp(SHARE.phoneClosed, read ? SHARE.phoneRead : SHARE.phoneOpen, open)
      : THREE.MathUtils.lerp(SHARE.closed, SHARE.open, open);
    // olvasómódban a kamera a kiválasztott lap közepére áll
    focusX = damp(focusX, read ? focus * (book.Wc / 2) * open : 0, DAMP.open, dt);
    target.x = focusX;
    const halfW = book.Wc + 0.08;
    const halfD = (book.Hc / 2) * Math.sin(ELEVATION) + 0.06;
    const stage = { top: THREE.MathUtils.lerp(bounds.closedTop, bounds.openTop, open), bottom: h - STAGE.bottom };
    const shift = Math.round(h / 2 - (stage.top + stage.bottom) / 2);
    if (shift !== viewShift) {
      viewShift = shift;
      camera.setViewOffset(w, h, 0, shift, w, h);
    }
    const stageH = Math.max(120, stage.bottom - stage.top);
    const dist = Math.max((halfW * h) / (share * w * vt), (halfD * h) / (0.8 * stageH * vt));

    // POV tilt: the camera orbits a little toward the mouse.
    const px = pointer.inside && !press ? pointer.x : 0;
    const py = pointer.inside && !press ? pointer.y : 0;
    tilt.yaw = damp(tilt.yaw, calm ? 0 : px * TILT_YAW, DAMP.tilt, dt);
    tilt.pitch = damp(tilt.pitch, calm ? 0 : -py * TILT_PITCH, DAMP.tilt, dt);
    const el = ELEVATION + tilt.pitch;
    camera.position.set(
      target.x + Math.sin(tilt.yaw) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(tilt.yaw) * Math.cos(el) * dist,
    );
    camera.lookAt(target);
    fog.near = dist + 3;
    fog.far = dist + 18;

    const yaw = damp(book.root.rotation.y, CLOSED_YAW * (1 - open), DAMP.yaw, dt);
    const turned = Math.abs(yaw - book.root.rotation.y) > 1e-6;
    book.root.rotation.y = yaw;
    const moved = camera.position.distanceToSquared(lastCam) > 1e-10;
    lastCam.copy(camera.position);
    return moved || turned;
  }

  // Render on demand: nothing is drawn while the scene is still (an open page
  // being read, an idle table), which saves a lot of battery. invalidate() asks
  // for a few frames after changes the loop can't see itself.
  let renderFrames = 12;
  function invalidate(n = 2) {
    renderFrames = Math.max(renderFrames, n);
  }

  // If frames run long (slow GPU at a high pixel ratio), step the resolution down.
  const governor = { time: 0, frames: 0 };
  function govern(dt: number) {
    if (pixelRatio <= 1 || dt > 0.25) return; // ignore tab switches / throttled frames
    governor.time += dt;
    if (++governor.frames < 90) return;
    if (governor.time / governor.frames > 0.024) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
      size = { w: 0, h: 0 };
    }
    governor.time = governor.frames = 0;
  }

  // ------------------------------------------------------------------ loop

  const wanted = new Set<number>();
  const playing = new Set<number>();
  let last = now();
  let isOpen = false;
  let raf = 0;
  function frame() {
    const t = now(), dt = Math.min(0.05, t - last);
    last = t;
    resize();

    // Media first: a page that just unloaded must fall back to its poster
    // before the book syncs textures for this frame's render.
    const visible = book.visibleFaces();
    wanted.clear();
    for (let s = book.target - 1; s <= book.target + 1; s++) book.spreadFaces(s).forEach((id) => wanted.add(id));
    playing.clear();
    if (reading() && bookOpen()) {
      // olvasómód (2026-11-11): csak a képernyőn lévő lap videója fut, a szomszéd lapé nem
      const f = book.faceOn(focus);
      if (f >= 0) playing.add(f);
    } else if (canHover) {
      if (hoveredFace >= 0) playing.add(hoveredFace);
    } else visible.forEach((id) => playing.add(id)); // touch screens: no hover, so just play
    pool.update(visible, wanted, playing);

    const bookChanged = book.update(t, dt);
    if (!press && !card.isOpen && pointer.inside && pointer.event) updateHover(pointer.event);

    const fp = book.footprint();
    blob.position.x = (fp.left + fp.right) / 2;
    blob.scale.set((fp.right - fp.left) * 1.28 + 0.1, book.Hc * 1.6, 1);

    // The headline steps aside as soon as the book is (heading to) open, and
    // returns while it closes on either cover.
    const nowOpen = (book.target > 0 && book.target < book.NI) || book.openness > 0.5 || card.isOpen;
    if (nowOpen !== isOpen) {
      isOpen = nowOpen;
      o.onOpenChange(isOpen);
    }

    const cameraMoved = placeCamera(dt);
    const cupChanged = coffee.update(dt);
    const cardChanged = card.update(dt, size.w, size.h) || cupChanged;
    const videoPlaying = videoPages.some((p) => p.playing && p.ready);
    if (bookChanged || cameraMoved || cardChanged || videoPlaying || renderFrames > 0) {
      renderer.render(scene, camera);
      renderFrames = Math.max(0, renderFrames - 1);
      govern(dt);
    }
    raf = requestAnimationFrame(frame);
  }

  const initial = parseInt(location.hash.slice(1), 10);
  if (initial > 0) {
    book.jump(initial);
    open = book.openness;
  }
  onSpreadChange();
  resize();
  book.update(now(), 0);
  frame();
  o.onReady();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("hashchange", onHash);
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVisibility);
    pool.dispose();
    card.dispose();
    contents.texture.dispose();
    free();
  };
}
