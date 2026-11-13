// 実績バッジ（保存済みデータから算出。架空の実績は作らない）

export interface BadgeStats {
  level: number;
  streak: number;
  completedMissions: number;
  artifacts: number;
  meetings: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}

export function computeBadges(s: BadgeStats): Badge[] {
  const defs: [string, string, string, boolean][] = [
    ["founder", "創業者", "会社を設立した", true],
    ["first_mission", "はじめの一歩", "ミッションを初めて完了", s.completedMissions >= 1],
    ["mission_10", "実行の人", "ミッションを10回完了", s.completedMissions >= 10],
    ["first_artifact", "最初の成果物", "AI社員と成果物を作成", s.artifacts >= 1],
    ["first_meeting", "社内会議デビュー", "社内会議を開催", s.meetings >= 1],
    ["streak_3", "三日坊主卒業", "3日連続で出社", s.streak >= 3],
    ["streak_7", "皆勤賞", "7日連続で出社", s.streak >= 7],
    ["level_3", "商品企画の段階へ", "会社レベル3に到達", s.level >= 3],
    ["level_5", "事業公開の段階へ", "会社レベル5に到達", s.level >= 5],
  ];
  return defs.map(([id, title, description, earned]) => ({ id, title, description, earned }));
}
