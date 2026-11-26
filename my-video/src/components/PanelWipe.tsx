import React from "react";
import { AbsoluteFill } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";

type Props = { direction: "left" | "up"; color: string };

/**
 * 新しいシーンがマスクで差し込まれ、境界にネイビーの帯が走る。
 * 前のシーンは少し奥へ押し出される（パララックス）。
 */
const PanelWipeComponent: React.FC<TransitionPresentationComponentProps<Props>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps: { direction, color },
}) => {
  const horizontal = direction === "left";
  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill
        style={{
          translate: horizontal ? `${-p * 22}% 0` : `0 ${-p * 22}%`,
          scale: String(1 - 0.05 * p),
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }
  const inset = (1 - p) * 100;
  const band = 5; // %
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: horizontal ? `inset(0 0 0 ${inset}%)` : `inset(${inset}% 0 0 0)`,
          translate: horizontal ? `${(1 - p) * 12}% 0` : `0 ${(1 - p) * 12}%`,
        }}
      >
        {children}
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          background: color,
          ...(horizontal
            ? { top: 0, bottom: 0, width: `${band}%`, left: `${inset - band}%` }
            : { left: 0, right: 0, height: `${band}%`, top: `${inset - band}%` }),
          opacity: p > 0 && p < 1 ? 1 : 0,
        }}
      />
    </AbsoluteFill>
  );
};

export const panelWipe = (props: Props): TransitionPresentation<Props> => ({
  component: PanelWipeComponent,
  props,
});
