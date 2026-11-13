import * as React from "react";
import type { CompanyLogo as Logo } from "@/lib/types";

const ICON_PATHS: Record<Logo["icon"], string> = {
  star: "M0 -9 L2.6 -2.8 L9 -2.8 L3.8 1.2 L5.6 8 L0 4 L-5.6 8 L-3.8 1.2 L-9 -2.8 L-2.6 -2.8 Z",
  spark: "M0 -10 L2 -2 L10 0 L2 2 L0 10 L-2 2 L-10 0 L-2 -2 Z",
  crown: "M-9 6 L-9 -4 L-4.5 0 L0 -7 L4.5 0 L9 -4 L9 6 Z",
  wave: "M-10 2 C-6 -4 -3 -4 0 2 C3 8 6 8 10 2 L10 6 C6 12 3 12 0 6 C-3 0 -6 0 -10 6 Z",
  leaf: "M-8 8 C-8 -4 0 -10 9 -9 C10 0 4 8 -8 8 Z",
  rocket: "M0 -10 C5 -6 6 0 4 6 L-4 6 C-6 0 -5 -6 0 -10 Z M-4 6 L-7 10 L-2 8 Z M4 6 L7 10 L2 8 Z",
};

function shapePath(shape: Logo["shape"]) {
  switch (shape) {
    case "shield":
      return "M50 4 L90 18 V50 C90 74 72 90 50 98 C28 90 10 74 10 50 V18 Z";
    case "hex":
      return "M50 3 L91 26 V74 L50 97 L9 74 V26 Z";
    case "diamond":
      return "M50 2 L96 50 L50 98 L4 50 Z";
    default:
      return "M50 3 A47 47 0 1 1 49.9 3 Z";
  }
}

/** 自動生成された会社ロゴ（SVG） */
export function CompanyLogo({ logo, size = 64, className }: { logo: Logo; size?: number; className?: string }) {
  const id = React.useId().replace(/:/g, "");
  const d = shapePath(logo.shape);
  const textSize = logo.initials.length >= 2 ? 30 : 36;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label="会社ロゴ">
      <defs>
        <linearGradient id={`lg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={logo.secondary} />
          <stop offset="100%" stopColor="#050812" />
        </linearGradient>
        <linearGradient id={`lb${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="40%" stopColor={logo.primary} />
          <stop offset="100%" stopColor={logo.primary} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#lg${id})`} stroke={`url(#lb${id})`} strokeWidth="3.5" />
      <g transform="translate(50 26) scale(0.95)" fill={logo.primary}>
        <path d={ICON_PATHS[logo.icon]} />
      </g>
      <text
        x="50"
        y="66"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Outfit, 'Noto Sans JP', sans-serif"
        fontWeight="800"
        fontSize={textSize}
        fill={logo.primary}
        letterSpacing="1"
      >
        {logo.initials}
      </text>
    </svg>
  );
}
