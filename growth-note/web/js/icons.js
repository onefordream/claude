import { raw } from './ui.js';

// アイコンは Phosphor Icons の形（256 グリッド・角丸の線端）に合わせて、使う分だけを置いている。
// 機能を示す場所（タブ・戻る・閉じる・削除・編集・検索・添付・録音）にだけ使い、見出しの飾りには使わない。
// サイズは 16 / 20 の2種類のみ。16 は Regular（線幅16）、20 は Light（線幅12）。
const P = {
  house: '<path d="M104,216V152h48v64h64V120a8,8,0,0,0-2.34-5.66l-80-80a8,8,0,0,0-11.32,0l-80,80A8,8,0,0,0,40,120v96Z"/>',
  notebook: '<line x1="112" y1="112" x2="176" y2="112"/><line x1="112" y1="144" x2="176" y2="144"/><rect x="40" y="40" width="176" height="176" rx="8"/><line x1="80" y1="40" x2="80" y2="216"/>',
  plus: '<line x1="40" y1="128" x2="216" y2="128"/><line x1="128" y1="40" x2="128" y2="216"/>',
  target: '<line x1="128" y1="128" x2="224" y2="32"/><path d="M195.88,60.12A95.92,95.92,0,1,0,218,94.56"/><path d="M161.94,94.06A48,48,0,1,0,176,128"/>',
  user: '<circle cx="128" cy="96" r="64"/><path d="M32,216c19.37-33.47,54.55-56,96-56s76.63,22.53,96,56"/>',
  caretLeft: '<polyline points="160 208 80 128 160 48"/>',
  caretRight: '<polyline points="96 48 176 128 96 208"/>',
  x: '<line x1="200" y1="56" x2="56" y2="200"/><line x1="200" y1="200" x2="56" y2="56"/>',
  trash: '<line x1="216" y1="56" x2="40" y2="56"/><line x1="104" y1="104" x2="104" y2="168"/><line x1="152" y1="104" x2="152" y2="168"/><path d="M200,56V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V56"/><path d="M168,56V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V56"/>',
  pencil: '<path d="M92.69,216H48a8,8,0,0,1-8-8V163.31a8,8,0,0,1,2.34-5.65L165.66,34.34a8,8,0,0,1,11.31,0L221.66,79a8,8,0,0,1,0,11.31L98.34,213.66A8,8,0,0,1,92.69,216Z"/><line x1="136" y1="64" x2="192" y2="120"/>',
  search: '<circle cx="112" cy="112" r="80"/><line x1="168.57" y1="168.57" x2="224" y2="224"/>',
  mic: '<rect x="88" y="24" width="80" height="144" rx="40"/><line x1="128" y1="200" x2="128" y2="232"/><path d="M200,128a72,72,0,0,1-144,0"/>',
  camera: '<path d="M208,208H48a16,16,0,0,1-16-16V80A16,16,0,0,1,48,64H80L96,40h64l16,24h32a16,16,0,0,1,16,16V192A16,16,0,0,1,208,208Z"/><circle cx="128" cy="132" r="36"/>',
  video: '<rect x="24" y="64" width="176" height="128" rx="16"/><polyline points="200 112 248 80 248 176 200 144"/>',
  image: '<rect x="32" y="48" width="192" height="160" rx="8"/><circle cx="156" cy="100" r="12"/><path d="M147.31,164,173,138.34a8,8,0,0,1,11.31,0L224,178.06"/><path d="M32,168.69l54.34-54.35a8,8,0,0,1,11.32,0L191.31,208"/>',
  check: '<polyline points="40 144 96 200 224 72"/>',
  stop: '<rect x="56" y="56" width="144" height="144" rx="8"/>',
};

export function icon(name, { size = 20, cls = '' } = {}) {
  const s = size <= 16 ? 16 : 20;
  const weight = s === 16 ? 16 : 12;
  return raw(
    `<svg class="icon ${cls}" width="${s}" height="${s}" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`,
  );
}
