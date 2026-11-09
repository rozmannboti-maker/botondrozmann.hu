import type { Ref } from "react";
import styles from "./Blinds.module.css";

const BLIND_COUNT = 12;
const BARS = Array.from({ length: BLIND_COUNT }, (_, i) => i);

// Horizontal blinds: each bar grows downward; the bars start one after another from the top
// of the screen to the bottom, scrubbed by the scroll.
export function Blinds({ ref }: { ref: Ref<HTMLDivElement> }) {
  return (
    <div className={styles.blinds} ref={ref}>
      {BARS.map((i) => (
        <div
          key={i}
          className={styles.bar}
          style={{ top: `${(i / BLIND_COUNT) * 100}%`, height: `calc(${100 / BLIND_COUNT}% + 1px)` }}
        />
      ))}
    </div>
  );
}
