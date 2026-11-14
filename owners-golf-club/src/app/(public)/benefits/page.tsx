import { PageHeader, Card, Unconfirmed } from "@/components/ui";
import { CtaBand } from "@/components/site";

export const metadata = { title: "会員特典" };

const ITEMS = [
  ["経営者限定のゴルフイベント", "名門コースを中心とした毎月のゴルフイベント（原則キャディ付き・関西／関東）にご参加いただけます。"],
  ["ビジネス交流", "会員企業・経営者紹介ページで、会員同士の事業や関心を知ることができます（掲載内容は会員ご本人が公開範囲を設定）。"],
  ["提携ゴルフ場の優待", "提携ゴルフ場でのご優待をご用意します。具体的な提携先・優待内容は決定次第、会員エリアでご案内します。"],
  ["会員限定ストア", "ゴルフ用品などを会員限定でご案内するストアをご利用いただけます。"],
  ["経営・AI勉強会", "経営やAIをテーマにした勉強会を開催し、録画アーカイブも会員エリアに掲載します。"],
  ["会員証・オリジナルネームプレート", "ご入会時に会員証とオリジナルネームプレートをご登録住所へお送りします。会員エリアではデジタル会員証もご利用いただけます。"],
];

export default function BenefitsPage() {
  return (
    <>
      <PageHeader en="BENEFITS" title="会員特典" />
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-16 md:grid-cols-2">
        {ITEMS.map(([t, b]) => (
          <Card key={t}>
            <h3 className="font-serif text-lg">{t}</h3>
            <p className="mt-3 text-sm text-mute">{b}</p>
          </Card>
        ))}
      </div>
      <p className="mx-auto max-w-5xl px-4 pb-16 text-xs text-mute">
        ※特典の具体的な内容・条件は <Unconfirmed /> です。決定次第ご案内します。
      </p>
      <CtaBand />
    </>
  );
}
