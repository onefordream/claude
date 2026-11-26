import { zColor } from "@remotion/zod-types";
import { z } from "zod";

export const siteSchema = z.object({
  name: z.string().describe("サイト名（モックアップ内に表示）"),
  category: z.string().describe("業種"),
  accent: zColor().describe("サイトのアクセントカラー"),
  image: z
    .string()
    .describe("ヒーロー画像（public/ 内のパス or URL。空欄ならイラスト）"),
});

export const reelSchema = z.object({
  brandName: z.string(),
  brandTagline: z.string(),
  colors: z.object({
    navy: zColor(),
    blue: zColor(),
    pale: zColor(),
  }),
  scene1: z.object({
    label: z.string(),
    title: z.string(),
    sites: z.array(siteSchema).min(1),
  }),
  scene2: z.object({
    label: z.string(),
    title: z.string(),
    amount: z.string(),
    unit: z.string(),
  }),
  scene3: z.object({
    label: z.string(),
    title: z.string(),
    price: z.number().int().min(0),
    suffix: z.string(),
  }),
  scene4: z.object({
    label: z.string(),
    line1: z.string(),
    highlight: z.string().describe("line1 の中でマーカーを引く部分"),
    line2: z.string(),
    chartTitle: z.string(),
    notification: z.string(),
  }),
  scene5: z.object({
    label: z.string(),
    line1: z.string(),
    line2: z.string(),
  }),
  scene6: z.object({
    cta: z.string(),
    phoneButton: z.string(),
  }),
});

export type ReelProps = z.infer<typeof reelSchema>;
export type Site = z.infer<typeof siteSchema>;
