import { useState, type MouseEvent } from "react";
import { posterUrl } from "../data/projects";
import { ABOUT, CONTACT, PROCESS, PROJECTS, SERVICES } from "../data/content";
import styles from "./Sections.module.css";

// A hero alatti rész: a régi oldal tartalma, újraírva (nem a klónozott kód).
export function Sections() {
  const [hover, setHover] = useState<{ slug: string; x: number; y: number } | null>(null);
  const onMove = (slug: string | null) => (e: MouseEvent) =>
    setHover(slug ? { slug, x: e.clientX, y: e.clientY } : null);

  return (
    <div className={styles.page}>
      <section className={styles.about} id="about">
        <p className={styles.statement}>
          {ABOUT.statement[0]} <em>{ABOUT.statement[1]}</em> {ABOUT.statement[2]}
        </p>
        <p className={styles.sub}>{ABOUT.sub}</p>
      </section>

      <section className={styles.block} id="projects">
        <h2 className={styles.label}>Munkáim</h2>
        <ul className={styles.projects}>
          {PROJECTS.map((p) => (
            <li
              key={p.name}
              onMouseEnter={onMove(p.slug)}
              onMouseMove={onMove(p.slug)}
              onMouseLeave={onMove(null)}
            >
              <span className={styles.projName}>{p.name}</span>
              <span className={styles.projKind}>{p.kind}</span>
              <span className={styles.projDate}>{p.date}</span>
            </li>
          ))}
        </ul>
        {hover && hover.slug && (
          <img
            className={styles.preview}
            src={posterUrl(hover.slug, 960)}
            alt=""
            style={{ left: hover.x, top: hover.y }}
          />
        )}
      </section>

      <section className={styles.block} id="services">
        <h2 className={styles.label}>Szolgáltatások</h2>
        <ul className={styles.services}>
          {SERVICES.map((s, i) => (
            <li key={s.name}>
              <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.svcName}>{s.name}</span>
              <span className={styles.svcText}>{s.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.block} id="process">
        <h2 className={styles.heading}>
          Így dolgozom. <em>Kezdéstől az élesítésig.</em>
        </h2>
        <ol className={styles.steps}>
          {PROCESS.map((s, i) => (
            <li key={s.name}>
              <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.name}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${styles.block} ${styles.contact}`} id="contact">
        <h2 className={styles.label}>Kapcsolat</h2>
        <p className={styles.dispo}>{CONTACT.lines[0]}</p>
        <p className={styles.dispo}>{CONTACT.lines[1]}</p>
        <a className={styles.mail} href={`mailto:${CONTACT.email}`}>
          {CONTACT.email}
        </a>
        <nav className={styles.socials} aria-label="Közösségi média">
          {CONTACT.socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
        </nav>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footMeta}>
          <span>© 2026</span>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </div>
        <div className={styles.footName} aria-hidden="true">
          Rozmann <em>Botond</em>.
        </div>
      </footer>
    </div>
  );
}
