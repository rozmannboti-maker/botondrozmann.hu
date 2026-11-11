// 2026-11-11 (PageSpeed): a three.js toNonIndexed() + toCreasedNormals() pontos másolata tiszta,
// típusos tömbökön, hogy háttérszálon (creaseWorker.ts) futhasson. A ceruza vékony geometriáján a
// three.js változat a fő szálon ~1 mp-ig blokkolt (a 0,01-es kvantálás miatt egy-egy pontcsoporthoz
// ezernyi lap tartozik). Az eredmény bitre azonos, csak máshol számolódik.

export type Attr = { array: Float32Array; itemSize: number };
export type CreaseInput = { position: Float32Array; index: Uint32Array; attrs: Record<string, Attr>; angle: number };
export type CreaseOutput = { position: Float32Array; normal: Float32Array; attrs: Record<string, Attr> };

function deindex(a: Float32Array, itemSize: number, index: Uint32Array) {
  const out = new Float32Array(index.length * itemSize);
  for (let i = 0; i < index.length; i++) {
    const s = index[i] * itemSize, d = i * itemSize;
    for (let k = 0; k < itemSize; k++) out[d + k] = a[s + k];
  }
  return out;
}

export function crease({ position, index, attrs, angle }: CreaseInput): CreaseOutput {
  const positions = deindex(position, 3, index);
  const outAttrs: Record<string, Attr> = {};
  for (const [name, a] of Object.entries(attrs)) outAttrs[name] = { array: deindex(a.array, a.itemSize, index), itemSize: a.itemSize };

  const vertexCount = positions.length / 3;
  const creaseDot = Math.cos(angle);
  const hashMultiplier = (1 + 1e-10) * 1e2;
  const faceCount = vertexCount / 3;

  const faceNormals = new Float64Array(faceCount * 3);
  for (let f = 0; f < faceCount; f++) {
    const f9 = 9 * f;
    const ax = positions[f9 + 0], ay = positions[f9 + 1], az = positions[f9 + 2];
    const bx = positions[f9 + 3], by = positions[f9 + 4], bz = positions[f9 + 5];
    const cx = positions[f9 + 6], cy = positions[f9 + 7], cz = positions[f9 + 8];
    const v1x = cx - bx, v1y = cy - by, v1z = cz - bz;
    const v2x = ax - bx, v2y = ay - by, v2z = az - bz;
    const nx = v1y * v2z - v1z * v2y;
    const ny = v1z * v2x - v1x * v2z;
    const nz = v1x * v2y - v1y * v2x;
    const invLength = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
    faceNormals[3 * f + 0] = nx * invLength;
    faceNormals[3 * f + 1] = ny * invLength;
    faceNormals[3 * f + 2] = nz * invLength;
  }

  const vertexIds = new Int32Array(vertexCount);
  const quantized = new Float64Array(vertexCount * 3);
  let tableSize = 1;
  while (tableSize < vertexCount * 2) tableSize <<= 1;
  const tableMask = tableSize - 1;
  const table = new Int32Array(tableSize);
  let uniqueCount = 0;
  for (let i = 0; i < vertexCount; i++) {
    const i3 = 3 * i;
    const qx = Math.trunc(positions[i3 + 0] * hashMultiplier);
    const qy = Math.trunc(positions[i3 + 1] * hashMultiplier);
    const qz = Math.trunc(positions[i3 + 2] * hashMultiplier);
    let slot = (Math.imul(qx, 73856093) ^ Math.imul(qy, 19349663) ^ Math.imul(qz, 83492791)) & tableMask;
    while (true) {
      const id = table[slot];
      if (id === 0) {
        const q3 = 3 * uniqueCount;
        quantized[q3 + 0] = qx;
        quantized[q3 + 1] = qy;
        quantized[q3 + 2] = qz;
        table[slot] = uniqueCount + 1;
        vertexIds[i] = uniqueCount++;
        break;
      }
      const q3 = 3 * (id - 1);
      if (quantized[q3 + 0] === qx && quantized[q3 + 1] === qy && quantized[q3 + 2] === qz) {
        vertexIds[i] = id - 1;
        break;
      }
      slot = (slot + 1) & tableMask;
    }
  }

  const bucketOffsets = new Int32Array(uniqueCount + 1);
  for (let i = 0; i < vertexCount; i++) bucketOffsets[vertexIds[i] + 1]++;
  for (let i = 0; i < uniqueCount; i++) bucketOffsets[i + 1] += bucketOffsets[i];
  const bucketFaces = new Int32Array(vertexCount);
  const bucketCursors = bucketOffsets.slice(0, uniqueCount);
  for (let f = 0; f < faceCount; f++) {
    const f3 = 3 * f;
    bucketFaces[bucketCursors[vertexIds[f3 + 0]]++] = f;
    bucketFaces[bucketCursors[vertexIds[f3 + 1]]++] = f;
    bucketFaces[bucketCursors[vertexIds[f3 + 2]]++] = f;
  }

  const normal = new Float32Array(vertexCount * 3);
  for (let f = 0; f < faceCount; f++) {
    const f3 = 3 * f;
    const nx = faceNormals[f3 + 0], ny = faceNormals[f3 + 1], nz = faceNormals[f3 + 2];
    for (let n = 0; n < 3; n++) {
      const i = f3 + n;
      const id = vertexIds[i];
      let sumX = 0, sumY = 0, sumZ = 0;
      for (let k = bucketOffsets[id], end = bucketOffsets[id + 1]; k < end; k++) {
        const o3 = 3 * bucketFaces[k];
        const ox = faceNormals[o3 + 0], oy = faceNormals[o3 + 1], oz = faceNormals[o3 + 2];
        if (nx * ox + ny * oy + nz * oz > creaseDot) {
          sumX += ox;
          sumY += oy;
          sumZ += oz;
        }
      }
      const invLength = 1 / (Math.sqrt(sumX * sumX + sumY * sumY + sumZ * sumZ) || 1);
      normal[3 * i + 0] = sumX * invLength;
      normal[3 * i + 1] = sumY * invLength;
      normal[3 * i + 2] = sumZ * invLength;
    }
  }
  return { position: positions, normal, attrs: outAttrs };
}
