import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrowserWindow } from "../components/Devices";
import { CharStagger, GridBackground, MaskReveal, SceneLabel } from "../components/Text";
import { CLAMP, springAt } from "../lib/anim";
import { FONT_STACK_JP } from "../lib/fonts";
import { NEUTRAL, useTheme } from "../lib/theme";
import type { ReelProps } from "../schema";

/** 各ウィンドウの着地位置（中心座標）・奥行き・入場方向 */
const SLOTS = [
  { x: 350, y: 780, scale: 0.86, rotate: -4, from: -1, delay: 0, depth: 0.5 },
  { x: 720, y: 930, scale: 0.92, rotate: 3, from: 1, delay: 4, depth: 0.8 },
  { x: 330, y: 1140, scale: 0.88, rotate: 2, from: -1, delay: 8, depth: 1.1 },
  { x: 710, y: 1290, scale: 0.9, rotate: -3, from: 1, delay: 12, depth: 1.4 },
];

export const Scene1Hero: React.FC<{ data: ReelProps["scene1"] }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const categories = data.sites.map((s) => s.category).join("・");

  return (
    <AbsoluteFill style={{ background: NEUTRAL.white, overflow: "hidden" }}>
      <GridBackground driftX={-frame * 0.6} driftY={-frame * 0.3} />

      {/* サイト画面（左右から交互に登場 + 奥行き別のパララックス） */}
      {SLOTS.map((slot, i) => {
        const site = data.sites[i % data.sites.length];
        const p = springAt(frame, fps, slot.delay, { damping: 17, stiffness: 120, mass: 0.8 });
        return (
          <BrowserWindow
            key={i}
            site={site}
            variant={i}
            scroll={interpolate(frame, [slot.delay + 14, 66], [0, 60], CLAMP)}
            style={{
              left: slot.x - 300,
              top: slot.y - 210,
              scale: String(slot.scale * (0.85 + 0.15 * p)),
              rotate: `${slot.rotate + (1 - p) * 14 * slot.from}deg`,
              translate: `${(1 - p) * 950 * slot.from + frame * slot.depth * -slot.from * 0.6}px ${-frame * slot.depth * 0.5}px`,
            }}
          />
        );
      })}

      {/* 見出しエリア（白い面で可読性を確保） */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 560, background: `linear-gradient(${NEUTRAL.white} 82%, rgba(255,255,255,0))` }} />
      <div style={{ position: "absolute", left: 90, top: 270, display: "flex", flexDirection: "column", gap: 22 }}>
        <SceneLabel text={data.label} delay={2} />
        <CharStagger
          text={data.title}
          delay={6}
          stagger={2}
          style={{ fontFamily: FONT_STACK_JP, fontWeight: 900, fontSize: 112, lineHeight: 1.2, color: theme.navy, letterSpacing: "0.02em" }}
        />
        <MaskReveal delay={20}>
          <div style={{ fontFamily: FONT_STACK_JP, fontWeight: 700, fontSize: 44, color: NEUTRAL.gray }}>
            {categories}
          </div>
        </MaskReveal>
      </div>
    </AbsoluteFill>
  );
};
