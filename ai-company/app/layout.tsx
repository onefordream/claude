import type { Metadata, Viewport } from "next";
import "./globals.css";
import { backendMode, devLocalMode } from "@/lib/config";

// 認証状態・実行時の環境変数に依存するため、すべてリクエスト時に描画する
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "AI COMPANY｜ゲームを始めたら、社長になっていた。", template: "%s｜AI COMPANY" },
  description: "AI秘書と話すだけで、あなただけの会社が誕生。AI社員と一緒に夢を形にする会社経営ゲーム。Your Dream. Your Company.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050812",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = backendMode();
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Outfit:wght@500;700;800&display=swap"
        />
      </head>
      <body>
        {devLocalMode && mode === "memory" && (
          <div className="relative z-[60] bg-gold/90 px-3 py-1 text-center text-[11px] font-bold text-navy-950">
            ローカル開発モード：データはメモリ保存（再起動で消去）・AIは開発用モックです
          </div>
        )}
        {mode === "unconfigured" && (
          <div className="relative z-[60] bg-danger/90 px-3 py-1 text-center text-[11px] font-bold text-white">
            サーバー設定が未完了です（Supabase の環境変数が必要です）
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
