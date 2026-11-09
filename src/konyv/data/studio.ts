import { ASSETS } from "./cases";
import { MAILTO } from "../../data/site";

// 2026-11-06: a főoldal /referenciak/ aloldala. A logó SVG-k üresek (a user kérésére nincs logó).
export const STUDIO = {
  name: "Rozmann Botond",
  contact: MAILTO, // a "Beszéljünk" gomb: közvetlenül e-mail
  home: "/", // vissza a főoldalra
  logo: `${ASSETS}logo.svg`,
  mark: `${ASSETS}mark.svg`,
  cover: "#1c1a17", // book cover colour
  coverImage: `${ASSETS}borito.webp`, // a Figmában készült borító (2048 × 1325)
};

export const HERO = {
  title: "Referenciák",
  text: "Kattints a könyvre, és lapozd át a munkáimat",
  hint: "Kattints a könyvre, és lapozd át a munkáimat",
  scroll: "Görgess lejjebb",
};

// Printed in the book (JetBrains Mono lines are set in capitals).
export const PRINT = {
  works: "Válogatott munkák · 2026",
  backCover: "Válogatott munkák — 2026",
  contents: "Tartalom",
  count: (n: number) => `${n} munka`,
  pick: "Válassz egy munkát",
  site: "botondrozmann.hu",
  fin: "Vége.",
  thanks: "Köszönöm, hogy megnézted",
  pencil: "ROZMANN BOTOND",
  // a névjegykártya az asztalon (2026-11-09): Botond saját tervezésű kártyája (1050 × 600 px képek,
  // forrás: 01-Sajat-Brand/Kepek/Rozmann Botond névjegykártya). A kattintható mezők a kép pixeleiben
  // vannak megadva (a sorok helye kimérve), arányként.
  card: {
    name: "Rozmann Botond",
    role: "Webfejlesztés",
    dialogLabel: "Névjegy: Rozmann Botond",
    close: "Névjegy bezárása",
    faceLight: `${ASSETS}nevjegy-vilagos.webp`,
    faceDark: `${ASSETS}nevjegy-sotet.webp`,
    aspect: 1050 / 600,
    spots: [
      { label: "+36 70 772 2277", href: "tel:+36707722277", x: 68/1050, y: 463/600, w: (252-68)/1050, h: (492-463)/600, external: false },
      { label: "rozmann.boti@gmail.com", href: MAILTO, x: 68/1050, y: 492/600, w: (333-68)/1050, h: (520-492)/600, external: false },
      { label: "botondrozmann.hu", href: "/", x: 68/1050, y: 520/600, w: (271-68)/1050, h: (547-520)/600, external: false },
    ],
  },
};
