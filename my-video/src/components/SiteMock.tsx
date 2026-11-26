import React from "react";
import { Img, staticFile } from "remotion";
import { resolveSrc } from "../lib/anim";
import { FONT_STACK_EN, FONT_STACK_JP } from "../lib/fonts";
import { NEUTRAL, tint, useTheme } from "../lib/theme";
import type { Site } from "../schema";

const Bar: React.FC<{ w: number; h?: number; c?: string; r?: number }> = ({
  w,
  h = 10,
  c = NEUTRAL.lightGray,
  r,
}) => <div style={{ width: w, height: h, borderRadius: r ?? h / 2, background: c }} />;

/** 業種ごとのヒーロー・イラスト（画像が無い場合） */
const HeroArt: React.FC<{ accent: string; variant: number }> = ({ accent, variant }) => {
  const base: React.CSSProperties = { position: "absolute", background: accent };
  switch (variant % 4) {
    case 0: // 円 + 小円
      return (
        <>
          <div style={{ ...base, width: 200, height: 200, borderRadius: 100, right: 30, top: -10 }} />
          <div style={{ ...base, width: 70, height: 70, borderRadius: 35, right: 210, bottom: 18, background: tint(accent, 45) }} />
        </>
      );
    case 1: // アーチ
      return (
        <>
          <div style={{ ...base, width: 170, height: 210, borderRadius: "85px 85px 0 0", right: 46, bottom: 0 }} />
          <div style={{ ...base, width: 90, height: 120, borderRadius: "45px 45px 0 0", right: 200, bottom: 0, background: tint(accent, 45) }} />
        </>
      );
    case 2: // 十字（医療系）
      return (
        <>
          <div style={{ ...base, width: 180, height: 180, borderRadius: 40, right: 40, top: 6, background: tint(accent, 40) }} />
          <div style={{ ...base, width: 46, height: 130, borderRadius: 10, right: 107, top: 31 }} />
          <div style={{ ...base, width: 130, height: 46, borderRadius: 10, right: 65, top: 73 }} />
        </>
      );
    default: // 家（建築系）
      return (
        <>
          <div style={{ ...base, width: 0, height: 0, background: "transparent", borderLeft: "105px solid transparent", borderRight: "105px solid transparent", borderBottom: `90px solid ${accent}`, right: 36, top: 16 }} />
          <div style={{ ...base, width: 170, height: 100, right: 56, top: 106, background: tint(accent, 55) }} />
          <div style={{ ...base, width: 40, height: 60, right: 121, top: 146 }} />
        </>
      );
  }
};

/** 600px 幅で設計した PC 向けサイトの中身 */
export const SiteMock: React.FC<{
  site: Site;
  variant: number;
  scroll?: number;
}> = ({ site, variant, scroll = 0 }) => {
  const theme = useTheme();
  return (
    <div style={{ width: 600, translate: `0 ${-scroll}px`, background: NEUTRAL.white }}>
      {/* ナビ */}
      <div style={{ height: 54, display: "flex", alignItems: "center", padding: "0 26px", gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: site.accent }} />
        <div style={{ fontFamily: FONT_STACK_EN, fontWeight: 800, fontSize: 18, color: theme.navy, flex: 1 }}>{site.name}</div>
        <Bar w={44} h={8} />
        <Bar w={44} h={8} />
        <Bar w={44} h={8} />
        <div style={{ width: 76, height: 28, borderRadius: 14, background: theme.navy }} />
      </div>
      {/* ヒーロー */}
      <div style={{ position: "relative", height: 200, margin: "0 18px", borderRadius: 16, overflow: "hidden", background: tint(site.accent, 14) }}>
        {site.image ? (
          <Img src={resolveSrc(site.image, staticFile)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <HeroArt accent={site.accent} variant={variant} />
        )}
        <div style={{ position: "absolute", left: 26, top: 30, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ alignSelf: "flex-start", padding: "4px 12px", borderRadius: 14, background: NEUTRAL.white, color: site.accent, fontFamily: FONT_STACK_JP, fontWeight: 700, fontSize: 15 }}>
            {site.category}
          </div>
          <Bar w={230} h={18} c={theme.navy} r={5} />
          <Bar w={170} h={18} c={theme.navy} r={5} />
          <Bar w={200} h={9} c={tint(theme.navy, 35)} />
          <div style={{ marginTop: 6, width: 118, height: 36, borderRadius: 18, background: site.accent, color: NEUTRAL.white, fontFamily: FONT_STACK_JP, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
            詳しく見る
          </div>
        </div>
      </div>
      {/* カード */}
      <div style={{ display: "flex", gap: 14, padding: "18px 18px 0" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ height: 70, borderRadius: 10, background: tint(site.accent, 18 + i * 10) }} />
            <Bar w={120} h={9} c={theme.navy} />
            <Bar w={90} h={7} />
          </div>
        ))}
      </div>
      {/* 下部セクション（スクロール用） */}
      <div style={{ margin: "22px 18px 0", height: 110, borderRadius: 14, background: theme.navy, display: "flex", alignItems: "center", padding: "0 26px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          <Bar w={220} h={14} c={NEUTRAL.white} />
          <Bar w={160} h={8} c={tint(theme.navy, 55)} />
        </div>
        <div style={{ width: 110, height: 36, borderRadius: 18, background: site.accent }} />
      </div>
      <div style={{ display: "flex", gap: 14, padding: "18px" }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ flex: 1, height: 90, borderRadius: 12, background: NEUTRAL.surface }} />
        ))}
      </div>
    </div>
  );
};
