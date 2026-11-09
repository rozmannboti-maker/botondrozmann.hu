# kitefold — agency site

A one-page agency site by ubernatural, from uberdesigner.ai, for "Kitefold", a placeholder studio. A glass logo flies
into the header; "We design / Really fast" slides in while a 3D ribbon of twelve works loops past the camera on an
S-curve; the ribbon falls into a 4 × 3 grid of cloth sheets that ripple under the cursor (the hovered one plays its
preview); blinds close into a dark section with a slow sphere of works. Everything is driven by the scroll.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173). `npm run build` makes a static build in `dist/`.
pnpm and yarn work too.

## What's where

```
index.html                  title, Geist preload, Instrument Serif from Google Fonts
public/assets/              per work: work-<slug>-1440.webp / -960.webp (posters), work-<slug>.mp4 (grid works'
                            preview loops); Geist (OFL) and its license; the Kitefold mark as SVG
src/data/site.ts            every text and link on the page
src/data/projects.ts        the works: 12 for the ribbon and grid (title, summary, loop start), 11 more for the sphere
src/data/logo.ts            the mark's SVG path (flat in the header, extruded as glass on the first screen)
src/styles/tokens.css       every colour, size and type value; the desktop and phone scales
src/App.tsx                 the scroll timeline: hero, footer labels, blinds, final section, and the engine's wiring
src/gl/timeline.ts          the one scene scale: where each stage starts and ends, in screens of scroll
src/gl/physics.ts           all the cloth, cursor and wind settings
src/gl/ribbonCurve.ts       the ribbon's 3D path
src/gl/engine.ts            renderer, camera, ribbon → grid choreography, GPU picking, hover video, final sphere
src/gl/projectCanvas.ts     one sheet: ribbon / grid pose, cursor touch, wind, preview loop
src/gl/clothSim.ts          the spring-grid cloth simulation
src/gl/shaders.ts           the sheet shader (ribbon layout, wind, fold lighting), text and picking shaders
src/gl/glassLogo.ts         the glass logo (dispersion shader, studio light baked into a cube map)
src/gl/workSphere.ts        the sphere of works behind the final section
src/gl/textPlane.ts         the hero type drawn into the 3D scene, so the ribbon can pass in front of and behind it
src/components/             Navigation, Hero, HoverInfo, Footer, Blinds, FinalSection (+ CSS Modules)
```

## Make it yours

- **Studio name, copy and links:** `src/data/site.ts`, the title and description in `index.html`.
- **Logo:** `LOGO_PATH` in `src/data/logo.ts`, one SVG path in a 48 × 48 box (closed shapes, no strokes). It is drawn
  flat in the header and extruded as glass on the first screen.
- **Your works:** `src/data/projects.ts` and `public/assets/`. Each work needs a 16:10 poster at 1440 × 900 and
  960 × 600 (WebP); the twelve grid works also need a 16:10 loop (960 × 600 H.264, no audio) and `start`, the second of
  the loop that matches the poster. The grid holds exactly twelve; the sphere shows those twelve plus `sphereExtras`.
- **Colours and type:** `src/styles/tokens.css` (light and dark themes; the header's sun / moon button switches them).
- **Pacing:** the stages in `src/gl/timeline.ts` (in screens of scroll; the page is `total + 1` screens long).
- **Cloth feel:** `src/gl/physics.ts`.

## Fonts and license

Geist (Vercel, SIL Open Font License; the license is in `public/assets/LICENSE-geist-OFL.txt`) and Instrument Serif
(Google Fonts, SIL Open Font License). The 3D noise in `src/gl/shaders.ts` is Ashima Arts / Stefan Gustavson's simplex
noise (MIT). The work posters and loops are previews of uberdesigner templates and are covered by your uberdesigner
license; replace them with your own work.
