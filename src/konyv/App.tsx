import { useRef, useState } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Stage } from "./components/Stage";
import styles from "./App.module.css";

export function App() {
  const [ready, setReady] = useState(false); // fonts, logo and posters loaded, first frame drawn
  const [open, setOpen] = useState(false); // the book is (heading to) open
  const hero = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null);

  return (
    <>
      <div className={styles.ui}>
        <Header ref={header} />
      </div>
      <div className={styles.heroWrap}>
        <Stage ready={ready} hero={hero} header={header} onReady={() => setReady(true)} onOpenChange={setOpen} />
        <Hero ref={hero} state={!ready ? "hidden" : open ? "away" : "shown"} />
      </div>
    </>
  );
}
