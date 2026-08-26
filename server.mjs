// ============================================================================
// server.mjs — アプリケーションサーバー（外部依存ゼロ / Node標準モジュールのみ）
//
// ・GET  /                 トップページ（全セクションをSSRで描画）
// ・GET  /rules/           競技規則ページ
// ・GET  /news/            NEWS一覧ページ
// ・GET  /api/capacity     プロ／アマチュアの残り枠を返す
// ・POST /api/entry        エントリー登録（定員超過で自動キャンセル待ち）
// ・POST /api/contact      お問い合わせ登録
// ・その他                  /public 以下の静的ファイルを配信
//
// コンテンツ（大会情報・出場プロ・スポンサー等）は src/data/*.mjs を編集する
// だけで反映されます。サーバー再起動も不要です（データはリクエスト毎に
// 再読込されます）。
// ============================================================================

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

import { renderHome } from "./src/templates/pages/home.mjs";
import { renderRules } from "./src/templates/pages/rules.mjs";
import { renderNews } from "./src/templates/pages/news.mjs";
import { renderNotFound } from "./src/templates/pages/not-found.mjs";
import { getCapacityStatus, submitEntry, submitContact } from "./src/lib/store.mjs";
import { sendAutoReply } from "./src/lib/mail-hook.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// --- 簡易レートリミッタ（POST エンドポイントの連投対策） --------------------
const rateBuckets = new Map();
function isRateLimited(ip, key, limit = 8, windowMs = 60_000) {
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const bucket = rateBuckets.get(bucketKey) || [];
  const recent = bucket.filter((t) => now - t < windowMs);
  recent.push(now);
  rateBuckets.set(bucketKey, recent);
  return recent.length > limit;
}

// --- Content-Type マップ ----------------------------------------------------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
};

function sendHtml(res, status, html) {
  send(res, status, Buffer.from(html, "utf8"), MIME[".html"], "no-cache");
}

function sendJson(res, status, obj) {
  send(res, status, Buffer.from(JSON.stringify(obj), "utf8"), MIME[".json"], "no-store");
}

function send(res, status, buffer, contentType, cacheControl, extraHeaders = {}) {
  const headers = {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
    ...SECURITY_HEADERS,
    ...extraHeaders,
  };
  res.writeHead(status, headers);
  res.end(buffer);
}

function sendCompressible(req, res, status, buffer, contentType, cacheControl) {
  const acceptEncoding = req.headers["accept-encoding"] || "";
  const compressible = /^(text\/|application\/(json|xml|javascript|manifest))/.test(contentType);
  if (compressible && buffer.length > 1024 && acceptEncoding.includes("gzip")) {
    const gz = zlib.gzipSync(buffer);
    send(res, status, gz, contentType, cacheControl, { "Content-Encoding": "gzip", Vary: "Accept-Encoding" });
  } else {
    send(res, status, buffer, contentType, cacheControl, { Vary: "Accept-Encoding" });
  }
}

function readBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("payload too large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseJsonBody(raw) {
  try {
    const data = JSON.parse(raw || "{}");
    return data && typeof data === "object" ? data : {};
  } catch {
    return null;
  }
}

// --- バリデーション ---------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9()+\-\s]{9,15}$/;

function clean(str, max = 200) {
  return typeof str === "string" ? str.trim().slice(0, max) : "";
}

function validateEntry(input) {
  const errors = {};
  const category = input.category === "pro" || input.category === "amateur" ? input.category : "";
  if (!category) errors.category = "参加区分を選択してください";

  const name = clean(input.name, 100);
  if (!name) errors.name = "氏名を入力してください";

  const kana = clean(input.kana, 100);
  if (!kana) errors.kana = "フリガナを入力してください";

  const email = clean(input.email, 200);
  if (!email || !EMAIL_RE.test(email)) errors.email = "正しいメールアドレスを入力してください";

  const phone = clean(input.phone, 20);
  if (!phone || !PHONE_RE.test(phone)) errors.phone = "正しい電話番号を入力してください";

  if (input.agreed !== true) errors.agreed = "キャンセル規定・大会規約への同意が必要です";

  const companion = clean(input.companion, 500);

  return { errors, value: { category, name, kana, email, phone, companion, agreed: true } };
}

function validateContact(input) {
  const errors = {};
  const type = clean(input.type, 50) || "その他";
  const name = clean(input.name, 100);
  if (!name) errors.name = "氏名を入力してください";
  const email = clean(input.email, 200);
  if (!email || !EMAIL_RE.test(email)) errors.email = "正しいメールアドレスを入力してください";
  const phone = clean(input.phone, 20);
  const message = clean(input.message, 2000);
  if (!message) errors.message = "お問い合わせ内容を入力してください";
  return { errors, value: { type, name, email, phone, message } };
}

// --- ルーティング -----------------------------------------------------------
async function handleApi(req, res, pathname) {
  const ip = req.socket.remoteAddress || "unknown";

  if (pathname === "/api/capacity" && req.method === "GET") {
    return sendJson(res, 200, getCapacityStatus());
  }

  if (pathname === "/api/entry" && req.method === "POST") {
    if (isRateLimited(ip, "entry")) return sendJson(res, 429, { ok: false, error: "too-many-requests" });
    const raw = await readBody(req);
    const body = parseJsonBody(raw);
    if (body === null) return sendJson(res, 400, { ok: false, error: "invalid-json" });
    const { errors, value } = validateEntry(body);
    if (Object.keys(errors).length) return sendJson(res, 422, { ok: false, errors });

    const result = submitEntry(value);
    if (!result.ok) return sendJson(res, 409, { ok: false, error: result.reason });

    sendAutoReply({
      to: value.email,
      kind: result.status === "waitlist" ? "entry-waitlist" : "entry-confirmed",
      payload: value,
    }).catch(() => {});

    return sendJson(res, 201, { ok: true, status: result.status });
  }

  if (pathname === "/api/contact" && req.method === "POST") {
    if (isRateLimited(ip, "contact")) return sendJson(res, 429, { ok: false, error: "too-many-requests" });
    const raw = await readBody(req);
    const body = parseJsonBody(raw);
    if (body === null) return sendJson(res, 400, { ok: false, error: "invalid-json" });
    const { errors, value } = validateContact(body);
    if (Object.keys(errors).length) return sendJson(res, 422, { ok: false, errors });

    const result = submitContact(value);
    sendAutoReply({ to: value.email, kind: "contact", payload: value }).catch(() => {});
    return sendJson(res, 201, { ok: true, id: result.id });
  }

  return sendJson(res, 404, { ok: false, error: "not-found" });
}

function safeStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const normalized = path.normalize(decoded).replace(/^([.][.][/\\])+/, "");
  const full = path.join(PUBLIC_DIR, normalized);
  if (!full.startsWith(PUBLIC_DIR)) return null;
  return full;
}

async function handleStatic(req, res, pathname) {
  const filePath = safeStaticPath(pathname);
  if (!filePath) return sendHtml(res, 400, "Bad request");

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) return sendHtml(res, 404, renderNotFound());
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const isHashed = /\.[a-f0-9]{8}\./.test(filePath);
    const cacheControl = ext === ".html" ? "no-cache" : isHashed ? "public, max-age=31536000, immutable" : "public, max-age=3600";
    const buffer = fs.readFileSync(filePath);
    return sendCompressible(req, res, 200, buffer, contentType, cacheControl);
  } catch {
    return sendHtml(res, 404, renderNotFound());
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname.startsWith("/api/")) {
      return await handleApi(req, res, pathname);
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendHtml(res, 405, "Method Not Allowed");
    }

    if (pathname === "/" || pathname === "/index.html") {
      const html = renderHome({ capacity: getCapacityStatus() });
      return sendCompressible(req, res, 200, Buffer.from(html, "utf8"), MIME[".html"], "no-cache");
    }

    if (pathname === "/rules" || pathname === "/rules/") {
      const html = renderRules();
      return sendCompressible(req, res, 200, Buffer.from(html, "utf8"), MIME[".html"], "no-cache");
    }

    if (pathname === "/news" || pathname === "/news/") {
      const html = renderNews();
      return sendCompressible(req, res, 200, Buffer.from(html, "utf8"), MIME[".html"], "no-cache");
    }

    return await handleStatic(req, res, pathname);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return sendHtml(res, 500, "Internal Server Error");
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SHADOW LADIES PRO-AM site running: http://localhost:${PORT}`);
});
