// 会社レベル（ゲーム内の進捗。現実の売上・事業成果とは無関係）

export const LEVELS: { level: number; xp: number; title: string }[] = [
  { level: 1, xp: 0, title: "会社設立" },
  { level: 2, xp: 80, title: "初めての事業計画" },
  { level: 3, xp: 220, title: "初めての商品企画" },
  { level: 4, xp: 420, title: "販売準備" },
  { level: 5, xp: 680, title: "最初の事業公開" },
  { level: 6, xp: 1000, title: "顧客との出会い" },
  { level: 7, xp: 1400, title: "仕組みづくり" },
  { level: 8, xp: 1900, title: "チーム拡大" },
  { level: 9, xp: 2500, title: "成長企業" },
  { level: 10, xp: 3200, title: "業界の注目株" },
];

export const MAX_LEVEL = LEVELS[LEVELS.length - 1].level;

export function levelForXp(xp: number): number {
  let lv = 1;
  for (const l of LEVELS) if (xp >= l.xp) lv = l.level;
  return lv;
}

export function levelTitle(level: number): string {
  return LEVELS.find((l) => l.level === level)?.title ?? LEVELS[LEVELS.length - 1].title;
}

/** 現在レベル内の進捗（0〜1）と次レベルまでの必要XP */
export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const cur = LEVELS.find((l) => l.level === level)!;
  const next = LEVELS.find((l) => l.level === level + 1);
  if (!next) return { level, ratio: 1, toNext: 0, nextTitle: null as string | null };
  const ratio = (xp - cur.xp) / (next.xp - cur.xp);
  return { level, ratio: Math.max(0, Math.min(1, ratio)), toNext: next.xp - xp, nextTitle: next.title };
}

export const MISSION_XP = { first_day: 50, daily: 40 } as const;
