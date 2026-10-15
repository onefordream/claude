import { HttpError, readJson, sendJson, str, num } from '../lib/http.js';
import { jstDate, jstMonth, addDays, isValidYmd } from '../lib/date.js';
import { DEFAULT_PARS, FAIRWAY, roundStats } from '../lib/golf.js';
import { entitlementsOf, golfRoundsWithStats, golfAnalysisData } from '../services.js';

const intIn = (v, min, max, field) => num(v, { min, max, integer: true, field });
const optInt = (v, min, max, field) => (v === null || v === undefined || v === '' ? null : intIn(v, min, max, field));

function parsInput(pars, holesCount) {
  if (!Array.isArray(pars) || pars.length !== holesCount) throw new HttpError(400, 'invalid_input', `パーを${holesCount}ホール分入力してください`);
  return pars.map((p) => intIn(p, 3, 6, 'パー'));
}

/** 成長ノートに残す1行の要約 */
export function roundSummaryText(round, st) {
  const toPar = st.toPar > 0 ? `+${st.toPar}` : st.toPar === 0 ? '±0' : `${st.toPar}`;
  const parts = [
    st.putts != null && `パット${st.putts}`,
    st.fwPct != null && `FWキープ${st.fwPct}%`,
    st.girPct != null && `パーオン${st.girPct}%`,
    st.ob != null && `OB${st.ob}`,
  ].filter(Boolean);
  return `ゴルフ｜${round.course_name}（${st.holesPlayed}H） ${st.score}（${toPar}）${parts.length ? `｜${parts.join(' / ')}` : ''}`;
}

export function registerGolfRoutes(router, app) {
  const { repo, worker } = app;

  function loadRound(userId, id) {
    const r = repo.golf.get(userId, id);
    if (!r) throw new HttpError(404, 'not_found', 'ラウンドが見つかりません');
    return r;
  }
  function present(userId, round) {
    const holes = round.mode === 'hole' ? repo.golf.holes(userId, round.id) : [];
    return {
      round: {
        id: round.id, playedOn: round.played_on, courseName: round.course_name, tee: round.tee, holesCount: round.holes_count,
        pars: round.pars, mode: round.mode, totals: round.totals, driveDistance: round.drive_distance, note: round.note,
        status: round.status, entryId: round.entry_id, finishedAt: round.finished_at,
      },
      holes: holes.map((h) => ({ no: h.hole_no, par: h.par, score: h.score, putts: h.putts, fairway: h.fairway, ob: h.ob, bunker: !!h.bunker, penalty: h.penalty })),
      stats: roundStats(round, holes),
    };
  }

  /** 終了済みのラウンドを修正したら、成長ノートの記録の要約も最新にする */
  function syncEntry(userId, roundId) {
    const round = repo.golf.get(userId, roundId);
    if (!round || round.status !== 'done' || !round.entry_id || !repo.entries.get(userId, round.entry_id)) return;
    const { stats } = present(userId, round);
    if (stats.score == null) return;
    repo.entries.update(userId, round.entry_id, { body: `${roundSummaryText(round, stats)}${round.note ? `\n\n${round.note}` : ''}` });
  }

  router.get('/api/golf/courses', async (ctx) => {
    sendJson(ctx.res, 200, { courses: repo.golf.courses(ctx.user.id), defaultPars: DEFAULT_PARS });
  });

  router.get('/api/golf/rounds', async (ctx) => {
    const list = golfRoundsWithStats(repo, ctx.user.id, { limit: 100 });
    const done = list.filter((x) => x.round.status === 'done' && x.stats.complete && x.stats.holesPlayed === 18);
    sendJson(ctx.res, 200, {
      rounds: list.map(({ round, stats }) => ({
        id: round.id, playedOn: round.played_on, courseName: round.course_name, holesCount: round.holes_count, status: round.status, mode: round.mode,
        score: stats.score, toPar: stats.toPar, holesPlayed: stats.holesPlayed, putts: stats.putts, fwPct: stats.fwPct, girPct: stats.girPct, ob: stats.ob,
      })),
      // 基本の数字は無料でも見られる
      summary: {
        rounds: list.filter((x) => x.round.status === 'done').length,
        best: done.reduce((m, x) => (m == null || x.stats.score < m ? x.stats.score : m), null),
        average: done.length ? Math.round((done.slice(0, 10).reduce((s, x) => s + x.stats.score, 0) / Math.min(10, done.length)) * 10) / 10 : null,
      },
    });
  });

  router.post('/api/golf/rounds', async (ctx) => {
    const userId = ctx.user.id;
    const body = await readJson(ctx.req);
    const today = jstDate();
    const playedOn = body.playedOn ?? today;
    if (!isValidYmd(playedOn) || playedOn > today || playedOn < addDays(today, -730)) throw new HttpError(400, 'invalid_input', 'プレー日が正しくありません');
    const holesCount = body.holesCount === 9 ? 9 : 18;
    const mode = body.mode === 'total' ? 'total' : 'hole';
    const courseName = str(body.courseName || 'コース名なし', { min: 1, max: 60, field: 'コース名' });
    const pars = parsInput(body.pars ?? DEFAULT_PARS.slice(0, holesCount), holesCount);
    const round = repo.golf.create(userId, { playedOn, courseName, tee: str(body.tee, { max: 20, field: 'ティー' }), holesCount, pars, mode });
    sendJson(ctx.res, 201, present(userId, round));
  });

  router.get('/api/golf/rounds/:id', async (ctx) => {
    sendJson(ctx.res, 200, present(ctx.user.id, loadRound(ctx.user.id, ctx.params.id)));
  });

  /** 1ホール分を保存（ホールを移るたびに自動保存される） */
  router.put('/api/golf/rounds/:id/holes/:no', async (ctx) => {
    const userId = ctx.user.id;
    const round = loadRound(userId, ctx.params.id);
    if (round.mode !== 'hole') throw new HttpError(400, 'invalid_mode', 'このラウンドは合計入力です');
    const no = intIn(ctx.params.no, 1, round.holes_count, 'ホール番号');
    const body = await readJson(ctx.req);
    const par = body.par != null ? intIn(body.par, 3, 6, 'パー') : round.pars[no - 1];
    const score = optInt(body.score, 1, 20, 'スコア');
    const putts = optInt(body.putts, 0, 10, 'パット数');
    if (score != null && putts != null && putts >= score) throw new HttpError(400, 'invalid_input', 'パット数がスコア以上になっています');
    const fairway = par >= 4 && FAIRWAY.includes(body.fairway) ? body.fairway : null;
    repo.golf.saveHole(userId, round.id, no, {
      par, score, putts, fairway,
      ob: optInt(body.ob, 0, 10, 'OB') ?? 0,
      bunker: !!body.bunker,
      penalty: optInt(body.penalty, 0, 10, 'ペナルティ') ?? 0,
    });
    if (par !== round.pars[no - 1]) {
      const pars = [...round.pars];
      pars[no - 1] = par;
      repo.golf.update(userId, round.id, { pars });
    }
    syncEntry(userId, round.id);
    sendJson(ctx.res, 200, present(userId, repo.golf.get(userId, round.id)));
  });

  router.patch('/api/golf/rounds/:id', async (ctx) => {
    const userId = ctx.user.id;
    const round = loadRound(userId, ctx.params.id);
    const body = await readJson(ctx.req);
    const f = {};
    if (body.courseName !== undefined) f.courseName = str(body.courseName, { min: 1, max: 60, field: 'コース名' });
    if (body.tee !== undefined) f.tee = str(body.tee, { max: 20, field: 'ティー' });
    if (body.note !== undefined) f.note = str(body.note, { max: 2000, field: 'メモ' });
    if (body.playedOn !== undefined) {
      if (!isValidYmd(body.playedOn) || body.playedOn > jstDate()) throw new HttpError(400, 'invalid_input', 'プレー日が正しくありません');
      f.playedOn = body.playedOn;
    }
    if (body.pars !== undefined) f.pars = parsInput(body.pars, round.holes_count);
    if (body.driveDistance !== undefined) f.driveDistance = optInt(body.driveDistance, 80, 400, 'ドライバー飛距離');
    if (body.totals !== undefined) {
      if (round.mode !== 'total') throw new HttpError(400, 'invalid_mode', 'このラウンドはホールごとの入力です');
      const t = body.totals || {};
      const n = round.holes_count;
      const totals = {
        score: optInt(t.score, n, n * 15, 'スコア'),
        putts: optInt(t.putts, 0, n * 6, 'パット数'),
        threePutts: optInt(t.threePutts, 0, n, '3パット'),
        fwHit: optInt(t.fwHit, 0, n, 'FWキープ'),
        fwChances: optInt(t.fwChances, 0, n, 'FWを狙ったホール'),
        gir: optInt(t.gir, 0, n, 'パーオン'),
        ob: optInt(t.ob, 0, 30, 'OB'),
        penalties: optInt(t.penalties, 0, 30, 'ペナルティ'),
        sandChances: optInt(t.sandChances, 0, n, 'バンカー'),
        sandSaves: optInt(t.sandSaves, 0, n, 'サンドセーブ'),
      };
      if (totals.fwHit != null && totals.fwChances != null && totals.fwHit > totals.fwChances) throw new HttpError(400, 'invalid_input', 'FWキープの数が多すぎます');
      if (totals.sandSaves != null && totals.sandChances != null && totals.sandSaves > totals.sandChances) throw new HttpError(400, 'invalid_input', 'サンドセーブの数が多すぎます');
      f.totals = totals;
    }
    repo.golf.update(userId, round.id, f);
    syncEntry(userId, round.id);
    sendJson(ctx.res, 200, present(userId, repo.golf.get(userId, round.id)));
  });

  /** ラウンドを終える: 成長ノートに記録を作り（2回目以降は更新）、コースのパーを覚える */
  router.post('/api/golf/rounds/:id/finish', async (ctx) => {
    const userId = ctx.user.id;
    const round = loadRound(userId, ctx.params.id);
    const body = await readJson(ctx.req);
    const { stats } = present(userId, round);
    if (stats.score == null) throw new HttpError(400, 'not_ready', 'スコアを入力してください');
    const note = body.note !== undefined ? str(body.note, { max: 2000, field: 'メモ' }) : round.note;
    const mood = body.mood == null || body.mood === '' ? null : intIn(body.mood, 1, 5, '気分');
    const text = `${roundSummaryText(round, stats)}${note ? `\n\n${note}` : ''}`;
    const prevBest = golfRoundsWithStats(repo, userId, { status: 'done', limit: 200 })
      .filter((x) => x.round.id !== round.id && x.stats.complete && x.stats.holesPlayed === round.holes_count)
      .reduce((m, x) => (m == null || x.stats.score < m ? x.stats.score : m), null);

    const entryId = repo.tx(() => {
      repo.golf.update(userId, round.id, { note });
      let id = round.entry_id && repo.entries.get(userId, round.entry_id) ? round.entry_id : null;
      if (id) {
        repo.entries.update(userId, id, { body: text, ...(body.mood !== undefined ? { mood } : {}) });
      } else {
        id = repo.entries.create(userId, { body: text, mood, goalId: null, localDate: round.played_on });
        const mediaIds = Array.isArray(body.mediaIds) ? body.mediaIds.filter((x) => typeof x === 'string').slice(0, 10) : [];
        repo.media.attach(userId, id, mediaIds);
        const insightId = repo.insights.createPending(userId, { entryId: id, scope: 'entry' });
        repo.jobs.enqueue(userId, 'entry_insight', { entryId: id, insightId });
      }
      if (Array.isArray(body.storeIds)) repo.shares.setForEntry(userId, id, body.storeIds.filter((x) => typeof x === 'string'));
      repo.golf.finish(userId, round.id, id);
      repo.golf.rememberCourse(userId, round.course_name, round.pars);
      return id;
    });
    worker.kick();
    sendJson(ctx.res, 200, {
      ...present(userId, repo.golf.get(userId, round.id)),
      entryId,
      personalBest: stats.complete && (prevBest == null || stats.score < prevBest) && prevBest != null,
      firstRound: prevBest == null,
    });
  });

  /** ラウンドを削除（成長ノートの記録は残す） */
  router.delete('/api/golf/rounds/:id', async (ctx) => {
    if (!repo.golf.remove(ctx.user.id, ctx.params.id)) throw new HttpError(404, 'not_found', 'ラウンドが見つかりません');
    sendJson(ctx.res, 200, { ok: true });
  });

  // ---------- 分析（プロ） ----------
  function coachState(userId, ent) {
    const limit = ent.limit('aiGolfCoachPerMonth');
    const used = repo.billing.usage(userId, jstMonth(), 'ai_golf_coach');
    return { latest: repo.insights.latestAny(userId, 'golf'), remaining: Math.max(0, limit - used), limit };
  }

  /** 無料の人には数値を返さず、いちばんの伸びしろの名前だけを見せる */
  router.get('/api/golf/analysis', async (ctx) => {
    const userId = ctx.user.id;
    const ent = entitlementsOf(repo, userId);
    const data = golfAnalysisData(repo, userId);
    if (!data) {
      sendJson(ctx.res, 200, { ready: false, locked: !ent.can('golfAnalytics') });
      return;
    }
    if (!ent.can('golfAnalytics')) {
      sendJson(ctx.res, 200, { ready: true, locked: true, teaser: { topArea: data.potentials.items[0]?.label ?? null, rounds: data.agg.rounds } });
      return;
    }
    const { notes, ...rest } = data;
    sendJson(ctx.res, 200, { ready: true, locked: false, ...rest, coach: coachState(userId, ent) });
  });

  router.post('/api/golf/coach', async (ctx) => {
    const userId = ctx.user.id;
    const ent = entitlementsOf(repo, userId);
    if (!ent.can('golfAnalytics')) throw new HttpError(402, 'plan_required', 'ゴルフAIコーチはプロプランの機能です');
    if (!golfAnalysisData(repo, userId)) throw new HttpError(400, 'not_ready', 'ラウンドを1つ以上記録すると分析できます');
    const state = coachState(userId, ent);
    if (state.latest?.status === 'pending') throw new HttpError(409, 'pending', 'AIコーチが分析中です');
    if (state.remaining <= 0) throw new HttpError(429, 'limit', `今月のAIコーチは${state.limit}回までです`);
    repo.tx(() => {
      const insightId = repo.insights.createPending(userId, { scope: 'golf' });
      repo.jobs.enqueue(userId, 'golf_coach', { insightId });
      repo.billing.addUsage(userId, jstMonth(), 'ai_golf_coach', 1);
    });
    worker.kick();
    sendJson(ctx.res, 202, { coach: coachState(userId, ent) });
  });
}
