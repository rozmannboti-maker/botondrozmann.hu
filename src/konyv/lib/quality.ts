// Rendering budget. Phones and small touch tablets get the low profile (lighter videos, smaller
// shadow map and table texture, capped pixel ratio); everything else gets high.
// Force either with ?q=low / ?q=high.
const forced = new URLSearchParams(location.search).get("q");
const coarse = window.matchMedia("(pointer: coarse)").matches;
const small = Math.min(screen.width, screen.height) < 820;
const low = forced ? forced === "low" : coarse && small;

export const quality = low
  ? { name: "low", maxPixelRatio: 1.5, shadowMap: 1024, tablePx: 256, phoneVideo: true, loadedVideos: 4 }
  : { name: "high", maxPixelRatio: 2, shadowMap: 2048, tablePx: 400, phoneVideo: false, loadedVideos: 8 };
