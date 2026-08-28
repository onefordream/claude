// ============================================================================
// admin-contacts.mjs — 管理者用お問い合わせ一覧ページ（Basic認証で保護）
// ============================================================================

import { esc } from "../../lib/render.mjs";
import { ADMIN_STYLES, renderAdminNav } from "./admin-shared.mjs";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function renderAdminContacts({ contacts }) {
  const sorted = [...contacts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const rows = sorted
    .map(
      (c, i) => `
      <tr>
        <td>${sorted.length - i}</td>
        <td>${esc(c.type)}</td>
        <td>${esc(c.name)}</td>
        <td><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></td>
        <td>${esc(c.phone || "-")}</td>
        <td style="white-space: pre-wrap; max-width: 420px;">${esc(c.message)}</td>
        <td>${esc(formatDate(c.createdAt))}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>お問い合わせ一覧（管理者） — SHADOW LADIES PRO-AM</title>
<style>${ADMIN_STYLES}</style>
</head>
<body>
  <h1>お問い合わせ一覧（管理者）</h1>
  ${renderAdminNav("contacts")}

  <dl class="summary">
    <div class="summary__card"><dt>合計件数</dt><dd>${contacts.length}</dd></div>
  </dl>

  <div class="table-wrap">
    ${
      sorted.length
        ? `<table>
      <thead>
        <tr><th>#</th><th>種別</th><th>氏名</th><th>メール</th><th>電話</th><th>内容</th><th>受信日時</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
        : `<p class="empty">まだお問い合わせがありません。</p>`
    }
  </div>
</body>
</html>`;
}
