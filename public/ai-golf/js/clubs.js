// クラブごとの基準値
// smash: ミート率（ボール初速 / ヘッドスピード）の標準値
// spin: 標準的なバックスピン量（rpm）。単眼カメラではスピンを測れないため推定に使う
// launch: 目標打ち出し角レンジ（度）
// avgSpeed: 一般男性アマチュア平均のボール初速（m/s）
// goodSpeed: シングルハンデ相当のボール初速（m/s）
export const CLUBS = [
  { id: 'dr', name: 'ドライバー', short: '1W', smash: 1.45, spin: 2800, launch: [11, 15], avgSpeed: 58, goodSpeed: 66 },
  { id: 'fw', name: 'フェアウェイウッド', short: '3W', smash: 1.42, spin: 3800, launch: [10, 14], avgSpeed: 54, goodSpeed: 61 },
  { id: 'ut', name: 'ユーティリティ', short: 'UT', smash: 1.38, spin: 4500, launch: [12, 16], avgSpeed: 50, goodSpeed: 56 },
  { id: 'i7', name: '7番アイアン', short: '7I', smash: 1.33, spin: 6500, launch: [16, 20], avgSpeed: 44, goodSpeed: 51 },
  { id: 'pw', name: 'ピッチングウェッジ', short: 'PW', smash: 1.24, spin: 8500, launch: [23, 28], avgSpeed: 37, goodSpeed: 43 },
];

export const clubById = (id) => CLUBS.find((c) => c.id === id) || CLUBS[0];

export const SHAPES = [
  { id: 'hook', label: 'フック', side: -2 },
  { id: 'draw', label: 'ドロー', side: -1 },
  { id: 'straight', label: 'ストレート', side: 0 },
  { id: 'fade', label: 'フェード', side: 1 },
  { id: 'slice', label: 'スライス', side: 2 },
];
