import { HttpError, readJson, sendJson, str } from '../lib/http.js';
import { RateLimiter } from '../lib/auth.js';
import { jstDate } from '../lib/date.js';
import { computeStreak } from '../lib/stats.js';
import { storeEntitlements, MAX_OWNED_STORES } from '../lib/plans.js';
import { normalizeCode, formatCode } from '../repo/stores.js';

const SHARE_MODES = ['selected', 'all'];

export const STORE_CATEGORIES = ['スポーツ', 'フィットネス', '音楽', '語学', '学習塾', 'アート・ものづくり', 'ダンス', 'その他'];

function presentStoreForMember(s) {
  return { id: s.id, name: s.name, category: s.category, description: s.description, requireApproval: !!s.require_approval };
}

function presentLink(l) {
  return {
    id: l.id,
    status: l.status,
    shareMode: l.share_mode,
    createdAt: l.created_at,
    approvedAt: l.approved_at,
    store: { id: l.store_id, name: l.store_name, category: l.store_category, description: l.store_description },
    sharedCount: l.shared_count ?? undefined,
    unreadComments: l.unread_comments ?? undefined,
  };
}

export function registerStoreRoutes(router, app) {
  const { repo } = app;
  // 店舗IDの総当たりを防ぐ
  const lookupLimiter = new RateLimiter({ max: 20, windowMs: 15 * 60 * 1000 });
  app.onClose(() => lookupLimiter.close());

  function findStoreByCodeOrThrow(ctx, code) {
    const key = ctx.user.id;
    if (lookupLimiter.isLimited(key)) throw new HttpError(429, 'rate_limited', '店舗IDの確認回数が多すぎます。しばらく待ってからお試しください');
    const normalized = normalizeCode(code);
    const store = normalized.length === 8 ? repo.stores.getByCode(normalized) : null;
    if (!store) {
      lookupLimiter.hit(key);
      throw new HttpError(404, 'store_not_found', '店舗IDが見つかりません。教室・お店で案内されたIDをご確認ください');
    }
    return store;
  }

  // ================= 生徒（個人ユーザー）側 =================

  router.get('/api/stores/lookup', async (ctx) => {
    const store = findStoreByCodeOrThrow(ctx, ctx.query.get('code'));
    const link = repo.links.find(store.id, ctx.user.id);
    sendJson(ctx.res, 200, {
      store: presentStoreForMember(store),
      existing: link && ['pending', 'active'].includes(link.status) ? { id: link.id, status: link.status } : null,
    });
  });

  router.get('/api/links', async (ctx) => {
    sendJson(ctx.res, 200, { links: repo.links.forUser(ctx.user.id).map(presentLink) });
  });

  router.post('/api/links', async (ctx) => {
    const body = await readJson(ctx.req);
    const store = findStoreByCodeOrThrow(ctx, body.code);
    const shareMode = SHARE_MODES.includes(body.shareMode) ? body.shareMode : 'selected';
    if (repo.stores.role(store.id, ctx.user.id)) {
      throw new HttpError(409, 'own_store', 'ご自身がスタッフの店舗とは連携できません');
    }
    const existing = repo.links.find(store.id, ctx.user.id);
    if (existing?.status === 'active') throw new HttpError(409, 'already_linked', 'この店舗とはすでに連携しています');
    if (existing?.status === 'pending') throw new HttpError(409, 'already_requested', 'この店舗の承認を待っています');
    // 承認不要の店舗でも、人数の上限を超えるときは承認待ちにする
    const full = repo.links.countActive(store.id) >= storeEntitlements(store.plan).limit('maxMembers');
    const link = repo.links.request(ctx.user.id, store.id, { shareMode, autoApprove: !store.require_approval && !full });
    sendJson(ctx.res, 201, { link: presentLink(repo.links.getForUser(ctx.user.id, link.id)) });
  });

  router.get('/api/links/:id', async (ctx) => {
    const l = repo.links.getForUser(ctx.user.id, ctx.params.id);
    if (!l || !['pending', 'active'].includes(l.status)) throw new HttpError(404, 'not_found', '連携が見つかりません');
    const full = repo.links.forUser(ctx.user.id).find((x) => x.id === l.id);
    sendJson(ctx.res, 200, { link: presentLink({ ...l, ...full, store_description: l.store_description }) });
  });

  router.patch('/api/links/:id', async (ctx) => {
    const l = repo.links.getForUser(ctx.user.id, ctx.params.id);
    if (!l || !['pending', 'active'].includes(l.status)) throw new HttpError(404, 'not_found', '連携が見つかりません');
    const body = await readJson(ctx.req);
    if (!SHARE_MODES.includes(body.shareMode)) throw new HttpError(400, 'invalid_input', '共有のしかたが正しくありません');
    repo.links.setShareMode(ctx.user.id, l.id, body.shareMode);
    sendJson(ctx.res, 200, { link: presentLink(repo.links.getForUser(ctx.user.id, l.id)) });
  });

  /** 連携をやめる: その瞬間から店舗は記録を見られなくなる */
  router.delete('/api/links/:id', async (ctx) => {
    const l = repo.links.getForUser(ctx.user.id, ctx.params.id);
    if (!l || !['pending', 'active'].includes(l.status)) throw new HttpError(404, 'not_found', '連携が見つかりません');
    repo.links.setStatus(l.id, 'ended');
    sendJson(ctx.res, 200, { ok: true });
  });

  /** 記録の共有先を変更する */
  router.put('/api/entries/:id/shares', async (ctx) => {
    const entry = repo.entries.get(ctx.user.id, ctx.params.id);
    if (!entry) throw new HttpError(404, 'not_found', '記録が見つかりません');
    const body = await readJson(ctx.req);
    const storeIds = Array.isArray(body.storeIds) ? body.storeIds.filter((x) => typeof x === 'string') : [];
    repo.shares.setForEntry(ctx.user.id, entry.id, storeIds);
    sendJson(ctx.res, 200, { entry: repo.entries.enrich(ctx.user.id, [entry])[0] });
  });

  // ================= 店舗（先生・スタッフ）側 =================

  function staffStore(ctx, { owner = false } = {}) {
    const store = repo.stores.get(ctx.params.id);
    const role = store ? repo.stores.role(store.id, ctx.user.id) : null;
    if (!store || !role) throw new HttpError(404, 'not_found', '店舗が見つかりません');
    if (owner && role !== 'owner') throw new HttpError(403, 'forbidden', 'この操作は店舗のオーナーだけができます');
    return { store, role };
  }

  function presentStoreForStaff(s, role) {
    const ent = storeEntitlements(s.plan);
    return {
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      code: formatCode(s.code),
      staffCode: role === 'owner' ? formatCode(s.staff_code) : null,
      requireApproval: !!s.require_approval,
      role,
      plan: { id: ent.plan, label: ent.label, limits: ent.limits },
      activeMembers: s.active_members ?? repo.links.countActive(s.id),
      pendingMembers: s.pending_members ?? undefined,
    };
  }

  function storeInput(body, { partial = false } = {}) {
    const out = {};
    if (!partial || body.name !== undefined) out.name = str(body.name, { min: 1, max: 40, field: '店舗名' });
    if (!partial || body.category !== undefined) {
      const c = str(body.category, { max: 20, field: 'ジャンル' });
      out.category = c;
    }
    if (!partial || body.description !== undefined) out.description = str(body.description, { max: 200, field: '紹介文' });
    if (body.requireApproval !== undefined) out.requireApproval = !!body.requireApproval;
    return out;
  }

  router.get('/api/stores', async (ctx) => {
    sendJson(ctx.res, 200, {
      stores: repo.stores.mine(ctx.user.id).map((s) => presentStoreForStaff(s, s.role)),
      categories: STORE_CATEGORIES,
    });
  });

  router.post('/api/stores', async (ctx) => {
    if (repo.stores.countOwned(ctx.user.id) >= MAX_OWNED_STORES) {
      throw new HttpError(402, 'plan_limit', `作成できる店舗は${MAX_OWNED_STORES}つまでです`);
    }
    const input = storeInput(await readJson(ctx.req));
    const store = repo.stores.create(ctx.user.id, input);
    sendJson(ctx.res, 201, { store: presentStoreForStaff(store, 'owner') });
  });

  router.post('/api/stores/join-staff', async (ctx) => {
    if (lookupLimiter.isLimited(ctx.user.id)) throw new HttpError(429, 'rate_limited', '確認回数が多すぎます。しばらく待ってからお試しください');
    const body = await readJson(ctx.req);
    const store = repo.stores.getByStaffCode(body.code);
    if (!store) {
      lookupLimiter.hit(ctx.user.id);
      throw new HttpError(404, 'store_not_found', 'スタッフ招待コードが見つかりません');
    }
    if (repo.stores.staff(store.id).length >= storeEntitlements(store.plan).limit('maxStaff')) {
      throw new HttpError(402, 'plan_limit', 'この店舗のスタッフ数が上限に達しています');
    }
    // 生徒として連携していた場合は、スタッフになるタイミングで連携を終える
    const asMember = repo.links.find(store.id, ctx.user.id);
    if (asMember && ['pending', 'active'].includes(asMember.status)) repo.links.setStatus(asMember.id, 'ended');
    repo.stores.addStaff(store.id, ctx.user.id);
    sendJson(ctx.res, 200, { store: presentStoreForStaff(store, repo.stores.role(store.id, ctx.user.id)) });
  });

  router.get('/api/stores/:id', async (ctx) => {
    const { store, role } = staffStore(ctx);
    sendJson(ctx.res, 200, {
      store: presentStoreForStaff(store, role),
      staff: repo.stores.staff(store.id).map((u) => ({ id: u.id, name: u.display_name, role: u.role, isMe: u.id === ctx.user.id })),
      categories: STORE_CATEGORIES,
    });
  });

  router.patch('/api/stores/:id', async (ctx) => {
    const { store } = staffStore(ctx, { owner: true });
    const updated = repo.stores.update(store.id, storeInput(await readJson(ctx.req), { partial: true }));
    sendJson(ctx.res, 200, { store: presentStoreForStaff(updated, 'owner') });
  });

  /** 店舗IDやスタッフ招待コードを作り直す（漏れたときなど）。既存の連携はそのまま */
  router.post('/api/stores/:id/regenerate-code', async (ctx) => {
    const { store } = staffStore(ctx, { owner: true });
    const body = await readJson(ctx.req);
    const updated = repo.stores.regenerateCode(store.id, body.type === 'staff' ? 'staff' : 'member');
    sendJson(ctx.res, 200, { store: presentStoreForStaff(updated, 'owner') });
  });

  router.delete('/api/stores/:id/staff/:userId', async (ctx) => {
    const { store } = staffStore(ctx, { owner: true });
    repo.stores.removeStaff(store.id, ctx.params.userId);
    sendJson(ctx.res, 200, { ok: true });
  });

  router.get('/api/stores/:id/members', async (ctx) => {
    const { store } = staffStore(ctx);
    const today = jstDate();
    const members = repo.links.membersOfStore(store.id).map((m) => {
      const streak = m.status === 'active' ? computeStreak(repo.links.sharedDates(store.id, m.user_id), today) : null;
      return {
        linkId: m.id,
        name: m.display_name,
        status: m.status,
        shareMode: m.share_mode,
        requestedAt: m.created_at,
        sharedCount: m.shared_count,
        lastSharedDate: m.last_shared_date,
        streak: streak?.current ?? 0,
      };
    });
    sendJson(ctx.res, 200, { members });
  });

  function memberLink(ctx, store) {
    const link = repo.links.getForStore(store.id, ctx.params.linkId);
    if (!link || !['pending', 'active'].includes(link.status)) throw new HttpError(404, 'not_found', 'メンバーが見つかりません');
    return link;
  }

  router.post('/api/stores/:id/members/:linkId/approve', async (ctx) => {
    const { store } = staffStore(ctx);
    const link = memberLink(ctx, store);
    const max = storeEntitlements(store.plan).limit('maxMembers');
    if (link.status !== 'active' && repo.links.countActive(store.id) >= max) {
      throw new HttpError(402, 'plan_limit', `現在のプランで連携できるメンバーは${max}人までです`);
    }
    repo.links.setStatus(link.id, 'active');
    sendJson(ctx.res, 200, { ok: true });
  });

  router.post('/api/stores/:id/members/:linkId/reject', async (ctx) => {
    const { store } = staffStore(ctx);
    const link = memberLink(ctx, store);
    repo.links.setStatus(link.id, 'rejected');
    sendJson(ctx.res, 200, { ok: true });
  });

  router.delete('/api/stores/:id/members/:linkId', async (ctx) => {
    const { store } = staffStore(ctx);
    const link = memberLink(ctx, store);
    repo.links.setStatus(link.id, 'ended');
    sendJson(ctx.res, 200, { ok: true });
  });

  function presentVisibleEntries(storeId, rows, viewerId) {
    const ids = rows.map((r) => r.id);
    const mediaRows = ids.length
      ? repo.db.prepare(`SELECT id, entry_id, kind, mime, size FROM media WHERE entry_id IN (${ids.map(() => '?').join(',')}) ORDER BY created_at`).all(...ids)
      : [];
    const commentRows = repo.comments.forStoreEntries(storeId, ids);
    return rows.map((r) => ({
      id: r.id,
      member: { linkId: r.link_id, name: r.member_name },
      body: r.body,
      mood: r.mood,
      localDate: r.local_date,
      createdAt: r.created_at,
      media: mediaRows.filter((m) => m.entry_id === r.id).map(({ entry_id, ...m }) => ({ ...m, url: `/api/media/${m.id}` })),
      comments: commentRows.filter((c) => c.entry_id === r.id).map((c) => ({
        id: c.id, body: c.body, createdAt: c.created_at, authorName: c.author_name, mine: c.author_id === viewerId,
      })),
    }));
  }

  /** 共有された記録の一覧（新しい順） */
  router.get('/api/stores/:id/feed', async (ctx) => {
    const { store } = staffStore(ctx);
    const { rows, nextCursor } = repo.visible.feed(store.id, {
      cursor: ctx.query.get('cursor'),
      linkId: ctx.query.get('member'),
      limit: 20,
    });
    sendJson(ctx.res, 200, { items: presentVisibleEntries(store.id, rows, ctx.user.id), nextCursor });
  });

  router.post('/api/stores/:id/entries/:entryId/comments', async (ctx) => {
    const { store } = staffStore(ctx);
    const entry = repo.visible.entry(store.id, ctx.params.entryId);
    if (!entry) throw new HttpError(404, 'not_found', '記録が見つからないか、共有が解除されています');
    const body = await readJson(ctx.req);
    const text = str(body.body, { min: 1, max: 1000, field: 'コメント' });
    repo.comments.create(store.id, entry.id, ctx.user.id, text);
    sendJson(ctx.res, 201, { entry: presentVisibleEntries(store.id, [entry], ctx.user.id)[0] });
  });

  router.delete('/api/stores/:id/comments/:commentId', async (ctx) => {
    const { store, role } = staffStore(ctx);
    const c = repo.comments.get(store.id, ctx.params.commentId);
    if (!c) throw new HttpError(404, 'not_found', 'コメントが見つかりません');
    if (c.author_id !== ctx.user.id && role !== 'owner') throw new HttpError(403, 'forbidden', '自分のコメントだけ削除できます');
    repo.comments.remove(store.id, c.id);
    sendJson(ctx.res, 200, { ok: true });
  });
}
