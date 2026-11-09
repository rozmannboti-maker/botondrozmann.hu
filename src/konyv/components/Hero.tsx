import type { Ref } from "react";
import { HERO } from "../data/studio";
import styles from "./Hero.module.css";

// hidden: before the scene is ready · shown: book closed · away: book open
export function Hero({ ref, state }: { ref: Ref<HTMLElement>; state: "hidden" | "shown" | "away" }) {
  return (
    <section ref={ref} className={`${styles.hero} ${styles[state]}`}>
      <h1>{HERO.title}</h1>
      <p>{HERO.text}</p>
    </section>
  );
}
