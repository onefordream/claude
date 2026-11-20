// AIコーチ（サーバー経由で Claude に指導を書いてもらう）
import { COACH_API_URL, COACH_APP_KEY } from './config.js';
import { sessionStats } from './coach.js';

export const aiCoachEnabled = () => !!COACH_API_URL;

/** 診断結果と履歴から、サーバーに送る数値だけのデータを作る */
export function buildCoachPayload(session, diagnosis, allSessions) {
  const st = diagnosis.stats;
  const p = diagnosis.potential;
  const shapes = {};
  Object.entries(st.shapeCount).forEach(([k, v]) => { shapes[k] = v; });
  const history = allSessions
    .filter((s) => s.club === session.club && s.id !== session.id && s.date < session.date && !s.sample)
    .sort((a, b) => b.date - a.date)
    .slice(0, 8)
    .map((s) => {
      const h = sessionStats(s);
      return {
        daysAgo: Math.max(0, Math.round((session.date - s.date) / 86400000)),
        shots: h.n,
        avgCarry: +h.avgCarry.toFixed(1),
        avgSpeed: +h.avgSpeed.toFixed(1),
        avgLaunch: +h.avgLaunch.toFixed(1),
        consistency: h.scores.consistency,
      };
    });
  const r1 = (v) => +v.toFixed(1);
  return {
    club: session.club,
    shots: st.n,
    avgSpeed: r1(st.avgSpeed),
    maxSpeed: r1(st.maxSpeed),
    avgLaunch: r1(st.avgLaunch),
    launchSd: r1(st.launchSd),
    speedCvPct: r1(st.speedCv * 100),
    headSpeed: r1(st.headSpeed),
    avgCarry: r1(st.avgCarry),
    maxCarry: r1(st.maxCarry),
    targetLaunch: st.club.launch,
    shapes,
    scores: st.scores,
    issues: diagnosis.issues.map((i) => i.id),
    potential: {
      now: r1(p.now), best: r1(p.best),
      launch: r1(p.steps[0].gain), meet: r1(p.steps[1].gain), speed: r1(p.steps[2].gain),
    },
    history,
  };
}

export async function fetchCoach(payload, { timeoutMs = 90000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${COACH_API_URL.replace(/\/$/, '')}/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(COACH_APP_KEY ? { 'X-App-Key': COACH_APP_KEY } : {}) },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.coach) throw new Error(body.message || `AIコーチに接続できませんでした（${res.status}）`);
    return body.coach;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AIコーチの応答が遅いため中断しました。');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
