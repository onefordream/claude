import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-xs tracking-[0.3em] text-gold">404</p>
      <h1 className="font-serif text-2xl">ページが見つかりません</h1>
      <Link href="/" className={btn.outline}>トップへ戻る</Link>
    </main>
  );
}
