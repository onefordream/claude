// ============================================================================
// sponsors.mjs — スポンサー企業データ
//
// 【更新方法】各ランクの配列に企業を追加するだけで、ロゴサイズ・掲載位置・
// 優先順位は自動的にランクに応じたスタイルが適用されます。
// 現時点で確定しているスポンサーはいないため、全ランク空の状態＝
// 「募集中」表示になっています。
// ============================================================================

/** @typedef {{ name: string, url?: string, logo?: string }} Sponsor */

export const sponsorRanks = [
  { id: "title", label: "TITLE SPONSOR", labelJa: "タイトルスポンサー", sponsors: /** @type {Sponsor[]} */ ([]) },
  { id: "platinum", label: "PLATINUM SPONSOR", labelJa: "プラチナスポンサー", sponsors: /** @type {Sponsor[]} */ ([]) },
  { id: "gold", label: "GOLD SPONSOR", labelJa: "ゴールドスポンサー", sponsors: /** @type {Sponsor[]} */ ([]) },
  { id: "silver", label: "SILVER SPONSOR", labelJa: "シルバースポンサー", sponsors: /** @type {Sponsor[]} */ ([]) },
];

export default sponsorRanks;
