// ============================================================================
// players.mjs — 出場プロ データ
//
// 【更新方法】
// この配列に1名＝1オブジェクトを追加・削除・並び替えするだけで「出場プロ」
// セクションと詳細モーダルに反映されます。コードは触る必要はありません。
//
// status: "announced"  → 顔写真・プロフィールを表示
//         "comingSoon" → "COMING SOON" カードとして表示（詳細は空でOK）
//
// photo: /public 以下の画像パス。未差し替えの場合は共通プレースホルダーを使用。
//
// 実在選手の戦績・プロフィールは、必ず本人確認済みの正確な情報のみを入力する
// こと（未確認の情報を推測で書かない）。
// ============================================================================

/** @typedef {{
 *   id: string,
 *   status: "announced" | "comingSoon",
 *   name: string,
 *   nameKana?: string,
 *   nameRomaji?: string,
 *   affiliation?: string,
 *   instagram?: string,
 *   profile?: string,
 *   achievements?: string[],
 *   photo?: string,
 * }} Player
 */

/** @type {Player[]} */
export const players = [
  // ---- 発表済み選手の入力例（コピーして使用してください） ----------------
  // {
  //   id: "player-01",
  //   status: "announced",
  //   name: "〇〇 〇〇",
  //   nameKana: "〇〇 〇〇",
  //   nameRomaji: "Xx Xx",
  //   affiliation: "〇〇ゴルフ倶楽部",
  //   instagram: "https://www.instagram.com/xxxxx/",
  //   profile: "プロフィール文章をここに入力します。",
  //   achievements: ["20XX年 〇〇オープン 優勝", "20XX年 〇〇選手権 3位"],
  //   photo: "/images/players/player-01.jpg",
  // },

  {
    id: "player-01",
    status: "announced",
    name: "田村祐里",
    nameKana: "たむら ゆり",
    nameRomaji: "Tamura Yuri",
    photo: "/images/players/tamura-yuri.webp",
  },
  {
    id: "player-02",
    status: "announced",
    name: "田中佑季",
    nameKana: "たなか ゆき",
    nameRomaji: "Tanaka Yuki",
    photo: "/images/players/tanaka-yuki.png",
  },
  {
    id: "player-03",
    status: "announced",
    name: "木村綾杏",
    nameKana: "きむら あやか",
    nameRomaji: "Kimura Ayaka",
    photo: "/images/players/kimura-ayaka.webp",
  },
  {
    id: "player-04",
    status: "announced",
    name: "兼松亜衣",
    nameKana: "かねまつ あい",
    nameRomaji: "Kanematsu Ai",
    photo: "/images/players/kanematsu-ai.webp",
  },
  {
    id: "player-05",
    status: "announced",
    name: "新田紗弓",
    nameKana: "にった さゆみ",
    nameRomaji: "Nitta Sayumi",
    photo: "/images/players/nitta-sayumi.webp",
  },

  ...Array.from({ length: 7 }, (_, i) => ({
    id: `coming-soon-${i + 1}`,
    status: "comingSoon",
  })),
];

export const playerCapacity = 40;

export default players;
