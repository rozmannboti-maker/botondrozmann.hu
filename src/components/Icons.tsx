import { LOGO_PATH, LOGO_VIEWBOX } from "../data/logo";

// The Rozmann Botond mark, terracotta accent
export function Logo() {
  return (
    <svg viewBox={LOGO_VIEWBOX} fill="none" aria-hidden="true">
      <path fill="var(--accent)" d={LOGO_PATH} />
    </svg>
  );
}

const RAYS = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);

export function Sun() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" aria-hidden="true">
      <circle cx="10" cy="10" r="4.4" fill="currentColor" stroke="none" />
      {RAYS.map((a) => (
        <line key={a} x1={10 + Math.cos(a) * 6.6} y1={10 + Math.sin(a) * 6.6} x2={10 + Math.cos(a) * 8.6} y2={10 + Math.sin(a) * 8.6} />
      ))}
    </svg>
  );
}

export function Moon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M12.9 14.6A6.2 6.2 0 0 1 8.6 3.7a6.2 6.2 0 1 0 7.8 8.4 6.1 6.1 0 0 1-3.5 2.5z" />
    </svg>
  );
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <path d="M1.5 7h11M8 2.5 12.5 7 8 11.5" />
    </svg>
  );
}

export function ArrowDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <path d="M7 1.5v11M2.5 8 7 12.5 11.5 8" />
    </svg>
  );
}
