import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP, SMOOTH, SNAPPY, springAt } from "../lib/anim";
import { FONT_STACK_EN } from "../lib/fonts";
import { NEUTRAL, useTheme } from "../lib/theme";

/** マスクの内側からスライドして現れるテキスト行 */
export const MaskReveal: React.FC<{
  delay: number;
  children: React.ReactNode;
  from?: "bottom" | "top";
  duration?: number;
  style?: React.CSSProperties;
}> = ({ delay, children, from = "bottom", duration = 20, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springAt(frame, fps, delay, SMOOTH, duration);
  const dir = from === "bottom" ? 1 : -1;
  return (
    <div
      style={{
        overflow: "hidden",
        padding: "0.06em 0.04em 0.12em",
        margin: "-0.06em -0.04em -0.12em",
        ...style,
      }}
    >
      <div style={{ translate: `0 ${(1 - p) * 115 * dir}%` }}>{children}</div>
    </div>
  );
};

/** 1文字ずつスプリングで立ち上がる見出し */
export const CharStagger: React.FC<{
  text: string;
  delay: number;
  stagger?: number;
  style?: React.CSSProperties;
}> = ({ text, delay, stagger = 2, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", whiteSpace: "pre", ...style }}>
      {Array.from(text).map((ch, i) => {
        const p = springAt(frame, fps, delay + i * stagger, SNAPPY);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: interpolate(p, [0, 0.4], [0, 1], CLAMP),
              translate: `0 ${(1 - p) * 70}px`,
              scale: String(0.7 + 0.3 * p),
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/** 英字の小見出し（ブルーの線付き） */
export const SceneLabel: React.FC<{
  text: string;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const p = springAt(frame, fps, delay, SMOOTH, 22);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        fontFamily: FONT_STACK_EN,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: "0.28em",
        color: theme.blue,
        ...style,
      }}
    >
      <div
        style={{
          width: 64 * p,
          height: 4,
          borderRadius: 2,
          background: theme.blue,
        }}
      />
      <div style={{ overflow: "hidden" }}>
        <div style={{ translate: `${(1 - p) * -105}% 0` }}>{text}</div>
      </div>
    </div>
  );
};

/** 背景：白地に淡いグリッド。drift でパララックス移動 */
export const GridBackground: React.FC<{
  driftX?: number;
  driftY?: number;
  cell?: number;
}> = ({ driftX = 0, driftY = 0, cell = 90 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: NEUTRAL.white,
      backgroundImage: `linear-gradient(${NEUTRAL.line} 1.5px, transparent 1.5px), linear-gradient(90deg, ${NEUTRAL.line} 1.5px, transparent 1.5px)`,
      backgroundSize: `${cell}px ${cell}px`,
      backgroundPosition: `${driftX}px ${driftY}px`,
      opacity: 0.7,
    }}
  />
);
