// The works: uberdesigner templates. Order = order in the grid (desktop 4 × 3, portrait 3 × 4)
// and along the ribbon. Files per work, at assetUrl():
//   work-<slug>-1440.webp, work-<slug>-960.webp  its poster (1440 × 900 / 960 × 600)
//   work-<slug>.mp4                             its preview loop (960 × 600, H.264, no audio), grid works only
// `start` = the loop's frame (s) that matches the poster, so the crossfade on hover is seamless.
// `video` = there is a work-<slug>.mp4 loop; without one the card stays on its poster.
export interface Work {
  slug: string;
  title: string;
  summary: string;
  start: number;
  video: boolean;
}

// 2026-11-03: csak a Kepek/referenciak-keszen mappa képei, ismétlés nélkül, a mappa sorrendjében.
export const works: Work[] = [
  { slug: "confinium", title: "confinium", start: 0, video: false,
    summary: "Ausztriai cégalapítással és könyveléssel foglalkozó iroda bemutatkozó weboldala." },
  { slug: "truckfest", title: "truckfest", start: 0, video: false,
    summary: "A greinbachi Truckfest rendezvény weboldala." },
  { slug: "szmheumetall", title: "szmh eumetall", start: 0, video: true,
    summary: "Hegesztett szerkezeteket gyártó cég bemutatkozó weboldala." },
  { slug: "tajkert", title: "tájkert", start: 0, video: true,
    summary: "Bemutatkozó weboldal." },
  { slug: "suti-rozsakert", title: "süti rózsakert", start: 0, video: true,
    summary: "WooCommerce webshop." },
  { slug: "mythos", title: "mythos private resort", start: 0, video: true,
    summary: "Szálláshely bemutatkozó oldala foglalási rendszerrel, Booking.com és Szállás.hu összekötéssel." },
  { slug: "lodore", title: "l'odore di napoli", start: 0, video: false,
    summary: "Nápolyi pizzéria és étterem weboldala asztalfoglalással." },
  { slug: "bbsalgo", title: "bbsalgó", start: 0, video: true,
    summary: "Kivitelező cég bemutatkozó weboldala." },
  { slug: "tajkert-szolgaltatasok", title: "tájkert", start: 0, video: false,
    summary: "Kertépítő cég szolgáltatás-oldala." },
];

// A gömb extra helyei (csak a záró szekcióban): első körben szintén ismétlés.
// 2026-11-03: üres. A záró gömb a rövidített hero-sorozatban (T.total 3,55) már nem látszik,
// az extra1..11 képek csak fölöslegesen töltődtek be (és a munkák ismétlései voltak).
export const sphereExtras: string[] = [];

export const assetUrl = (file: string) => `${import.meta.env.BASE_URL}assets/${file}`;

/** Poster width: the 960 set on phones (shorter side under 600 px), 1440 elsewhere. */
export const posterWidth = () => (Math.min(window.innerWidth, window.innerHeight) < 600 ? 960 : 1440);

export const posterUrl = (slug: string, width: number) => assetUrl(`work-${slug}-${width}.webp`);
export const videoUrl = (slug: string) => assetUrl(`work-${slug}.mp4`);
