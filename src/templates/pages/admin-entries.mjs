// ============================================================================
// admin-entries.mjs — 管理者用エントリー一覧・案内メール送信ページ（Basic認証で保護）
// ============================================================================

import { esc } from "../../lib/render.mjs";
import { ADMIN_STYLES, renderAdminNav } from "./admin-shared.mjs";

const CATEGORY_LABEL = { pro: "プロ", amateur: "アマチュア" };
const STATUS_LABEL = { confirmed: "確定", waitlist: "キャンセル待ち" };

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function renderFlash(query) {
  if (query.get("reason") === "not-configured") {
    return `<div class="flash flash--warn">メール送信が設定されていません（RESEND_API_KEY 未設定）。管理者にご確認ください。</div>`;
  }
  if (query.has("deleted")) {
    if (query.get("deleted") === "0") return `<div class="flash flash--warn">削除できませんでした（対象が見つかりません）。</div>`;
    const promoted = query.get("promoted");
    return promoted
      ? `<div class="flash flash--ok">削除しました。キャンセル待ちから ${esc(promoted)} 様を繰り上げ当選とし、通知メールを送信しました。</div>`
      : `<div class="flash flash--ok">削除しました。</div>`;
  }
  if (!query.has("sent")) return "";
  const sent = Number(query.get("sent") || 0);
  const failed = Number(query.get("failed") || 0);
  if (failed > 0) return `<div class="flash flash--warn">${sent}件送信しました（${failed}件失敗）。</div>`;
  if (sent === 0) return `<div class="flash flash--warn">送信対象が選択されていませんでした。</div>`;
  return `<div class="flash flash--ok">${sent}件に送信しました。</div>`;
}

export function renderAdminEntries({ entries, capacity, query = new URLSearchParams() }) {
  const sorted = [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const rows = sorted
    .map(
      (e, i) => `
      <tr>
        <td class="checkbox-col"><input type="checkbox" name="ids" value="${esc(e.id)}" form="broadcast-form" /></td>
        <td>${sorted.length - i}</td>
        <td><span class="badge badge--${e.category}">${esc(CATEGORY_LABEL[e.category] || e.category)}</span></td>
        <td><span class="badge badge--${e.status}">${esc(STATUS_LABEL[e.status] || e.status)}</span></td>
        <td>${esc(e.name)}</td>
        <td>${esc(e.kana)}</td>
        <td><a href="mailto:${esc(e.email)}">${esc(e.email)}</a></td>
        <td>${esc(e.phone)}</td>
        <td>${esc(e.companion || "-")}</td>
        <td>${esc(formatDate(e.createdAt))}</td>
        <td>
          <form method="POST" action="/admin/entries/delete" onsubmit="return confirm('${esc(e.name)}さんのエントリーを削除しますか？')">
            <input type="hidden" name="id" value="${esc(e.id)}" />
            <button type="submit" class="delete-btn">削除</button>
          </form>
        </td>
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
<style>${ADMIN_STYLES}</style>
</head>
<body>
  <h1>エントリー一覧（管理者）</h1>
  ${renderAdminNav("entries")}
  ${renderFlash(query)}

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
        <tr>
          <th class="checkbox-col"><input type="checkbox" id="select-all" /></th>
          <th>#</th><th>区分</th><th>状態</th><th>氏名</th><th>フリガナ</th><th>メール</th><th>電話</th><th>同伴者</th><th>受付日時</th><th>操作</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
        : `<p class="empty">まだエントリーがありません。</p>`
    }
  </div>

  <form id="broadcast-form" class="broadcast" method="POST" action="/admin/broadcast">
    <h2>案内メールを送る</h2>
    <p>上の表でチェックした人にメールを送ります（左上のチェックボックスで全員選択）。</p>
    <input type="text" name="subject" placeholder="件名" required />
    <textarea name="body" placeholder="本文" required></textarea>
    <button type="submit">選択した人に送信</button>
  </form>

  <script>
    document.getElementById('select-all').addEventListener('change', function (e) {
      document.querySelectorAll('input[name="ids"]').forEach(function (cb) { cb.checked = e.target.checked; });
    });
  </script>
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
