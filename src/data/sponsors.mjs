// ============================================================================
// sponsors.mjs — スポンサー企業データ
//
// 【更新方法】sponsors 配列に企業を追加するだけです。
// isMain: true を付けた企業は「メインスポンサー」として他社より目立つ形で
// 単独掲載されます（1社を想定）。それ以外は全社「スポンサー企業」として
// 横一列・同じサイズで掲載します。
// ============================================================================

/** @typedef {{ name: string, url?: string, logo?: string, isMain?: boolean }} Sponsor */

/** @type {Sponsor[]} */
export const sponsors = [
  { name: "GOLF STUDIO SHADOW", logo: "/images/sponsors/golf-studio-shadow.jpg", isMain: true },
  { name: "合同会社ONE FOR DREAM", logo: "/images/sponsors/one-for-dream.webp" },
  { name: "有限会社創研プランニング", logo: "/images/sponsors/soken-planning.webp" },
  { name: "山口税理士事務所", logo: "/images/sponsors/yamaguchi-zeirishi.webp" },
  { name: "株式会社岡田製作所", logo: "/images/sponsors/okada-seisakusho.webp" },
];

export default sponsors;
