import { useCallback, useState } from "react";
import { PORTRAIT } from "../data/site";
import { HeroRipple } from "./HeroRipple";
import { Letters } from "./Letters";
import styles from "./PortraitHero.module.css";

const LETTER_STEP = 0.09; // s between letters of the name
const START = { first: 0.2, second: 0.75 }; // s, when each word's first letter starts

type Props = {
  ready: boolean; // loader gone: play the intro
};

// The first screen: a full-screen portrait that ripples under the cursor, the name rising letter by letter over it.
// App's scroll controller sets --out (0..1) on this element while the work ribbon crosses the screen.
export function PortraitHero({ ready }: Props) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const onRipple = useCallback(() => {}, []);

  return (
    <section id="portrait-hero" className={styles.hero} data-ready={ready || undefined}>
      <div className={styles.media}>
        <img
          className={styles.photo}
          src={PORTRAIT.photo}
          alt={PORTRAIT.alt}
          onLoad={(e) => {
            const img = e.currentTarget;
            img.dataset.loaded = "";
            img.decode().catch(() => {}).finally(() => setImage(img));
          }}
        />
        <HeroRipple image={image} onReady={onRipple} />
      </div>
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.frame}>
        <h1 className={styles.name} aria-label={PORTRAIT.name.join(" ")}>
          <span className={styles.first}>
            <Letters text={PORTRAIT.name[0]} className={styles.letter} delay={START.first} step={LETTER_STEP} />
          </span>
          <span className={styles.second}>
            <Letters text={PORTRAIT.name[1]} className={styles.letter} delay={START.second} step={LETTER_STEP} />
          </span>
        </h1>
        <div className={styles.sub}>
          <p>{PORTRAIT.role}</p>
          <p className={styles.spec}>{PORTRAIT.spec}</p>
        </div>
        <a className={styles.cta} href={PORTRAIT.cta.href}>
          {PORTRAIT.cta.label}
        </a>
      </div>
    </section>
  );
}
