import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Betűk: Instrument Serif (@font-face a Header.module.css-ben) + a rendszer Helvetica Neue-ja (2026-11-09).
import "./styles/tokens.css";
import "./styles/global.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
