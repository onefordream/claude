import { loadEnv } from './src/lib/env.js';
loadEnv();

import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

import { run, get, all } from './src/db.js';
import {
  createUser,
  findUserByEmail,
  createSession,
  destroySession,
  getSessionUser,
  parseCookies,
  sessionCookieHeader,
} from './src/auth.js';
import { verifyPassword } from './src/auth.js';
import { isAiConfigured, summarizeLessonRecord, suggestPractice } from './src/lib/ai.js';
import {
  readBody,
  parseUrlEncoded,
  sendHtml,
  sendJson,
  redirect,
  encodeFlash,
  clearFlashCookie,
  readFlash,
} from './src/lib/http.js';
import { getBoundary, parseMultipart } from './src/lib/multipart.js';

import { loginPage, registerPage } from './src/views/auth.js';
import {
  dashboardPage,
  recordsListPage,
  newRecordPage,
  practiceListPage,
  newPracticePage,
  recordDetailPage,
  roundsPage,
  newGoalPage,
} from './src/views/student.js';
import { studentListPage, studentDetailPage } from './src/views/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const UPLOADS_DIR = join(__dirname, 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

const PORT = Number(process.env.PORT || 3000);

// Render's free tier gives the process ~512MB of RAM and the multipart
// parser buffers the whole request in memory, so a phone video that's too
// large will stall or crash the instance. Fail fast with a clear message
// instead of hanging on a huge upload.
const MAX_UPLOAD_BODY_BYTES = 70 * 1024 * 1024;

// ---------- helpers ----------

function ensureOwnerSeed() {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  const name = process.env.OWNER_NAME || 'スタジオ管理者';
  if (!email || !password) return;
  const existing = findUserByEmail(email);
  if (existing) return;
  createUser({ name, email, password, role: 'instructor' });
  console.log(`[seed] instructor account created: ${email}`);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
};

function serveStatic(req, res, pathname) {
  const rel = pathname.replace(/^\/static\//, '');
  const safeName = rel.split('/').map((p) => (p === '..' ? '' : p)).join('/');
  const filePath = join(PUBLIC_DIR, safeName);
  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const type = MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  createReadStream(filePath).pipe(res);
}

function serveMedia(req, res, filename, user) {
  const video = get(`SELECT * FROM videos WHERE filename = ?`, [filename]);
  if (!video) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const record = get(`SELECT * FROM lesson_records WHERE id = ?`, [video.lesson_record_id]);
  if (!record) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const isOwner = user && user.role === 'student' && user.id === record.user_id;
  const isInstructor = user && user.role === 'instructor';
  if (!isOwner && !isInstructor) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const filePath = join(UPLOADS_DIR, video.filename);
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const stat = statSync(filePath);
  const range = req.headers.range;
  const type = video.mime_type || 'application/octet-stream';

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': type,
    });
    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Content-Type': type,
    });
    createReadStream(filePath).pipe(res);
  }
}

function studentStats(userId) {
  const recordCount = get(
    `SELECT COUNT(*) AS c FROM lesson_records WHERE user_id = ? AND record_type = 'lesson'`,
    [userId]
  ).c;
  const practiceCount = get(
    `SELECT COUNT(*) AS c FROM lesson_records WHERE user_id = ? AND record_type = 'self_practice'`,
    [userId]
  ).c;
  const roundCount = get(`SELECT COUNT(*) AS c FROM round_records WHERE user_id = ?`, [userId]).c;
  const last = get(
    `SELECT record_date FROM lesson_records WHERE user_id = ? ORDER BY record_date DESC, id DESC LIMIT 1`,
    [userId]
  );
  return { recordCount, practiceCount, roundCount, lastDate: last ? last.record_date : null };
}

function roundStats(userId) {
  const currentYear = String(new Date().getFullYear());
  const best = get(
    `SELECT MIN(score) AS v FROM round_records WHERE user_id = ? AND score IS NOT NULL`,
    [userId]
  );
  const yearAvg = get(
    `SELECT AVG(score) AS v FROM round_records WHERE user_id = ? AND score IS NOT NULL AND substr(round_date, 1, 4) = ?`,
    [userId, currentYear]
  );
  const avgPutts = get(
    `SELECT AVG(putts) AS v FROM round_records WHERE user_id = ? AND putts IS NOT NULL`,
    [userId]
  );
  return {
    bestScore: best.v ?? null,
    yearAvgScore: yearAvg.v !== null && yearAvg.v !== undefined ? Math.round(yearAvg.v * 10) / 10 : null,
    avgPutts: avgPutts.v !== null && avgPutts.v !== undefined ? Math.round(avgPutts.v * 10) / 10 : null,
  };
}

async function generateAiSummaryInBackground(recordId, content, notes) {
  if (!isAiConfigured()) {
    run(`UPDATE lesson_records SET ai_status = 'unavailable' WHERE id = ?`, [recordId]);
    return;
  }
  try {
    const { summary, nextIssues } = await summarizeLessonRecord({ content, notes });
    run(
      `UPDATE lesson_records SET ai_summary = ?, ai_next_issues = ?, ai_status = 'done' WHERE id = ?`,
      [summary, nextIssues, recordId]
    );
  } catch (err) {
    console.error('AI summarization failed:', err.message);
    run(`UPDATE lesson_records SET ai_status = 'error' WHERE id = ?`, [recordId]);
  }
}

function saveVideoFile(file) {
  const ext = extname(file.filename).slice(0, 10) || '';
  const safeExt = /^[a-zA-Z0-9.]*$/.test(ext) ? ext : '';
  const storedName = `${Date.now()}-${randomBytes(8).toString('hex')}${safeExt}`;
  writeFileSync(join(UPLOADS_DIR, storedName), file.data);
  return storedName;
}

async function parseRequestBody(req, { maxBytes } = {}) {
  const contentType = req.headers['content-type'] || '';

  // Reject early from the Content-Length header, before buffering anything,
  // so an oversized upload fails in milliseconds instead of tying up memory.
  const declaredLength = Number(req.headers['content-length'] || 0);
  if (maxBytes && declaredLength && declaredLength > maxBytes) {
    throw Object.assign(new Error('Request body too large'), { code: 'BODY_TOO_LARGE' });
  }

  const buf = await readBody(req, maxBytes);
  if (contentType.startsWith('multipart/form-data')) {
    const boundary = getBoundary(contentType);
    if (!boundary) return { fields: {}, files: [] };
    return parseMultipart(buf, boundary);
  }
  return { fields: parseUrlEncoded(buf), files: [] };
}

// ---------- route table ----------

function matchRoute(method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(pathname);
    if (match) return { handler: route.handler, params: match.groups || {} };
  }
  return null;
}

const routes = [
  { method: 'GET', pattern: /^\/$/, handler: handleRoot },
  { method: 'GET', pattern: /^\/login$/, handler: handleLoginPage },
  { method: 'POST', pattern: /^\/login$/, handler: handleLogin },
  { method: 'GET', pattern: /^\/register$/, handler: handleRegisterPage },
  { method: 'POST', pattern: /^\/register$/, handler: handleRegister },
  { method: 'POST', pattern: /^\/logout$/, handler: handleLogout },
  { method: 'GET', pattern: /^\/dashboard$/, handler: requireAuth(handleDashboard) },
  { method: 'GET', pattern: /^\/records$/, handler: requireStudent(handleRecordsList) },
  { method: 'GET', pattern: /^\/records\/new$/, handler: requireStudent(handleNewRecordPage) },
  { method: 'POST', pattern: /^\/records$/, handler: requireStudent(handleCreateRecord) },
  { method: 'GET', pattern: /^\/records\/(?<id>\d+)$/, handler: requireAuth(handleRecordDetail) },
  { method: 'GET', pattern: /^\/practice$/, handler: requireStudent(handlePracticeList) },
  { method: 'GET', pattern: /^\/practice\/new$/, handler: requireStudent(handleNewPracticePage) },
  { method: 'POST', pattern: /^\/practice$/, handler: requireStudent(handleCreatePractice) },
  { method: 'GET', pattern: /^\/rounds$/, handler: requireStudent(handleRoundsPage) },
  { method: 'POST', pattern: /^\/rounds$/, handler: requireStudent(handleCreateRound) },
  { method: 'GET', pattern: /^\/goals\/new$/, handler: requireStudent(handleNewGoalPage) },
  { method: 'POST', pattern: /^\/goals$/, handler: requireStudent(handleCreateGoal) },
  { method: 'POST', pattern: /^\/goals\/(?<id>\d+)\/achieve$/, handler: requireStudent(handleAchieveGoal) },
  { method: 'POST', pattern: /^\/ai\/suggest$/, handler: requireStudent(handleAiSuggest) },
  { method: 'GET', pattern: /^\/admin$/, handler: requireInstructor(handleStudentList) },
  {
    method: 'GET',
    pattern: /^\/admin\/students\/(?<id>\d+)$/,
    handler: requireInstructor(handleStudentDetail),
  },
];

function requireAuth(handler) {
  return (ctx) => {
    if (!ctx.user) return redirect(ctx.res, '/login');
    return handler(ctx);
  };
}
function requireStudent(handler) {
  return requireAuth((ctx) => {
    if (ctx.user.role !== 'student') return redirect(ctx.res, '/admin');
    return handler(ctx);
  });
}
function requireInstructor(handler) {
  return requireAuth((ctx) => {
    if (ctx.user.role !== 'instructor') return redirect(ctx.res, '/dashboard');
    return handler(ctx);
  });
}

// ---------- handlers ----------

function handleRoot(ctx) {
  if (!ctx.user) return redirect(ctx.res, '/login');
  return redirect(ctx.res, ctx.user.role === 'instructor' ? '/admin' : '/dashboard');
}

function handleLoginPage(ctx) {
  if (ctx.user) return redirect(ctx.res, '/dashboard');
  sendHtml(ctx.res, 200, loginPage({ flash: ctx.flash }), [clearFlashCookie()]);
}

async function handleLogin(ctx) {
  const { fields } = await parseRequestBody(ctx.req);
  const user = findUserByEmail(fields.email || '');
  if (!user || !verifyPassword(fields.password || '', user.password_salt, user.password_hash)) {
    return sendHtml(
      ctx.res,
      401,
      loginPage({ flash: { type: 'error', message: 'メールアドレスまたはパスワードが正しくありません。' } })
    );
  }
  const session = createSession(user.id);
  redirect(ctx.res, user.role === 'instructor' ? '/admin' : '/dashboard', [
    sessionCookieHeader(session.token),
    clearFlashCookie(),
  ]);
}

function handleRegisterPage(ctx) {
  if (ctx.user) return redirect(ctx.res, '/dashboard');
  sendHtml(ctx.res, 200, registerPage({ flash: ctx.flash }), [clearFlashCookie()]);
}

async function handleRegister(ctx) {
  const { fields } = await parseRequestBody(ctx.req);
  const name = (fields.name || '').trim();
  const furigana = (fields.furigana || '').trim();
  const email = (fields.email || '').trim();
  const password = fields.password || '';

  if (!name || !email || password.length < 8) {
    return sendHtml(
      ctx.res,
      400,
      registerPage({
        flash: { type: 'error', message: '入力内容をご確認ください（パスワードは8文字以上）。' },
        values: { name, furigana, email },
      })
    );
  }
  if (findUserByEmail(email)) {
    return sendHtml(
      ctx.res,
      400,
      registerPage({
        flash: { type: 'error', message: 'そのメールアドレスは既に登録されています。' },
        values: { name, furigana, email },
      })
    );
  }

  const userId = createUser({ name, furigana, email, password, role: 'student' });
  const session = createSession(userId);
  redirect(ctx.res, '/dashboard', [sessionCookieHeader(session.token), clearFlashCookie()]);
}

function handleLogout(ctx) {
  if (ctx.sessionToken) destroySession(ctx.sessionToken);
  redirect(ctx.res, '/login', [sessionCookieHeader(null, { clear: true })]);
}

function getActiveGoal(userId) {
  return get(`SELECT * FROM goals WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1`, [userId]);
}

function handleDashboard(ctx) {
  if (ctx.user.role === 'instructor') return redirect(ctx.res, '/admin');
  const stats = studentStats(ctx.user.id);
  const goal = getActiveGoal(ctx.user.id);
  const recentRecords = all(
    `SELECT * FROM lesson_records WHERE user_id = ? AND record_type = 'lesson' ORDER BY record_date DESC, id DESC LIMIT 5`,
    [ctx.user.id]
  );
  const recentPractice = all(
    `SELECT * FROM lesson_records WHERE user_id = ? AND record_type = 'self_practice' ORDER BY record_date DESC, id DESC LIMIT 5`,
    [ctx.user.id]
  );
  const recentRounds = all(
    `SELECT * FROM round_records WHERE user_id = ? ORDER BY round_date DESC, id DESC LIMIT 5`,
    [ctx.user.id]
  );
  sendHtml(
    ctx.res,
    200,
    dashboardPage({ user: ctx.user, flash: ctx.flash, stats, goal, recentRecords, recentPractice, recentRounds }),
    [clearFlashCookie()]
  );
}

function handleRecordsList(ctx) {
  const records = all(
    `SELECT * FROM lesson_records WHERE user_id = ? AND record_type = 'lesson' ORDER BY record_date DESC, id DESC`,
    [ctx.user.id]
  );
  sendHtml(ctx.res, 200, recordsListPage({ user: ctx.user, flash: ctx.flash, records }), [clearFlashCookie()]);
}

function handleNewRecordPage(ctx) {
  sendHtml(ctx.res, 200, newRecordPage({ user: ctx.user, flash: ctx.flash }), [clearFlashCookie()]);
}

async function handleCreateRecord(ctx) {
  let fields, files;
  try {
    ({ fields, files } = await parseRequestBody(ctx.req, { maxBytes: MAX_UPLOAD_BODY_BYTES }));
  } catch (err) {
    if (err.code === 'BODY_TOO_LARGE') {
      return sendHtml(
        ctx.res,
        413,
        newRecordPage({
          user: ctx.user,
          flash: { type: 'error', message: '添付ファイルが大きすぎます(合計70MBまで)。動画の解像度を下げるか、短く撮影してからお試しください。' },
        })
      );
    }
    throw err;
  }

  const recordDate = fields.record_date || new Date().toISOString().slice(0, 10);
  const content = (fields.content || '').trim();
  const notes = (fields.notes || '').trim();

  if (!content) {
    return sendHtml(
      ctx.res,
      400,
      newRecordPage({
        user: ctx.user,
        flash: { type: 'error', message: '練習内容を入力してください。' },
        values: fields,
      })
    );
  }

  const result = run(
    `INSERT INTO lesson_records (user_id, record_date, content, notes, record_type) VALUES (?, ?, ?, ?, 'lesson')`,
    [ctx.user.id, recordDate, content, notes || null]
  );
  const recordId = Number(result.lastInsertRowid);

  const videoFiles = files.filter((f) => f.fieldName === 'videos');
  for (const file of videoFiles) {
    const storedName = saveVideoFile(file);
    run(
      `INSERT INTO videos (lesson_record_id, filename, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)`,
      [recordId, storedName, file.filename, file.mimeType, file.data.length]
    );
  }

  // Fire-and-forget AI summarization so the user isn't blocked on the API call.
  generateAiSummaryInBackground(recordId, content, notes);

  redirect(ctx.res, `/records/${recordId}`, [
    encodeFlash('success', '記録を保存しました。AIによる要約は数秒後に反映されます。'),
  ]);
}

function handlePracticeList(ctx) {
  const records = all(
    `SELECT * FROM lesson_records WHERE user_id = ? AND record_type = 'self_practice' ORDER BY record_date DESC, id DESC`,
    [ctx.user.id]
  );
  sendHtml(ctx.res, 200, practiceListPage({ user: ctx.user, flash: ctx.flash, records }), [clearFlashCookie()]);
}

function handleNewPracticePage(ctx) {
  sendHtml(ctx.res, 200, newPracticePage({ user: ctx.user, flash: ctx.flash }), [clearFlashCookie()]);
}

async function handleCreatePractice(ctx) {
  let fields, files;
  try {
    ({ fields, files } = await parseRequestBody(ctx.req, { maxBytes: MAX_UPLOAD_BODY_BYTES }));
  } catch (err) {
    if (err.code === 'BODY_TOO_LARGE') {
      return sendHtml(
        ctx.res,
        413,
        newPracticePage({
          user: ctx.user,
          flash: { type: 'error', message: '添付ファイルが大きすぎます(合計70MBまで)。動画の解像度を下げるか、短く撮影してからお試しください。' },
        })
      );
    }
    throw err;
  }

  const recordDate = fields.record_date || new Date().toISOString().slice(0, 10);
  const content = (fields.content || '').trim();
  const notes = (fields.notes || '').trim();
  const durationMinutes = fields.duration_minutes ? parseInt(fields.duration_minutes, 10) : null;
  const ballCount = fields.ball_count ? parseInt(fields.ball_count, 10) : null;

  if (!content) {
    return sendHtml(
      ctx.res,
      400,
      newPracticePage({
        user: ctx.user,
        flash: { type: 'error', message: '練習内容を入力してください。' },
        values: fields,
      })
    );
  }

  const result = run(
    `INSERT INTO lesson_records (user_id, record_date, content, notes, record_type, duration_minutes, ball_count)
     VALUES (?, ?, ?, ?, 'self_practice', ?, ?)`,
    [ctx.user.id, recordDate, content, notes || null, durationMinutes, ballCount]
  );
  const recordId = Number(result.lastInsertRowid);

  const videoFiles = files.filter((f) => f.fieldName === 'videos');
  for (const file of videoFiles) {
    const storedName = saveVideoFile(file);
    run(
      `INSERT INTO videos (lesson_record_id, filename, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)`,
      [recordId, storedName, file.filename, file.mimeType, file.data.length]
    );
  }

  generateAiSummaryInBackground(recordId, content, notes);

  redirect(ctx.res, `/records/${recordId}`, [
    encodeFlash('success', '自主練の記録を保存しました。AIによる要約は数秒後に反映されます。'),
  ]);
}

function handleRecordDetail(ctx) {
  const record = get(`SELECT * FROM lesson_records WHERE id = ?`, [ctx.params.id]);
  if (!record) {
    ctx.res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return ctx.res.end('記録が見つかりません');
  }
  const isOwner = ctx.user.role === 'student' && ctx.user.id === record.user_id;
  const isInstructor = ctx.user.role === 'instructor';
  if (!isOwner && !isInstructor) {
    ctx.res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return ctx.res.end('この記録を閲覧する権限がありません');
  }
  const videos = all(`SELECT * FROM videos WHERE lesson_record_id = ? ORDER BY id`, [record.id]);
  let ownerName = ctx.user.name;
  if (isInstructor) {
    const owner = get(`SELECT name FROM users WHERE id = ?`, [record.user_id]);
    ownerName = owner ? owner.name : '';
  }
  sendHtml(
    ctx.res,
    200,
    recordDetailPage({
      user: ctx.user,
      flash: ctx.flash,
      record,
      videos,
      readOnly: isInstructor,
      ownerName,
    }),
    [clearFlashCookie()]
  );
}

function handleRoundsPage(ctx) {
  const rounds = all(`SELECT * FROM round_records WHERE user_id = ? ORDER BY round_date DESC, id DESC`, [
    ctx.user.id,
  ]);
  const stats = roundStats(ctx.user.id);
  sendHtml(ctx.res, 200, roundsPage({ user: ctx.user, flash: ctx.flash, rounds, stats }), [clearFlashCookie()]);
}

async function handleCreateRound(ctx) {
  const { fields } = await parseRequestBody(ctx.req);
  const roundDate = fields.round_date || new Date().toISOString().slice(0, 10);
  const courseName = (fields.course_name || '').trim();
  const score = fields.score ? parseInt(fields.score, 10) : null;
  const putts = fields.putts ? parseInt(fields.putts, 10) : null;
  const issues = (fields.issues || '').trim();
  const notes = (fields.notes || '').trim();

  if (!courseName) {
    const rounds = all(`SELECT * FROM round_records WHERE user_id = ? ORDER BY round_date DESC, id DESC`, [
      ctx.user.id,
    ]);
    return sendHtml(
      ctx.res,
      400,
      roundsPage({
        user: ctx.user,
        flash: { type: 'error', message: 'コース名を入力してください。' },
        rounds,
        stats: roundStats(ctx.user.id),
        values: fields,
      })
    );
  }

  run(
    `INSERT INTO round_records (user_id, round_date, course_name, score, putts, issues, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ctx.user.id, roundDate, courseName, score, putts, issues || null, notes || null]
  );
  redirect(ctx.res, '/rounds', [encodeFlash('success', 'ラウンド記録を保存しました。')]);
}

function handleNewGoalPage(ctx) {
  sendHtml(ctx.res, 200, newGoalPage({ user: ctx.user, flash: ctx.flash }), [clearFlashCookie()]);
}

async function handleCreateGoal(ctx) {
  const { fields } = await parseRequestBody(ctx.req);
  const content = (fields.content || '').trim();
  const targetDate = fields.target_date || null;

  if (!content) {
    return sendHtml(
      ctx.res,
      400,
      newGoalPage({ user: ctx.user, flash: { type: 'error', message: '目標を入力してください。' }, values: fields })
    );
  }

  if (getActiveGoal(ctx.user.id)) {
    return sendHtml(
      ctx.res,
      400,
      newGoalPage({
        user: ctx.user,
        flash: { type: 'error', message: 'すでに設定中の目標があります。達成するか、達成ボタンを押してから新しい目標を設定してください。' },
        values: fields,
      })
    );
  }

  run(`INSERT INTO goals (user_id, content, target_date) VALUES (?, ?, ?)`, [ctx.user.id, content, targetDate]);
  redirect(ctx.res, '/dashboard', [encodeFlash('success', '目標を設定しました。達成に向けてがんばりましょう！')]);
}

function handleAchieveGoal(ctx) {
  const goal = get(`SELECT * FROM goals WHERE id = ? AND user_id = ? AND status = 'active'`, [
    ctx.params.id,
    ctx.user.id,
  ]);
  if (!goal) return redirect(ctx.res, '/dashboard');

  run(`UPDATE goals SET status = 'achieved', achieved_at = datetime('now') WHERE id = ?`, [goal.id]);
  redirect(ctx.res, '/goals/new', [
    encodeFlash(
      'success',
      'おめでとうございます🎊見事目標達成されましたね👏では次の目標を設定して更なる高みを目指しましょう🔥'
    ),
  ]);
}

async function handleAiSuggest(ctx) {
  if (!isAiConfigured()) {
    return sendJson(ctx.res, 200, {
      ok: false,
      message: 'AI機能はまだ設定されていません。管理者にANTHROPIC_API_KEYの設定を依頼してください。',
    });
  }
  const records = all(
    `SELECT * FROM lesson_records WHERE user_id = ? ORDER BY record_date DESC, id DESC LIMIT 8`,
    [ctx.user.id]
  );
  const rounds = all(`SELECT * FROM round_records WHERE user_id = ? ORDER BY round_date DESC, id DESC LIMIT 5`, [
    ctx.user.id,
  ]);
  try {
    const suggestion = await suggestPractice({ studentName: ctx.user.name, records, rounds });
    sendJson(ctx.res, 200, { ok: true, suggestion });
  } catch (err) {
    console.error('AI suggestion failed:', err.message);
    sendJson(ctx.res, 200, { ok: false, message: 'AIコーチへの問い合わせに失敗しました。時間をおいて再度お試しください。' });
  }
}

function handleStudentList(ctx) {
  const q = (ctx.query.get('q') || '').trim();
  const where = q ? `AND (u.name LIKE ? OR u.furigana LIKE ?)` : '';
  const params = q ? [`%${q}%`, `%${q}%`] : [];
  const students = all(
    `SELECT u.id, u.name, u.email, u.furigana,
            (SELECT COUNT(*) FROM lesson_records lr WHERE lr.user_id = u.id) AS record_count,
            (SELECT MAX(record_date) FROM lesson_records lr WHERE lr.user_id = u.id) AS last_date
     FROM users u WHERE u.role = 'student' ${where} ORDER BY u.name`,
    params
  );
  sendHtml(ctx.res, 200, studentListPage({ user: ctx.user, flash: ctx.flash, students, q }), [clearFlashCookie()]);
}

function handleStudentDetail(ctx) {
  const student = get(`SELECT * FROM users WHERE id = ? AND role = 'student'`, [ctx.params.id]);
  if (!student) {
    ctx.res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return ctx.res.end('生徒が見つかりません');
  }
  const records = all(
    `SELECT * FROM lesson_records WHERE user_id = ? AND record_type = 'lesson' ORDER BY record_date DESC, id DESC`,
    [student.id]
  );
  const practiceRecords = all(
    `SELECT * FROM lesson_records WHERE user_id = ? AND record_type = 'self_practice' ORDER BY record_date DESC, id DESC`,
    [student.id]
  );
  const rounds = all(`SELECT * FROM round_records WHERE user_id = ? ORDER BY round_date DESC, id DESC`, [
    student.id,
  ]);
  const goal = getActiveGoal(student.id);
  sendHtml(
    ctx.res,
    200,
    studentDetailPage({ user: ctx.user, flash: ctx.flash, student, records, practiceRecords, rounds, goal }),
    [clearFlashCookie()]
  );
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith('/static/')) return serveStatic(req, res, pathname);

    const cookies = parseCookies(req);
    const user = getSessionUser(cookies.session);
    const flash = readFlash(cookies);

    if (pathname.startsWith('/media/')) {
      return serveMedia(req, res, basename(pathname), user);
    }

    const matched = matchRoute(req.method, pathname);
    if (!matched) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('ページが見つかりません');
    }

    const ctx = {
      req,
      res,
      user,
      flash,
      sessionToken: cookies.session,
      params: matched.params,
      query: url.searchParams,
    };
    await matched.handler(ctx);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('サーバーエラーが発生しました');
    }
  }
});

ensureOwnerSeed();

server.listen(PORT, () => {
  console.log(`GOLF STUDIO SHADOW ゴルフ成長AI記録ノート: http://localhost:${PORT}`);
  if (!isAiConfigured()) {
    console.log('[info] ANTHROPIC_API_KEY is not set — AI要約・提案機能は無効化されています。');
  }
});
