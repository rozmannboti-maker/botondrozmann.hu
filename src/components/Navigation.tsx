import type { Ref } from "react";
import { NAV } from "../data/site";
import styles from "./Navigation.module.css";
import pill from "../styles/pill.module.css";

// The header inverts over the black section through data-inverted, set straight from the
// scroll controller (no React re-render per frame).
export function Navigation({ ref }: { ref: Ref<HTMLElement> }) {
  return (
    <header className={styles.nav} ref={ref}>
      {/* no logo for now; the engine still expects this node (it sets its opacity) */}
      <span data-nav-logo hidden />
      <div className={styles.actions}>
        <a
          className={`${pill.pill} ${pill.accent}`}
          href={NAV.talk.href}
          data-nav-item
        >
          {NAV.talk.label}
        </a>
        <button
          className={`${pill.pill} ${pill.ink}`}
          data-nav-item
          aria-controls="sm-panel"
          onClick={() => (window as Window & { __siteMenu?: { toggle: () => void } }).__siteMenu?.toggle()}
        >
          {NAV.menu}
        </button>
      </div>
    </header>
  );
}
