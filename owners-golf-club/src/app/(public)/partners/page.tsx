import { PageHeader, Card } from "@/components/ui";
import { CtaBand } from "@/components/site";

export const metadata = { title: "提携ゴルフ場・メーカー" };

export default function PartnersPage() {
  return (
    <>
      <PageHeader en="PARTNERS" title="提携ゴルフ場・メーカー" lead="会員の皆さまにご優待をご提供いただく提携先をご紹介します。" />
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-16 md:grid-cols-2">
        <Card>
          <p className="text-xs tracking-[0.3em] text-gold">GOLF COURSES</p>
          <h3 className="mt-2 font-serif text-xl">提携ゴルフ場</h3>
          <p className="mt-4 text-sm text-mute">提携ゴルフ場は現在調整中です。決定次第、こちらと会員エリアで地域別にご紹介します。</p>
        </Card>
        <Card>
          <p className="text-xs tracking-[0.3em] text-gold">MAKERS</p>
          <h3 className="mt-2 font-serif text-xl">提携メーカー</h3>
          <p className="mt-4 text-sm text-mute">提携メーカーは現在調整中です。決定次第ご紹介します。</p>
        </Card>
      </div>
      <CtaBand />
    </>
  );
}
