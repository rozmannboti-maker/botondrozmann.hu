import type { CSSProperties } from "react";

type Props = {
  text: string;
  className: string; // the reveal class for one letter
  delay: number; // seconds before the first letter
  step: number; // seconds between letters
};

/** One inline-block span per letter, each with its own --delay, for letter-by-letter reveals. Hidden from screen
    readers: the parent carries the text as its aria-label. */
export function Letters({ text, className, delay, step }: Props) {
  return (
    <>
      {[...text].map((char, i) => (
        <span
          key={i}
          className={className}
          aria-hidden="true"
          style={{ "--delay": `${(delay + i * step).toFixed(3)}s` } as CSSProperties}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </>
  );
}
