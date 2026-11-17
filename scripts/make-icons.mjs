// Genera los iconos PNG de la PWA sin dependencias (solo zlib de Node).
// Uso: npm run icons
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(out, { recursive: true });

// ---- PNG mínimo -----------------------------------------------------------
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const png = (w, h, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

// ---- Dibujo (coordenadas 0..1) -------------------------------------------
// distancia con signo a un rectángulo redondeado
const sdRR = (px, py, x0, y0, x1, y1, r) => {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const hx = (x1 - x0) / 2 - r, hy = (y1 - y0) / 2 - r;
  const dx = Math.max(Math.abs(px - cx) - hx, 0);
  const dy = Math.max(Math.abs(py - cy) - hy, 0);
  return Math.hypot(dx, dy) - r;
};
const lerp = (a, b, t) => a + (b - a) * t;
const C1 = [255, 154, 77], C2 = [242, 107, 29];

function render(size, { rounded, glyphScale }) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 4; // supersampling
  const s = glyphScale;
  // transforma coordenadas del glifo respecto al centro
  const g = (v) => 0.5 + (v - 0.5) * s;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, gg = 0, b = 0, a = 0;
      for (let j = 0; j < SS; j++) {
        for (let i = 0; i < SS; i++) {
          const px = (x + (i + 0.5) / SS) / size;
          const py = (y + (j + 0.5) / SS) / size;
          const inBg = rounded ? sdRR(px, py, 0, 0, 1, 1, 0.22) <= 0 : true;
          if (!inBg) continue;
          const t = (px + py) / 2;
          let col = [lerp(C1[0], C2[0], t), lerp(C1[1], C2[1], t), lerp(C1[2], C2[2], t)];
          // solapa trasera
          if (sdRR(px, py, g(0.28), g(0.27), g(0.70), g(0.33), 0.025 * s) <= 0)
            col = col.map((c) => lerp(c, 255, 0.7));
          // cuerpo de la cartera
          if (sdRR(px, py, g(0.24), g(0.34), g(0.76), g(0.70), 0.08 * s) <= 0) {
            col = [255, 255, 255];
            // broche
            if (sdRR(px, py, g(0.52), g(0.45), g(0.78), g(0.57), 0.06 * s) <= 0)
              col = [lerp(C1[0], C2[0], t) + 4, lerp(C1[1], C2[1], t) + 8, lerp(C1[2], C2[2], t) + 8];
            if (Math.hypot(px - g(0.60), py - g(0.51)) <= 0.026 * s) col = [255, 255, 255];
          }
          r += col[0]; gg += col[1]; b += col[2]; a += 255;
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      const cnt = a / 255;
      buf[o] = cnt ? Math.min(255, Math.round(r / cnt)) : 0;
      buf[o + 1] = cnt ? Math.min(255, Math.round(gg / cnt)) : 0;
      buf[o + 2] = cnt ? Math.min(255, Math.round(b / cnt)) : 0;
      buf[o + 3] = Math.round((a / n));
    }
  }
  return png(size, size, buf);
}

const jobs = [
  ['icon-192.png', 192, { rounded: true, glyphScale: 1 }],
  ['icon-512.png', 512, { rounded: true, glyphScale: 1 }],
  ['icon-maskable-512.png', 512, { rounded: false, glyphScale: 0.8 }],
  ['apple-touch-icon.png', 180, { rounded: false, glyphScale: 0.9 }],
];
for (const [name, size, opt] of jobs) {
  writeFileSync(join(out, name), render(size, opt));
  console.log('✔', name);
}
