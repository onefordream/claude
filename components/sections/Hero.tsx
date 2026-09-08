import PhoneFrame from "../ui/PhoneFrame";
import BrowserFrame, { StudentRow } from "../ui/BrowserFrame";
import Icon from "../ui/Icon";
import Divider from "../ui/Divider";
import { ScrSub, ScrGoal, Bubble } from "../ui/ScreenParts";

export default function Hero() {
  return (
    <section className="hero section band-white">
      <div className="wrap pt-14 sm:pt-20 pb-8">
        <div className="hero-copy max-w-[720px] mx-auto text-center">
          <p className="for">
            <Icon name="users" size={14} />
            ORIGINAL AI GROWTH NOTE ／ スクール・コーチ・インストラクター向け
          </p>
          <h1 className="h1">
            先生が書くカルテから、
            <br />
            「<span className="accent-text">生徒が育つ成長ノート</span>」へ。
          </h1>
          <p className="lead mx-auto max-w-[480px]">
            レッスン、練習、目標、成果。生徒自身が記録し、AIと一緒に成長を振り返る。
            あなたのスクール専用の成長ノートをつくります。
          </p>
          <div className="cta-row center">
            <a href="#contact" className="btn btn-primary">無料デモを見る</a>
            <a href="#contact" className="btn btn-secondary">導入について相談する</a>
          </div>
          <p className="powered">POWERED BY CRAFTORY</p>
        </div>

        <div className="hero-stage">
          <BrowserFrame className="stage-browser" title="生徒の記録">
            <StudentRow initial="Y" name="Yuto K." note="レッスン記録・今日" />
            <StudentRow initial="M" name="Mao S." note="自主練習・昨日" />
            <StudentRow initial="R" name="Ren T." note="目標を更新" />
          </BrowserFrame>

          <PhoneFrame className="stage-phone-a">
            <ScrSub>HOME</ScrSub>
            <ScrGoal label="GOAL" text="スイングの再現性を上げる" color="var(--accent-main)" />
          </PhoneFrame>

          <PhoneFrame className="stage-phone-b">
            <ScrSub>AI COACH</ScrSub>
            <Bubble from="me">今日は何を練習すればいい？</Bubble>
            <Bubble from="ai">30ヤード地点の反復から始めましょう。</Bubble>
          </PhoneFrame>

          <span className="chip"><Icon name="target" size={14} className="!text-[var(--accent-main)]" />目標</span>
          <span className="chip"><Icon name="notebook" size={14} className="!text-[var(--accent-main)]" />レッスン</span>
          <span className="chip"><Icon name="refresh" size={14} className="!text-[var(--accent-main)]" />自主練習</span>
        </div>
      </div>
      <Divider fill="var(--accent-verylight)" />
    </section>
  );
}
