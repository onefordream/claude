// プランごとの機能差はこのファイルに集約する。
// 各機能は「プラン名」ではなく entitlements の can()/limit() を問い合わせるだけにしておくと、
// あとから有料プランの追加・機能差の変更がこのファイルの編集だけで済む。

export const PLANS = {
  free: {
    id: 'free',
    label: 'フリー',
    features: {
      weeklyReview: false, // AIによる週間ふりかえり
      videoUpload: true,
      aiImageReading: true, // 写真もAIに読ませる
    },
    limits: {
      aiEntryInsightsPerMonth: 30, // 記録ごとのAI分析（超えた分は簡易分析）
      maxActiveGoals: 3,
      maxImageMB: 15,
      maxAudioMB: 25,
      maxVideoMB: 100,
      storageMB: 1024,
    },
  },
  pro: {
    id: 'pro',
    label: 'プロ',
    features: {
      weeklyReview: true,
      videoUpload: true,
      aiImageReading: true,
    },
    limits: {
      aiEntryInsightsPerMonth: 600,
      maxActiveGoals: 50,
      maxImageMB: 25,
      maxAudioMB: 100,
      maxVideoMB: 500,
      storageMB: 20 * 1024,
    },
  },
};

export const DEFAULT_PLAN = 'free';

export function entitlementsFor(planId) {
  const plan = PLANS[planId] || PLANS[DEFAULT_PLAN];
  return {
    plan: plan.id,
    label: plan.label,
    features: { ...plan.features },
    limits: { ...plan.limits },
    can(feature) {
      return plan.features[feature] === true;
    },
    limit(key) {
      return plan.limits[key];
    },
  };
}

/** サブスクリプション行から有効なプランを決める（期限切れ・解約済みは無料扱い） */
export function effectivePlan(sub, now = new Date()) {
  if (!sub) return DEFAULT_PLAN;
  const activeStatus = sub.status === 'active' || sub.status === 'trialing';
  const notExpired = !sub.current_period_end || new Date(sub.current_period_end) > now;
  return activeStatus && notExpired && PLANS[sub.plan] ? sub.plan : DEFAULT_PLAN;
}
