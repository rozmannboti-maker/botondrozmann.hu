import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted fonts (OFL), Latin subset only: all the copy is Latin.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter-tight/latin-ext-400.css";
import "@fontsource/inter-tight/latin-ext-500.css";
import "@fontsource/jetbrains-mono/latin-ext-400.css";
import "@fontsource/jetbrains-mono/latin-ext-500.css";
import "@fontsource/google-sans/latin-ext-500.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter-tight/latin-400.css";
import "@fontsource/inter-tight/latin-500.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/google-sans/latin-500.css";
import "./styles/tokens.css";
import "./styles/global.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
