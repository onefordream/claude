import React from "react";
import { FONT_STACK_EN } from "../lib/fonts";
import { NEUTRAL } from "../lib/theme";
import type { Site } from "../schema";
import { SiteMock } from "./SiteMock";

const SHADOW = "0 28px 60px rgba(11,31,68,0.16), 0 6px 16px rgba(11,31,68,0.08)";

/** ブラウザウィンドウ（600×420 設計、配置側で scale する） */
export const BrowserWindow: React.FC<{
  site: Site;
  variant: number;
  scroll?: number;
  style?: React.CSSProperties;
}> = ({ site, variant, scroll = 0, style }) => (
  <div
    style={{
      position: "absolute",
      width: 600,
      height: 420,
      borderRadius: 20,
      overflow: "hidden",
      background: NEUTRAL.white,
      boxShadow: `${SHADOW}, 0 0 0 1.5px rgba(11,31,68,0.06)`,
      ...style,
    }}
  >
    <div style={{ height: 42, background: NEUTRAL.surface, display: "flex", alignItems: "center", gap: 8, padding: "0 18px", borderBottom: `1.5px solid ${NEUTRAL.line}` }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 11, height: 11, borderRadius: 6, background: NEUTRAL.lightGray }} />
      ))}
      <div style={{ marginLeft: 14, flex: 1, height: 24, borderRadius: 12, background: NEUTRAL.white, border: `1.5px solid ${NEUTRAL.line}`, display: "flex", alignItems: "center", padding: "0 12px", fontFamily: FONT_STACK_EN, fontWeight: 700, fontSize: 12, color: NEUTRAL.gray }}>
        {`${site.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.jp`}
      </div>
    </div>
    <div style={{ height: 378, overflow: "hidden" }}>
      <SiteMock site={site} variant={variant} scroll={scroll} />
    </div>
  </div>
);

/** ノートPC（画面 760×475 設計） */
export const Laptop: React.FC<{
  children: React.ReactNode;
  navy: string;
  style?: React.CSSProperties;
}> = ({ children, navy, style }) => (
  <div style={{ position: "absolute", width: 860, height: 540, ...style }}>
    <div style={{ position: "absolute", left: 36, top: 0, width: 788, height: 503, borderRadius: 26, background: navy, boxShadow: SHADOW, padding: 14 }}>
      <div style={{ width: 760, height: 475, borderRadius: 12, overflow: "hidden", background: NEUTRAL.white }}>{children}</div>
    </div>
    <div style={{ position: "absolute", left: 0, top: 500, width: 860, height: 30, borderRadius: "4px 4px 22px 22px", background: "#CBD4E3" }} />
    <div style={{ position: "absolute", left: 360, top: 500, width: 140, height: 10, borderRadius: "0 0 10px 10px", background: "#AEB9CC" }} />
  </div>
);

/** スマートフォン（画面 356×740 設計） */
export const Phone: React.FC<{
  children: React.ReactNode;
  navy: string;
  style?: React.CSSProperties;
}> = ({ children, navy, style }) => (
  <div style={{ position: "absolute", width: 384, height: 768, borderRadius: 60, background: navy, padding: 14, boxShadow: SHADOW, ...style }}>
    <div style={{ position: "relative", width: 356, height: 740, borderRadius: 47, overflow: "hidden", background: NEUTRAL.white }}>
      {children}
      <div style={{ position: "absolute", left: 128, top: 12, width: 100, height: 30, borderRadius: 15, background: navy }} />
    </div>
  </div>
);

export type { Site };
