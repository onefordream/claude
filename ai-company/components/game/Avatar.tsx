import * as React from "react";
import type { EmployeeRole } from "@/lib/types";
import { cn } from "@/lib/utils";

// オリジナルのアニメ調キャラクター（SVG）。役職ごとに外見を変える。

type HairStyle = "long" | "short" | "bob" | "wavy";
interface Look {
  hair: string;
  hairShade: string;
  eye: string;
  outfit: string;
  outfitShade: string;
  accent: string;
  bg: [string, string];
  style: HairStyle;
  glasses?: boolean;
  clip?: boolean;
  earrings?: boolean;
  tie?: boolean;
}

export const LOOKS: Record<EmployeeRole, Look> = {
  secretary: { hair: "#1d2748", hairShade: "#3a4f8f", eye: "#3b82f6", outfit: "#18264f", outfitShade: "#0f1a3a", accent: "#d4af37", bg: ["#1e3a8a", "#0b1226"], style: "long", clip: true },
  planner: { hair: "#3b2a22", hairShade: "#6b4a38", eye: "#c98a1e", outfit: "#2a3346", outfitShade: "#1b2231", accent: "#5b9dff", bg: ["#0f4c5c", "#0b1226"], style: "short", glasses: true, tie: true },
  marketer: { hair: "#7c3a33", hairShade: "#b5625a", eye: "#e0457b", outfit: "#5c1d3a", outfitShade: "#3f1328", accent: "#f3d98b", bg: ["#6b1f4a", "#0b1226"], style: "wavy", earrings: true },
  sales: { hair: "#22252f", hairShade: "#4a5163", eye: "#2f9e7a", outfit: "#1f3b2f", outfitShade: "#142a21", accent: "#9cc3ff", bg: ["#14532d", "#0b1226"], style: "short", tie: true },
  designer: { hair: "#c7a07a", hairShade: "#e8c9a7", eye: "#8b5cf6", outfit: "#3b2f5c", outfitShade: "#271f3f", accent: "#f3d98b", bg: ["#4c1d95", "#0b1226"], style: "bob" },
  developer: { hair: "#101827", hairShade: "#334155", eye: "#22d3ee", outfit: "#1e293b", outfitShade: "#111827", accent: "#22d3ee", bg: ["#164e63", "#0b1226"], style: "short", glasses: true },
  accountant: { hair: "#2b2b2b", hairShade: "#555", eye: "#64748b", outfit: "#2f2f3a", outfitShade: "#1f1f27", accent: "#d4af37", bg: ["#334155", "#0b1226"], style: "short", tie: true },
  hr: { hair: "#e3a1b4", hairShade: "#f5c6d3", eye: "#db2777", outfit: "#4a2c3a", outfitShade: "#331e28", accent: "#fbcfe8", bg: ["#831843", "#0b1226"], style: "long", clip: true },
  support: { hair: "#6b4f2a", hairShade: "#9b7a4a", eye: "#16a34a", outfit: "#22403a", outfitShade: "#162b27", accent: "#86efac", bg: ["#065f46", "#0b1226"], style: "bob" },
  legal: { hair: "#1b1b2f", hairShade: "#3c3c63", eye: "#7c3aed", outfit: "#25213d", outfitShade: "#18152a", accent: "#c4b5fd", bg: ["#312e81", "#0b1226"], style: "long", glasses: true },
  video: { hair: "#b91c1c", hairShade: "#ef4444", eye: "#f97316", outfit: "#3a1f12", outfitShade: "#26140b", accent: "#fdba74", bg: ["#7c2d12", "#0b1226"], style: "short" },
};

export function Avatar({
  role,
  size = 96,
  talking = false,
  happy = false,
  locked = false,
  className,
  framed = true,
}: {
  role: EmployeeRole;
  size?: number;
  talking?: boolean;
  happy?: boolean;
  locked?: boolean;
  className?: string;
  framed?: boolean;
}) {
  const l = LOOKS[role] ?? LOOKS.secretary;
  const id = React.useId().replace(/:/g, "");
  const skin = "#ffe4d2";
  const skinShade = "#f6c9b0";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn("select-none", locked && "opacity-40 grayscale", className)}
      role="img"
      aria-label={`${role} のキャラクター`}
    >
      <defs>
        <radialGradient id={`bg${id}`} cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor={l.bg[0]} />
          <stop offset="100%" stopColor={l.bg[1]} />
        </radialGradient>
        <linearGradient id={`hair${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={l.hairShade} />
          <stop offset="55%" stopColor={l.hair} />
        </linearGradient>
        <linearGradient id={`iris${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1226" />
          <stop offset="55%" stopColor={l.eye} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`suit${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={l.outfit} />
          <stop offset="100%" stopColor={l.outfitShade} />
        </linearGradient>
        <clipPath id={`clip${id}`}>
          <circle cx="100" cy="100" r="100" />
        </clipPath>
      </defs>

      <g clipPath={framed ? `url(#clip${id})` : undefined}>
        {framed && <circle cx="100" cy="100" r="100" fill={`url(#bg${id})`} />}
        {framed && <circle cx="100" cy="100" r="96" fill="none" stroke={l.accent} strokeOpacity="0.35" strokeWidth="2" />}

        {/* 後ろ髪 */}
        {l.style === "long" && (
          <path d="M52 98 C46 48 76 26 100 26 C124 26 154 48 148 98 C150 132 152 156 160 182 L130 182 C134 150 134 124 132 104 L68 104 C66 124 66 150 70 182 L40 182 C48 156 50 132 52 98 Z" fill={`url(#hair${id})`} />
        )}
        {l.style === "wavy" && (
          <path d="M50 100 C44 48 76 26 100 26 C124 26 156 48 150 100 C158 120 146 136 156 152 C164 166 150 180 158 190 L128 186 C136 160 132 128 132 106 L68 106 C68 128 64 160 72 186 L42 190 C50 180 36 166 44 152 C54 136 42 120 50 100 Z" fill={`url(#hair${id})`} />
        )}
        {l.style === "bob" && (
          <path d="M54 96 C50 50 76 30 100 30 C124 30 150 50 146 96 C148 112 148 126 142 138 L124 136 L124 104 L76 104 L76 136 L58 138 C52 126 52 112 54 96 Z" fill={`url(#hair${id})`} />
        )}

        {/* 体・スーツ */}
        <rect x="89" y="126" width="22" height="26" rx="6" fill={skinShade} />
        <path d="M34 210 C38 166 66 146 100 146 C134 146 162 166 166 210 Z" fill={`url(#suit${id})`} />
        <path d="M84 147 L100 176 L116 147 C110 145 90 145 84 147 Z" fill="#f8fafc" />
        <path d="M84 147 L100 176 L90 186 L76 152 Z" fill={l.outfitShade} opacity="0.9" />
        <path d="M116 147 L100 176 L110 186 L124 152 Z" fill={l.outfitShade} opacity="0.9" />
        {l.tie ? (
          <path d="M96 150 L104 150 L106 158 L102 182 L98 182 L94 158 Z" fill={l.accent} />
        ) : (
          <g fill={l.accent}>
            <path d="M100 152 L88 146 L88 160 Z" />
            <path d="M100 152 L112 146 L112 160 Z" />
            <circle cx="100" cy="153" r="3.5" />
          </g>
        )}
        <circle cx="128" cy="170" r="3" fill={l.accent} opacity="0.85" />

        {/* 耳 */}
        <ellipse cx="62" cy="100" rx="6" ry="9" fill={skinShade} />
        <ellipse cx="138" cy="100" rx="6" ry="9" fill={skinShade} />
        {l.earrings && (
          <g fill={l.accent}>
            <circle cx="62" cy="112" r="3" />
            <circle cx="138" cy="112" r="3" />
          </g>
        )}

        {/* 顔 */}
        <path d="M62 90 C62 60 80 44 100 44 C120 44 138 60 138 90 C138 116 122 136 100 139 C78 136 62 116 62 90 Z" fill={skin} />
        <path d="M70 120 C80 134 90 138 100 139 C110 138 120 134 130 120 C122 130 112 135 100 135 C88 135 78 130 70 120 Z" fill={skinShade} opacity="0.5" />

        {/* 頬 */}
        <ellipse cx="77" cy="112" rx="7" ry="3.6" fill="#ff8fa3" opacity={happy ? 0.55 : 0.32} />
        <ellipse cx="123" cy="112" rx="7" ry="3.6" fill="#ff8fa3" opacity={happy ? 0.55 : 0.32} />

        {/* 目 */}
        {happy ? (
          <g stroke="#2a1d1d" strokeWidth="3.2" strokeLinecap="round" fill="none">
            <path d="M75 98 Q84 89 93 98" />
            <path d="M107 98 Q116 89 125 98" />
          </g>
        ) : (
          <g style={{ transformOrigin: "100px 97px" }} className="animate-blink">
            {[84, 116].map((cx) => (
              <g key={cx}>
                <ellipse cx={cx} cy="98" rx="9" ry="10.5" fill="#fff" />
                <ellipse cx={cx} cy="99" rx="7.2" ry="9" fill={`url(#iris${id})`} />
                <ellipse cx={cx} cy="100" rx="3.4" ry="4.6" fill="#0b1226" />
                <circle cx={cx - 3} cy="94.5" r="2.6" fill="#fff" />
                <circle cx={cx + 3} cy="103" r="1.3" fill="#fff" opacity="0.9" />
                <path
                  d={cx < 100 ? `M${cx - 11} 89 Q${cx - 1} 84 ${cx + 9} 91` : `M${cx - 9} 91 Q${cx + 1} 84 ${cx + 11} 89`}
                  stroke="#1f1720"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            ))}
          </g>
        )}
        {/* 眉 */}
        <g stroke={l.hair} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M75 80 Q83 76 91 79" />
          <path d="M109 79 Q117 76 125 80" />
        </g>
        {/* 鼻・口 */}
        <path d="M100 106 L99 110" stroke={skinShade} strokeWidth="2" strokeLinecap="round" />
        {talking ? (
          <ellipse cx="100" cy="121" rx="4.5" ry="3.6" fill="#b4475a" className="animate-talk" style={{ transformOrigin: "100px 121px" }} />
        ) : (
          <path d={happy ? "M92 118 Q100 128 108 118 Z" : "M93 119 Q100 125 107 119"} stroke="#b4475a" strokeWidth="2.4" strokeLinecap="round" fill={happy ? "#d9596f" : "none"} />
        )}

        {/* メガネ */}
        {l.glasses && (
          <g stroke="#1f2937" strokeWidth="2.2" fill="rgba(180,210,255,0.08)">
            <rect x="72" y="88" width="24" height="20" rx="7" />
            <rect x="104" y="88" width="24" height="20" rx="7" />
            <path d="M96 97 L104 97" />
          </g>
        )}

        {/* 前髪 */}
        {l.style === "short" ? (
          <path d="M58 92 C54 52 78 34 100 34 C124 34 148 52 142 92 C138 78 134 70 128 66 C124 74 116 78 108 78 C110 72 110 66 108 62 C100 72 86 78 72 78 C66 80 60 86 58 92 Z" fill={`url(#hair${id})`} />
        ) : (
          <path d="M58 94 C56 54 78 36 100 36 C124 36 146 54 142 94 C138 80 132 70 124 64 C122 76 114 82 104 84 C108 76 108 68 106 62 C98 74 84 82 70 82 C64 84 60 88 58 94 Z" fill={`url(#hair${id})`} />
        )}
        <path d="M80 50 C90 44 104 42 116 46" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* 髪留め */}
        {l.clip && (
          <g transform="translate(126 60) rotate(20)">
            <path d="M0 -7 L2.2 -2.2 L7 0 L2.2 2.2 L0 7 L-2.2 2.2 L-7 0 L-2.2 -2.2 Z" fill={l.accent} />
          </g>
        )}
      </g>
      {locked && (
        <g>
          <circle cx="100" cy="100" r="26" fill="#0b1226" opacity="0.85" />
          <rect x="88" y="98" width="24" height="18" rx="3" fill="#8f9abb" />
          <path d="M92 98 V91 A8 8 0 0 1 108 91 V98" stroke="#8f9abb" strokeWidth="4" fill="none" />
        </g>
      )}
    </svg>
  );
}
