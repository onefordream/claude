// ============================================================================
// gallery.mjs — ギャラリー データ
//
// firstTournamentGallery : 第1回大会の写真・動画（追加分をここに）
// currentTournamentGallery : 第2回大会終了後、公式写真をここに追加していく
//   （大会前は空配列のままでOK。自動的に「公開予定」表示になります）
// ============================================================================

/** @typedef {{ id: string, src: string, alt: string, size?: "large"|"normal", width: number, height: number }} GalleryImage */

/** @type {GalleryImage[]} */
export const firstTournamentGallery = [
  { id: "1st-01", src: "/images/first-tournament/first-tournament-1.jpg", alt: "参加者・スタッフの集合写真", size: "large", width: 1567, height: 1045 },
  { id: "1st-02", src: "/images/first-tournament/first-tournament-2.jpg", alt: "優勝チームの表彰式", width: 1567, height: 1045 },
  { id: "1st-03", src: "/images/first-tournament/first-tournament-3.jpg", alt: "コース脇での記念撮影", width: 1500, height: 2000 },
  { id: "1st-04", src: "/images/first-tournament/first-tournament-4.jpg", alt: "参加者同士の記念撮影", width: 1567, height: 1045 },
  { id: "1st-05", src: "/images/first-tournament/first-tournament-5.jpg", alt: "スイングする参加者", width: 1567, height: 1045 },
  { id: "1st-06", src: "/images/first-tournament/first-tournament-6.jpg", alt: "表彰式での記念撮影", width: 1567, height: 1045 },
  { id: "1st-07", src: "/images/first-tournament/first-tournament-7.jpg", alt: "ティーグラウンドでの一コマ", width: 1567, height: 1045 },
];

/** @type {GalleryImage[]} */
export const currentTournamentGallery = [];

export const firstTournamentFacts = {
  date: "2025-06-16",
  dateLabel: "2025年6月16日",
  venue: "パインレークゴルフクラブ",
  pro: 36,
  amateur: 108,
  total: 144,
};

export default { firstTournamentGallery, currentTournamentGallery, firstTournamentFacts };
