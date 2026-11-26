import { Easing, spring, type SpringConfig } from "remotion";

export const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/** 減衰の強い、跳ねないスプリング */
export const SMOOTH: Partial<SpringConfig> = { damping: 200 };
/** 少しだけオーバーシュートするスプリング */
export const SNAPPY: Partial<SpringConfig> = { damping: 14, stiffness: 160, mass: 0.7 };
/** 勢いよく着地するスプリング */
export const PUNCH: Partial<SpringConfig> = { damping: 11, stiffness: 190, mass: 0.9 };

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.7, 0, 0.2, 1);

export const springAt = (
  frame: number,
  fps: number,
  delay: number,
  config: Partial<SpringConfig> = SMOOTH,
  durationInFrames?: number,
) => spring({ frame: frame - delay, fps, config, durationInFrames });

export const resolveSrc = (src: string, staticFileFn: (p: string) => string) =>
  /^https?:\/\//.test(src) ? src : staticFileFn(src);
