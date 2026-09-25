/**
 * ============================================================
 *  ゴルフ場設定ファイル
 *  ここだけ編集すれば、名前・画像・予約リンクを変更できます。
 * ============================================================
 *
 *  name  : カードに表示するゴルフ場名
 *  image : コース写真（public/images/ 内のファイル）
 *          推奨サイズ 横1600px × 縦800px 程度 / JPG・WebP / 200KB 前後
 *          同じファイル名で上書きすれば差し替え完了です。
 *  alt   : 画像の説明（読み上げ・SEO用）
 *  url   : アフィリエイト予約ページのURL（https:// から始まるURL）
 *
 *  ※ url が https:// で始まらない場合は仮リンクとみなし、クリックしても遷移しません。
 */
window.GOLF_COURSES = [
  {
    name: "デイリー信楽カントリー倶楽部",
    image: "images/daily-shigaraki.jpg",
    alt: "デイリー信楽カントリー倶楽部のコース風景",
    url: "AFFILIATE_URL_DAILY_SHIGARAKI"
  },
  {
    name: "名阪ロイヤルゴルフクラブ",
    image: "images/meihan-royal.jpg",
    alt: "名阪ロイヤルゴルフクラブのコース風景",
    url: "AFFILIATE_URL_MEIHAN_ROYAL"
  },
  {
    name: "京阪カントリー倶楽部",
    image: "images/keihan-country.jpg",
    alt: "京阪カントリー倶楽部のクラブハウスとグリーン",
    url: "AFFILIATE_URL_KEIHAN_COUNTRY"
  },
  {
    name: "吉川ロイヤルゴルフクラブ",
    image: "images/yokawa-royal.webp",
    alt: "吉川ロイヤルゴルフクラブのコース風景",
    url: "AFFILIATE_URL_YOKAWA_ROYAL"
  }
];

/**
 * 予約ページを新しいタブで開くかどうか。
 * Instagram 内ブラウザでは同じタブで開く方がスムーズなため、false を推奨します。
 */
window.GOLF_OPEN_IN_NEW_TAB = false;
