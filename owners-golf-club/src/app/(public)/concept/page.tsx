import { PageHeader, SectionTitle } from "@/components/ui";
import { CtaBand } from "@/components/site";

export const metadata = { title: "コンセプト" };

export default function ConceptPage() {
  return (
    <>
      <PageHeader en="CONCEPT" title="コンセプト" lead="経営者のための、ゴルフを通じた信頼のコミュニティ。" />
      <div className="mx-auto max-w-3xl space-y-16 px-4 py-16">
        <section>
          <SectionTitle en="FOR OWNERS" ja="対象となる方" />
          <p className="mt-6 text-sm leading-loose">
            OWNERS GOLF CLUBは、会社経営者・代表取締役・CEO・法人オーナーの方を対象とした会員制コミュニティです。
            入会は完全審査制とし、会員同士が安心して交流できる環境を大切にしています。
          </p>
        </section>
        <section>
          <SectionTitle en="WHY GOLF" ja="ゴルフという場" />
          <p className="mt-6 text-sm leading-loose">
            ラウンドを共にする数時間は、会議室では生まれない対話の時間です。私たちはゴルフを、経営者同士が肩書きを越えて向き合い、
            信頼関係を築くための場として位置づけています。
          </p>
        </section>
        <section>
          <SectionTitle en="THREE VALUES" ja="人脈・優待・学び" />
          <ul className="mt-6 space-y-4 text-sm leading-loose">
            <li><span className="font-serif text-lg">人脈</span> — 経営者限定のゴルフ・ビジネス交流。</li>
            <li><span className="font-serif text-lg">優待</span> — 提携ゴルフ場・ゴルフ用品の会員優待。</li>
            <li><span className="font-serif text-lg">学び</span> — 経営・AIをテーマにした勉強会。</li>
          </ul>
        </section>
        <section>
          <SectionTitle en="SCHEDULE" ja="始動時期" />
          <p className="mt-6 text-sm leading-loose">2027年3月の始動を予定しています。最新情報は事前登録いただいた方へ順次お知らせします。</p>
        </section>
      </div>
      <CtaBand />
    </>
  );
}
