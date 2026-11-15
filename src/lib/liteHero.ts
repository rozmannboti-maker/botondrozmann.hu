// 2026-11-15: telefonon a WebGL-szalag (fotók + videók + szimuláció) akadozott, ezért ott nincs
// WebGL: a hero egy képernyőnyi, a cím és az alcím a DOM-ban áll, utána rögtön a többi szekció
// jön. Asztalin ?hero=lite-tal kipróbálható.
const params = new URLSearchParams(location.search);
export const PORTRAIT_HERO = params.get("hero") === "portre";
export const LITE_HERO =
  !PORTRAIT_HERO && (params.get("hero") === "lite" || window.matchMedia("(max-width: 768px)").matches);
