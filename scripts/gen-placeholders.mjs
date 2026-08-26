// ============================================================================
// gen-placeholders.mjs — ブランドカラーを用いたプレースホルダーSVGを生成する
// 実写真が届いたら、対応するファイルを同名の .jpg/.png 等に差し替えるだけでよい
// （テンプレート側の <img> パスはそのままでOK。拡張子を変える場合はデータ
// ファイル内のパスも更新すること）。
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/images/placeholders");
fs.mkdirSync(OUT_DIR, { recursive: true });

function svgPlaceholder({ width, height, from, to, angle = 135, label, sublabel, dark = true }) {
  const textColor = dark ? "#FFFFFF" : "#3A2A0C";
  const subColor = dark ? "rgba(255,255,255,0.72)" : "rgba(58,42,12,0.7)";
  const id = `g${Math.random().toString(36).slice(2, 8)}`;
  const cx = width / 2;
  const cy = height / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="${id}" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="${id}-glow" cx="50%" cy="20%" r="75%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#${id})"/>
  <rect width="${width}" height="${height}" fill="url(#${id}-glow)"/>
  <circle cx="${width * 0.86}" cy="${height * 0.12}" r="${Math.min(width, height) * 0.22}" fill="#ffffff" opacity="0.08"/>
  <circle cx="${width * 0.1}" cy="${height * 0.92}" r="${Math.min(width, height) * 0.28}" fill="#ffffff" opacity="0.07"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.5">
    <circle cx="${cx}" cy="${cy - height * 0.02}" r="${Math.min(width, height) * 0.1}"/>
  </g>
  <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="'Zen Kaku Gothic New','Noto Sans JP',sans-serif" font-weight="700" font-size="${Math.max(14, Math.min(width, height) * 0.055)}" fill="${textColor}" letter-spacing="2">${label}</text>
  ${
    sublabel
      ? `<text x="${cx}" y="${cy + 6 + Math.max(20, Math.min(width, height) * 0.08)}" text-anchor="middle" font-family="'Noto Sans JP',sans-serif" font-size="${Math.max(11, Math.min(width, height) * 0.032)}" fill="${subColor}">${sublabel}</text>`
      : ""
  }
</svg>`;
}

const PALETTES = {
  rosePurple: { from: "#6C34A0", to: "#E23B72" },
  goldRose: { from: "#BE9448", to: "#E23B72" },
  purpleGreen: { from: "#4F2C8C", to: "#1E9D6C" },
  purpleRose: { from: "#3B1F66", to: "#E23B72" },
  gold: { from: "#8C6C2C", to: "#F1DFAE", dark: false },
  green: { from: "#12734F", to: "#5FC79A" },
  neutral: { from: "#EDE6DA", to: "#F8F3EA", dark: false },
};

const files = [
  // HERO
  { name: "hero-1.svg", width: 640, height: 800, ...PALETTES.rosePurple, label: "HERO IMAGE", sublabel: "PRO_PLAYER_IMAGE 差し替え予定" },
  { name: "hero-2.svg", width: 520, height: 520, ...PALETTES.goldRose, label: "HERO IMAGE", sublabel: "差し替え予定" },
  { name: "hero-3.svg", width: 500, height: 625, ...PALETTES.purpleGreen, label: "HERO IMAGE", sublabel: "差し替え予定" },
  // ABOUT
  { name: "about-1.svg", width: 640, height: 800, ...PALETTES.purpleRose, label: "ABOUT IMAGE", sublabel: "差し替え予定" },
  { name: "about-2.svg", width: 480, height: 480, ...PALETTES.gold, label: "PRO PLAYER", sublabel: "差し替え予定" },
  // PLAYER (generic)
  { name: "player.svg", width: 480, height: 600, ...PALETTES.purpleGreen, label: "PRO PLAYER", sublabel: "IMAGE 差し替え予定" },
  // SPECIAL MC
  { name: "mc.svg", width: 640, height: 800, ...PALETTES.purpleRose, label: "SPECIAL MC", sublabel: "IMAGE 差し替え予定" },
  // PRIZE GIFT
  { name: "gift.svg", width: 480, height: 480, ...PALETTES.gold, label: "参加賞", sublabel: "マーカー写真 差し替え予定" },
  // SPONSOR LOGO
  { name: "sponsor-logo.svg", width: 320, height: 160, ...PALETTES.neutral, label: "SPONSOR LOGO", sublabel: "" },
  // ORGANIZER
  { name: "organizer.svg", width: 480, height: 480, ...PALETTES.green, label: "ORGANIZER", sublabel: "IMAGE 差し替え予定" },
  // VENUE
  { name: "venue.svg", width: 640, height: 480, ...PALETTES.green, label: "VENUE IMAGE", sublabel: "差し替え予定" },
  // FIRST TOURNAMENT GALLERY
  { name: "first-tournament-1.svg", width: 800, height: 1000, ...PALETTES.rosePurple, label: "1st TOURNAMENT", sublabel: "GALLERY 差し替え予定" },
  { name: "first-tournament-2.svg", width: 800, height: 600, ...PALETTES.goldRose, label: "1st TOURNAMENT", sublabel: "GALLERY 差し替え予定" },
  { name: "first-tournament-3.svg", width: 800, height: 800, ...PALETTES.purpleGreen, label: "1st TOURNAMENT", sublabel: "GALLERY 差し替え予定" },
  { name: "first-tournament-4.svg", width: 800, height: 1000, ...PALETTES.purpleRose, label: "1st TOURNAMENT", sublabel: "GALLERY 差し替え予定" },
  { name: "first-tournament-5.svg", width: 800, height: 600, ...PALETTES.green, label: "1st TOURNAMENT", sublabel: "GALLERY 差し替え予定" },
];

for (const f of files) {
  const svg = svgPlaceholder(f);
  fs.writeFileSync(path.join(OUT_DIR, f.name), svg, "utf8");
}

console.log(`Generated ${files.length} placeholder SVGs in ${OUT_DIR}`);
