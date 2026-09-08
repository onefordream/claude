import PhoneFrame from "../ui/PhoneFrame";
import { HomeScreen } from "../ui/screens";

export default function Hero() {
  return (
    <section className="section-pad pt-14 sm:pt-20 overflow-hidden">
      <div className="container-narrow grid lg:grid-cols-2 gap-14 lg:gap-8 items-center">
        <div className="animate-fadeUp">
          <p className="text-xs tracking-[0.25em] font-semibold text-muted mb-5">
            FOR SCHOOL / COACH / INSTRUCTOR
          </p>
          <h1 className="text-[30px] sm:text-[40px] lg:text-[44px] font-bold leading-[1.35] text-ink tracking-tight">
            「先生が書くカルテ」から、
            <br />
            「生徒が育つ成長ノート」へ。
          </h1>
          <p className="mt-6 text-[15px] sm:text-base text-muted leading-relaxed">
            レッスン、練習、目標、成果。
            <br />
            生徒自身が成長を記録し、AIと一緒に振り返る。
            <br />
            あなたのスクール専用の
            <span className="text-ink font-semibold">
              「オリジナルAI成長ノート」
            </span>
            をつくります。
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <a href="#contact" className="btn-primary">
              デモを見てみる
            </a>
            <a href="#contact" className="btn-secondary">
              導入について相談する
            </a>
          </div>

          <p className="mt-8 text-[11px] tracking-[0.15em] text-muted/70 font-semibold">
            Powered by CRAFTORY
          </p>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="absolute -inset-8 bg-gradient-to-b from-offwhite to-transparent rounded-[60px] -z-10" />
          <PhoneFrame>
            <HomeScreen />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}
