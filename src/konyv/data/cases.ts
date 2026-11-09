// The book's pages, in order. 2026-11-06: ugyanazok a munkák (2026-11-09: Gombabák kivéve, már nem a mi munkánk), mint a főoldal Referenciák listájában.
// A lap képe a hero 16:10-es posztere (assets/work-<poster>-1440.webp). Ahol van felvétel
// (konyv/case-<slug>.mp4, 1280 × 800, telefonon case-<slug>-phone.mp4), ott a lap hoverre mozog;
// a felvétel első kockája megegyezik a poszterrel. `tag` is the small label on the contents page.
// `full` (2026-11-09): a felvétel a teljes oldal végiggörgetése (Botond képernyőfelvétele), a lap
// állóképe ennek első kockája: konyv/poster-<slug>.webp. A többinél még a régi 6 mp-es hero-klip megy.
export type Case = { slug: string; title: string; tag: string; start: number; poster: string; video: boolean; full?: boolean };

export const ASSETS = `${import.meta.env.BASE_URL}konyv/`;

export const CASES: Case[] = [
  { slug: "mythos", title: "mythos private resort", tag: "szálláshely", start: 0, poster: "mythos", video: true },
  { slug: "szmheumetall", title: "szmh-euro metall", tag: "kivitelező", start: 0, poster: "szmheumetall", video: true, full: true },
  { slug: "tajkert", title: "tájkert", tag: "kertépítő", start: 0, poster: "tajkert", video: true },
  { slug: "suti-rozsakert", title: "süti rózsakert", tag: "webshop", start: 0, poster: "suti-rozsakert", video: true },
  { slug: "confinium", title: "confinium", tag: "könyvelőiroda", start: 0, poster: "confinium", video: false },
  { slug: "lodore", title: "l'odore di napoli", tag: "étterem", start: 0, poster: "lodore", video: false },
  { slug: "truckfest", title: "truckfest", tag: "rendezvény", start: 0, poster: "truckfest", video: false },
  { slug: "bbsalgo", title: "bbsalgó", tag: "kivitelező", start: 0, poster: "bbsalgo", video: true },
];

export const caseMedia = (c: Case, phone: boolean) => ({
  src: c.video ? `${ASSETS}case-${c.slug}${phone ? "-phone" : ""}.mp4` : "",
  poster: c.full ? `${ASSETS}poster-${c.slug}.webp` : `${import.meta.env.BASE_URL}assets/work-${c.poster}-1440.webp`,
});
