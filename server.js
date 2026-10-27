import { loadEnv } from './src/lib/env.js';
loadEnv();

import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync, statfsSync, writeFileSync, unlinkSync } from 'node:fs';
import { extname, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

import { brand } from './src/config.js';
import { jstToday, jstHour, addDays } from './src/lib/date.js';
import { allowAttempt } from './src/lib/rateLimit.js';
import { run, get, all } from './src/db.js';
import {
  createUser,
  findUserByEmail,
  createSession,
  destroySession,
  getSessionUser,
  parseCookies,
  sessionCookieHeader,
  generateTempPassword,
  setUserPassword,
} from './src/auth.js';
import { verifyPassword } from './src/auth.js';
import { isAiConfigured, summarizeLessonRecord, suggestPractice, analyzeRoundPerformance } from './src/lib/ai.js';
import {
  DEFAULT_PARS_18,
  aggregateRound,
  combineRoundAggregates,
  computeAbilityScores,
  computeGrowthPotential,
  buildFallbackRoundAnalysis,
  scoreBandForAverage,
} from './src/lib/golfStats.js';
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
import { termsPage, privacyPage } from './src/views/legal.js';
import { appIconSvg } from './src/views/layout.js';
import {
  dashboardPage,
  recordsListPage,
  newRecordPage,
  practiceListPage,
  newPracticePage,
  recordDetailPage,
  newGoalPage,
  mypagePage,
} from './src/views/student.js';
import { studentListPage, studentDetailPage, instructorListPage } from './src/views/admin.js';
import { videoLibraryPage } from './src/views/videos.js';
import {
  newRoundStartPage,
  holeEntryPage,
  totalEntryPage,
  roundDetailPage,
  roundsPage,
  analysisPage,
} from './src/views/rounds.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
// Same DATA_DIR convention as src/db.js — persistent-disk-backed in
// production, a local folder for development.
const UPLOADS_DIR = process.env.DATA_DIR ? join(process.env.DATA_DIR, 'uploads') : join(__dirname, 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

const PORT = Number(process.env.PORT || 3000);

// Render's free tier gives the process ~512MB of RAM and the multipart
// parser buffers the whole request in memory, so a phone video that's too
// large will stall or crash the instance. Fail fast with a clear message
// instead of hanging on a huge upload.
const MAX_UPLOAD_BODY_BYTES = 70 * 1024 * 1024;

// ---------- helpers ----------

// Render (and most PaaS) terminate TLS at a proxy and forward plain HTTP to
// this process, setting X-Forwarded-For with the real client IP.
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function ensureOwnerSeed() {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  const name = process.env.OWNER_NAME || 'スタジオ管理者';
  if (!email || !password) return;
  const existing = findUserByEmail(email);
  if (existing) {
    // Deployments that were already running before is_owner existed have
    // this account sitting at the column's DEFAULT 0 — without this, the
    // studio's own representative silently loses owner-only access after
    // an otherwise unrelated update.
    if (!existing.is_owner) {
      run(`UPDATE users SET is_owner = 1 WHERE id = ?`, [existing.id]);
      console.log(`[seed] granted owner status to existing account: ${email}`);
    }
    return;
  }
  createUser({ name, email, password, role: 'instructor', isOwner: true });
  console.log(`[seed] owner instructor account created: ${email}`);
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

function streamVideoFile(req, res, filename, mimeType) {
  const filePath = join(UPLOADS_DIR, filename);
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const stat = statSync(filePath);
  const range = req.headers.range;
  const type = mimeType || 'application/octet-stream';

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match && match[1] ? parseInt(match[1], 10) : 0;
    const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
    const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
    const safeEnd = Number.isFinite(end) ? Math.min(stat.size - 1, end) : stat.size - 1;
    if (!match || safeStart > safeEnd || safeStart >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      'Content-Range': `bytes ${safeStart}-${safeEnd}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': safeEnd - safeStart + 1,
      'Content-Type': type,
    });
    createReadStream(filePath, { start: safeStart, end: safeEnd }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Content-Type': type,
    });
    createReadStream(filePath).pipe(res);
  }
}

// A student's personal practice/lesson video, restricted to its owner and instructors.
function servePersonalVideo(req, res, video, user) {
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
  streamVideoFile(req, res, video.filename, video.mime_type);
}

function serveMedia(req, res, filename, user) {
  if (!user) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const video = get(`SELECT * FROM videos WHERE filename = ?`, [filename]);
  if (video) return servePersonalVideo(req, res, video, user);

  // Library videos (instructor-provided teaching material) are viewable by
  // any logged-in student or instructor, not just the uploader.
  const libraryVideo = get(`SELECT * FROM library_videos WHERE filename = ?`, [filename]);
  if (libraryVideo) return streamVideoFile(req, res, libraryVideo.filename, libraryVideo.mime_type);

  // A round's attached photo — same ownership rule as a personal video.
  const round = get(`SELECT * FROM rounds WHERE photo_filename = ?`, [filename]);
  if (round) {
    const isOwner = user.role === 'student' && user.id === round.user_id;
    const isInstructor = user.role === 'instructor';
    if (!isOwner && !isInstructor) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    const ext = extname(round.photo_filename).toLowerCase();
    return streamVideoFile(req, res, round.photo_filename, MIME_TYPES[ext] || 'application/octet-stream');
  }

  res.writeHead(404);
  res.end('Not found');
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
  const roundCount = get(`SELECT COUNT(*) AS c FROM rounds WHERE user_id = ? AND status = 'complete'`, [userId]).c;
  const last = get(
    `SELECT record_date FROM lesson_records WHERE user_id = ? ORDER BY record_date DESC, id DESC LIMIT 1`,
    [userId]
  );
  return { recordCount, practiceCount, roundCount, lastDate: last ? last.record_date : null };
}

function roundStats(userId) {
  const currentYear = String(new Date().getFullYear());
  const best = get(
    `SELECT MIN(total_score) AS v FROM rounds WHERE user_id = ? AND status = 'complete' AND holes = 18 AND total_score IS NOT NULL`,
    [userId]
  );
  const yearAvg = get(
    `SELECT AVG(total_score) AS v FROM rounds WHERE user_id = ? AND status = 'complete' AND total_score IS NOT NULL AND substr(play_date, 1, 4) = ?`,
    [userId, currentYear]
  );
  const avgPutts = get(
    `SELECT AVG(putts_total) AS v FROM rounds WHERE user_id = ? AND status = 'complete' AND putts_total IS NOT NULL`,
    [userId]
  );
  return {
    bestScore: best.v ?? null,
    yearAvgScore: yearAvg.v !== null && yearAvg.v !== undefined ? Math.round(yearAvg.v * 10) / 10 : null,
    avgPutts: avgPutts.v !== null && avgPutts.v !== undefined ? Math.round(avgPutts.v * 10) / 10 : null,
  };
}

// Loads every completed round for a user plus its computed aggregate (reading
// round_holes for 'hole' mode rounds, the stored totals for 'total' mode),
// and the 18-hole-normalized combination used by the analysis page.
function buildRoundAnalysis(userId) {
  const rows = all(`SELECT * FROM rounds WHERE user_id = ? AND status = 'complete' ORDER BY play_date DESC, id DESC`, [
    userId,
  ]);
  const entries = rows.map((row) => {
    const round = { ...row, pars: JSON.parse(row.pars) };
    const holes = round.entry_mode === 'hole' ? all(`SELECT * FROM round_holes WHERE round_id = ? ORDER BY hole_no`, [round.id]) : [];
    const aggregate = aggregateRound(round, holes);
    return { round, aggregate };
  });
  const combined = combineRoundAggregates(entries.map((e) => e.aggregate));
  const abilityScores = computeAbilityScores(combined);
  const growth = computeGrowthPotential(combined);
  return { entries, combined, abilityScores, growth };
}

// Recomputes and stores the summary columns on a 'hole' mode round from its
// round_holes rows, so the round list / dashboard can read simple columns
// without re-aggregating every time (round_holes stays the source of truth
// for the full breakdown shown on the round detail page).
function syncRoundTotalsFromHoles(round) {
  const holes = all(`SELECT * FROM round_holes WHERE round_id = ? ORDER BY hole_no`, [round.id]);
  const agg = aggregateRound({ ...round, pars: JSON.parse(round.pars) }, holes);
  run(
    `UPDATE rounds SET total_score = ?, putts_total = ?, fw_keep_count = ?, gir_count = ?, three_putt_count = ?,
       ob_total = ?, penalty_total = ?, bunker_count = ?, bunker_save_count = ?, updated_at = datetime('now') WHERE id = ?`,
    [
      agg.totalScore,
      agg.puttsTotal,
      agg.fwKeepCount,
      agg.girCount,
      agg.threePuttPlusCount,
      agg.obTotal,
      agg.penaltyTotal,
      agg.sandSaveOpportunities,
      agg.sandSaveCount,
      round.id,
    ]
  );
}

// This app is used in Japan regardless of which timezone the server itself
// runs in (Render defaults to UTC), so "today" for streaks/greetings is
// always computed in JST rather than the server's local time — see
// src/lib/date.js (also used by the view layer for date-input defaults, so
// both sides agree on what day it is).

// Consecutive days (lesson or self-practice) ending today or yesterday —
// "alive" through yesterday so the streak doesn't vanish before the user
// has had a chance to record today.
function computeStreak(userId) {
  const rows = all(`SELECT DISTINCT record_date FROM lesson_records WHERE user_id = ?`, [userId]);
  if (!rows.length) return { streak: 0, recordedToday: false };
  const dates = new Set(rows.map((r) => r.record_date));
  const today = jstToday();
  const recordedToday = dates.has(today);
  let cursor = recordedToday ? today : addDays(today, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return { streak, recordedToday };
}

// This week's lesson-record count (used in the home-screen greeting and stat strip).
function weeklyActivity(userId) {
  const weekStart = addDays(jstToday(), -6);
  const row = get(`SELECT COUNT(*) AS c FROM lesson_records WHERE user_id = ? AND record_date >= ?`, [userId, weekStart]);
  return { weeklyCount: row.c };
}

// Simple deterministic hash so the same user sees the same message all day
// (a page reload shouldn't make it flicker) but a different one tomorrow,
// and different students aren't all stuck with the same line.
function seedFrom(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickTodayMessage({ streak, recordedToday, weeklyCount, hasGoal, userId }) {
  const seed = seedFrom(`${userId}-${jstToday()}`);
  const pick = (variants) => variants[seed % variants.length];

  if (recordedToday && streak >= 30) {
    return pick([
      `${streak}日連続達成中。ここまで続けられるのは立派です`,
      `${streak}日連続!継続する力そのものが、もう立派な武器です`,
      `${streak}日連続。これだけ積み重ねれば、変化が出ないはずがありません`,
    ]);
  }
  if (recordedToday && streak >= 7) {
    return pick([
      `${streak}日連続!今日も記録できました。すばらしい継続力です`,
      `${streak}日連続達成。毎日の積み重ねが力になっています`,
      `${streak}日間、よく続けています。この調子でいきましょう`,
    ]);
  }
  if (recordedToday) {
    return pick([
      '今日の記録、お疲れさまでした。積み重ねが力になります',
      '今日もしっかり記録できました。小さな一歩の積み重ねです',
      '記録完了です。今日の積み重ねが未来のスコアにつながります',
    ]);
  }
  if (streak >= 14) {
    return pick([
      `${streak}日連続更新中。もうすっかり習慣になっていますね`,
      `${streak}日間続いています。今日も記録して伸ばしましょう`,
    ]);
  }
  if (streak >= 2) {
    return pick([
      `${streak}日連続更新中。今日も記録して続けましょう`,
      `${streak}日連続です。今日も忘れずに記録していきましょう`,
      `いい流れがきています。${streak}日連続、今日も続けましょう`,
    ]);
  }
  if (weeklyCount > 0) {
    return pick([
      `今週はすでに${weeklyCount}件記録しています。この調子で`,
      `今週${weeklyCount}件の記録、順調です。今日も続けましょう`,
    ]);
  }
  if (hasGoal) {
    return pick([
      '目標に向けて、今日の一歩を記録してみましょう',
      '目標達成まで、小さな記録を積み重ねていきましょう',
    ]);
  }
  return pick([
    '今日から始めましょう。小さな記録も、積み重なれば成長の資産になります',
    '最初の一歩を踏み出しましょう。記録はあとで振り返る宝物になります',
    'まずは一つ記録してみましょう。続けるうちに成長が見えてきます',
  ]);
}

function jstGreeting() {
  const h = jstHour();
  if (h < 5) return 'こんばんは';
  if (h < 11) return 'おはようございます';
  if (h < 17) return 'こんにちは';
  return 'こんばんは';
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

// Routes that don't take a video (login, register, goal/round text forms) never
// pass maxBytes explicitly. Without a cap here they'd fall through to
// readBody's 300MB default — enough for an unauthenticated POST to /login to
// buffer 300MB per request before any rate limit check runs. 1MB is far more
// than any text-only form field needs.
const DEFAULT_BODY_BYTES = 1 * 1024 * 1024;

async function parseRequestBody(req, { maxBytes = DEFAULT_BODY_BYTES } = {}) {
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
  { method: 'GET', pattern: /^\/terms$/, handler: (ctx) => sendHtml(ctx.res, 200, termsPage({ user: ctx.user, flash: ctx.flash }), [clearFlashCookie()]) },
  { method: 'GET', pattern: /^\/privacy$/, handler: (ctx) => sendHtml(ctx.res, 200, privacyPage({ user: ctx.user, flash: ctx.flash }), [clearFlashCookie()]) },
  {
    method: 'GET',
    pattern: /^\/favicon\.svg$/,
    handler: (ctx) => {
      ctx.res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' });
      ctx.res.end(appIconSvg(brand.colors.dark));
    },
  },
  {
    method: 'GET',
    pattern: /^\/manifest\.webmanifest$/,
    handler: (ctx) => {
      sendJson(ctx.res, 200, {
        name: `${brand.studioName} ${brand.tagline}`,
        short_name: brand.studioName,
        start_url: '/dashboard',
        display: 'standalone',
        background_color: brand.colors.dark,
        theme_color: brand.colors.dark,
        icons: [{ src: '/static/apple-touch-icon.png', sizes: '512x512', type: 'image/png' }],
      });
    },
  },
  { method: 'POST', pattern: /^\/logout$/, handler: handleLogout },
  { method: 'GET', pattern: /^\/dashboard$/, handler: requireAuth(handleDashboard) },
  { method: 'GET', pattern: /^\/mypage$/, handler: requireStudent(handleMypage) },
  { method: 'GET', pattern: /^\/records$/, handler: requireStudent(handleRecordsList) },
  { method: 'GET', pattern: /^\/records\/new$/, handler: requireStudent(handleNewRecordPage) },
  { method: 'POST', pattern: /^\/records$/, handler: requireStudent(handleCreateRecord) },
  { method: 'GET', pattern: /^\/records\/(?<id>\d+)$/, handler: requireAuth(handleRecordDetail) },
  { method: 'GET', pattern: /^\/practice$/, handler: requireStudent(handlePracticeList) },
  { method: 'GET', pattern: /^\/practice\/new$/, handler: requireStudent(handleNewPracticePage) },
  { method: 'POST', pattern: /^\/practice$/, handler: requireStudent(handleCreatePractice) },
  { method: 'GET', pattern: /^\/rounds$/, handler: requireStudent(handleRoundsPage) },
  { method: 'GET', pattern: /^\/rounds\/new$/, handler: requireStudent(handleNewRoundPage) },
  { method: 'POST', pattern: /^\/rounds$/, handler: requireStudent(handleCreateRoundStart) },
  { method: 'GET', pattern: /^\/rounds\/(?<id>\d+)$/, handler: requireStudent(handleRoundShow) },
  { method: 'GET', pattern: /^\/rounds\/(?<id>\d+)\/edit$/, handler: requireStudent(handleRoundEdit) },
  { method: 'GET', pattern: /^\/rounds\/(?<id>\d+)\/holes$/, handler: requireStudent(handleHoleEntryPage) },
  { method: 'POST', pattern: /^\/rounds\/(?<id>\d+)\/holes\/save$/, handler: requireStudent(handleSaveHoleAjax) },
  { method: 'GET', pattern: /^\/rounds\/(?<id>\d+)\/total$/, handler: requireStudent(handleTotalEntryPage) },
  { method: 'POST', pattern: /^\/rounds\/(?<id>\d+)\/total$/, handler: requireStudent(handleSaveTotalEntry) },
  { method: 'POST', pattern: /^\/rounds\/(?<id>\d+)\/finish$/, handler: requireStudent(handleFinishRound) },
  { method: 'POST', pattern: /^\/rounds\/(?<id>\d+)\/delete$/, handler: requireStudent(handleDeleteRound) },
  { method: 'GET', pattern: /^\/analysis$/, handler: requireStudent(handleAnalysisPage) },
  { method: 'POST', pattern: /^\/ai\/round-coach$/, handler: requireStudent(handleRoundCoachAi) },
  { method: 'GET', pattern: /^\/goals\/new$/, handler: requireStudent(handleNewGoalPage) },
  { method: 'POST', pattern: /^\/goals$/, handler: requireStudent(handleCreateGoal) },
  { method: 'POST', pattern: /^\/goals\/(?<id>\d+)\/achieve$/, handler: requireStudent(handleAchieveGoal) },
  { method: 'POST', pattern: /^\/ai\/suggest$/, handler: requireStudent(handleAiSuggest) },
  { method: 'GET', pattern: /^\/videos$/, handler: requireAuth(handleVideoLibrary) },
  { method: 'POST', pattern: /^\/videos$/, handler: requireOwner(handleUploadLibraryVideo) },
  {
    method: 'POST',
    pattern: /^\/videos\/(?<id>\d+)\/delete$/,
    handler: requireOwner(handleDeleteLibraryVideo),
  },
  { method: 'GET', pattern: /^\/admin$/, handler: requireInstructor(handleStudentList) },
  { method: 'GET', pattern: /^\/admin\/export$/, handler: requireOwner(handleExportData) },
  {
    method: 'GET',
    pattern: /^\/admin\/students\/(?<id>\d+)$/,
    handler: requireInstructor(handleStudentDetail),
  },
  {
    method: 'GET',
    pattern: /^\/admin\/students\/(?<id>\d+)\/rounds\/(?<roundId>\d+)$/,
    handler: requireInstructor(handleAdminRoundDetail),
  },
  {
    method: 'POST',
    pattern: /^\/admin\/students\/(?<id>\d+)\/rounds\/(?<roundId>\d+)\/comments$/,
    handler: requireInstructor(handleAdminRoundComment),
  },
  {
    method: 'POST',
    pattern: /^\/admin\/students\/(?<id>\d+)\/round-coach$/,
    handler: requireInstructor(handleAdminRoundCoachAi),
  },
  {
    method: 'POST',
    pattern: /^\/admin\/students\/(?<id>\d+)\/reset-password$/,
    handler: requireOwner(handleResetStudentPassword),
  },
  {
    method: 'POST',
    pattern: /^\/admin\/students\/(?<id>\d+)\/suspend$/,
    handler: requireOwner(handleToggleStudentSuspend),
  },
  {
    method: 'POST',
    pattern: /^\/admin\/students\/(?<id>\d+)\/delete$/,
    handler: requireOwner(handleDeleteStudent),
  },
  { method: 'GET', pattern: /^\/admin\/instructors$/, handler: requireOwner(handleInstructorList) },
  { method: 'POST', pattern: /^\/admin\/instructors$/, handler: requireOwner(handleCreateInstructor) },
  {
    method: 'POST',
    pattern: /^\/admin\/instructors\/(?<id>\d+)\/reset-password$/,
    handler: requireOwner(handleResetInstructorPassword),
  },
  {
    method: 'POST',
    pattern: /^\/admin\/instructors\/(?<id>\d+)\/delete$/,
    handler: requireOwner(handleDeleteInstructor),
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

// For studio-level administration (video library, staff accounts, data
// export, usage stats, account suspension/deletion) — only the originally
// seeded "representative" account, not every instructor added later.
function requireOwner(handler) {
  return requireInstructor((ctx) => {
    if (!ctx.user.is_owner) return redirect(ctx.res, '/admin');
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
  const email = (fields.email || '').trim().toLowerCase();

  if (!allowAttempt(`login:${email}`, { max: 10, windowMs: 15 * 60 * 1000 })) {
    return sendHtml(
      ctx.res,
      429,
      loginPage({
        flash: { type: 'error', message: 'ログイン試行回数が多すぎます。15分ほど待ってから再度お試しください。' },
      })
    );
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(fields.password || '', user.password_salt, user.password_hash)) {
    return sendHtml(
      ctx.res,
      401,
      loginPage({ flash: { type: 'error', message: 'メールアドレスまたはパスワードが正しくありません。' } })
    );
  }
  if (user.is_suspended) {
    return sendHtml(
      ctx.res,
      403,
      loginPage({ flash: { type: 'error', message: 'このアカウントは停止されています。詳しくは指導者にお問い合わせください。' } })
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
  if (!allowAttempt(`register:${getClientIp(ctx.req)}`, { max: 10, windowMs: 60 * 60 * 1000 })) {
    return sendHtml(
      ctx.res,
      429,
      registerPage({ flash: { type: 'error', message: '登録試行回数が多すぎます。しばらく待ってから再度お試しください。' } })
    );
  }

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
  const stats = { ...studentStats(ctx.user.id), bestScore: roundStats(ctx.user.id).bestScore };
  const goal = getActiveGoal(ctx.user.id);
  const { streak, recordedToday } = computeStreak(ctx.user.id);
  const { weeklyCount } = weeklyActivity(ctx.user.id);
  const todayMessage = pickTodayMessage({ streak, recordedToday, weeklyCount, hasGoal: Boolean(goal), userId: ctx.user.id });
  const recentCombined = all(
    `SELECT lr.*, (SELECT COUNT(*) FROM videos v WHERE v.lesson_record_id = lr.id) AS video_count
     FROM lesson_records lr WHERE lr.user_id = ? ORDER BY lr.record_date DESC, lr.id DESC LIMIT 6`,
    [ctx.user.id]
  );
  sendHtml(
    ctx.res,
    200,
    dashboardPage({
      user: ctx.user,
      flash: ctx.flash,
      stats,
      goal,
      streak,
      weeklyCount,
      todayMessage,
      greeting: jstGreeting(),
      todayLabel: new Date().toLocaleDateString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      }),
      recentCombined,
    }),
    [clearFlashCookie()]
  );
}

function handleMypage(ctx) {
  if (ctx.user.role === 'instructor') return redirect(ctx.res, '/admin');
  const stats = studentStats(ctx.user.id);
  const { streak } = computeStreak(ctx.user.id);
  const memberSince = (ctx.user.created_at || '').slice(0, 10);
  sendHtml(
    ctx.res,
    200,
    mypagePage({ user: ctx.user, flash: ctx.flash, stats: { ...stats, streak }, memberSince }),
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

  const recordDate = fields.record_date || jstToday();
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

  const recordDate = fields.record_date || jstToday();
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

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

function parsePars(fields, holes) {
  const pars = [];
  for (let i = 1; i <= holes; i++) {
    const v = parseInt(fields[`par_${i}`], 10);
    pars.push([3, 4, 5].includes(v) ? v : 4);
  }
  return pars;
}

// Remembers the course's par layout per student, so picking the same course
// name again on the start screen can prefill it.
function rememberCourse(userId, name, holes, pars) {
  run(
    `INSERT INTO courses (user_id, name, holes, pars, last_used_at) VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, name) DO UPDATE SET holes = excluded.holes, pars = excluded.pars, last_used_at = datetime('now')`,
    [userId, name, holes, JSON.stringify(pars)]
  );
}

function loadOwnedRound(ctx) {
  return get(`SELECT * FROM rounds WHERE id = ? AND user_id = ?`, [ctx.params.id, ctx.user.id]);
}

function roundNotFound(ctx) {
  ctx.res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  ctx.res.end('ラウンドが見つかりません');
}

function holeSummariesFor(roundId, holes, pars) {
  const saved = new Map(all(`SELECT * FROM round_holes WHERE round_id = ?`, [roundId]).map((h) => [h.hole_no, h]));
  const list = [];
  for (let i = 1; i <= holes; i++) {
    list.push(saved.get(i) || { hole_no: i, par: pars[i - 1], strokes: null, putts: null, tee_shot: null, ob_count: 0, penalty_count: 0, bunker: 0 });
  }
  return list;
}

function handleRoundsPage(ctx) {
  const rounds = all(`SELECT * FROM rounds WHERE user_id = ? ORDER BY play_date DESC, id DESC`, [ctx.user.id]);
  const { combined } = buildRoundAnalysis(ctx.user.id);
  sendHtml(ctx.res, 200, roundsPage({ user: ctx.user, flash: ctx.flash, rounds, combined }), [clearFlashCookie()]);
}

function handleNewRoundPage(ctx) {
  const courses = all(`SELECT * FROM courses WHERE user_id = ? ORDER BY last_used_at DESC`, [ctx.user.id]);
  sendHtml(ctx.res, 200, newRoundStartPage({ user: ctx.user, flash: ctx.flash, courses }), [clearFlashCookie()]);
}

async function handleCreateRoundStart(ctx) {
  const { fields } = await parseRequestBody(ctx.req);
  const courseName = (fields.course_name || '').trim();
  const playDate = fields.play_date || jstToday();
  const holes = fields.holes === '9' ? 9 : 18;
  const entryMode = fields.entry_mode === 'total' ? 'total' : 'hole';
  const pars = parsePars(fields, holes);

  if (!courseName) {
    const courses = all(`SELECT * FROM courses WHERE user_id = ? ORDER BY last_used_at DESC`, [ctx.user.id]);
    return sendHtml(
      ctx.res,
      400,
      newRoundStartPage({
        user: ctx.user,
        flash: { type: 'error', message: 'コース名を入力してください。' },
        courses,
        values: { ...fields, holes, pars },
      })
    );
  }

  rememberCourse(ctx.user.id, courseName, holes, pars);

  const result = run(
    `INSERT INTO rounds (user_id, play_date, course_name, holes, pars, entry_mode, status) VALUES (?, ?, ?, ?, ?, ?, 'in_progress')`,
    [ctx.user.id, playDate, courseName, holes, JSON.stringify(pars), entryMode]
  );
  const roundId = Number(result.lastInsertRowid);

  if (entryMode === 'hole') {
    redirect(ctx.res, `/rounds/${roundId}/holes`);
  } else {
    redirect(ctx.res, `/rounds/${roundId}/total`);
  }
}

// Entry point for an existing round: resumes hole-by-hole entry where it was
// left off, or shows the permanent detail/summary page once complete.
function handleRoundShow(ctx) {
  const round = loadOwnedRound(ctx);
  if (!round) return roundNotFound(ctx);
  const pars = JSON.parse(round.pars);

  if (round.status === 'in_progress') {
    if (round.entry_mode === 'hole') return redirect(ctx.res, `/rounds/${round.id}/holes`);
    return redirect(ctx.res, `/rounds/${round.id}/total`);
  }

  const holes = round.entry_mode === 'hole' ? all(`SELECT * FROM round_holes WHERE round_id = ? ORDER BY hole_no`, [round.id]) : [];
  const aggregate = aggregateRound({ ...round, pars }, holes);
  const comments = all(
    `SELECT rc.*, u.name AS author_name FROM round_comments rc LEFT JOIN users u ON u.id = rc.author_id WHERE rc.round_id = ? ORDER BY rc.id`,
    [round.id]
  );
  sendHtml(ctx.res, 200, roundDetailPage({ user: ctx.user, flash: ctx.flash, round, holes, aggregate, comments }), [
    clearFlashCookie(),
  ]);
}

function handleRoundEdit(ctx) {
  const round = loadOwnedRound(ctx);
  if (!round) return roundNotFound(ctx);
  if (round.entry_mode === 'hole') return redirect(ctx.res, `/rounds/${round.id}/holes`);
  return redirect(ctx.res, `/rounds/${round.id}/total`);
}

// Lets a student delete their own round — in progress or complete. round_holes
// and round_comments cascade via their foreign keys; the attached photo file
// (if any) has to be removed separately since it lives on disk, not in SQLite.
function handleDeleteRound(ctx) {
  const round = loadOwnedRound(ctx);
  if (!round) return roundNotFound(ctx);
  if (round.photo_filename) {
    const filePath = join(UPLOADS_DIR, round.photo_filename);
    if (existsSync(filePath)) unlinkSync(filePath);
  }
  run(`DELETE FROM rounds WHERE id = ?`, [round.id]);
  redirect(ctx.res, '/rounds', [encodeFlash('success', 'ラウンド記録を削除しました。')]);
}

function handleHoleEntryPage(ctx) {
  const round = loadOwnedRound(ctx);
  if (!round || round.entry_mode !== 'hole') return roundNotFound(ctx);
  const pars = JSON.parse(round.pars);
  const summaries = holeSummariesFor(round.id, round.holes, pars);
  sendHtml(ctx.res, 200, holeEntryPage({ user: ctx.user, flash: ctx.flash, round, holeSummaries: summaries }), [
    clearFlashCookie(),
  ]);
}

// Shared by handleSaveHole and handleFinishRound: upserts the hole whose
// fields were submitted (`current_hole`), and keeps the round's par array
// (and the student's saved course template) in sync if it was edited here.
function saveHoleFromFields(userId, round, fields) {
  const currentHole = Math.max(1, Math.min(round.holes, parseInt(fields.current_hole, 10) || 1));
  const pars = JSON.parse(round.pars);
  const par = [3, 4, 5].includes(parseInt(fields.par, 10)) ? parseInt(fields.par, 10) : pars[currentHole - 1];
  const strokes = Math.max(1, Math.min(15, parseInt(fields.strokes, 10) || par));
  const putts = Math.max(0, Math.min(strokes, parseInt(fields.putts, 10) ?? 2));
  const teeShot = ['fw', 'left', 'right'].includes(fields.tee_shot) ? fields.tee_shot : null;
  const ob = Math.max(0, Math.min(9, parseInt(fields.ob_count, 10) || 0));
  const penalty = Math.max(0, Math.min(9, parseInt(fields.penalty_count, 10) || 0));
  const bunker = fields.bunker === '1' ? 1 : 0;

  run(
    `INSERT INTO round_holes (round_id, hole_no, par, strokes, putts, tee_shot, ob_count, penalty_count, bunker)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(round_id, hole_no) DO UPDATE SET par = excluded.par, strokes = excluded.strokes, putts = excluded.putts,
       tee_shot = excluded.tee_shot, ob_count = excluded.ob_count, penalty_count = excluded.penalty_count, bunker = excluded.bunker`,
    [round.id, currentHole, par, strokes, putts, teeShot, ob, penalty, bunker]
  );

  if (pars[currentHole - 1] !== par) {
    pars[currentHole - 1] = par;
    run(`UPDATE rounds SET pars = ?, updated_at = datetime('now') WHERE id = ?`, [JSON.stringify(pars), round.id]);
    rememberCourse(userId, round.course_name, round.holes, pars);
  }
  return currentHole;
}

// Background save from the single-page hole-entry screen: the client never
// navigates or reloads for this, it just fires this after every hole it
// leaves, so the response is JSON rather than a redirect.
async function handleSaveHoleAjax(ctx) {
  const round = loadOwnedRound(ctx);
  if (!round || round.entry_mode !== 'hole') return sendJson(ctx.res, 404, { ok: false });
  const { fields } = await parseRequestBody(ctx.req);
  saveHoleFromFields(ctx.user.id, round, fields);
  sendJson(ctx.res, 200, { ok: true });
}

function handleTotalEntryPage(ctx) {
  const round = loadOwnedRound(ctx);
  if (!round || round.entry_mode !== 'total') return roundNotFound(ctx);
  sendHtml(ctx.res, 200, totalEntryPage({ user: ctx.user, flash: ctx.flash, round }), [clearFlashCookie()]);
}

function toIntOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

async function handleSaveTotalEntry(ctx) {
  const round = loadOwnedRound(ctx);
  if (!round || round.entry_mode !== 'total') return roundNotFound(ctx);

  let fields, files;
  try {
    ({ fields, files } = await parseRequestBody(ctx.req, { maxBytes: MAX_PHOTO_BYTES }));
  } catch (err) {
    if (err.code === 'BODY_TOO_LARGE') {
      return sendHtml(
        ctx.res,
        400,
        totalEntryPage({ user: ctx.user, flash: { type: 'error', message: '写真のサイズが大きすぎます(上限15MB)。' }, round }),
        []
      );
    }
    throw err;
  }

  const totalScore = toIntOrNull(fields.total_score);
  if (totalScore === null) {
    return sendHtml(
      ctx.res,
      400,
      totalEntryPage({ user: ctx.user, flash: { type: 'error', message: 'スコアを入力してください。' }, round, values: fields })
    );
  }

  let photoFilename = round.photo_filename;
  const photo = (files || []).find((f) => f.fieldName === 'photo');
  if (photo && photo.mimeType.startsWith('image/')) {
    photoFilename = saveVideoFile(photo);
  }

  run(
    `UPDATE rounds SET total_score = ?, putts_total = ?, fw_keep_count = ?, gir_count = ?, three_putt_count = ?,
       ob_total = ?, penalty_total = ?, bunker_count = ?, bunker_save_count = ?, driver_avg_yards = ?,
       notes = ?, photo_filename = ?, status = 'complete', updated_at = datetime('now')
     WHERE id = ?`,
    [
      totalScore,
      toIntOrNull(fields.putts_total),
      toIntOrNull(fields.fw_keep_count),
      toIntOrNull(fields.gir_count),
      toIntOrNull(fields.three_putt_count),
      toIntOrNull(fields.ob_total),
      toIntOrNull(fields.penalty_total),
      toIntOrNull(fields.bunker_count),
      toIntOrNull(fields.bunker_save_count),
      toIntOrNull(fields.driver_avg_yards),
      (fields.notes || '').trim() || null,
      photoFilename,
      round.id,
    ]
  );
  redirect(ctx.res, `/rounds/${round.id}`, [encodeFlash('success', 'ラウンド記録を保存しました。')]);
}

// The last hole's fields arrive with this request same as any other
// save-and-navigate action, so persist them before marking the round complete.
async function handleFinishRound(ctx) {
  const round = loadOwnedRound(ctx);
  if (!round || round.entry_mode !== 'hole') return roundNotFound(ctx);
  const { fields } = await parseRequestBody(ctx.req);
  saveHoleFromFields(ctx.user.id, round, fields);

  run(`UPDATE rounds SET status = 'complete', updated_at = datetime('now') WHERE id = ?`, [round.id]);
  syncRoundTotalsFromHoles(round);
  redirect(ctx.res, `/rounds/${round.id}`, [encodeFlash('success', 'お疲れさまでした。ラウンドを記録しました。')]);
}

function handleAnalysisPage(ctx) {
  const { entries, combined, abilityScores, growth } = buildRoundAnalysis(ctx.user.id);
  const recentRounds = entries.slice(0, 10).reverse().map((e) => ({
    round: { playDate: e.round.play_date, courseName: e.round.course_name, holesPlayed: e.round.holes },
    aggregate: e.aggregate,
  }));
  sendHtml(
    ctx.res,
    200,
    analysisPage({ user: ctx.user, flash: ctx.flash, combined, abilityScores, growth, recentRounds }),
    [clearFlashCookie()]
  );
}

async function runRoundCoachAi(userId, studentName) {
  const { combined, abilityScores, growth } = buildRoundAnalysis(userId);
  if (!combined) {
    return { ok: false, message: 'ラウンドを記録すると分析できます。' };
  }
  const recentNotes = all(`SELECT notes FROM rounds WHERE user_id = ? AND status = 'complete' AND notes IS NOT NULL ORDER BY play_date DESC LIMIT 3`, [
    userId,
  ]).map((r) => r.notes);

  if (!isAiConfigured()) {
    return { ok: true, analysis: buildFallbackRoundAnalysis({ combined, abilityScores, growth }), aiUsed: false };
  }
  try {
    const analysis = await analyzeRoundPerformance({ studentName, combined, abilityScores, growth, recentNotes });
    return { ok: true, analysis, aiUsed: true };
  } catch (err) {
    console.error('Round coach AI failed:', err.message);
    return { ok: true, analysis: buildFallbackRoundAnalysis({ combined, abilityScores, growth }), aiUsed: false };
  }
}

async function handleRoundCoachAi(ctx) {
  const result = await runRoundCoachAi(ctx.user.id, ctx.user.name);
  sendJson(ctx.res, 200, result);
}

function handleAdminRoundDetail(ctx) {
  const student = get(`SELECT * FROM users WHERE id = ? AND role = 'student'`, [ctx.params.id]);
  if (!student) return roundNotFound(ctx);
  const round = get(`SELECT * FROM rounds WHERE id = ? AND user_id = ?`, [ctx.params.roundId, student.id]);
  if (!round) return roundNotFound(ctx);
  const pars = JSON.parse(round.pars);
  const holes = round.entry_mode === 'hole' ? all(`SELECT * FROM round_holes WHERE round_id = ? ORDER BY hole_no`, [round.id]) : [];
  const aggregate = aggregateRound({ ...round, pars }, holes);
  const comments = all(
    `SELECT rc.*, u.name AS author_name FROM round_comments rc LEFT JOIN users u ON u.id = rc.author_id WHERE rc.round_id = ? ORDER BY rc.id`,
    [round.id]
  );
  sendHtml(
    ctx.res,
    200,
    roundDetailPage({
      user: ctx.user,
      flash: ctx.flash,
      round,
      holes,
      aggregate,
      comments,
      readOnly: true,
      backHref: `/admin/students/${student.id}`,
    }),
    [clearFlashCookie()]
  );
}

async function handleAdminRoundComment(ctx) {
  const student = get(`SELECT * FROM users WHERE id = ? AND role = 'student'`, [ctx.params.id]);
  if (!student) return roundNotFound(ctx);
  const round = get(`SELECT * FROM rounds WHERE id = ? AND user_id = ?`, [ctx.params.roundId, student.id]);
  if (!round) return roundNotFound(ctx);
  const { fields } = await parseRequestBody(ctx.req);
  const body = (fields.body || '').trim();
  if (body) {
    run(`INSERT INTO round_comments (round_id, author_id, body) VALUES (?, ?, ?)`, [round.id, ctx.user.id, body]);
  }
  redirect(ctx.res, `/admin/students/${student.id}/rounds/${round.id}`, [encodeFlash('success', 'コメントを投稿しました。')]);
}

async function handleAdminRoundCoachAi(ctx) {
  const student = get(`SELECT * FROM users WHERE id = ? AND role = 'student'`, [ctx.params.id]);
  if (!student) return sendJson(ctx.res, 404, { ok: false, message: '生徒が見つかりません。' });
  const result = await runRoundCoachAi(student.id, student.name);
  sendJson(ctx.res, 200, result);
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
      'おめでとうございます。見事目標達成されましたね。では次の目標を設定して、更なる高みを目指しましょう'
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
  const rounds = all(
    `SELECT play_date AS round_date, course_name, total_score AS score, notes AS issues
     FROM rounds WHERE user_id = ? AND status = 'complete' ORDER BY play_date DESC, id DESC LIMIT 5`,
    [ctx.user.id]
  );
  try {
    const suggestion = await suggestPractice({ studentName: ctx.user.name, records, rounds });
    sendJson(ctx.res, 200, { ok: true, suggestion });
  } catch (err) {
    console.error('AI suggestion failed:', err.message);
    sendJson(ctx.res, 200, { ok: false, message: 'AIコーチへの問い合わせに失敗しました。時間をおいて再度お試しください。' });
  }
}

function handleVideoLibrary(ctx) {
  // Non-owner instructors are scoped to student search only — the video
  // library (and its upload/delete actions) is a studio-level concern.
  if (ctx.user.role === 'instructor' && !ctx.user.is_owner) return redirect(ctx.res, '/admin');
  const videos = all(`SELECT * FROM library_videos ORDER BY created_at DESC, id DESC`);
  sendHtml(ctx.res, 200, videoLibraryPage({ user: ctx.user, flash: ctx.flash, videos }), [clearFlashCookie()]);
}

async function handleUploadLibraryVideo(ctx) {
  let fields, files;
  try {
    ({ fields, files } = await parseRequestBody(ctx.req, { maxBytes: MAX_UPLOAD_BODY_BYTES }));
  } catch (err) {
    if (err.code === 'BODY_TOO_LARGE') {
      const videos = all(`SELECT * FROM library_videos ORDER BY created_at DESC, id DESC`);
      return sendHtml(
        ctx.res,
        413,
        videoLibraryPage({
          user: ctx.user,
          flash: { type: 'error', message: '動画ファイルが大きすぎます(合計70MBまで)。' },
          videos,
        })
      );
    }
    throw err;
  }

  const title = (fields.title || '').trim();
  const description = (fields.description || '').trim();
  const videoFile = files.find((f) => f.fieldName === 'video');

  if (!title || !videoFile) {
    const videos = all(`SELECT * FROM library_videos ORDER BY created_at DESC, id DESC`);
    return sendHtml(
      ctx.res,
      400,
      videoLibraryPage({
        user: ctx.user,
        flash: { type: 'error', message: 'タイトルと動画ファイルを指定してください。' },
        videos,
        values: fields,
      })
    );
  }

  const storedName = saveVideoFile(videoFile);
  run(
    `INSERT INTO library_videos (title, description, filename, original_name, mime_type, size_bytes, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, description || null, storedName, videoFile.filename, videoFile.mimeType, videoFile.data.length, ctx.user.id]
  );
  redirect(ctx.res, '/videos', [encodeFlash('success', '動画をアップロードしました。')]);
}

function handleDeleteLibraryVideo(ctx) {
  const video = get(`SELECT * FROM library_videos WHERE id = ?`, [ctx.params.id]);
  if (video) {
    run(`DELETE FROM library_videos WHERE id = ?`, [video.id]);
    const filePath = join(UPLOADS_DIR, video.filename);
    if (existsSync(filePath)) unlinkSync(filePath);
  }
  redirect(ctx.res, '/videos', [encodeFlash('success', '動画を削除しました。')]);
}

// Full data export for backup/portability. Deliberately excludes
// password_hash/password_salt and session tokens — this file may be
// downloaded onto a laptop or emailed, and credentials have no business
// leaving the server.
function handleExportData(ctx) {
  const data = {
    exported_at: new Date().toISOString(),
    studio_name: brand.studioName,
    users: all(`SELECT id, name, email, furigana, role, created_at FROM users ORDER BY id`),
    lesson_records: all(`SELECT * FROM lesson_records ORDER BY id`),
    rounds: all(`SELECT * FROM rounds ORDER BY id`),
    round_holes: all(`SELECT * FROM round_holes ORDER BY id`),
    round_comments: all(`SELECT * FROM round_comments ORDER BY id`),
    courses: all(`SELECT * FROM courses ORDER BY id`),
    goals: all(`SELECT * FROM goals ORDER BY id`),
    videos: all(`SELECT id, lesson_record_id, filename, original_name, mime_type, size_bytes, created_at FROM videos ORDER BY id`),
    library_videos: all(
      `SELECT id, title, description, filename, original_name, mime_type, size_bytes, uploaded_by, created_at FROM library_videos ORDER BY id`
    ),
  };
  const json = JSON.stringify(data, null, 2);
  const filename = `${jstToday()}-data-export.json`;
  ctx.res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  ctx.res.end(json);
}

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

// Gives the instructor visibility into storage usage so they can catch a
// disk approaching capacity before it fails an upload, and so the operator
// (the person deploying this per store) can see at a glance whether a
// store's video usage warrants moving them to a bigger plan.
function getStorageUsage() {
  const videoTotal = get(
    `SELECT COALESCE(SUM(size_bytes), 0) AS bytes FROM (
       SELECT size_bytes FROM videos
       UNION ALL
       SELECT size_bytes FROM library_videos
     )`
  ).bytes;
  const studentCount = get(`SELECT COUNT(*) AS n FROM users WHERE role = 'student'`).n;

  let disk = null;
  try {
    const stat = statfsSync(UPLOADS_DIR);
    const totalBytes = stat.blocks * stat.bsize;
    const freeBytes = stat.bavail * stat.bsize;
    disk = { totalBytes, freeBytes, usedBytes: totalBytes - freeBytes };
  } catch {
    // statfs isn't available on every platform/filesystem - the video total
    // above still works without it.
  }

  return { videoTotalBytes: videoTotal, studentCount, disk };
}

function handleStudentList(ctx) {
  const q = (ctx.query.get('q') || '').trim();
  const where = q ? `AND (u.name LIKE ? OR u.furigana LIKE ?)` : '';
  const params = q ? [`%${q}%`, `%${q}%`] : [];
  const students = all(
    `SELECT u.id, u.name, u.email, u.furigana, u.is_suspended,
            (SELECT COUNT(*) FROM lesson_records lr WHERE lr.user_id = u.id) AS record_count,
            (SELECT MAX(record_date) FROM lesson_records lr WHERE lr.user_id = u.id) AS last_date,
            (SELECT MAX(play_date) FROM rounds r WHERE r.user_id = u.id AND r.status = 'complete') AS last_round_date
     FROM users u WHERE u.role = 'student' ${where} ORDER BY u.name`,
    params
  );
  for (const s of students) {
    const { combined, growth } = buildRoundAnalysis(s.id);
    s.avgScore = combined ? combined.avgScorePer18 : null;
    s.topGrowthLabel = growth.items.length ? growth.items[0].label : null;
  }
  let usage = null;
  if (ctx.user.is_owner) {
    const rawUsage = getStorageUsage();
    usage = {
      studentCount: rawUsage.studentCount,
      videoTotal: formatBytes(rawUsage.videoTotalBytes),
      dataDirConfigured: Boolean(process.env.DATA_DIR),
      diskFree: rawUsage.disk ? formatBytes(rawUsage.disk.freeBytes) : null,
      diskUsedPercent: rawUsage.disk ? Math.round((rawUsage.disk.usedBytes / rawUsage.disk.totalBytes) * 100) : null,
    };
  }
  sendHtml(ctx.res, 200, studentListPage({ user: ctx.user, flash: ctx.flash, students, q, usage }), [
    clearFlashCookie(),
  ]);
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
  const rounds = all(`SELECT * FROM rounds WHERE user_id = ? ORDER BY play_date DESC, id DESC`, [student.id]);
  const analysis = buildRoundAnalysis(student.id);
  const goal = getActiveGoal(student.id);
  sendHtml(
    ctx.res,
    200,
    studentDetailPage({ user: ctx.user, flash: ctx.flash, student, records, practiceRecords, rounds, analysis, goal }),
    [clearFlashCookie()]
  );
}

// Students have no email/SMS delivery configured, so there's no self-serve
// "forgot password" flow — the instructor resets it here and relays the new
// password to the student directly (in person, by phone, LINE, etc.).
function handleResetStudentPassword(ctx) {
  const student = get(`SELECT * FROM users WHERE id = ? AND role = 'student'`, [ctx.params.id]);
  if (!student) {
    ctx.res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return ctx.res.end('生徒が見つかりません');
  }
  const tempPassword = generateTempPassword();
  setUserPassword(student.id, tempPassword);
  run(`DELETE FROM sessions WHERE user_id = ?`, [student.id]);
  redirect(ctx.res, `/admin/students/${student.id}`, [
    encodeFlash(
      'success',
      `${student.name}さんの新しいパスワードを発行しました：${tempPassword}　このパスワードを生徒本人に伝えてください。`
    ),
  ]);
}

// Suspension is reversible: a suspended student can't log in, but nothing
// about their account or records is touched, so re-activating restores
// them exactly as they were.
function handleToggleStudentSuspend(ctx) {
  const student = get(`SELECT * FROM users WHERE id = ? AND role = 'student'`, [ctx.params.id]);
  if (!student) {
    ctx.res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return ctx.res.end('生徒が見つかりません');
  }
  const nextSuspended = student.is_suspended ? 0 : 1;
  run(`UPDATE users SET is_suspended = ? WHERE id = ?`, [nextSuspended, student.id]);
  run(`DELETE FROM sessions WHERE user_id = ?`, [student.id]);
  redirect(ctx.res, `/admin/students/${student.id}`, [
    encodeFlash(
      'success',
      nextSuspended ? `${student.name}さんのアカウントを停止しました。` : `${student.name}さんのアカウント停止を解除しました。`
    ),
  ]);
}

// A permanent, irreversible delete — all of the student's records, rounds,
// goals, videos (DB rows) and sessions cascade via the FK ON DELETE CASCADE
// defined in db.js. The video *files* on disk don't cascade, so they're
// unlinked explicitly first to avoid leaving orphaned files behind.
function handleDeleteStudent(ctx) {
  const student = get(`SELECT * FROM users WHERE id = ? AND role = 'student'`, [ctx.params.id]);
  if (!student) {
    ctx.res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return ctx.res.end('生徒が見つかりません');
  }
  const videos = all(
    `SELECT v.filename FROM videos v JOIN lesson_records lr ON lr.id = v.lesson_record_id WHERE lr.user_id = ?`,
    [student.id]
  );
  const roundPhotos = all(`SELECT photo_filename FROM rounds WHERE user_id = ? AND photo_filename IS NOT NULL`, [
    student.id,
  ]);
  for (const f of [...videos, ...roundPhotos.map((r) => ({ filename: r.photo_filename }))]) {
    const filePath = join(UPLOADS_DIR, f.filename);
    if (existsSync(filePath)) unlinkSync(filePath);
  }
  run(`DELETE FROM users WHERE id = ?`, [student.id]);
  redirect(ctx.res, '/admin', [encodeFlash('success', `${student.name}さんのアカウントを削除しました。`)]);
}

function handleInstructorList(ctx) {
  const instructors = all(`SELECT * FROM users WHERE role = 'instructor' ORDER BY id`);
  sendHtml(ctx.res, 200, instructorListPage({ user: ctx.user, flash: ctx.flash, instructors }), [clearFlashCookie()]);
}

async function handleCreateInstructor(ctx) {
  const { fields } = await parseRequestBody(ctx.req);
  const name = (fields.name || '').trim();
  const email = (fields.email || '').trim();

  if (!name || !email) {
    return sendHtml(
      ctx.res,
      400,
      instructorListPage({
        user: ctx.user,
        flash: { type: 'error', message: '名前とメールアドレスを入力してください。' },
        instructors: all(`SELECT * FROM users WHERE role = 'instructor' ORDER BY id`),
      })
    );
  }
  if (findUserByEmail(email)) {
    return sendHtml(
      ctx.res,
      400,
      instructorListPage({
        user: ctx.user,
        flash: { type: 'error', message: 'そのメールアドレスは既に登録されています。' },
        instructors: all(`SELECT * FROM users WHERE role = 'instructor' ORDER BY id`),
      })
    );
  }

  const tempPassword = generateTempPassword();
  createUser({ name, email, password: tempPassword, role: 'instructor' });
  redirect(ctx.res, '/admin/instructors', [
    encodeFlash(
      'success',
      `${name}さんを指導者として追加しました。初期パスワード：${tempPassword}　このパスワードを本人に伝えてください。`
    ),
  ]);
}

function handleResetInstructorPassword(ctx) {
  const instructor = get(`SELECT * FROM users WHERE id = ? AND role = 'instructor'`, [ctx.params.id]);
  if (!instructor) {
    ctx.res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return ctx.res.end('指導者が見つかりません');
  }
  const tempPassword = generateTempPassword();
  setUserPassword(instructor.id, tempPassword);
  run(`DELETE FROM sessions WHERE user_id = ?`, [instructor.id]);
  redirect(ctx.res, '/admin/instructors', [
    encodeFlash(
      'success',
      `${instructor.name}さんの新しいパスワードを発行しました：${tempPassword}　このパスワードを本人に伝えてください。`
    ),
  ]);
}

function handleDeleteInstructor(ctx) {
  const instructor = get(`SELECT * FROM users WHERE id = ? AND role = 'instructor'`, [ctx.params.id]);
  if (!instructor) {
    ctx.res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return ctx.res.end('指導者が見つかりません');
  }
  if (instructor.id === ctx.user.id) {
    return redirect(ctx.res, '/admin/instructors', [
      encodeFlash('error', '自分自身を削除することはできません。'),
    ]);
  }
  const instructorCount = get(`SELECT COUNT(*) AS n FROM users WHERE role = 'instructor'`).n;
  if (instructorCount <= 1) {
    return redirect(ctx.res, '/admin/instructors', [
      encodeFlash('error', '最後の指導者アカウントは削除できません。'),
    ]);
  }
  run(`DELETE FROM users WHERE id = ?`, [instructor.id]);
  redirect(ctx.res, '/admin/instructors', [encodeFlash('success', `${instructor.name}さんを削除しました。`)]);
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
  console.log(`${brand.studioName} ${brand.tagline}: http://localhost:${PORT}`);
  if (!isAiConfigured()) {
    console.log('[info] ANTHROPIC_API_KEY is not set — AI要約・提案機能は無効化されています。');
  }
});
