import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // three.js is most of the ~1 MB bundle (~290 kB gzipped); that's expected, not a warning.
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
    // 2026-11-06: két oldal: a főoldal és a /referenciak/ (a 3D könyv, src/konyv)
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        referenciak: resolve(__dirname, "referenciak/index.html"),
      },
    },
  },
});
