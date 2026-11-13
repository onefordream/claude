import type { CompanyLogo } from "@/lib/types";

// 会社ロゴの自動生成（テンプレート＋SVG）。社名から決定的に生成する。

const PALETTES: [string, string][] = [
  ["#d4af37", "#1e3a8a"],
  ["#60a5fa", "#0f172a"],
  ["#f5d78e", "#7c2d12"],
  ["#5eead4", "#134e4a"],
  ["#c4b5fd", "#312e81"],
  ["#fda4af", "#4c0519"],
  ["#fcd34d", "#1e293b"],
  ["#93c5fd", "#1e1b4b"],
];
const SHAPES: CompanyLogo["shape"][] = ["shield", "hex", "circle", "diamond"];
const ICONS: CompanyLogo["icon"][] = ["star", "spark", "crown", "wave", "leaf", "rocket"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function initialsFor(name: string): string {
  const trimmed = name.replace(/(株式会社|合同会社|有限会社|\s)/g, "");
  const latin = trimmed.match(/[A-Za-z0-9]+/g);
  if (latin && latin.join("").length >= 2) {
    const words = name.match(/[A-Za-z0-9]+/g) ?? [];
    if (words.length >= 2) return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
    return latin.join("").slice(0, 2).toUpperCase();
  }
  return Array.from(trimmed).slice(0, 1).join("") || "AI";
}

export function generateLogo(name: string): CompanyLogo {
  const h = hash(name || "AI COMPANY");
  const [primary, secondary] = PALETTES[h % PALETTES.length];
  return {
    initials: initialsFor(name),
    primary,
    secondary,
    shape: SHAPES[(h >>> 3) % SHAPES.length],
    icon: ICONS[(h >>> 7) % ICONS.length],
  };
}

export function isValidLogo(v: unknown): v is CompanyLogo {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const hex = /^#[0-9a-fA-F]{6}$/;
  return (
    typeof o.initials === "string" &&
    o.initials.length <= 4 &&
    typeof o.primary === "string" &&
    hex.test(o.primary) &&
    typeof o.secondary === "string" &&
    hex.test(o.secondary) &&
    SHAPES.includes(o.shape as CompanyLogo["shape"]) &&
    ICONS.includes(o.icon as CompanyLogo["icon"])
  );
}
