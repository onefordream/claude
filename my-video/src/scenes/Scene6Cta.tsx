import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrowserWindow, Phone } from "../components/Devices";
import { GridBackground, MaskReveal } from "../components/Text";
import { CLAMP, EASE_OUT, SMOOTH, SNAPPY, springAt } from "../lib/anim";
import { FONT_STACK_EN, FONT_STACK_JP } from "../lib/fonts";
import { NEUTRAL, tint, useTheme } from "../lib/theme";
import type { ReelProps, Site } from "../schema";

/** ブランドのモノグラム + ワードマーク */
const BrandMark: React.FC<{ name: string; tagline: string; delay: number }> = ({ name, tagline, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const mark = springAt(frame, fps, delay, SNAPPY);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
      <div style={{ width: 104, height: 104, borderRadius: 28, background: theme.navy, display: "flex", alignItems: "center", justifyContent: "center", scale: String(mark), rotate: `${(1 - mark) * -90}deg` }}>
        <div style={{ fontFamily: FONT_STACK_EN, fontWeight: 800, fontSize: 64, color: NEUTRAL.white }}>{name.slice(0, 1)}</div>
        <div style={{ position: "absolute", right: 18, bottom: 18, width: 16, height: 16, borderRadius: 8, background: theme.blue }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", overflow: "hidden", padding: "4px 0" }}>
          {Array.from(name).map((ch, i) => {
            const p = springAt(frame, fps, delay + 4 + i * 2, SMOOTH, 18);
            return (
              <span key={i} style={{ display: "inline-block", fontFamily: FONT_STACK_EN, fontWeight: 800, fontSize: 80, lineHeight: 1, letterSpacing: "0.08em", color: theme.navy, translate: `0 ${(1 - p) * 110}%` }}>
                {ch}
              </span>
            );
          })}
        </div>
        <MaskReveal delay={delay + 14}>
          <div style={{ fontFamily: FONT_STACK_EN, fontWeight: 700, fontSize: 30, letterSpacing: "0.24em", color: NEUTRAL.gray }}>{tagline.toUpperCase()}</div>
        </MaskReveal>
      </div>
    </div>
  );
};

/** スマホ画面の中身（ブランドサイト） */
const MobileSite: React.FC<{ brand: string; priceText: string; monthlyText: string; button: string; scroll: number }> = ({ brand, priceText, monthlyText, button, scroll }) => {
  const theme = useTheme();
  const bar = (w: number, c: string = NEUTRAL.lightGray, h = 10) => <div style={{ width: w, height: h, borderRadius: h / 2, background: c }} />;
  return (
    <div style={{ position: "absolute", inset: 0, translate: `0 ${-scroll}px` }}>
      <div style={{ height: 56 }} />
      <div style={{ display: "flex", alignItems: "center", padding: "0 24px", height: 56, gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: theme.navy }} />
        <div style={{ fontFamily: FONT_STACK_EN, fontWeight: 800, fontSize: 20, color: theme.navy, letterSpacing: "0.06em", flex: 1 }}>{brand}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{bar(24, theme.navy, 4)}{bar(24, theme.navy, 4)}{bar(16, theme.navy, 4)}</div>
      </div>
      <div style={{ margin: "8px 18px 0", height: 250, borderRadius: 22, background: theme.navy, padding: 26, display: "flex", flexDirection: "column", gap: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 170, height: 170, borderRadius: 85, background: theme.blue }} />
        <div style={{ fontFamily: FONT_STACK_EN, fontWeight: 800, fontSize: 34, color: NEUTRAL.white, letterSpacing: "0.04em", position: "relative" }}>{brand}</div>
        {bar(200, NEUTRAL.white, 12)}
        {bar(150, tint(theme.navy, 60), 10)}
        <div style={{ marginTop: "auto", alignSelf: "flex-start", padding: "10px 22px", borderRadius: 22, background: NEUTRAL.white, color: theme.navy, fontFamily: FONT_STACK_JP, fontWeight: 700, fontSize: 18 }}>{button}</div>
      </div>
      {[monthlyText, priceText].map((t, i) => (
        <div key={i} style={{ margin: "14px 18px 0", height: 76, borderRadius: 18, background: theme.pale, display: "flex", alignItems: "center", padding: "0 22px", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: i === 0 ? theme.blue : theme.navy }} />
          <div style={{ fontFamily: FONT_STACK_JP, fontWeight: 700, fontSize: 22, color: theme.navy }}>{t}</div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 12, margin: "14px 18px 0" }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ flex: 1, height: 150, borderRadius: 18, background: NEUTRAL.surface, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ height: 70, borderRadius: 12, background: tint(theme.blue, 20 + i * 15) }} />
            {bar(110, theme.navy, 8)}
            {bar(80)}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Scene6Cta: React.FC<{
  data: ReelProps["scene6"];
  brandName: string;
  brandTagline: string;
  sites: Site[];
  priceText: string;
  monthlyText: string;
}> = ({ data, brandName, brandTagline, sites, priceText, monthlyText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const phone = springAt(frame, fps, 8, { damping: 16, stiffness: 100 });
  const side = springAt(frame, fps, 14, { damping: 20, stiffness: 90 });
  const cta = springAt(frame, fps, 30, SNAPPY);
  const ctaText = springAt(frame, fps, 36, SMOOTH, 18);
  const nudge = Math.max(0, Math.sin(((frame - 50) / fps) * Math.PI * 2.2)) * 10;
  const float = Math.sin((frame / fps) * Math.PI) * 8;

  return (
    <AbsoluteFill style={{ background: NEUTRAL.white, overflow: "hidden" }}>
      <GridBackground driftX={frame * 0.5} driftY={-frame * 0.5} />

      {/* 奥のサイト画面（パララックス） */}
      <BrowserWindow site={sites[1 % sites.length]} variant={1} style={{ left: -60, top: 640, scale: "0.62", rotate: "-8deg", translate: `${(1 - side) * -500 + frame * 0.6}px ${-frame * 0.4}px` }} />
      <BrowserWindow site={sites[2 % sites.length]} variant={2} style={{ left: 450, top: 820, scale: "0.62", rotate: "7deg", translate: `${(1 - side) * 500 - frame * 0.6}px ${-frame * 0.7}px` }} />

      {/* スマートフォン */}
      <Phone
        navy={theme.navy}
        style={{
          left: 540 - 192,
          top: 470,
          scale: "0.88",
          transformOrigin: "50% 0",
          translate: `0 ${(1 - phone) * 1100 + float}px`,
          rotate: `${(1 - phone) * 10}deg`,
        }}
      >
        <MobileSite brand={brandName} priceText={priceText} monthlyText={monthlyText} button={data.phoneButton} scroll={interpolate(frame, [30, 96], [0, 36], { ...CLAMP, easing: EASE_OUT })} />
      </Phone>

      {/* ブランド */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 268, display: "flex", justifyContent: "center" }}>
        <BrandMark name={brandName} tagline={brandTagline} delay={2} />
      </div>

      {/* CTA ボタン */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1270, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "26px 30px 26px 46px", borderRadius: 64, background: theme.navy, boxShadow: "0 24px 50px rgba(11,31,68,0.25)", scale: String(cta) }}>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontFamily: FONT_STACK_JP, fontWeight: 700, fontSize: 46, color: NEUTRAL.white, whiteSpace: "nowrap", letterSpacing: "0.02em", translate: `0 ${(1 - ctaText) * 110}%` }}>{data.cta}</div>
          </div>
          <div style={{ width: 68, height: 68, borderRadius: 34, background: theme.blue, display: "flex", alignItems: "center", justifyContent: "center", translate: `${nudge}px 0` }}>
            <svg width={34} height={34} viewBox="0 0 24 24">
              <path d="M4 12 H19 M13 6 L19 12 L13 18" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
