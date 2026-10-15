import { randomUUID, randomInt } from 'node:crypto';
import { nowIso } from '../lib/date.js';

// 店舗（レッスン先）連携のデータアクセス。
// 店舗側に見えるのは「つながりが active」かつ「本人が共有した記録」だけ。この条件は必ず SQL 側で確認する。

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O・1/I など紛らわしい文字を除く

export function newStoreCode() {
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return s;
}

/** 入力ゆれ（小文字・ハイフン・空白）を吸収して 8 文字に正規化 */
export function normalizeCode(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const formatCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

export function createStoreRepos(db, { tx }) {
  const q = (sql) => db.prepare(sql);

  function uniqueCode(column) {
    for (let i = 0; i < 20; i++) {
      const code = newStoreCode();
      if (!q(`SELECT 1 FROM stores WHERE ${column} = ?`).get(code)) return code;
    }
    throw new Error('could not allocate store code');
  }

  const stores = {
    create(userId, { name, category, description }) {
      const id = randomUUID();
      const now = nowIso();
      tx(() => {
        q(`INSERT INTO stores (id, name, category, description, code, staff_code, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, name, category, description, uniqueCode('code'), uniqueCode('staff_code'), userId, now, now);
        q(`INSERT INTO store_staff (store_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)`).run(id, userId, now);
      });
      return stores.get(id);
    },
    get(id) {
      return q('SELECT * FROM stores WHERE id = ?').get(id);
    },
    getByCode(code) {
      return q('SELECT * FROM stores WHERE code = ?').get(normalizeCode(code));
    },
    getByStaffCode(code) {
      return q('SELECT * FROM stores WHERE staff_code = ?').get(normalizeCode(code));
    },
    role(storeId, userId) {
      return q('SELECT role FROM store_staff WHERE store_id = ? AND user_id = ?').get(storeId, userId)?.role ?? null;
    },
    countOwned(userId) {
      return q(`SELECT COUNT(*) AS c FROM store_staff WHERE user_id = ? AND role = 'owner'`).get(userId).c;
    },
    /** 自分がスタッフとして管理している店舗 */
    mine(userId) {
      return q(`SELECT s.*, st.role,
                  (SELECT COUNT(*) FROM store_links l WHERE l.store_id = s.id AND l.status = 'active') AS active_members,
                  (SELECT COUNT(*) FROM store_links l WHERE l.store_id = s.id AND l.status = 'pending') AS pending_members
                FROM stores s JOIN store_staff st ON st.store_id = s.id
                WHERE st.user_id = ? ORDER BY s.created_at`).all(userId);
    },
    update(id, { name, category, description, requireApproval }) {
      q(`UPDATE stores SET name = COALESCE(?, name), category = COALESCE(?, category), description = COALESCE(?, description),
           require_approval = COALESCE(?, require_approval), updated_at = ? WHERE id = ?`)
        .run(name ?? null, category ?? null, description ?? null, requireApproval === undefined ? null : requireApproval ? 1 : 0, nowIso(), id);
      return stores.get(id);
    },
    regenerateCode(id, type) {
      const column = type === 'staff' ? 'staff_code' : 'code';
      q(`UPDATE stores SET ${column} = ?, updated_at = ? WHERE id = ?`).run(uniqueCode(column), nowIso(), id);
      return stores.get(id);
    },
    addStaff(storeId, userId) {
      q(`INSERT INTO store_staff (store_id, user_id, role, created_at) VALUES (?, ?, 'staff', ?)
         ON CONFLICT(store_id, user_id) DO NOTHING`).run(storeId, userId, nowIso());
    },
    staff(storeId) {
      return q(`SELECT u.id, u.display_name, st.role, st.created_at FROM store_staff st JOIN users u ON u.id = st.user_id
                WHERE st.store_id = ? ORDER BY CASE st.role WHEN 'owner' THEN 0 ELSE 1 END, st.created_at`).all(storeId);
    },
    removeStaff(storeId, userId) {
      q(`DELETE FROM store_staff WHERE store_id = ? AND user_id = ? AND role != 'owner'`).run(storeId, userId);
    },
    remove(id) {
      q('DELETE FROM stores WHERE id = ?').run(id);
    },
    /** 退会時: オーナーの店舗は、ほかのスタッフがいれば引き継ぎ、いなければ削除する */
    handOverOrDelete(userId) {
      tx(() => {
        const owned = q(`SELECT store_id FROM store_staff WHERE user_id = ? AND role = 'owner'`).all(userId);
        for (const { store_id: storeId } of owned) {
          const next = q(`SELECT user_id FROM store_staff WHERE store_id = ? AND user_id != ? ORDER BY created_at LIMIT 1`).get(storeId, userId);
          if (next) q(`UPDATE store_staff SET role = 'owner' WHERE store_id = ? AND user_id = ?`).run(storeId, next.user_id);
          else q('DELETE FROM stores WHERE id = ?').run(storeId);
        }
      });
    },
  };

  const links = {
    /** 生徒側: 自分のつながり一覧 */
    forUser(userId) {
      return q(`SELECT l.*, s.name AS store_name, s.category AS store_category, s.code AS store_code,
                  (SELECT COUNT(*) FROM entry_shares es WHERE es.store_id = l.store_id AND es.user_id = l.user_id) AS shared_count,
                  (SELECT COUNT(*) FROM store_comments c JOIN entries e ON e.id = c.entry_id
                     WHERE c.store_id = l.store_id AND e.user_id = l.user_id AND c.read_at IS NULL) AS unread_comments
                FROM store_links l JOIN stores s ON s.id = l.store_id
                WHERE l.user_id = ? AND l.status IN ('pending', 'active')
                ORDER BY CASE l.status WHEN 'active' THEN 0 ELSE 1 END, l.created_at`).all(userId);
    },
    getForUser(userId, id) {
      return q(`SELECT l.*, s.name AS store_name, s.category AS store_category, s.description AS store_description
                FROM store_links l JOIN stores s ON s.id = l.store_id WHERE l.id = ? AND l.user_id = ?`).get(id, userId);
    },
    getForStore(storeId, id) {
      return q('SELECT * FROM store_links WHERE id = ? AND store_id = ?').get(id, storeId);
    },
    find(storeId, userId) {
      return q('SELECT * FROM store_links WHERE store_id = ? AND user_id = ?').get(storeId, userId);
    },
    /** 新規または解除済みのつながりを作り直す */
    request(userId, storeId, { shareMode, autoApprove }) {
      const now = nowIso();
      const status = autoApprove ? 'active' : 'pending';
      q(`INSERT INTO store_links (id, store_id, user_id, status, share_mode, created_at, approved_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(store_id, user_id) DO UPDATE SET status = excluded.status, share_mode = excluded.share_mode,
           approved_at = excluded.approved_at, ended_at = NULL, updated_at = excluded.updated_at`)
        .run(randomUUID(), storeId, userId, status, shareMode, now, autoApprove ? now : null, now);
      return links.find(storeId, userId);
    },
    setShareMode(userId, id, shareMode) {
      q('UPDATE store_links SET share_mode = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(shareMode, nowIso(), id, userId);
    },
    setStatus(id, status) {
      const now = nowIso();
      q(`UPDATE store_links SET status = ?, updated_at = ?,
           approved_at = CASE WHEN ? = 'active' THEN ? ELSE approved_at END,
           ended_at = CASE WHEN ? IN ('ended', 'rejected') THEN ? ELSE NULL END
         WHERE id = ?`).run(status, now, status, now, status, now, id);
    },
    /** 生徒側: いま共有できる店舗 */
    activeForUser(userId) {
      return q(`SELECT l.id, l.store_id, l.share_mode, s.name AS store_name FROM store_links l JOIN stores s ON s.id = l.store_id
                WHERE l.user_id = ? AND l.status = 'active' ORDER BY l.created_at`).all(userId);
    },
    /** 店舗側: メンバー一覧（共有された記録だけから集計する） */
    membersOfStore(storeId) {
      return q(`SELECT l.id, l.user_id, l.status, l.share_mode, l.created_at, l.approved_at, u.display_name,
                  (SELECT COUNT(*) FROM entry_shares es WHERE es.store_id = l.store_id AND es.user_id = l.user_id) AS shared_count,
                  (SELECT MAX(e.local_date) FROM entry_shares es JOIN entries e ON e.id = es.entry_id
                     WHERE es.store_id = l.store_id AND es.user_id = l.user_id) AS last_shared_date
                FROM store_links l JOIN users u ON u.id = l.user_id
                WHERE l.store_id = ? AND l.status IN ('pending', 'active')
                ORDER BY CASE l.status WHEN 'pending' THEN 0 ELSE 1 END, u.display_name`).all(storeId);
    },
    sharedDates(storeId, linkUserId) {
      return q(`SELECT DISTINCT e.local_date FROM entry_shares es JOIN entries e ON e.id = es.entry_id
                WHERE es.store_id = ? AND es.user_id = ?`).all(storeId, linkUserId).map((r) => r.local_date);
    },
    countActive(storeId) {
      return q(`SELECT COUNT(*) AS c FROM store_links WHERE store_id = ? AND status = 'active'`).get(storeId).c;
    },
  };

  const shares = {
    /** 記録の共有先を置き換える。共有できるのは自分の active なつながりの店舗だけ */
    setForEntry(userId, entryId, storeIds) {
      const allowed = new Set(links.activeForUser(userId).map((l) => l.store_id));
      const targets = [...new Set(storeIds)].filter((id) => allowed.has(id));
      tx(() => {
        q('DELETE FROM entry_shares WHERE entry_id = ? AND user_id = ?').run(entryId, userId);
        const ins = q('INSERT INTO entry_shares (entry_id, store_id, user_id, created_at) VALUES (?, ?, ?, ?)');
        for (const storeId of targets) ins.run(entryId, storeId, userId, nowIso());
      });
      return targets;
    },
    forEntries(userId, entryIds) {
      if (!entryIds.length) return [];
      const ph = entryIds.map(() => '?').join(',');
      return q(`SELECT es.entry_id, es.store_id, s.name AS store_name, l.status
                FROM entry_shares es JOIN stores s ON s.id = es.store_id
                JOIN store_links l ON l.store_id = es.store_id AND l.user_id = es.user_id
                WHERE es.user_id = ? AND es.entry_id IN (${ph})`).all(userId, ...entryIds);
    },
  };

  const comments = {
    create(storeId, entryId, authorId, body) {
      const id = randomUUID();
      q(`INSERT INTO store_comments (id, store_id, entry_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(id, storeId, entryId, authorId, body, nowIso());
      return id;
    },
    /** 生徒側: 自分の記録についたコメント */
    forOwnEntries(userId, entryIds) {
      if (!entryIds.length) return [];
      const ph = entryIds.map(() => '?').join(',');
      return q(`SELECT c.id, c.entry_id, c.body, c.created_at, c.read_at, s.name AS store_name, u.display_name AS author_name
                FROM store_comments c JOIN entries e ON e.id = c.entry_id JOIN stores s ON s.id = c.store_id
                LEFT JOIN users u ON u.id = c.author_id
                WHERE e.user_id = ? AND c.entry_id IN (${ph}) ORDER BY c.created_at`).all(userId, ...entryIds);
    },
    forStoreEntries(storeId, entryIds) {
      if (!entryIds.length) return [];
      const ph = entryIds.map(() => '?').join(',');
      return q(`SELECT c.id, c.entry_id, c.body, c.created_at, c.author_id, u.display_name AS author_name
                FROM store_comments c LEFT JOIN users u ON u.id = c.author_id
                WHERE c.store_id = ? AND c.entry_id IN (${ph}) ORDER BY c.created_at`).all(storeId, ...entryIds);
    },
    markRead(userId, entryId) {
      q(`UPDATE store_comments SET read_at = ? WHERE entry_id = ? AND read_at IS NULL
         AND entry_id IN (SELECT id FROM entries WHERE id = ? AND user_id = ?)`).run(nowIso(), entryId, entryId, userId);
    },
    unreadForUser(userId, limit = 5) {
      return q(`SELECT c.id, c.entry_id, c.body, c.created_at, s.name AS store_name, u.display_name AS author_name
                FROM store_comments c JOIN entries e ON e.id = c.entry_id JOIN stores s ON s.id = c.store_id
                LEFT JOIN users u ON u.id = c.author_id
                WHERE e.user_id = ? AND c.read_at IS NULL ORDER BY c.created_at DESC LIMIT ?`).all(userId, limit);
    },
    get(storeId, id) {
      return q('SELECT * FROM store_comments WHERE id = ? AND store_id = ?').get(id, storeId);
    },
    remove(storeId, id) {
      q('DELETE FROM store_comments WHERE id = ? AND store_id = ?').run(id, storeId);
    },
  };

  /**
   * 店舗側から見える記録。つながりが active で、本人が共有したものだけ。
   * AI のふりかえりは本人だけのものなので含めない。
   */
  const visible = {
    entry(storeId, entryId) {
      return q(`SELECT e.*, u.display_name AS member_name, l.id AS link_id
                FROM entry_shares es
                JOIN entries e ON e.id = es.entry_id
                JOIN store_links l ON l.store_id = es.store_id AND l.user_id = es.user_id AND l.status = 'active'
                JOIN users u ON u.id = e.user_id
                WHERE es.store_id = ? AND es.entry_id = ?`).get(storeId, entryId);
    },
    feed(storeId, { cursor = null, linkId = null, limit = 20 } = {}) {
      const where = ['es.store_id = ?'];
      const args = [storeId];
      if (linkId) {
        where.push('l.id = ?');
        args.push(linkId);
      }
      if (cursor) {
        const [d, c] = String(cursor).split('|');
        where.push('(e.local_date, e.created_at) < (?, ?)');
        args.push(d, c);
      }
      const rows = q(`SELECT e.*, u.display_name AS member_name, l.id AS link_id
                      FROM entry_shares es
                      JOIN entries e ON e.id = es.entry_id
                      JOIN store_links l ON l.store_id = es.store_id AND l.user_id = es.user_id AND l.status = 'active'
                      JOIN users u ON u.id = e.user_id
                      WHERE ${where.join(' AND ')}
                      ORDER BY e.local_date DESC, e.created_at DESC LIMIT ?`).all(...args, limit + 1);
      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit);
      const last = page[page.length - 1];
      return { rows: page, nextCursor: hasMore && last ? `${last.local_date}|${last.created_at}` : null };
    },
    /** スタッフがこのメディアを見てよいか（共有された記録に添付されたものだけ） */
    mediaForStaff(staffUserId, mediaId) {
      return q(`SELECT m.* FROM media m
                JOIN entry_shares es ON es.entry_id = m.entry_id
                JOIN store_links l ON l.store_id = es.store_id AND l.user_id = es.user_id AND l.status = 'active'
                JOIN store_staff st ON st.store_id = es.store_id AND st.user_id = ?
                WHERE m.id = ? LIMIT 1`).get(staffUserId, mediaId);
    },
  };

  return { stores, links, shares, comments, visible };
}
