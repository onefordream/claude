// ============================================================================
// news.mjs — NEWS / お知らせ
// 配列の先頭に追加してください（新しい順に表示されます）。
// トップページには最新3件のみ表示されます。
// ============================================================================

/** @typedef {{ id: string, date: string, category: string, title: string, body?: string }} NewsItem */

/** @type {NewsItem[]} */
export const news = [
  {
    id: "news-2026-08-26-open",
    date: "2026-08-26",
    category: "エントリー",
    title: "第2回 SHADOW LADIES PRO-AM TOURNAMENT 公式サイトを公開しました",
    body: "本日より公式サイトにてエントリー受付を開始いたします。皆さまのご参加をお待ちしております。",
  },
];

export default news;
