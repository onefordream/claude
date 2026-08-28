// ============================================================================
// admin-entries.mjs — 管理者用エントリー一覧ページ（Basic認証で保護）
// ============================================================================

import { esc } from "../../lib/render.mjs";

const CATEGORY_LABEL = { pro: "プロ", amateur: "アマチュア" };
const STATUS_LABEL = { confirmed: "確定", waitlist: "キャンセル待ち" };

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function renderAdminEntries({ entries, capacity }) {
  const sorted = [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const rows = sorted
    .map(
      (e, i) => `
      <tr>
        <td>${sorted.length - i}</td>
        <td><span class="badge badge--${e.category}">${esc(CATEGORY_LABEL[e.category] || e.category)}</span></td>
        <td><span class="badge badge--${e.status}">${esc(STATUS_LABEL[e.status] || e.status)}</span></td>
        <td>${esc(e.name)}</td>
        <td>${esc(e.kana)}</td>
        <td><a href="mailto:${esc(e.email)}">${esc(e.email)}</a></td>
        <td>${esc(e.phone)}</td>
        <td>${esc(e.companion || "-")}</td>
        <td>${esc(formatDate(e.createdAt))}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>エントリー一覧（管理者） — SHADOW LADIES PRO-AM</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif; background: #f6f5f2; color: #1a1a1a; padding: 1.5rem; }
  h1 { font-size: 1.3rem; margin: 0 0 1rem; }
  .summary { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .summary__card { background: #fff; border-radius: 10px; padding: 0.9rem 1.2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); min-width: 160px; }
  .summary__card dt { font-size: 0.72rem; color: #888; }
  .summary__card dd { margin: 0.2rem 0 0; font-size: 1.3rem; font-weight: 700; }
  .toolbar { margin-bottom: 1rem; display: flex; gap: 0.8rem; align-items: center; }
  .toolbar a { color: #b93862; font-size: 0.85rem; text-decoration: underline; }
  .table-wrap { overflow-x: auto; background: #fff; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  table { border-collapse: collapse; width: 100%; font-size: 0.85rem; white-space: nowrap; }
  th, td { padding: 0.55rem 0.8rem; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #faf9f7; font-size: 0.72rem; color: #888; position: sticky; top: 0; }
  .badge { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
  .badge--pro { background: #f0e6d2; color: #8a6d1f; }
  .badge--amateur { background: #e6eef0; color: #2f5d66; }
  .badge--confirmed { background: #e3f0e1; color: #2e6b2e; }
  .badge--waitlist { background: #f6e0e0; color: #a13a3a; }
  .empty { padding: 2rem; text-align: center; color: #999; }
</style>
</head>
<body>
  <h1>エントリー一覧（管理者）</h1>

  <dl class="summary">
    <div class="summary__card"><dt>プロ 確定</dt><dd>${capacity.pro.confirmed} / ${capacity.pro.capacity}</dd></div>
    <div class="summary__card"><dt>プロ キャンセル待ち</dt><dd>${capacity.pro.waitlist}</dd></div>
    <div class="summary__card"><dt>アマチュア 確定</dt><dd>${capacity.amateur.confirmed} / ${capacity.amateur.capacity}</dd></div>
    <div class="summary__card"><dt>アマチュア キャンセル待ち</dt><dd>${capacity.amateur.waitlist}</dd></div>
    <div class="summary__card"><dt>合計エントリー数</dt><dd>${entries.length}</dd></div>
  </dl>

  <div class="toolbar">
    <a href="/admin/entries.csv">CSVでダウンロード（Excelで開けます）</a>
  </div>

  <div class="table-wrap">
    ${
      sorted.length
        ? `<table>
      <thead>
        <tr><th>#</th><th>区分</th><th>状態</th><th>氏名</th><th>フリガナ</th><th>メール</th><th>電話</th><th>同伴者</th><th>受付日時</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
        : `<p class="empty">まだエントリーがありません。</p>`
    }
  </div>
</body>
</html>`;
}

export function renderEntriesCsv(entries) {
  const header = ["区分", "状態", "氏名", "フリガナ", "メール", "電話", "同伴者", "受付日時"];
  const rows = [...entries]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((e) => [
      CATEGORY_LABEL[e.category] || e.category,
      STATUS_LABEL[e.status] || e.status,
      e.name,
      e.kana,
      e.email,
      e.phone,
      e.companion || "",
      formatDate(e.createdAt),
    ]);

  const csvEscape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header, ...rows].map((row) => row.map(csvEscape).join(","));
  return "﻿" + lines.join("\r\n");
}
