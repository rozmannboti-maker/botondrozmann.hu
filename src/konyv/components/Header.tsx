import { useEffect, type Ref } from "react";
import { NAV } from "../../data/site";
import pill from "../../styles/pill.module.css";
import menuHtml from "../../old/site-menu.html?raw";
import { initSiteMenu } from "../../old/site-menu";
import { STUDIO } from "../data/studio";
import styles from "./Header.module.css";

// 2026-11-06: ugyanaz a "Beszéljünk" + "Menü" pár és ugyanaz a kinyíló menü, mint a főoldalon.
// A főoldal tokenjeit (--u, --pill-h, színek) a .top saját magának állítja be, mert a könyv
// :root-változói (--edge, --muted, --bg) más jelentésűek. The scene measures this element
// (the open book sits below it).
export function Header({ ref }: { ref: Ref<HTMLElement> }) {
  useEffect(() => initSiteMenu(), []);
  return (
    <>
      <header ref={ref} className={styles.top}>
        <a className={styles.home} href={STUDIO.home}>
          ← Főoldal
        </a>
        <div className={styles.actions}>
          <a className={`${pill.pill} ${pill.accent}`} href={NAV.talk.href}>
            {NAV.talk.label}
          </a>
          <button
            className={`${pill.pill} ${pill.ink}`}
            aria-controls="sm-panel"
            onClick={() => (window as Window & { __siteMenu?: { toggle: () => void } }).__siteMenu?.toggle()}
          >
            {NAV.menu}
          </button>
        </div>
      </header>
      {/* a főoldal menüje (#site-menu, fixed); a menüpontok innen a főoldal szekcióira visznek */}
      <div dangerouslySetInnerHTML={{ __html: menuHtml }} />
    </>
  );
}
