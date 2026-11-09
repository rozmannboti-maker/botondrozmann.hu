import type { Ref } from "react";
import { ArrowDown } from "./Icons";
import { AberrationDefs } from "./AberrationDefs";
import { FINAL } from "../data/site";
import styles from "./FinalSection.module.css";

// The black section: every line rises out of its mask once the blinds have closed.
export function FinalSection({ ref }: { ref: Ref<HTMLElement> }) {
  return (
    <section className={styles.final} ref={ref} id="about">
      <p className={styles.crumb}>
        <span className="line-mask">
          <span data-final-line>
            <span className={styles.star}>*</span>&nbsp;&nbsp; {FINAL.crumb}
          </span>
        </span>
      </p>
      <p className={styles.aside}>
        {FINAL.aside.map((l) => (
          <span className="line-mask" key={l}>
            <span data-final-line>{l}</span>
          </span>
        ))}
      </p>
      <h2 className={styles.lead}>
        {/* the aberration plays on "Time is money." only */}
        <span className="line-mask">
          <span data-final-line>
            <span className={styles.phrase} data-ca-phrase>
              {FINAL.phrase}
            </span>
            {FINAL.lead[0]}
          </span>
        </span>
        {FINAL.lead.slice(1).map((l) => (
          <span className="line-mask" key={l}>
            <span data-final-line>{l}</span>
          </span>
        ))}
      </h2>
      <AberrationDefs />
      <a className={styles.scroll} href={FINAL.scroll.href}>
        <span className="line-mask">
          <span data-final-line>
            <ArrowDown className={styles.arrow} /> {FINAL.scroll.label}
          </span>
        </span>
      </a>
    </section>
  );
}
