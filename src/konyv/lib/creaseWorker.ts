// Háttérszál a ceruza élsimított normáljaihoz (lásd crease.ts).
import { crease, type CreaseInput } from "./crease";

self.onmessage = (e: MessageEvent<{ id: number; input: CreaseInput }>) => {
  const out = crease(e.data.input);
  const transfer = [out.position.buffer, out.normal.buffer, ...Object.values(out.attrs).map((a) => a.array.buffer)];
  (self as unknown as Worker).postMessage({ id: e.data.id, out }, transfer as Transferable[]);
};
