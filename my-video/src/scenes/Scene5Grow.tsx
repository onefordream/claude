import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { GridBackground, MaskReveal, SceneLabel } from "../components/Text";
import { CLAMP, EASE_OUT, SNAPPY, springAt } from "../lib/anim";
import { FONT_STACK_JP } from "../lib/fonts";
import { NEUTRAL, tint, useTheme } from "../lib/theme";
import type { ReelProps } from "../schema";

const STEPS = [0.18, 0.3, 0.42, 0.56, 0.72, 0.9];

export const Scene5Grow: React.FC<{ data: ReelProps["scene5"] }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const theme = useTheme();

  // カメラ：わずかにズームアウトしながら上へパン
  const cam = interpolate(frame, [0, durationInFrames], [1.08, 1], { ...CLAMP, easing: EASE_OUT });
  const arrow = interpolate(frame, [30, 70], [0, 1], { ...CLAMP, easing: EASE_OUT });
  const flag = springAt(frame, fps, 66, SNAPPY);
  const tracking = interpolate(frame, [6, 40], [0.22, 0.04], { ...CLAMP, easing: EASE_OUT });

  const baseY = 1420;
  const areaH = 520;
  const left = 110;
  const bw = 112;
  const gap = 26;
  const tops = STEPS.map((h, i) => [left + i * (bw + gap) + bw / 2, baseY - h * areaH - 40] as const);
  const path = `M ${left - 10} ${baseY - 90} ` + tops.map(([x, y]) => `L ${x} ${y}`).join(" ");
  const end = tops[tops.length - 1];

  return (
    <AbsoluteFill style={{ background: NEUTRAL.white, overflow: "hidden" }}>
      <GridBackground driftY={frame * 1.4} driftX={-frame * 0.4} />

      <div style={{ position: "absolute", inset: 0, scale: String(cam), transformOrigin: "50% 80%" }}>
        {/* 階段状に伸びるバー（事業の成長） */}
        {STEPS.map((h, i) => {
          const g = springAt(frame, fps, 14 + i * 6, { damping: 15, stiffness: 120 });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: left + i * (bw + gap),
                top: baseY - h * areaH,
                width: bw,
                height: h * areaH,
                borderRadius: "18px 18px 6px 6px",
                background: i === STEPS.length - 1 ? theme.blue : i % 2 === 0 ? theme.navy : tint(theme.navy, 80),
                transformOrigin: "50% 100%",
                scale: `1 ${g}`,
              }}
            />
          );
        })}
        <div style={{ position: "absolute", left: 80, top: baseY, width: 920, height: 4, borderRadius: 2, background: NEUTRAL.lightGray }} />

        {/* 上昇する矢印 */}
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <path d={path} fill="none" stroke={theme.blue} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - arrow} />
        </svg>
        <div style={{ position: "absolute", left: end[0] - 42, top: end[1] - 120, width: 84, height: 84, borderRadius: 42, background: NEUTRAL.white, border: `8px solid ${theme.blue}`, display: "flex", alignItems: "center", justifyContent: "center", scale: String(flag) }}>
          <svg width={40} height={40} viewBox="0 0 24 24">
            <path d="M6 18 L18 6 M9 6 H18 V15" fill="none" stroke={theme.blue} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* テキスト */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 290, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <SceneLabel text={data.label} delay={2} style={{ marginBottom: 20 }} />
        <MaskReveal delay={6} duration={24}>
          <div style={{ fontFamily: FONT_STACK_JP, fontWeight: 900, fontSize: 128, lineHeight: 1.25, color: theme.navy, letterSpacing: `${tracking}em` }}>{data.line1}</div>
        </MaskReveal>
        <MaskReveal delay={14} duration={24}>
          <div style={{ fontFamily: FONT_STACK_JP, fontWeight: 900, fontSize: 108, lineHeight: 1.25, color: theme.navy, letterSpacing: `${tracking}em`, whiteSpace: "nowrap" }}>{data.line2}</div>
        </MaskReveal>
      </div>
    </AbsoluteFill>
  );
};
