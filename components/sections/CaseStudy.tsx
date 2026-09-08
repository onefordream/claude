import PhoneFrame from "../ui/PhoneFrame";
import Divider from "../ui/Divider";
import { ScrSub, ScrGoal, ScrField, Bubble } from "../ui/ScreenParts";

export default function CaseStudy() {
  return (
    <section className="section band-dark" id="casestudy">
      <div className="wrap">
        <p className="eyebrow justify-center">CASE STUDY — 導入イメージ</p>
        <h2 className="h2 center">GOLF STUDIO SHADOW</h2>
        <p className="lead center">
          {/* TODO: 実際の導入スクリーンショット・素材に差し替え */}
          ゴルフスクールでの活用イメージです。指導方針に合わせて、記録項目やAIコーチの設計をカスタマイズしています。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mt-13" style={{ marginTop: 52 }}>
          <div>
            <PhoneFrame>
              <ScrSub>HOME</ScrSub>
              <ScrGoal label="GOAL" text="ラウンドスコアの安定化" color="var(--accent-main)" />
              <ScrField label="NEXT ACTION" text="ショートゲーム練習 30分" />
            </PhoneFrame>
            <p className="cs-cap">GOAL</p>
          </div>
          <div>
            <PhoneFrame>
              <ScrSub>LESSON</ScrSub>
              <ScrField label="TODAY'S LESSON" text="ショートゲームの距離感" />
              <ScrField label="NEXT ACTION" text="30y地点を反復" />
            </PhoneFrame>
            <p className="cs-cap">LESSON</p>
          </div>
          <div>
            <PhoneFrame>
              <ScrSub>RESULT</ScrSub>
              <ScrGoal label="ROUND" text="89" color="var(--ink)" size={20} />
            </PhoneFrame>
            <p className="cs-cap">ROUND</p>
          </div>
          <div>
            <PhoneFrame>
              <ScrSub>AI COACH</ScrSub>
              <Bubble from="me">次のラウンドまで何をすればいい？</Bubble>
              <Bubble from="ai">ショートパットの精度を重点的に。</Bubble>
            </PhoneFrame>
            <p className="cs-cap">AI COACH</p>
          </div>
        </div>
        <p className="text-[12.5px] text-center mt-5" style={{ color: "var(--muted-on-dark)" }}>
          ※実際の導入スクリーンショットに順次差し替え予定です。実証済みの成果数値は今後掲載します。
        </p>

        <div className="cta-row center" style={{ marginTop: 36 }}>
          <a href="#contact" className="btn btn-primary">実際の利用イメージを見る</a>
        </div>
      </div>
      <Divider fill="var(--white)" d="M0,35 C 480,-5 960,65 1440,15 L1440,60 L0,60 Z" />
    </section>
  );
}
