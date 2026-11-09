import { useEffect, useRef, type RefObject } from "react";
import { CASES, caseMedia } from "../data/cases";
import { PRINT, STUDIO } from "../data/studio";
import { quality } from "../lib/quality";
import { startScene } from "../lib/scene";
import styles from "./Stage.module.css";

type Props = {
  ready: boolean;
  hero: RefObject<HTMLElement | null>;
  header: RefObject<HTMLElement | null>;
  onReady: () => void;
  onOpenChange: (open: boolean) => void;
};

// The WebGL book scene (created inside `host`) and the vignette over it.
export function Stage({ ready, hero, header, onReady, onOpenChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onOpenChange });
  callbacks.current = { onReady, onOpenChange };

  useEffect(() => {
    if (!host.current || !hero.current || !header.current) return;
    return startScene({
      host: host.current,
      canvasClass: styles.canvas,
      label: `${STUDIO.name} portfolio, an interactive 3D book on a table. Hover a page to play its video; click or drag pages to turn them, or use the arrow keys.`,
      hero: hero.current,
      header: header.current,
      cases: CASES.map((c) => ({ ...c, ...caseMedia(c, quality.phoneVideo) })),
      brand: { logo: STUDIO.logo, mark: STUDIO.mark, bg: STUDIO.cover, cover: STUDIO.coverImage },
      print: PRINT,
      onReady: () => callbacks.current.onReady(),
      onOpenChange: (open) => callbacks.current.onOpenChange(open),
    });
  }, [hero, header]);

  return (
    <>
      <div ref={host} className={styles.host} data-ready={ready || undefined} />
      <div className={styles.vignette} />
    </>
  );
}
