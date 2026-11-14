import Link from "next/link";
import { btn, GoldRule, SectionTitle } from "@/components/ui";
import { CtaBand } from "@/components/site";
import { ENTRY_FEE, ENTRY_FEE_INCL, MONTHLY_FEE, MONTHLY_FEE_INCL } from "@/lib/constants";
import { yen } from "@/lib/format";

const VALUES = [
  { no: "01", en: "NETWORK", title: "人脈", body: "会員は審査を通過した経営者のみ。ゴルフを共にする時間が、利害を超えた信頼関係とビジネスの出会いを生みます。" },
  { no: "02", en: "PRIVILEGE", title: "優待", body: "提携ゴルフ場でのご優待や、ゴルフ用品の会員限定ストアなど、会員だけの特典をご用意します。" },
  { no: "03", en: "LEARNING", title: "学び", body: "経営・AIをテーマにした勉強会を開催。経営者同士で知見を持ち寄り、学び合う場をつくります。" },
];

export default function TopPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 border-l border-gold/30 bg-green md:block" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-36">
          <p className="text-xs tracking-[0.4em] text-gold">MEMBERS ONLY ・ BY SCREENING</p>
          <h1 className="mt-6 font-serif text-3xl leading-snug md:text-5xl md:leading-snug">
            経営者が、
            <br />
            経営者と出会う<span className="inline-block">ゴルフ倶楽部。</span>
          </h1>
          <GoldRule className="mt-8" />
          <p className="mt-8 max-w-xl text-sm text-white/80 md:text-base">
            OWNERS GOLF CLUBは、会社経営者・代表取締役・CEO・法人オーナーを対象とした、完全審査制の会員制ゴルフ＆ビジネスコミュニティです。
          </p>
          <p className="mt-3 text-sm text-gold">2027年3月 始動予定</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/apply" className="inline-flex items-center justify-center border border-gold bg-gold px-8 py-3 text-sm tracking-widest text-ink hover:bg-transparent hover:text-gold">
              入会を申請する
            </Link>
            <Link href="/concept" className={`${btn.outline} border-white/60 text-white hover:bg-white hover:text-ink`}>
              コンセプトを見る
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionTitle en="THREE VALUES" ja="3つの価値" center />
        <div className="mt-12 grid gap-px bg-line md:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.no} className="bg-white p-8">
              <p className="font-serif text-3xl text-gold">{v.no}</p>
              <p className="mt-4 text-xs tracking-[0.3em] text-mute">{v.en}</p>
              <h3 className="mt-1 font-serif text-2xl">{v.title}</h3>
              <p className="mt-4 text-sm text-mute">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2">
          <div>
            <SectionTitle en="GOLF EVENTS" ja="毎月のゴルフイベント" />
            <p className="mt-6 text-sm text-mute">名門コースを中心に、原則キャディ付きのラウンドを毎月開催します。開催エリアは関西・関東。</p>
            <Link href="/events" className={`${btn.link} mt-6 inline-block text-sm`}>イベントについて詳しく</Link>
          </div>
          <div className="flex aspect-[4/3] items-center justify-center border border-line bg-white text-xs tracking-widest text-mute">
            IMAGE（プレースホルダ）
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionTitle en="FEE" ja="料金" center />
        <div className="mx-auto mt-10 grid max-w-3xl gap-px bg-line md:grid-cols-2">
          <div className="bg-white p-8 text-center">
            <p className="text-sm text-mute">入会金</p>
            <p className="mt-2 font-serif text-3xl">{yen(ENTRY_FEE)}<span className="ml-1 text-sm">（税抜）</span></p>
            <p className="mt-1 text-xs text-mute">税込 {yen(ENTRY_FEE_INCL)}</p>
          </div>
          <div className="bg-white p-8 text-center">
            <p className="text-sm text-mute">月会費</p>
            <p className="mt-2 font-serif text-3xl">{yen(MONTHLY_FEE)}<span className="ml-1 text-sm">（税抜）</span></p>
            <p className="mt-1 text-xs text-mute">税込 {yen(MONTHLY_FEE_INCL)}</p>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-mute">お支払いは審査で承認された方のみご案内します。</p>
      </section>

      <CtaBand />
    </>
  );
}
