// ============================================================================
// sponsors.mjs — スポンサー企業データ
//
// 【更新方法】sponsors 配列に企業を追加するだけです。ランク分けはせず、
// 全社を「スポンサー企業」として横一列・同じサイズで掲載します。
// ============================================================================

/** @typedef {{ name: string, url?: string, logo?: string }} Sponsor */

/** @type {Sponsor[]} */
export const sponsors = [
  { name: "有限会社創研プランニング", logo: "/images/sponsors/soken-planning.webp" },
  { name: "ONE FOR DREAM", logo: "/images/sponsors/one-for-dream.webp" },
  { name: "山口税理士事務所", logo: "/images/sponsors/yamaguchi-zeirishi.webp" },
  { name: "株式会社岡田製作所", logo: "/images/sponsors/okada-seisakusho.webp" },
];

export default sponsors;
