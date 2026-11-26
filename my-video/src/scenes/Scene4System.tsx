import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Laptop } from "../components/Devices";
import { AiBadge, GrowthChartCard, NotifyCard } from "../components/Graphics";
import { SiteMock } from "../components/SiteMock";
import { GridBackground, MaskReveal, SceneLabel } from "../components/Text";
import { CLAMP, EASE_OUT, springAt } from "../lib/anim";
import { FONT_STACK_JP } from "../lib/fonts";
import { NEUTRAL, tint, useTheme } from "../lib/theme";
import type { ReelProps, Site } from "../schema";

export const Scene4System: React.FC<{ data: ReelProps["scene4"]; site: Site }> = ({ data, site }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const laptop = springAt(frame, fps, 6, { damping: 18, stiffness: 110 });
  const chart = springAt(frame, fps, 30, { damping: 16, stiffness: 120 });
  const marker = interpolate(frame, [22, 36], [0, 1], { ...CLAMP, easing: EASE_OUT });

  const idx = data.highlight ? data.line1.indexOf(data.highlight) : -1;
  const before = idx >= 0 ? data.line1.slice(0, idx) : data.line1;
  const hl = idx >= 0 ? data.highlight : "";
  const after = idx >= 0 ? data.line1.slice(idx + hl.length) : "";

  const headline: React.CSSProperties = { fontFamily: FONT_STACK_JP, fontWeight: 900, fontSize: 104, lineHeight: 1.25, color: theme.navy, letterSpacing: "0.02em", whiteSpace: "nowrap" };

  return (
    <AbsoluteFill style={{ background: NEUTRAL.white, overflow: "hidden" }}>
      <GridBackground driftY={-frame * 0.5} />

      {/* 見出し */}
      <div style={{ position: "absolute", left: 90, top: 270, display: "flex", flexDirection: "column", gap: 14 }}>
        <SceneLabel text={data.label} delay={2} />
        <MaskReveal delay={6}>
          <div style={headline}>
            {before}
            <span style={{ position: "relative", display: "inline-block" }}>
              <span style={{ position: "absolute", left: -6, right: -6, bottom: 14, height: 38, background: tint(theme.blue, 22), transformOrigin: "left", scale: `${marker} 1` }} />
              <span style={{ position: "relative", color: theme.blue }}>{hl}</span>
            </span>
            {after}
          </div>
        </MaskReveal>
        <MaskReveal delay={12}>
          <div style={headline}>{data.line2}</div>
        </MaskReveal>
      </div>

      {/* ノートPC（下からせり上がり、画面内はスクロール） */}
      <Laptop
        navy={theme.navy}
        style={{
          left: 110,
          top: 640,
          scale: String(0.82 * (0.9 + 0.1 * laptop)),
          translate: `0 ${(1 - laptop) * 700 - frame * 0.4}px`,
        }}
      >
        <div style={{ scale: String(760 / 600), transformOrigin: "0 0" }}>
          <SiteMock site={site} variant={0} scroll={interpolate(frame, [20, 100], [0, 150], { ...CLAMP, easing: EASE_OUT })} />
        </div>
      </Laptop>

      <AiBadge delay={22} style={{ left: 770, top: 700, translate: `0 ${-frame * 0.8}px` }} />

      <GrowthChartCard
        delay={34}
        title={data.chartTitle}
        style={{
          left: 90,
          top: 1080,
          scale: String(0.92),
          translate: `${(1 - chart) * -700}px ${-frame * 1.1}px`,
          rotate: `${(1 - chart) * -6}deg`,
        }}
      />

      <NotifyCard delay={52} text={data.notification} style={{ right: 150, top: 1330 }} />
    </AbsoluteFill>
  );
};
