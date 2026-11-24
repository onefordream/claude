// ============================================================================
// news.mjs — NEWS / お知らせ
// 配列の先頭に追加してください（新しい順に表示されます）。
// トップページには最新3件のみ表示されます。
// ============================================================================

/** @typedef {{ id: string, date: string, category: string, title: string, body?: string, url?: string, linkLabel?: string }} NewsItem */

/** @type {NewsItem[]} */
export const news = [
  {
    id: "news-2026-11-24-guidelines",
    date: "2026-11-24",
    category: "大会要項",
    title: "大会要項・競技ルールを公開しました",
    body: "日程、競技方法、参加資格、エントリーフィー、キャンセル規定、競技ルール・ローカルルールなど、大会当日に関する詳細情報をまとめた大会要項を公開しました。ご参加の皆さまは事前にご確認ください。",
    url: "/documents/tournament-guidelines.pdf",
    linkLabel: "大会要項を見る（PDF）",
  },
  {
    id: "news-2026-11-24-pairings",
    date: "2026-11-24",
    category: "組み合わせ",
    title: "組み合わせ（組合表）を公開しました",
    body: "12月3日の大会当日の組み合わせ・スタート時間を公開しました。甲賀コース・伊賀コースそれぞれのスタート時間とプロ・アマチュアの組み合わせをご確認いただけます。",
    url: "/documents/pairings-2026-12-03.pdf",
    linkLabel: "組み合わせ表を見る（PDF）",
  },
  {
    id: "news-2026-10-18-practice-round",
    date: "2026-10-18",
    category: "会場",
    title: "練習ラウンドに！会場デイリー信楽カントリー倶楽部の限定特別価格のご案内",
    body: "大会に向けて、本番コースで一度練習しておきませんか？会場のデイリー信楽カントリー倶楽部を特別価格でご利用いただける限定プランをご用意しました。コースの特徴を事前に把握できる絶好の機会です、ぜひご活用ください。",
    url: "https://www3.golfyoyaku.jp/rsv_sys/dailysha_golf/shigaraki/mcalendar/index/secretPlanIds:972982?utm_source=affiliate&utm_medium=affiliate&utm_campaign=shigaraki_secret_plan&utm_content=kageyama&cid=c01m57jt7tp1qmyjvfk54v1q63j&p=pigymaqaeo7q",
    linkLabel: "限定特別価格で予約する",
  },
  {
    id: "news-2026-08-26-open",
    date: "2026-08-26",
    category: "エントリー",
    title: "第2回 SHADOW LADIES PRO-AM TOURNAMENT 公式サイトを公開しました",
    body: "本日より公式サイトにてエントリー受付を開始いたします。皆さまのご参加をお待ちしております。",
  },
];

export default news;
