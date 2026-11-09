import { ASSETS } from "./cases";
import { FOOTER, MAIL, MAILTO } from "../../data/site";

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
  // a névjegykártya az asztalon (2026-11-09): az adatok a főoldal site.ts-éből jönnek
  card: {
    name: "Rozmann Botond",
    role: "Weboldal készítés üzleti szemmel",
    email: MAIL,
    mailto: MAILTO,
    site: "botondrozmann.hu",
    siteHref: "/",
    socials: FOOTER.socials.map((so) => ({ label: so.label === "Insta" ? "Instagram" : so.label, href: so.href })),
    dialogLabel: "Névjegy: Rozmann Botond",
    close: "Névjegy bezárása",
  },
};
