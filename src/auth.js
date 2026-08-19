import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { run, get } from './db.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, expectedHash) {
  const hash = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}

export function createUser({ name, email, password, role, furigana }) {
  const { salt, hash } = hashPassword(password);
  const result = run(
    `INSERT INTO users (name, email, password_hash, password_salt, role, furigana) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email.toLowerCase().trim(), hash, salt, role, furigana || null]
  );
  return Number(result.lastInsertRowid);
}

export function findUserByEmail(email) {
  return get(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
}

export function findUserById(id) {
  return get(`SELECT * FROM users WHERE id = ?`, [id]);
}

export function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  run(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`, [token, userId, expiresAt]);
  return { token, expiresAt };
}

export function destroySession(token) {
  run(`DELETE FROM sessions WHERE token = ?`, [token]);
}

export function getSessionUser(token) {
  if (!token) return null;
  const session = get(`SELECT * FROM sessions WHERE token = ?`, [token]);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }
  return findUserById(session.user_id);
}

export function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function sessionCookieHeader(token, { clear = false } = {}) {
  if (clear) {
    return `session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
  }
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}
