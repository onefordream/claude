import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New, Noto_Sans_JP, IBM_Plex_Mono } from "next/font/google";
import IconSprite from "@/components/ui/IconSprite";
import "./globals.css";

const SITE_URL = "https://ai-growth-note.example.com";
const TITLE = "オリジナルAI成長ノート | 先生が書くカルテから、生徒が育つ成長ノートへ";
const DESCRIPTION =
  "スクール・コーチ専用にカスタマイズできる「オリジナルAI成長ノート」。生徒自身がレッスン・自主練習・成長を記録し、AIと一緒に振り返る仕組みを、あなたのスクール専用に構築します。開発・提供：CRAFTORY。";

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-display",
  display: "swap",
});
const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "AI成長ノート",
    "レッスンカルテ",
    "スクール DX",
    "オリジナルアプリ",
    "CRAFTORY",
    "スポーツスクール",
    "習い事 記録アプリ",
  ],
  authors: [{ name: "CRAFTORY" }],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "オリジナルAI成長ノート by CRAFTORY",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "オリジナルAI成長ノート",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/ogp.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${zenKaku.variable} ${notoSans.variable} ${plexMono.variable}`}>
      <body className="antialiased" style={{ fontFamily: "var(--font-body)" }}>
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
