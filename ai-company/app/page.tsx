import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, Users, Target, ShieldCheck } from "lucide-react";
import { getSessionUser, getUserStore } from "@/lib/server/auth";
import { backendMode } from "@/lib/config";
import { Avatar } from "@/components/game/Avatar";
import { buttonVariants } from "@/components/ui/button";

export default async function Home() {
  if (backendMode() !== "unconfigured") {
    const user = await getSessionUser();
    if (user) {
      const store = await getUserStore(user);
      redirect((await store.getCompany()) ? "/office" : "/onboarding");
    }
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-5 pb-16 pt-8">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <header className="relative flex items-center justify-between">
        <div className="font-display text-lg font-extrabold tracking-[0.25em] text-gold-gradient">AI COMPANY</div>
        <Link href="/login" className="text-sm font-semibold text-muted hover:text-text">
          ログイン
        </Link>
      </header>

      <section className="relative mt-10 grid flex-1 items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-4 font-display text-xs font-bold tracking-[0.35em] text-sky-soft">YOUR DREAM. YOUR COMPANY.</p>
          <h1 className="text-[2.1rem] font-black leading-[1.3] sm:text-5xl sm:leading-[1.25]">
            ゲームを始めたら、
            <br />
            <span className="text-gold-gradient shine">社長になっていた。</span>
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-muted">
            AI秘書と話すだけで、あなただけの会社が誕生。
            個性あふれるAI社員と一緒に、夢を形にする最初の仕事を始めましょう。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login?mode=signup" className={buttonVariants({ variant: "gold", size: "lg" })}>
              無料で会社を設立する
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              出社する（ログイン）
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted/80">※ アプリ内の会社設立は仮想的なもので、法的な法人設立ではありません。</p>
        </div>

        <div className="relative mx-auto">
          <div className="absolute inset-0 -z-10 rounded-full bg-sky/20 blur-3xl" />
          <div className="animate-float">
            <Avatar role="secretary" size={280} />
          </div>
          <div className="panel absolute -bottom-2 left-1/2 w-64 -translate-x-1/2 px-4 py-3 text-center text-sm">
            <span className="text-gold-soft">ミオ</span>「はじめまして、社長。」
          </div>
        </div>
      </section>

      <section className="relative mt-16 grid gap-3 sm:grid-cols-4">
        {[
          { icon: Sparkles, t: "秘書と面談するだけ", d: "会話から社名・理念・事業計画をAIが設計" },
          { icon: Users, t: "AI社員を雇用", d: "秘書・企画・マーケが役割別に仕事を支援" },
          { icon: Target, t: "毎日のミッション", d: "成果物を残して経験値を獲得、会社が成長" },
          { icon: ShieldCheck, t: "安心の設計", d: "無断の送信・購入・契約は一切しません" },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="panel p-4">
            <Icon className="mb-2 text-gold" size={22} />
            <div className="text-sm font-bold">{t}</div>
            <div className="mt-1 text-xs leading-relaxed text-muted">{d}</div>
          </div>
        ))}
      </section>

      <footer className="relative mt-12 flex justify-center gap-5 text-xs text-muted">
        <Link href="/terms">利用規約</Link>
        <Link href="/privacy">プライバシーポリシー</Link>
      </footer>
    </main>
  );
}
