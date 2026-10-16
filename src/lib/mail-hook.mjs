// ============================================================================
// mail-hook.mjs — 自動返信・管理者通知メール送信（Resend API 経由）
//
// 【設定方法】
// Resend（https://resend.com）でAPIキーを発行し、環境変数 RESEND_API_KEY に
// 設定してください。未設定の場合は何も送信せず、静かに no-op で終わります
// （ローカル開発時にエラーにならないようにするため）。
//
// 管理者への通知先は環境変数 ADMIN_NOTIFY_EMAIL で上書きできます
// （未設定時は下記 DEFAULT_ADMIN_EMAIL 宛）。
// ============================================================================

import { site } from "../data/site.mjs";

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_ADMIN_EMAIL = "onefordream72@gmail.com";
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || DEFAULT_ADMIN_EMAIL;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "SHADOW LADIES PRO-AM <onboarding@resend.dev>";

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function send({ to, subject, html, replyTo }, retriesLeft = 2) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "not-configured" };

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (res.status === 429 && retriesLeft > 0) {
      await sleep(1200);
      return send({ to, subject, html, replyTo }, retriesLeft - 1);
    }
    if (!res.ok) {
      console.error("[mail-hook] send failed", res.status, await res.text().catch(() => ""));
      return { sent: false, reason: `http-${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[mail-hook] send error", err);
    return { sent: false, reason: "network-error" };
  }
}

function entryTable(p) {
  return `
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td style="color:#888">区分</td><td>${p.category === "pro" ? "プロの部" : "アマチュアの部"}</td></tr>
      <tr><td style="color:#888">氏名</td><td>${esc(p.name)}（${esc(p.kana)}）</td></tr>
      <tr><td style="color:#888">メール</td><td>${esc(p.email)}</td></tr>
      <tr><td style="color:#888">電話</td><td>${esc(p.phone)}</td></tr>
      <tr><td style="color:#888">同伴者</td><td>${esc(p.companion || "-")}</td></tr>
    </table>`;
}

const APPLICANT_TEMPLATES = {
  "entry-confirmed": (p) => ({
    subject: `【${site.shortName}】エントリーを受け付けました`,
    html: `
      <p>${esc(p.name)} 様</p>
      <p>${esc(site.nameJa)} へのエントリーを受け付けました。</p>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td style="color:#888">開催日</td><td>${esc(site.eventDateLabelJa)}</td></tr>
        <tr><td style="color:#888">会場</td><td>${esc(site.venue.name)}</td></tr>
      </table>
      <p>当日を楽しみにお待ちしております。</p>`,
  }),
  "entry-waitlist": (p) => ({
    subject: `【${site.shortName}】エントリーを受け付けました（キャンセル待ち）`,
    html: `
      <p>${esc(p.name)} 様</p>
      <p>${esc(site.nameJa)} へのお申し込みありがとうございます。</p>
      <p>大変申し訳ございませんが、現在定員に達しているためキャンセル待ちとしての受付となります。繰り上がりが発生した場合、改めてご連絡いたします。</p>`,
  }),
  "entry-promoted": (p) => ({
    subject: `【${site.shortName}】キャンセル待ちから繰り上げ当選のご連絡`,
    html: `
      <p>${esc(p.name)} 様</p>
      <p>キャンセルが発生したため、キャンセル待ちから繰り上げでのご参加が確定いたしました。</p>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td style="color:#888">開催日</td><td>${esc(site.eventDateLabelJa)}</td></tr>
        <tr><td style="color:#888">会場</td><td>${esc(site.venue.name)}</td></tr>
      </table>
      <p>当日を楽しみにお待ちしております。</p>`,
  }),
  contact: (p) => ({
    subject: `【${site.shortName}】お問い合わせを受け付けました`,
    html: `
      <p>${esc(p.name)} 様</p>
      <p>お問い合わせいただきありがとうございます。内容を確認のうえ、担当者よりご連絡いたします。</p>
      <p>――――――――――<br />${esc(p.message).replace(/\n/g, "<br />")}<br />――――――――――</p>`,
  }),
};

const ADMIN_TEMPLATES = {
  "entry-confirmed": (p) => `<p>新規エントリーがありました。</p>${entryTable(p)}`,
  "entry-waitlist": (p) => `<p>新規エントリー（キャンセル待ち）がありました。</p>${entryTable(p)}`,
  "entry-promoted": (p) => `<p>キャンセル待ちから繰り上げ当選としました。</p>${entryTable(p)}`,
  contact: (p) => `
    <p>新しいお問い合わせが届きました。</p>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td style="color:#888">種別</td><td>${esc(p.type)}</td></tr>
      <tr><td style="color:#888">氏名</td><td>${esc(p.name)}</td></tr>
      <tr><td style="color:#888">メール</td><td>${esc(p.email)}</td></tr>
      <tr><td style="color:#888">電話</td><td>${esc(p.phone || "-")}</td></tr>
    </table>
    <p>${esc(p.message).replace(/\n/g, "<br />")}</p>`,
};

/**
 * @param {{to:string, kind:"entry-confirmed"|"entry-waitlist"|"contact", payload:object}} params
 */
export async function sendAutoReply({ to, kind, payload }) {
  const applicantTemplate = APPLICANT_TEMPLATES[kind];
  const adminBodyFn = ADMIN_TEMPLATES[kind];
  if (!applicantTemplate || !adminBodyFn) return { sent: false, reason: "unknown-kind" };

  const { subject, html } = applicantTemplate(payload);

  const [applicant, admin] = await Promise.all([
    send({ to, subject, html, replyTo: ADMIN_EMAIL }),
    send({ to: ADMIN_EMAIL, subject: `[管理者通知] ${subject}`, html: adminBodyFn(payload), replyTo: payload.email }),
  ]);

  return { applicant, admin };
}

/**
 * 参加者への一斉・個別案内メール送信
 * @param {{recipients:{email:string, name:string}[], subject:string, bodyText:string}} params
 */
export async function sendBroadcast({ recipients, subject, bodyText }) {
  if (!process.env.RESEND_API_KEY) return { sent: 0, failed: 0, total: recipients.length, reason: "not-configured" };

  const bodyHtml = esc(bodyText).replace(/\n/g, "<br />");
  // Resend のレート制限（1秒あたり2件）に収まるよう、1件ずつ間隔を空けて送信する。
  const SEND_INTERVAL_MS = 550;
  const results = [];

  for (const r of recipients) {
    const res = await send({
      to: r.email,
      subject,
      html: `<p>${esc(r.name)} 様</p><p>${bodyHtml}</p>`,
      replyTo: ADMIN_EMAIL,
    });
    results.push({ email: r.email, ...res });
    await sleep(SEND_INTERVAL_MS);
  }

  const sent = results.filter((r) => r.sent).length;
  return { sent, failed: results.length - sent, total: recipients.length, results };
}
