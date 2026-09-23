// Central place for everything that changes when this app is set up for a
// new golf studio. To brand a fresh deployment for a different store:
//   1. Replace public/logo.png with the new studio's logo (same filename)
//   2. Set STUDIO_NAME, APP_TAGLINE and BRAND_COLOR in that store's .env
//      (or as Render environment variables)
// No other code or file needs to change.
//
// This module reads process.env directly, so it loads the local .env file
// itself (idempotent — a no-op once real env vars are already set, e.g. on
// Render) rather than relying on import order elsewhere: ES module imports
// are evaluated before the importing file's own top-level code, so a
// loadEnv() call in server.js would otherwise run too late for this file.
import { loadEnv } from './lib/env.js';
loadEnv();

function hexToHsl(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { h: 152, s: 53, l: 27 }; // fallback: the original SHADOW green
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Derive a light->dark ramp from a single brand color, matching the
// --green-900/700/500/100 tokens the stylesheet already uses.
function deriveColorRamp(baseHex) {
  const { h, s } = hexToHsl(baseHex);
  return {
    dark: hslToHex(h, clamp(s, 30, 70), 15),
    base: baseHex,
    mid: hslToHex(h, clamp(s, 30, 70), 45),
    light: hslToHex(h, clamp(s * 0.6, 15, 45), 93),
  };
}

export const brand = {
  studioName: process.env.STUDIO_NAME || 'GOLF STUDIO SHADOW',
  tagline: process.env.APP_TAGLINE || 'ゴルフ成長AI記録ノート',
  colors: deriveColorRamp(process.env.BRAND_COLOR || '#1b6b4f'),
};
