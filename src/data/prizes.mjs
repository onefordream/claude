// ============================================================================
// prizes.mjs — 賞金・賞品データ
// プロは「賞金」、アマチュアは必ず「金券」と表記すること（混同禁止）。
// 賞金総額は表示しない。
// ============================================================================

export const proFormat = {
  title: "プロの部",
  competition: "18ホール・ストロークプレー",
};

// 単位: 円。1位のみ視覚的に大きく強調する。
export const proPrizes = [
  { rank: 1, amount: 700000, label: "700,000円", featured: true },
  { rank: 2, amount: 300000, label: "300,000円" },
  { rank: 3, amount: 200000, label: "200,000円" },
  { rank: 4, amount: 150000, label: "150,000円" },
  { rank: 5, amount: 100000, label: "100,000円" },
  { rank: 6, amount: 80000, label: "80,000円" },
  { rank: 7, amount: 50000, label: "50,000円" },
  { rank: 8, amount: 30000, label: "30,000円" },
  { rank: 9, amount: 30000, label: "30,000円" },
  { rank: 10, amount: 20000, label: "20,000円" },
  { rank: 11, amount: 20000, label: "20,000円" },
  { rank: 12, amount: 10000, label: "10,000円" },
  { rank: 13, amount: 10000, label: "10,000円" },
];

export const amateurFormat = {
  title: "アマチュアの部",
  competition: "ダブルペリア方式",
  handicap: "ハンディキャップ上限なし",
  teamNote: "チーム戦はありません（個人戦）",
};

// 金券。現金賞金と誤読されないよう、必ず「◯◯円分」と表記する。
export const amateurPrizes = [
  { rank: 1, amount: 100000, label: "100,000円分", featured: true },
  { rank: 2, amount: 50000, label: "50,000円分" },
  { rank: 3, amount: 30000, label: "30,000円分" },
  { rank: 4, amount: 20000, label: "20,000円分" },
  { rank: 5, amount: 10000, label: "10,000円分" },
];

export const participationGift = {
  title: "参加賞",
  name: "女子プロのサイン入りオリジナルマーカー",
  description: "ご参加いただく皆さまへ、出場プロのサイン入りオリジナルマーカーをプレゼント予定です。",
  photo: null, // /images/gift/marker.jpg などに差し替え
};

export default { proFormat, proPrizes, amateurFormat, amateurPrizes, participationGift };
