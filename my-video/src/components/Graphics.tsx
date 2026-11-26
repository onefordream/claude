import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP, EASE_OUT, SMOOTH, SNAPPY, springAt } from "../lib/anim";
import { FONT_STACK_EN, FONT_STACK_JP } from "../lib/fonts";
import { NEUTRAL, tint, useTheme } from "../lib/theme";

/** 4点の星形（AI のきらめき） */
const Sparkle: React.FC<{ size: number; color: string; style?: React.CSSProperties }> = ({ size, color, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", ...style }}>
    <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill={color} />
  </svg>
);

/** AI アイコン（ポップして、リングがゆっくり回転） */
export const AiBadge: React.FC<{ delay: number; style?: React.CSSProperties }> = ({ delay, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const p = springAt(frame, fps, delay, SNAPPY);
  const s1 = springAt(frame, fps, delay + 8, SNAPPY);
  const s2 = springAt(frame, fps, delay + 12, SNAPPY);
  return (
    <div style={{ position: "absolute", width: 190, height: 190, scale: String(p), ...style }}>
      <svg width={190} height={190} style={{ position: "absolute", rotate: `${(frame - delay) * 1.2}deg` }}>
        <circle cx={95} cy={95} r={90} fill="none" stroke={theme.blue} strokeWidth={3} strokeDasharray="10 12" />
      </svg>
      <div style={{ position: "absolute", left: 20, top: 20, width: 150, height: 150, borderRadius: 75, background: theme.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_STACK_EN, fontWeight: 800, fontSize: 64, color: NEUTRAL.white, letterSpacing: "0.02em", boxShadow: "0 18px 40px rgba(11,31,68,0.22)" }}>
        AI
      </div>
      <Sparkle size={44} color={theme.blue} style={{ right: -6, top: 4, scale: String(s1), rotate: `${(1 - s1) * -90}deg` }} />
      <Sparkle size={26} color={theme.blue} style={{ left: -4, bottom: 18, scale: String(s2) }} />
    </div>
  );
};

/** 伸びる棒グラフ + 折れ線 */
export const GrowthChartCard: React.FC<{
  delay: number;
  title: string;
  style?: React.CSSProperties;
}> = ({ delay, title, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const heights = [0.22, 0.34, 0.48, 0.66, 0.92];
  const W = 420;
  const H = 210;
  const gap = 22;
  const bw = (W - gap * (heights.length - 1)) / heights.length;
  const pts = heights.map((h, i) => [i * (bw + gap) + bw / 2, H - h * H - 20] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const line = interpolate(frame, [delay + 14, delay + 40], [0, 1], { ...CLAMP, easing: EASE_OUT });
  const chip = springAt(frame, fps, delay + 36, SNAPPY);
  return (
    <div style={{ position: "absolute", width: 480, height: 330, borderRadius: 28, background: NEUTRAL.white, boxShadow: "0 26px 56px rgba(11,31,68,0.16), 0 0 0 1.5px rgba(11,31,68,0.05)", padding: "26px 30px", ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: FONT_STACK_JP, fontWeight: 700, fontSize: 26, color: theme.navy }}>{title}</div>
        <div style={{ scale: String(chip), padding: "6px 14px", borderRadius: 16, background: tint(theme.blue, 14), color: theme.blue, fontFamily: FONT_STACK_EN, fontWeight: 800, fontSize: 20 }}>
          ↗ UP
        </div>
      </div>
      <svg width={W} height={H} style={{ marginTop: 26, overflow: "visible" }}>
        <line x1={0} x2={W} y1={H} y2={H} stroke={NEUTRAL.line} strokeWidth={2} />
        {heights.map((h, i) => {
          const g = springAt(frame, fps, delay + 4 + i * 4, SMOOTH, 24);
          const bh = h * H * g;
          return (
            <rect key={i} x={i * (bw + gap)} y={H - bh} width={bw} height={bh} rx={8} fill={i === heights.length - 1 ? theme.blue : tint(theme.blue, 22 + i * 8)} />
          );
        })}
        <path d={d} fill="none" stroke={theme.navy} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - line} />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={8} fill={NEUTRAL.white} stroke={theme.navy} strokeWidth={4} opacity={line >= i / (pts.length - 1) ? 1 : 0} />
        ))}
      </svg>
    </div>
  );
};

/** 通知カード */
export const NotifyCard: React.FC<{ delay: number; text: string; style?: React.CSSProperties }> = ({ delay, text, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const p = springAt(frame, fps, delay, SNAPPY);
  return (
    <div style={{ position: "absolute", display: "flex", alignItems: "center", gap: 16, padding: "18px 26px 18px 18px", borderRadius: 24, background: NEUTRAL.white, boxShadow: "0 20px 44px rgba(11,31,68,0.16), 0 0 0 1.5px rgba(11,31,68,0.05)", translate: `${(1 - p) * 260}px 0`, opacity: interpolate(p, [0, 0.3], [0, 1], CLAMP), ...style }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: theme.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={28} height={28} viewBox="0 0 24 24">
          <path d="M4 6h16v12H4z" fill="none" stroke="white" strokeWidth={2.2} strokeLinejoin="round" />
          <path d="M4 7l8 6 8-6" fill="none" stroke="white" strokeWidth={2.2} strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ fontFamily: FONT_STACK_JP, fontWeight: 700, fontSize: 28, color: theme.navy, whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
};
