import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Header } from "../konyv/components/Header";

// 2026-11-21: a jogi oldalak (ÁSZF, adatvédelem, sütik) szövege sima HTML; ide csak a közös
// fejléc ("← Főoldal", Beszéljünk + Menü) és a kinyíló menü kerül, mint a /referenciak/-on.
createRoot(document.getElementById("hdr")!).render(
  <StrictMode>
    <Header ref={null} />
  </StrictMode>,
);
