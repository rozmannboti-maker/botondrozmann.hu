// A HTML fejében indított háttérszálas WebGL-előmelegítés (index.html, referenciak/index.html).
// Videókártya nélküli gépen a böngésző első WebGL-indítása kb. 1 mp; ha a 3D jelenet ezt
// megvárja, a fő szál nem blokkol. Normál eszközön néhány ezredmásodperc.
export function gpuWarm(): Promise<void> {
  return (window as Window & { __gpuWarm?: Promise<void> }).__gpuWarm ?? Promise.resolve();
}
