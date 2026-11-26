import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { GridBackground, MaskReveal, SceneLabel } from "../components/Text";
import { CLAMP, EASE_OUT, PUNCH, SMOOTH, springAt } from "../lib/anim";
import { FONT_STACK_EN, FONT_STACK_JP } from "../lib/fonts";
import { NEUTRAL, useTheme } from "../lib/theme";
import type { ReelProps } from "../schema";

const IMPACT = 16; // 「0」が着地するフレーム

export const Scene2Zero: React.FC<{ data: ReelProps["scene2"] }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const zero = springAt(frame, fps, 6, PUNCH);
  const unit = springAt(frame, fps, IMPACT + 2, { damping: 14, stiffness: 150 });
  const disc = springAt(frame, fps, 2, SMOOTH, 26);
  const underline = interpolate(frame, [30, 44], [0, 1], { ...CLAMP, easing: EASE_OUT });

  return (
    <AbsoluteFill style={{ background: NEUTRAL.white, overflow: "hidden" }}>
      <GridBackground driftY={frame * 0.8} />

      {/* 背景の淡い円（パララックス） */}
      <div style={{ position: "absolute", left: 540 - 400, top: 800 - 400, width: 800, height: 800, borderRadius: 400, background: theme.pale, scale: String(disc), translate: `0 ${-frame * 0.6}px` }} />

      {/* 着地の衝撃リング（フラットなストローク） */}
      {[0, 5].map((d, i) => {
        const r = interpolate(frame, [IMPACT + d, IMPACT + d + 22], [120, 520], { ...CLAMP, easing: EASE_OUT });
        const o = interpolate(frame, [IMPACT + d, IMPACT + d + 22], [1, 0], CLAMP);
        return (
          <svg key={i} width={1080} height={1600} style={{ position: "absolute", left: 0, top: 0 }}>
            <circle cx={540} cy={800} r={r} fill="none" stroke={i === 0 ? theme.blue : theme.navy} strokeWidth={i === 0 ? 8 : 3} opacity={o} />
          </svg>
        );
      })}

      {/* スピード線 */}
      <svg width={1080} height={1600} style={{ position: "absolute", left: 0, top: 0 }}>
        {[-150, -110, -70, 20, 60, 110, 160, 200].map((deg, i) => {
          const t = interpolate(frame, [IMPACT, IMPACT + 12], [0, 1], { ...CLAMP, easing: EASE_OUT });
          const a = (deg * Math.PI) / 180;
          const r0 = 330 + t * 60;
          const r1 = r0 + 70 * (1 - t);
          return (
            <line key={i} x1={540 + Math.cos(a) * r0} y1={800 + Math.sin(a) * r0} x2={540 + Math.cos(a) * r1} y2={800 + Math.sin(a) * r1} stroke={theme.navy} strokeWidth={7} strokeLinecap="round" opacity={t > 0 && t < 1 ? 1 : 0} />
          );
        })}
      </svg>

      <div style={{ position: "absolute", left: 90, top: 290 }}>
        <SceneLabel text={data.label} delay={4} />
      </div>

      {/* 0 円 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, height: 660, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end" }}>
          <div
            style={{
              fontFamily: FONT_STACK_EN,
              fontWeight: 800,
              fontSize: 620,
              lineHeight: 1,
              color: theme.navy,
              letterSpacing: "-0.04em",
              scale: String(interpolate(zero, [0, 1], [3.2, 1])),
              rotate: `${(1 - zero) * -10}deg`,
              opacity: interpolate(frame, [6, 9], [0, 1], CLAMP),
            }}
          >
            {data.amount}
          </div>
          <div style={{ overflow: "hidden", marginLeft: 18, marginBottom: 70 }}>
            <div style={{ fontFamily: FONT_STACK_JP, fontWeight: 900, fontSize: 170, lineHeight: 1.1, color: theme.blue, translate: `${(1 - unit) * 110}% 0` }}>
              {data.unit}
            </div>
          </div>
        </div>
      </div>

      {/* 見出し */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1150, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <MaskReveal delay={20}>
          <div style={{ fontFamily: FONT_STACK_JP, fontWeight: 900, fontSize: 120, color: theme.navy, letterSpacing: "0.04em" }}>{data.title}</div>
        </MaskReveal>
        <div style={{ width: 560 * underline, height: 12, borderRadius: 6, background: theme.blue }} />
      </div>
    </AbsoluteFill>
  );
};
