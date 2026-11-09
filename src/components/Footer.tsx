import type { Ref } from "react";
import { FOOTER, joined } from "../data/site";
import styles from "./Footer.module.css";
import pill from "../styles/pill.module.css";

// The note rises line by line in the intro; at the grid, "Visit our socials:" slides left and
// "& Subscribe <3" appears (App's master timeline).
export function Footer({ ref }: { ref: Ref<HTMLElement> }) {
  return (
    <footer className={styles.footer} ref={ref}>
      <p className={styles.note} aria-label={joined(FOOTER.note)}>
        {FOOTER.note.map((l) => (
          <span className="line-mask" key={l}>
            <span data-note-line>{l}</span>
          </span>
        ))}
      </p>
      <div className={styles.socials}>
        <div className={styles.labels} data-labels>
          {/* the outer span slides (--slide, CSS), the inner one rises in the intro (GSAP) */}
          <span className={styles.visit} data-visit-slide>
            <span data-visit>{FOOTER.visit}</span>
          </span>
          <span data-amp>&amp;</span>
          <a href={FOOTER.subscribe.href} data-sub>
            {FOOTER.subscribe.label}
          </a>
        </div>
        <div className={styles.btns}>
          {FOOTER.socials.map((s) => (
            <a className={`${pill.pill} ${pill.outline}`} href={s.href} key={s.label} data-social>
              → {s.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
