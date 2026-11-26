import { linearTiming, TransitionSeries } from "@remotion/transitions";
import React from "react";
import { AbsoluteFill } from "remotion";
import { panelWipe } from "./components/PanelWipe";
import { EASE_IN_OUT } from "./lib/anim";
import "./lib/fonts";
import { ThemeProvider } from "./lib/theme";
import { Scene1Hero } from "./scenes/Scene1Hero";
import { Scene2Zero } from "./scenes/Scene2Zero";
import { Scene3Price } from "./scenes/Scene3Price";
import { Scene4System } from "./scenes/Scene4System";
import { Scene5Grow } from "./scenes/Scene5Grow";
import { Scene6Cta } from "./scenes/Scene6Cta";
import type { ReelProps } from "./schema";

/**
 * シーン尺は「トランジションの中間点」が 2/4/6/9/12 秒に来るよう設定。
 * 各シーン尺 = 本編尺 + トランジション(12f)の半分×前後。合計 450f = 15 秒。
 */
const T = 12;
const wipe = linearTiming({ durationInFrames: T, easing: EASE_IN_OUT });

export const CraftoryReel: React.FC<ReelProps> = (props) => {
  const { colors, scene1, scene2, scene3, scene4, scene5, scene6 } = props;
  const priceText = `${scene3.title} ${scene3.price.toLocaleString("ja-JP")}${scene3.suffix}`;
  const monthlyText = `${scene2.title}（${scene2.amount}${scene2.unit}）`;

  return (
    <ThemeProvider theme={colors}>
      <AbsoluteFill style={{ background: "#FFFFFF" }}>
        <TransitionSeries name="Reel">
          <TransitionSeries.Sequence name="01 ホームページ制作" durationInFrames={60 + T / 2}>
            <Scene1Hero data={scene1} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={panelWipe({ direction: "left", color: colors.navy })} timing={wipe} />
          <TransitionSeries.Sequence name="02 月額費用なし" durationInFrames={60 + T}>
            <Scene2Zero data={scene2} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={panelWipe({ direction: "up", color: colors.blue })} timing={wipe} />
          <TransitionSeries.Sequence name="03 制作費" durationInFrames={60 + T}>
            <Scene3Price data={scene3} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={panelWipe({ direction: "left", color: colors.navy })} timing={wipe} />
          <TransitionSeries.Sequence name="04 売れる仕組み" durationInFrames={90 + T}>
            <Scene4System data={scene4} site={scene1.sites[0]} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={panelWipe({ direction: "up", color: colors.blue })} timing={wipe} />
          <TransitionSeries.Sequence name="05 事業拡大" durationInFrames={90 + T}>
            <Scene5Grow data={scene5} />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={panelWipe({ direction: "left", color: colors.navy })} timing={wipe} />
          <TransitionSeries.Sequence name="06 CTA" durationInFrames={90 + T / 2}>
            <Scene6Cta
              data={scene6}
              brandName={props.brandName}
              brandTagline={props.brandTagline}
              sites={scene1.sites}
              priceText={priceText}
              monthlyText={monthlyText}
            />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </AbsoluteFill>
    </ThemeProvider>
  );
};
