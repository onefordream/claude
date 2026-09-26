import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFC'), salt, KEYLEN, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password.normalize('NFC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// 存在しないメールアドレスでも同じだけ時間をかけ、登録有無を推測されにくくする
let dummyHash;
export async function burnPasswordCheck(password) {
  dummyHash ??= await hashPassword('dummy-password-for-timing');
  await verifyPassword(password, dummyHash);
}

export function newSessionToken() {
  return randomBytes(32).toString('base64url');
}

/** DB にはセッショントークンそのものではなくハッシュだけを保存する */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/** 固定ウィンドウ方式の簡易レートリミッタ（プロセス内メモリ） */
export class RateLimiter {
  constructor({ max, windowMs }) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = new Map();
    this.timer = setInterval(() => this.sweep(), windowMs);
    this.timer.unref();
  }
  isLimited(key) {
    const h = this.hits.get(key);
    return !!h && h.resetAt > Date.now() && h.count >= this.max;
  }
  hit(key) {
    const now = Date.now();
    const h = this.hits.get(key);
    if (!h || h.resetAt <= now) this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
    else h.count++;
  }
  reset(key) {
    this.hits.delete(key);
  }
  sweep() {
    const now = Date.now();
    for (const [k, h] of this.hits) if (h.resetAt <= now) this.hits.delete(k);
  }
  close() {
    clearInterval(this.timer);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email);
}
