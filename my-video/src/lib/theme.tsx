import React, { createContext, useContext } from "react";

export type Theme = {
  navy: string;
  blue: string;
  pale: string;
};

export const defaultTheme: Theme = {
  navy: "#0B1F44",
  blue: "#2563EB",
  pale: "#EEF3FF",
};

/** 共通のニュートラルカラー（白基調） */
export const NEUTRAL = {
  white: "#FFFFFF",
  line: "#E4EAF4",
  gray: "#64748B",
  lightGray: "#D6DDEA",
  surface: "#F5F7FB",
};

const ThemeContext = createContext<Theme>(defaultTheme);

export const ThemeProvider: React.FC<{
  theme: Theme;
  children: React.ReactNode;
}> = ({ theme, children }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

export const useTheme = () => useContext(ThemeContext);

/** accent を白と混ぜた淡色（グラデーションを使わずフラットに） */
export const tint = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, white)`;
