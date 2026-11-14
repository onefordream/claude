import { PageHeader, Card } from "@/components/ui";
import { CtaBand } from "@/components/site";

export const metadata = { title: "ゴルフイベント" };

const POINTS = [
  ["名門コース中心", "格式あるコースを中心に開催します。"],
  ["原則キャディ付き", "ラウンド中の会話に集中できるよう、原則キャディ付きでご案内します。"],
  ["毎月開催", "毎月の定期開催を予定しています。"],
  ["関西・関東", "関西エリア・関東エリアの両方で開催します。"],
];

export default function EventsIntroPage() {
  return (
    <>
      <PageHeader en="GOLF EVENTS" title="ゴルフイベント" lead="会員限定のゴルフイベントは、会員エリアから日程の確認・お申し込みができます。" />
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-16 sm:grid-cols-2">
        {POINTS.map(([t, b]) => (
          <Card key={t}>
            <h3 className="font-serif text-lg">{t}</h3>
            <p className="mt-2 text-sm text-mute">{b}</p>
          </Card>
        ))}
      </div>
      <p className="mx-auto max-w-5xl px-4 pb-16 text-xs text-mute">※開催コース・日程・参加費は会員エリアにてご案内します（現時点で未確定）。</p>
      <CtaBand />
    </>
  );
}
