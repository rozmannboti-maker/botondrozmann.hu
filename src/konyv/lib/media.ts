// Video pages: each case shows its poster until the video has a frame ready,
// holds still on its current frame while visible, plays while hovered, and is
// unloaded when far away.
import * as THREE from "three";

export type VideoEntry = { src: string; start: number };

export class VideoPage {
  readonly entry: VideoEntry;
  readonly poster: THREE.Texture;
  ready = false;
  playing = false;
  lastWanted = 0;
  private readonly anisotropy: number;
  private video: HTMLVideoElement | null = null;
  private texture: THREE.VideoTexture | null = null;

  constructor(entry: VideoEntry, poster: THREE.Texture, anisotropy: number) {
    this.entry = entry;
    this.poster = poster;
    this.anisotropy = anisotropy;
  }

  get loaded() {
    return this.video !== null;
  }

  get map(): THREE.Texture {
    return this.ready && this.texture ? this.texture : this.poster;
  }

  load() {
    // no recording for this case: the page stays on its poster
    if (this.video || !this.entry.src) return;
    const v = document.createElement("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "auto";
    v.crossOrigin = "anonymous";
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    // Start on the poster frame so the swap from poster to video is invisible.
    v.addEventListener("loadedmetadata", () => {
      v.currentTime = this.entry.start;
    }, { once: true });
    v.addEventListener("seeked", () => {
      if (!this.texture || this.ready) return;
      this.texture.needsUpdate = true;
      this.ready = true;
      if (this.playing) this.play();
    }, { once: true });
    v.src = this.entry.src;

    const t = new THREE.VideoTexture(v);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = this.anisotropy;
    this.video = v;
    this.texture = t;
  }

  unload() {
    if (!this.video || !this.texture) return;
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
    this.texture.dispose();
    this.video = this.texture = null;
    this.ready = false;
    this.playing = false;
  }

  setPlaying(on: boolean) {
    if (on === this.playing) return;
    this.playing = on;
    if (!this.video || !this.ready) return;
    if (on) this.play();
    else this.video.pause();
  }

  private play() {
    this.video?.play().catch(() => {});
  }
}

export class MediaPool {
  private readonly pages: VideoPage[];
  private readonly maxLoaded: number;
  private tick = 0;

  constructor(pages: VideoPage[], maxLoaded = 8) {
    this.pages = pages;
    this.maxLoaded = maxLoaded;
  }

  // visible/wanted: keep loaded (frame on screen); playing: actually play.
  update(visible: Set<number>, wanted: Set<number>, playing: Set<number>) {
    this.tick++;
    this.pages.forEach((page, i) => {
      if (visible.has(i) || wanted.has(i)) {
        page.load();
        page.lastWanted = this.tick;
      }
      page.setPlaying(visible.has(i) && playing.has(i));
    });

    const loaded = this.pages.filter((p) => p.loaded);
    if (loaded.length > this.maxLoaded) {
      loaded
        .filter((p) => p.lastWanted !== this.tick)
        .sort((a, b) => a.lastWanted - b.lastWanted)
        .slice(0, loaded.length - this.maxLoaded)
        .forEach((p) => p.unload());
    }
  }

  suspend() {
    this.pages.forEach((p) => p.setPlaying(false));
  }

  dispose() {
    this.pages.forEach((p) => {
      p.unload();
      p.poster.dispose();
    });
  }
}
