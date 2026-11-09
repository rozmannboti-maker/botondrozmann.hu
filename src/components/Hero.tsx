import { Fragment, type Ref } from "react";
import { HERO, joined } from "../data/site";
import styles from "./Hero.module.css";

// The DOM lines set the type (size, tracking, position). The text itself (headlines and
// subheading) is drawn in the WebGL scene as planes at z = 0: the far part of the ribbon
// passes behind them, the near loop in front.
export function Hero({
  rootRef,
  line1Ref,
  line2Ref,
  subRef,
}: {
  rootRef: Ref<HTMLDivElement>;
  line1Ref: Ref<HTMLHeadingElement>;
  line2Ref: Ref<HTMLParagraphElement>;
  subRef: Ref<HTMLParagraphElement>;
}) {
  return (
    <>
      <div className={styles.dom} ref={rootRef}>
        <h1 className={`${styles.line} ${styles.line1}`} ref={line1Ref} aria-label={joined(HERO.line1)}>
          <span className={styles.sans}>{HERO.line1[0]}</span>
          <span className={styles.serif}>{HERO.line1[1]}</span>
        </h1>
        <p className={`${styles.line} ${styles.line2}`} ref={line2Ref} aria-label={joined(HERO.line2)}>
          <span className={styles.sans}>{HERO.line2[0]}</span>
          <span className={styles.serif}>{HERO.line2[1]}</span>
        </p>
      </div>
      <p className={styles.sub} ref={subRef} aria-label={joined(HERO.sub)}>
        {HERO.sub.map((l, i) => (
          <Fragment key={l}>
            {i > 0 && <br />}
            <span>{l}</span>
          </Fragment>
        ))}
      </p>
    </>
  );
}
