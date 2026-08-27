// ============================================================================
// site.mjs — 大会の確定事実 (Single Source of Truth)
// ここに書かれた値だけが正であり、他のテンプレートはすべてこのファイルを参照する。
// 不明な情報（住所・電話の詳細等）は推測で埋めず、はっきり分かる形で保留にする。
// ============================================================================

export const site = {
  // --- 基本情報 -------------------------------------------------------
  editionNumber: 2,
  editionLabel: "第2回",
  nameJa: "第2回 SHADOW LADIES PRO-AM TOURNAMENT",
  nameEn: "2nd SHADOW LADIES PRO-AM TOURNAMENT",
  shortName: "SHADOW LADIES PRO-AM",
  tagline: "女子プロと夢の18ホール",
  taglineEn: "A Dream 18 Holes With Women's Pro Golfers",

  // --- 開催情報 -------------------------------------------------------
  eventDate: "2026-12-03",
  eventDateLabelJa: "2026年12月3日（木）",
  eventDateLabelShort: "2026.12.03 THU",

  venue: {
    name: "デイリー信楽カントリー倶楽部",
    nameEn: "Daily Shigaraki Country Club",
    address: "〒529-1821 滋賀県甲賀市信楽町多羅尾字上流1577",
    addressNote: "住所・アクセス詳細は確定次第掲載いたします。",
    mapUrl: "https://maps.app.goo.gl/t4bhC2HfAKiTQeKMA",
    phone: null,
  },

  organizer: {
    name: "合同会社ONE FOR DREAM",
    nameEn: "ONE FOR DREAM LLC",
    representative: "影山 拓真",
    representativeReading: "かげやま たくま",
  },

  // --- 大会規模 ---------------------------------------------------------
  capacity: {
    pro: 40,
    amateur: 120,
    total: 160,
    flightsPlanned: 40,
    groupFormula: "1組＝女子プロ1名＋アマチュア3名（原則）",
  },

  // --- 参加料 -----------------------------------------------------------
  amateurFee: {
    amount: 30000,
    amountLabel: "30,000円",
    unit: "1名",
    includes: [
      "大会参加費",
      "プレー費",
      "昼食費",
      "昼食時ワンドリンク",
    ],
    payment: "大会当日、プレー終了後にゴルフ場にて精算",
  },

  // --- エントリー ---------------------------------------------------------
  entry: {
    deadline: "2026-11-30",
    deadlineLabelJa: "2026年11月30日（月）",
    note: "定員になり次第、通常エントリーは終了します。定員到達後は自動的にキャンセル待ち受付に切り替わります。",
  },

  // --- キャンセル規定 -------------------------------------------------------
  cancelPolicy: [
    { period: "開催1週間前から", rate: "40%" },
    { period: "開催3日前から", rate: "60%" },
    { period: "開催前日", rate: "80%" },
    { period: "開催当日", rate: "100%" },
  ],

  dressCode: "デイリー信楽カントリー倶楽部のドレスコードを遵守",

  contact: {
    phone: "070-8366-0392",
    phoneHref: "tel:07083660392",
  },

  // --- SEO ---------------------------------------------------------------
  seo: {
    title: "第2回 SHADOW LADIES PRO-AM TOURNAMENT｜女子プロと夢の18ホール",
    description:
      "2026年12月3日（木）、デイリー信楽カントリー倶楽部にて開催。女子プロ40名・アマチュア120名が参加するSHADOW LADIES PRO-AM TOURNAMENT。",
    siteUrl: "https://shadowladies-proam.jp",
    ogImage: "/images/og-image.png",
    locale: "ja_JP",
    twitterHandle: null,
  },
};

export default site;
