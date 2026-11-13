import Link from "next/link";
import { Avatar } from "@/components/game/Avatar";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <Avatar role="secretary" size={140} />
      <h1 className="mt-4 text-xl font-black">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-muted">社長、お探しのページは移動したか、存在しないようです。</p>
      <Link href="/" className={buttonVariants({ variant: "gold", className: "mt-6" })}>
        社長室へ戻る
      </Link>
    </main>
  );
}
