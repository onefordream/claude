import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { GridBackground, MaskReveal, SceneLabel } from "../components/Text";
import { CLAMP, EASE_OUT, SMOOTH, SNAPPY, springAt } from "../lib/anim";
import { FONT_STACK_EN, FONT_STACK_JP } from "../lib/fonts";
import { NEUTRAL, useTheme } from "../lib/theme";
import type { ReelProps } from "../schema";
import { Easing } from "remotion";

const COUNT_START = 16;
const COUNT_END = 46;

export const Scene3Price: React.FC<{ data: ReelProps["scene3"] }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const panel = interpolate(frame, [4, 20], [0, 1], { ...CLAMP, easing: EASE_OUT });
  const t = interpolate(frame, [COUNT_START, COUNT_END], [0, 1], { ...CLAMP, easing: Easing.bezier(0.25, 0.6, 0.3, 1) });
  // 高速で回る桁感を出すため、途中は 1 の位まで細かく変化させ最後にぴたりと止める
  const value = t >= 1 ? data.price : Math.floor(data.price * t);
  const bump = springAt(frame, fps, COUNT_END, SNAPPY);
  const settled = frame >= COUNT_END;
  const underline = interpolate(frame, [COUNT_END, COUNT_END + 12], [0, 1], { ...CLAMP, easing: EASE_OUT });
  const suffix = springAt(frame, fps, COUNT_END - 4, SMOOTH, 18);

  return (
    <AbsoluteFill style={{ background: NEUTRAL.white, overflow: "hidden" }}>
      <GridBackground driftX={frame * 0.7} />

      {/* 背景の大きな ¥（輪郭のみ・パララックス） */}
      <div style={{ position: "absolute", right: -120, top: 260, fontFamily: FONT_STACK_EN, fontWeight: 800, fontSize: 1100, lineHeight: 1, color: "transparent", WebkitTextStroke: `4px ${NEUTRAL.line}`, translate: `${-frame * 1.2}px 0` }}>
        ¥
      </div>

      <div style={{ position: "absolute", left: 90, top: 290, display: "flex", flexDirection: "column", gap: 26 }}>
        <SceneLabel text={data.label} delay={2} />
        <MaskReveal delay={6}>
          <div style={{ fontFamily: FONT_STACK_JP, fontWeight: 900, fontSize: 112, color: theme.navy, letterSpacing: "0.04em" }}>{data.title}</div>
        </MaskReveal>
      </div>

      {/* 価格パネル（マスクで左から展開） */}
      <div style={{ position: "absolute", left: 70, top: 700, width: 940, height: 440, borderRadius: 40, background: theme.pale, clipPath: `inset(0 ${(1 - panel) * 100}% 0 0 round 40px)` }} />
      <div style={{ position: "absolute", left: 70, top: 700, width: 12, height: 440 * panel, borderRadius: 6, background: theme.blue }} />

      <div style={{ position: "absolute", left: 70, top: 700, width: 940, height: 440, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", scale: String(settled ? interpolate(bump, [0, 1], [1.1, 1]) : 1) }}>
          <div style={{ fontFamily: FONT_STACK_EN, fontWeight: 800, fontSize: 200, lineHeight: 1, color: theme.navy, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", opacity: interpolate(frame, [COUNT_START - 2, COUNT_START + 2], [0, 1], CLAMP) }}>
            {value.toLocaleString("ja-JP")}
          </div>
          <div style={{ overflow: "hidden", marginLeft: 12 }}>
            <div style={{ fontFamily: FONT_STACK_JP, fontWeight: 900, fontSize: 84, color: theme.navy, translate: `0 ${(1 - suffix) * 110}%` }}>{data.suffix}</div>
          </div>
        </div>
        <div style={{ marginTop: 26, width: 640 * underline, height: 14, borderRadius: 7, background: theme.blue }} />
      </div>
    </AbsoluteFill>
  );
};
