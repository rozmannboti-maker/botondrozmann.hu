// Oldal szövegek és linkek. ELSŐ KÖR: vázlat, a szövegek még nem véglegesek.
export const STUDIO = "Rozmann Botond";

// minden kapcsolatfelvételi gomb ide visz: közvetlenül e-mail írás (2026-11-05)
export const MAIL = "rozmann.boti@gmail.com";
export const MAILTO = `mailto:${MAIL}`;

export const NAV = {
  talk: { label: "Beszéljünk", href: MAILTO },
  menu: "Menü",
};

export const HERO = {
  // szövegforrás: HQ/01-Sajat-Brand/Weboldal-Fooldal-Szovegek.md
  line1: ["Weboldal", "készítés"],
  line2: ["üzleti ", "szemmel."],
  // a két cím közti kis szöveg kikerült (2026-11-02); a kiegészítő mondat a bal alsó sarokban van
  sub: [] as string[],
};

export const FOOTER = {
  // lines as in the layout, for the line-by-line reveal
  note: ["Értem, hogyan működik egy", "vállalkozás, ezért olyan oldalt", "építek, ami eredményt hoz. Sokan", "mondják, hogy ehhez le kell mondani", "a szépségről. Szerintem nem."],
  visit: "Itt találsz meg:",
  subscribe: { label: "Írj nekem", href: MAILTO },
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/rozmannbotond/" },
    { label: "Behance", href: "https://www.behance.net/rozmannbotond" },
    { label: "Insta", href: "https://www.instagram.com/rozmannbotond/" },
  ],
};

export const FINAL = {
  crumb: "Rólam / Így dolgozom",
  aside: ["Egyedi kód, saját képek és szöveg,", "átgondolt felépítés. A discoverytől az", "élesítésig mindent végigviszek."],
  // the aberration plays on this phrase only
  phrase: "Nem sablon.",
  lead: [" Weboldalakat építek", "vállalkozásoknak, amelyek", "igényesek, gyorsak és", "valóban eladnak, hosszú", "távú munkakapcsolatban."],
  scroll: { label: "Görgess tovább", href: "#about" },
};

export const joined = (lines: string[]) => lines.join(" ").replace(/ +/g, " ").trim();

// Portré-hero (az első képernyő). ELSŐ KÖR: vázlat.
export const PORTRAIT = {
  photo: "/assets/hero-portre.webp",
  alt: "Rozmann Botond",
  name: ["Rozmann", "Botond"],
  role: "Egyedi weboldalak és webshopok",
  spec: "[ Kódolt, nem sablon ]",
  cta: { label: "Beszéljünk a projektedről", href: MAILTO },
};
