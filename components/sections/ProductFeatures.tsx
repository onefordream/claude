import { ReactNode } from "react";
import PhoneFrame from "../ui/PhoneFrame";
import Divider from "../ui/Divider";
import { ScrSub, ScrGoal, ScrField } from "../ui/ScreenParts";

function FunctionCard({
  no,
  tag,
  title,
  desc,
  tags,
  reverse,
  visual,
}: {
  no: string;
  tag: string;
  title: ReactNode;
  desc: string;
  tags: string[];
  reverse?: boolean;
  visual: ReactNode;
}) {
  return (
    <div className={`fn-card ${reverse ? "rev" : ""}`}>
      <div>
        <div className="fn-no">{no}</div>
        <div className="fn-tag">{tag}</div>
        <h3>{title}</h3>
        <p className="desc">{desc}</p>
        <div className="fn-tagrow">
          {tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
      <div className="fn-visual">{visual}</div>
    </div>
  );
}

export default function ProductFeatures() {
  return (
    <section className="section band-accent-dark" id="product">
      <div className="wrap">
        <p className="eyebrow justify-center">FEATURE</p>
        <h2 className="h2 center">
          成長を支える機能を、
          <br />
          ひとつに。
        </h2>

        <FunctionCard
          no="01"
          tag="LESSON NOTE — レッスン記録"
          title={<>「教わった」で、<br />終わらせない。</>}
          desc="レッスン終了後、生徒自身が内容を記録。自分の言葉で振り返ることで、次の練習につなげます。"
          tags={["今日やったこと", "気づいたこと", "次回までの課題"]}
          visual={
            <PhoneFrame>
              <ScrSub>LESSON RECORD</ScrSub>
              <ScrField label="TODAY'S LESSON" text="アプローチの距離感を練習した" />
              <ScrField label="DISCOVERY" text="手首を固定すると安定する" />
              <ScrField label="NEXT ACTION" text="30ヤード地点を反復練習" />
            </PhoneFrame>
          }
        />

        <FunctionCard
          no="02"
          tag="PRACTICE — 自主練習"
          title={<>レッスンとレッスンの間も、<br />成長は続いている。</>}
          desc="練習内容・球数・時間・気づき・課題。日々の取り組みを、生徒自身がその場で記録します。"
          tags={["練習内容", "球数 / 時間", "気づき・課題"]}
          reverse
          visual={
            <PhoneFrame>
              <ScrSub>PRACTICE LOG</ScrSub>
              <ScrField label="9/07" text="素振り 100回・リズム意識" />
              <ScrField label="9/05" text="パター練習 30分" />
              <ScrField label="9/02" text="アプローチ練習 50球" />
            </PhoneFrame>
          }
        />

        <FunctionCard
          no="03"
          tag="RESULT — 成果記録"
          title={<>成長を、「記憶」ではなく<br />「記録」に。</>}
          desc="ゴルフならラウンドとスコア、テニスなら試合結果、学習塾ならテスト結果。業種によって記録項目は変更できます。"
          tags={["ラウンド / スコア", "試合結果", "テスト結果"]}
          visual={
            <PhoneFrame>
              <ScrSub>ROUND / RESULT</ScrSub>
              <ScrGoal label="2026.09.06 〇〇カントリークラブ" text="89" color="var(--ink)" size={24} />
              <ScrField label="CHALLENGE" text="ショートパットの精度" />
            </PhoneFrame>
          }
        />

        <FunctionCard
          no="04"
          tag="GOAL — 目標管理"
          title={<>目標を、<br />決めただけにしない。</>}
          desc="HOME画面の上部にいつでも現在の目標を表示。目標と日々の行動をつなげます。"
          tags={["現在の目標", "次回までの課題"]}
          reverse
          visual={
            <PhoneFrame>
              <ScrSub>HOME</ScrSub>
              <ScrGoal label="CURRENT GOAL" text="スイングの再現性を上げる" color="var(--accent-main)" />
              <ScrField label="NEXT ACTION" text="素振り 50回 / 動画チェック" />
            </PhoneFrame>
          }
        />
      </div>
      <Divider fill="var(--dark)" d="M0,30 C 460,-10 980,68 1440,20 L1440,60 L0,60 Z" />
    </section>
  );
}
