// Diagnosztika: ?fps a címben → a bal alsó sarokban az aktuális képkocka/mp, a leglassabb képkocka
// és az éppen látható szekció. Telefonon így lemérhető, hol akad az oldal.
export function startFpsMeter() {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "fixed", left: "8px", bottom: "8px", zIndex: "2147483647", padding: "6px 8px",
    font: "600 12px/1.3 ui-monospace, Menlo, monospace", color: "#fff", background: "rgba(0,0,0,.75)",
    borderRadius: "6px", pointerEvents: "none", whiteSpace: "pre",
  });
  document.body.appendChild(el);
  const ids = ["about", "projects", "svc", "circle-gallery", "contact", "footer-transition"];
  const worst: Record<string, number[]> = {};
  let frames = 0, maxDt = 0, last = performance.now(), winStart = last;
  const section = () => {
    let cur = "hero";
    for (const id of ids) {
      const e = document.getElementById(id);
      if (!e) continue;
      const r = e.getBoundingClientRect();
      if (r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5) cur = id;
    }
    return cur;
  };
  const loop = (now: number) => {
    const dt = now - last; last = now; frames++; if (dt > maxDt) maxDt = dt;
    if (now - winStart >= 500) {
      const fps = Math.round((frames * 1000) / (now - winStart));
      const sec = section();
      (worst[sec] ||= []).push(fps);
      const summary = Object.entries(worst).map(([k, a]) => `${k}: min ${Math.min(...a)}`).join("\n");
      el.textContent = `${fps} fps  max ${Math.round(maxDt)}ms  [${sec}]\n${summary}`;
      frames = 0; maxDt = 0; winStart = now;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
