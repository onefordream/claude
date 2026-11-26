import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const FONT_JP = "Noto Sans JP";
export const FONT_EN = "Inter";

/** 英数字は Inter、和文は Noto Sans JP にフォールバック */
export const FONT_STACK_EN = `"${FONT_EN}", "${FONT_JP}", sans-serif`;
export const FONT_STACK_JP = `"${FONT_JP}", sans-serif`;

const files: Array<[string, string, string]> = [
  [FONT_JP, "NotoSansJP_500Medium.ttf", "500"],
  [FONT_JP, "NotoSansJP_700Bold.ttf", "700"],
  [FONT_JP, "NotoSansJP_900Black.ttf", "900"],
  [FONT_EN, "Inter_700Bold.ttf", "700"],
  [FONT_EN, "Inter_800ExtraBold.ttf", "800"],
];

for (const [family, file, weight] of files) {
  loadFont({
    family,
    url: staticFile(`fonts/${file}`),
    weight,
    format: "truetype",
    display: "block",
  });
}
