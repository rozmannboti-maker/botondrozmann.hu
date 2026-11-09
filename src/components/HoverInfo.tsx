import { useState } from "react";
import { ArrowRight } from "./Icons";
import type { Work } from "../data/projects";
import styles from "./HoverInfo.module.css";
import pill from "../styles/pill.module.css";

// The work under the cursor, above the grid. The last one stays rendered while the block
// fades out; a new one rises out of its line masks (keyed spans restart the animation).
export function HoverInfo({ hovered, works }: { hovered: number | null; works: Work[] }) {
  const [shown, setShown] = useState<number | null>(null);
  if (hovered !== null && hovered !== shown) setShown(hovered);
  const visible = hovered !== null;
  const w = shown !== null ? works[shown] : null;
  return (
    <div className={`${styles.info} ${visible ? styles.visible : ""}`} aria-live="polite">
      {w && shown !== null && (
        <>
          <div className={styles.title}>
            <span className="line-mask">
              <span key={`i${shown}`} className={styles.anim}>
                <span className={styles.idx}>[{String(shown + 1).padStart(2, "0")}]</span>{" "}
                <span className={styles.name}>{w.title}</span>
              </span>
            </span>
          </div>
          <p className={styles.desc}>
            <span className="line-mask">
              <span key={`d${shown}`} className={`${styles.anim} ${styles.animDesc}`}>
                {w.summary}
              </span>
            </span>
          </p>
          <a className={`${styles.btn} ${pill.pill} ${pill.ink}`} href={`#${w.slug}`}>
            <ArrowRight className={pill.arrow} /> See full
          </a>
        </>
      )}
    </div>
  );
}
