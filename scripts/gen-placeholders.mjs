// ============================================================================
// gen-placeholders.mjs — ブランドカラーを用いたプレースホルダーSVGを生成する
// 実写真（または許諾済みのAI生成写真）が届いたら、対応するファイルを同名の
// .jpg/.png 等に差し替えるだけでよい（テンプレート側の <img> パスはそのまま
// でOK。拡張子を変える場合はデータファイル内のパスも更新すること）。
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/images/placeholders");
fs.mkdirSync(OUT_DIR, { recursive: true });

// 上品でエディトリアルな雰囲気のプレースホルダー：
// 対角グラデーション + ごく薄いヴィネット + 極細フレーム線 + 小さなレタースペース文字
function svgPlaceholder({ width, height, from, to, angle = 130, label, sublabel, dark = true }) {
  const textColor = dark ? "#FFFFFF" : "#16372C";
  const subColor = dark ? "rgba(255,255,255,0.68)" : "rgba(22,55,44,0.62)";
  const ruleColor = dark ? "rgba(200,169,106,0.85)" : "rgba(147,116,62,0.7)";
  const id = `g${Math.random().toString(36).slice(2, 8)}`;
  const cx = width / 2;
  const cy = height / 2;
  const inset = Math.min(width, height) * 0.045;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="${id}" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="${id}-vg" cx="50%" cy="42%" r="72%">
      <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.16"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#${id})"/>
  <rect width="${width}" height="${height}" fill="url(#${id}-vg)"/>
  <rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" fill="none" stroke="${ruleColor}" stroke-opacity="0.55" stroke-width="1"/>
  <line x1="${cx - 26}" y1="${cy - 14}" x2="${cx + 26}" y2="${cy - 14}" stroke="${ruleColor}" stroke-width="1"/>
  <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-family="'Zen Kaku Gothic New','Noto Sans JP',sans-serif" font-weight="700" font-size="${Math.max(13, Math.min(width, height) * 0.042)}" fill="${textColor}" letter-spacing="3">${label}</text>
  ${
    sublabel
      ? `<text x="${cx}" y="${cy + 10 + Math.max(20, Math.min(width, height) * 0.07)}" text-anchor="middle" font-family="'Noto Sans JP',sans-serif" font-size="${Math.max(10, Math.min(width, height) * 0.026)}" fill="${subColor}">${sublabel}</text>`
      : ""
  }
</svg>`;
}

// HERO全面背景用：横長のエディトリアルな写真プレースホルダー。
// 額縁は付けず、実写に差し替えたときそのまま全面写真になる構成にする。
function svgHeroBg({ width, height }) {
  const id = `hb${Math.random().toString(36).slice(2, 8)}`;
  const spotX = width * 0.68;
  const spotY = height * 0.42;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="HERO_IMAGE placeholder">
  <defs>
    <linearGradient id="${id}" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="#1F4A3B"/>
      <stop offset="50%" stop-color="#16372C"/>
      <stop offset="100%" stop-color="#0C2019"/>
    </linearGradient>
    <radialGradient id="${id}-spot" cx="${(spotX / width) * 100}%" cy="${(spotY / height) * 100}%" r="55%">
      <stop offset="0%" stop-color="#E4D3AC" stop-opacity="0.28"/>
      <stop offset="60%" stop-color="#E4D3AC" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#E4D3AC" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id}-vg" cx="50%" cy="42%" r="78%">
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.3"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#${id})"/>
  <rect width="${width}" height="${height}" fill="url(#${id}-spot)"/>
  <rect width="${width}" height="${height}" fill="url(#${id}-vg)"/>
  <text x="${width - 28}" y="${height - 26}" text-anchor="end" font-family="'Zen Kaku Gothic New','Noto Sans JP',sans-serif" font-weight="700" font-size="${Math.max(13, width * 0.013)}" fill="#F8F7F3" fill-opacity="0.85" letter-spacing="2">HERO IMAGE — 差し替え予定</text>
</svg>`;
}

const PALETTES = {
  deepGreen: { from: "#1F4A3B", to: "#0C2019" },
  roseGold: { from: "#B93862", to: "#93743E" },
  greenGold: { from: "#16372C", to: "#93743E" },
  roseGreen: { from: "#B93862", to: "#16372C" },
  gold: { from: "#93743E", to: "#E4D3AC", dark: false },
  blush: { from: "#F4D7DF", to: "#FDF8F5", dark: false },
  neutral: { from: "#EEF1EC", to: "#F8F7F3", dark: false },
};

const files = [
  // ABOUT
  { name: "about-1.svg", width: 640, height: 800, ...PALETTES.deepGreen, label: "ABOUT IMAGE", sublabel: "差し替え予定" },
  { name: "about-2.svg", width: 480, height: 480, ...PALETTES.roseGold, label: "PRO PLAYER", sublabel: "差し替え予定" },
  { name: "about-3.svg", width: 360, height: 360, ...PALETTES.gold, label: "VENUE", sublabel: "差し替え予定" },
  // PLAYER (generic)
  { name: "player.svg", width: 480, height: 600, ...PALETTES.greenGold, label: "PRO PLAYER", sublabel: "IMAGE 差し替え予定" },
  // SPECIAL MC
  { name: "mc.svg", width: 640, height: 800, ...PALETTES.roseGreen, label: "SPECIAL MC", sublabel: "IMAGE 差し替え予定" },
  // PRIZE GIFT
  { name: "gift.svg", width: 480, height: 480, ...PALETTES.gold, label: "参加賞", sublabel: "マーカー写真 差し替え予定" },
  // SPONSOR LOGO
  { name: "sponsor-logo.svg", width: 320, height: 160, ...PALETTES.neutral, label: "SPONSOR LOGO", sublabel: "" },
  // ORGANIZER
  { name: "organizer.svg", width: 480, height: 480, ...PALETTES.deepGreen, label: "ORGANIZER", sublabel: "IMAGE 差し替え予定" },
  // VENUE
  { name: "venue.svg", width: 640, height: 480, ...PALETTES.deepGreen, label: "VENUE IMAGE", sublabel: "差し替え予定" },
  // FIRST TOURNAMENT GALLERY
  { name: "first-tournament-1.svg", width: 800, height: 1000, ...PALETTES.deepGreen, label: "1st TOURNAMENT", sublabel: "GALLERY 差し替え予定" },
  { name: "first-tournament-2.svg", width: 800, height: 600, ...PALETTES.roseGold, label: "1st TOURNAMENT", sublabel: "GALLERY 差し替え予定" },
  { name: "first-tournament-3.svg", width: 800, height: 800, ...PALETTES.greenGold, label: "1st TOURNAMENT", sublabel: "GALLERY 差し替え予定" },
  { name: "first-tournament-4.svg", width: 800, height: 1000, ...PALETTES.roseGreen, label: "1st TOURNAMENT", sublabel: "GALLERY 差し替え予定" },
  { name: "first-tournament-5.svg", width: 800, height: 600, ...PALETTES.deepGreen, label: "1st TOURNAMENT", sublabel: "GALLERY 差し替え予定" },
];

for (const f of files) {
  fs.writeFileSync(path.join(OUT_DIR, f.name), svgPlaceholder(f), "utf8");
}

fs.writeFileSync(path.join(OUT_DIR, "hero-bg.svg"), svgHeroBg({ width: 1920, height: 1200 }), "utf8");

console.log(`Generated ${files.length + 1} placeholder SVGs in ${OUT_DIR}`);
