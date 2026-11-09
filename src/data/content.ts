// A hero alatti tartalom. Forrás: a régi weboldal (2026-09-08 mentés) és a Szolgaltatasok.md.
// Javítva: "kézzel írt kód" kivéve (lásd Hangnem-es-Stilus), nincs gondolatjel.

export const ABOUT = {
  statement: ["Webfejlesztőként egyedi webes élményeket tervezek,", "technikai precizitással", "és érzelemmel."],
  sub: "Rozmann Botond vagyok, Budapestről. Emlékezetes digitális élményeket építek: egyedi kód és igényes vizuális megjelenés, sablonok nélkül.",
};

// slug = a work-<slug>-960.webp előnézeti kép (a Walter Groupnak még nincs képe)
export const PROJECTS = [
  { name: "Mythos Private Resort", kind: "Szálláshely", date: "01 2025", slug: "mythos" },
  { name: "Gombabák", kind: "Webshop", date: "06 2025", slug: "gombabak" },
  { name: "Szmh-Euro Metall", kind: "Ipar", date: "09 2025", slug: "szmheumetall" },
  { name: "Tájkert Kft.", kind: "Bemutatkozó weboldal", date: "11 2025", slug: "tajkert" },
  { name: "Walter Group", kind: "Webshop", date: "02 2026", slug: "" },
];

export const SERVICES = [
  { name: "Egyedi weboldal", text: "Kódolt, nem sablon" },
  { name: "WordPress fejlesztés", text: "Egyedi téma, Elementor nélkül" },
  { name: "Webshop", text: "Shopify, WooCommerce vagy teljesen egyedi" },
  { name: "Márkaépítés", text: "Design, identitás, arculat" },
];

export const PROCESS = [
  { name: "Konzultáció", text: "Megbeszéljük a célt, a közönséget és azt, hogy mit vársz az oldaltól." },
  { name: "Felmérés", text: "Átnézem a meglévő anyagaidat, és véglegesítjük az oldalak és a funkciók listáját." },
  { name: "Tervezés és fejlesztés", text: "Szöveg, képek és kód készül, közben végig látod, mi épül." },
  { name: "Élesítés", text: "Tesztelem a linkeket, az űrlapokat és a mobil nézetet, kiteszem élesbe, és két hétig javítom, ami apróság." },
];

export const CONTACT = {
  lines: [
    "Elérhető vagyok szabadúszó és projektmunkákra, hazai és nemzetközi vállalkozások számára egyaránt.",
    "Nyitott vagyok hosszú távú partnerségekre is, ahol a minőség és a részletek számítanak.",
  ],
  email: "rozmann.boti@gmail.com",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/rozmannbotond/" },
    { label: "Behance", href: "https://www.behance.net/rozmannbotond" },
    { label: "Instagram", href: "https://www.instagram.com/rozmannbotond/" },
  ],
};
