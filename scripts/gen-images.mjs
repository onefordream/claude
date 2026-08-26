// ============================================================================
// gen-images.mjs — favicon / OGP画像を依存パッケージなしで生成する
// （npm レジストリが利用できない環境のため、Node標準の zlib のみで
//   PNGエンコーダとピクセルフォントを自前実装している）
//
// 生成物はブランドカラーを使った暫定デザイン。プロが仕上げた最終ロゴ／
// OGP画像が用意でき次第、/public/favicon.svg・/public/og-image.png 等を
// 差し替えてください。
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public");

// ---- PNG encoder (RFC 2083 minimal implementation) -------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

// ---- Tiny raster canvas -----------------------------------------------------
class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
  }
  setPixel(x, y, [r, g, b, a = 255]) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    if (a >= 255) {
      this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
      return;
    }
    // alpha blend over existing pixel
    const srcA = a / 255;
    this.data[i] = Math.round(r * srcA + this.data[i] * (1 - srcA));
    this.data[i + 1] = Math.round(g * srcA + this.data[i + 1] * (1 - srcA));
    this.data[i + 2] = Math.round(b * srcA + this.data[i + 2] * (1 - srcA));
    this.data[i + 3] = 255;
  }
  fillRect(x0, y0, w, h, color) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.setPixel(x, y, color);
  }
  fillDiagonalGradient(from, to) {
    const maxD = this.width + this.height;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = (x + y) / maxD;
        this.setPixel(x, y, lerpColor(from, to, t));
      }
    }
  }
  glowCircle(cx, cy, r, color, maxAlpha = 90) {
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(this.height, Math.ceil(cy + r));
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(this.width, Math.ceil(cx + r));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const d = Math.hypot(x - cx, y - cy) / r;
        if (d > 1) continue;
        const a = (1 - d) * maxAlpha;
        this.setPixel(x, y, [...color, a]);
      }
    }
  }
  roundedRectMask(x0, y0, w, h, radius, color) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const inCorner =
          (x < x0 + radius && y < y0 + radius && dist(x, y, x0 + radius, y0 + radius) > radius) ||
          (x >= x0 + w - radius && y < y0 + radius && dist(x, y, x0 + w - radius, y0 + radius) > radius) ||
          (x < x0 + radius && y >= y0 + h - radius && dist(x, y, x0 + radius, y0 + h - radius) > radius) ||
          (x >= x0 + w - radius && y >= y0 + h - radius && dist(x, y, x0 + w - radius, y0 + h - radius) > radius);
        if (!inCorner) this.setPixel(x, y, color);
      }
    }
  }
  toPngBuffer() {
    return encodePng(this.width, this.height, this.data);
  }
}

function dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); }
function lerpColor(a, b, t) {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), 255];
}

// ---- 5x7 pixel font (only glyphs actually used) -----------------------------
const FONT = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  R: ["####.", "#...#", "#...#", "####.", "#..#.", "#...#", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", "#####"],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

function drawText(canvas, text, x, y, scale, color) {
  let cursor = x;
  for (const ch of text.toUpperCase()) {
    const glyph = FONT[ch];
    if (!glyph) { cursor += 4 * scale; continue; }
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === "#") canvas.fillRect(cursor + col * scale, y + row * scale, scale, scale, color);
      }
    }
    cursor += 6 * scale;
  }
  return cursor;
}

function textWidth(text, scale) {
  let w = 0;
  for (const ch of text.toUpperCase()) w += ch === " " || FONT[ch] ? 6 * scale : 4 * scale;
  return w - scale; // no trailing gap
}

// ---- Colors (FEMININE × GOLF × FASHION × PREMIUM palette) --------------------
const WHITE = [255, 255, 255];
const OFFWHITE = [248, 247, 243];
const GOLD = [200, 169, 106];
const GOLD_LIGHT = [228, 211, 172];
const DEEP_GREEN = [22, 55, 44];
const GREEN_DEEP = [12, 32, 25];
const ROSE = [217, 77, 120];

// ---- Build favicon / touch icon ----------------------------------------------
function buildMonogram(size) {
  const c = new Canvas(size, size);
  c.fillDiagonalGradient(GREEN_DEEP, DEEP_GREEN);
  c.glowCircle(size * 0.82, size * 0.14, size * 0.5, GOLD, 55);
  const scale = Math.max(1, Math.round(size / 16));
  const text = "SL";
  const w = textWidth(text, scale);
  const h = 7 * scale;
  drawText(c, text, Math.round((size - w) / 2), Math.round((size - h) / 2), scale, OFFWHITE);
  return c;
}

fs.writeFileSync(path.join(PUBLIC_DIR, "favicon-32.png"), buildMonogram(32).toPngBuffer());
fs.writeFileSync(path.join(PUBLIC_DIR, "apple-touch-icon.png"), buildMonogram(180).toPngBuffer());
fs.writeFileSync(path.join(PUBLIC_DIR, "icon-512.png"), buildMonogram(512).toPngBuffer());

// ---- Build favicon.svg (vector, scales cleanly) -------------------------------
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1F4A3B"/>
      <stop offset="100%" stop-color="#0C2019"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#g)"/>
  <text x="32" y="41" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="500" font-size="26" fill="#F8F7F3">SL</text>
</svg>`;
fs.writeFileSync(path.join(PUBLIC_DIR, "favicon.svg"), faviconSvg, "utf8");

// ---- Build OG image (1200x630) -----------------------------------------------
function buildOgImage() {
  const width = 1200;
  const height = 630;
  const c = new Canvas(width, height);
  c.fillDiagonalGradient(GREEN_DEEP, DEEP_GREEN);
  c.glowCircle(width * 0.92, height * 0.04, 320, GOLD, 40);
  c.glowCircle(width * 0.02, height * 1.02, 280, ROSE, 26);

  const padX = 90;
  let y = 150;

  drawText(c, "2ND", padX, y, 11, GOLD_LIGHT);
  y += 11 * 7 + 26;

  drawText(c, "SHADOW LADIES", padX, y, 10, WHITE);
  y += 10 * 7 + 18;

  drawText(c, "PRO-AM TOURNAMENT", padX, y, 6, WHITE);
  y += 6 * 7 + 46;

  drawText(c, "2026.12.03", padX, y, 7, GOLD_LIGHT);

  // monogram badge
  const badgeSize = 120;
  const bx = width - padX - badgeSize;
  const by = 70;
  for (let yy = 0; yy < badgeSize; yy++) {
    for (let xx = 0; xx < badgeSize; xx++) {
      const dx = xx - badgeSize / 2;
      const dy = yy - badgeSize / 2;
      if (Math.hypot(dx, dy) <= badgeSize / 2) {
        c.setPixel(bx + xx, by + yy, [255, 255, 255, 30]);
      }
    }
  }
  drawText(c, "SL", bx + badgeSize / 2 - textWidth("SL", 6) / 2, by + badgeSize / 2 - 21, 6, WHITE);

  return c;
}

fs.writeFileSync(path.join(PUBLIC_DIR, "og-image.png"), buildOgImage().toPngBuffer());

console.log("Generated favicon-32.png, apple-touch-icon.png, icon-512.png, favicon.svg, og-image.png");
