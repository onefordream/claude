// プランごとの機能差はこのファイルに集約する。
// 各機能は「プラン名」ではなく entitlements の can()/limit() を問い合わせるだけにしておくと、
// あとから有料プランの追加・機能差の変更がこのファイルの編集だけで済む。

export const PLANS = {
  free: {
    id: 'free',
    label: 'フリー',
    features: {
      aiEntryInsight: false, // 記録ごとのAIふりかえり（無料は体験回数のみ）
      growthAnalytics: false, // 成長レベル・レーダー・推移・足りないもの
      aiSelfAnalysis: false, // AIによる自己分析
      weeklyReview: false, // AIによる週間ふりかえり
      golfAnalytics: false, // ゴルフのデータ分析（能力レーダー・伸びしろ・推移）とAIコーチ
      videoUpload: true,
      aiImageReading: true, // 写真もAIに読ませる
    },
    limits: {
      aiTrialCredits: 3, // 無料で体験できるAIふりかえりの回数（通算）
      aiEntryInsightsPerMonth: 0,
      aiSelfAnalysesPerMonth: 0,
      aiGolfCoachPerMonth: 0,
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
      aiEntryInsight: true,
      growthAnalytics: true,
      aiSelfAnalysis: true,
      weeklyReview: true,
      golfAnalytics: true,
      videoUpload: true,
      aiImageReading: true,
    },
    limits: {
      aiTrialCredits: 0,
      aiEntryInsightsPerMonth: 600,
      aiSelfAnalysesPerMonth: 8,
      aiGolfCoachPerMonth: 10,
      maxActiveGoals: 50,
      maxImageMB: 25,
      maxAudioMB: 100,
      maxVideoMB: 500,
      storageMB: 20 * 1024,
    },
  },
};

// 料金（表示用）。実際の請求額は Stripe の Price で決まるので、両方を合わせて変更する。
export const PRICING = {
  month: { interval: 'month', label: '月額', amount: 580, note: '' },
  year: { interval: 'year', label: '年額', amount: 5800, note: '2か月分おトク' },
  trialDays: 7,
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
  // past_due（支払い失敗のリトライ中）は猶予期間としてプロのまま使える
  const activeStatus = ['active', 'trialing', 'past_due'].includes(sub.status);
  const notExpired = !sub.current_period_end || new Date(sub.current_period_end) > now;
  return activeStatus && notExpired && PLANS[sub.plan] ? sub.plan : DEFAULT_PLAN;
}

// 店舗（レッスン先）側のプラン。生徒側のプランとは独立して課金できるようにしておく。
export const STORE_PLANS = {
  free: { id: 'free', label: 'お試し', limits: { maxMembers: 30, maxStaff: 3 } },
  standard: { id: 'standard', label: 'スタンダード', limits: { maxMembers: 300, maxStaff: 20 } },
};

export function storeEntitlements(planId) {
  const plan = STORE_PLANS[planId] || STORE_PLANS.free;
  return { plan: plan.id, label: plan.label, limits: { ...plan.limits }, limit: (k) => plan.limits[k] };
}

/** 1人が作れる店舗の数 */
export const MAX_OWNED_STORES = 3;
