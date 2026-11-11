import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { transform } from "lightningcss";

// 2026-11-11 (PageSpeed): a stíluslapok építéskor a HTML-be kerülnek, ugyanabban a sorrendben,
// tömörítve. Így nincs külön, a megjelenítést blokkoló CSS-kérés; a kaszkád (és a dizájn) változatlan.
//  - a public/assets/css/*.css linkek: a fájl tartalma (a relatív url('../…') /assets/… lesz)
//  - a Vite saját CSS-e (main-*.css, a közös chunk): a bundle-ből
const minify = (code: string, name: string) =>
  new TextDecoder().decode(transform({ filename: name, code: new TextEncoder().encode(code), minify: true }).code);

function inlineCss(): Plugin {
  return {
    name: "inline-css",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        html = html.replace(/<link rel="stylesheet" href="\/assets\/css\/([\w-]+\.css)" \/>/g, (_m, file: string) => {
          const css = readFileSync(resolve(__dirname, "public/assets/css", file), "utf8").replace(/url\((['"]?)\.\.\//g, "url($1/assets/");
          return `<style data-src="${file}">${minify(css, file)}</style>`;
        });
        html = html.replace(/<link rel="stylesheet" crossorigin href="\/(assets\/[^"]+\.css)">/g, (m, file: string) => {
          const asset = ctx.bundle?.[file];
          if (!asset || asset.type !== "asset") return m;
          return `<style>${String(asset.source)}</style>`;
        });
        return html;
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineCss()],
  // three.js is most of the ~1 MB bundle (~290 kB gzipped); that's expected, not a warning.
  build: {
    target: "es2022",
    // forrástérképek (PageSpeed „Bevált módszerek”: a nagy saját JS-hez legyen source map)
    sourcemap: true,
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
