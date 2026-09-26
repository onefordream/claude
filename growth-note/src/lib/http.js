export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

/** JSON ボディを読む。上限を超えるものは読み切る前に拒否する。 */
export async function readJson(req, maxBytes = 256 * 1024) {
  const type = (req.headers['content-type'] || '').split(';')[0].trim();
  if (type !== 'application/json') throw new HttpError(415, 'unsupported_media_type', 'JSON で送信してください');
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > maxBytes) throw new HttpError(413, 'payload_too_large', 'データが大きすぎます');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'payload_too_large', 'データが大きすぎます');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('not object');
    return value;
  } catch {
    throw new HttpError(400, 'invalid_json', 'データの形式が正しくありません');
  }
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      /* 壊れた Cookie は無視 */
    }
  }
  return out;
}

export function appendCookie(res, name, value, { maxAge, secure, httpOnly = true, sameSite = 'Lax', path = '/' } = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSite}`;
  if (maxAge !== undefined) c += `; Max-Age=${maxAge}`;
  if (httpOnly) c += '; HttpOnly';
  if (secure) c += '; Secure';
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, c) : c);
}

/** 最小限のルーター。パス中の :name をパラメータとして取り出す。 */
export class Router {
  constructor() {
    this.routes = [];
  }
  add(method, pattern, handler, { auth = true } = {}) {
    const keys = [];
    const re = new RegExp(
      '^' +
        pattern.replace(/\/:([a-zA-Z]+)/g, (_, k) => {
          keys.push(k);
          return '/([^/]+)';
        }) +
        '/?$',
    );
    this.routes.push({ method, re, keys, handler, auth });
  }
  get(p, h, o) { this.add('GET', p, h, o); }
  post(p, h, o) { this.add('POST', p, h, o); }
  patch(p, h, o) { this.add('PATCH', p, h, o); }
  put(p, h, o) { this.add('PUT', p, h, o); }
  delete(p, h, o) { this.add('DELETE', p, h, o); }

  match(method, pathname) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = r.re.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method) continue;
      const params = {};
      r.keys.forEach((k, i) => {
        params[k] = decodeURIComponent(m[i + 1]);
      });
      return { route: r, params };
    }
    return { route: null, pathMatched };
  }
}

// ---- 入力チェックの小さなヘルパー ----
export function str(v, { max = 1000, min = 0, field = '値', trim = true } = {}) {
  if (v === undefined || v === null) v = '';
  if (typeof v !== 'string') throw new HttpError(400, 'invalid_input', `${field}の形式が正しくありません`);
  const s = trim ? v.trim() : v;
  if (s.length < min) throw new HttpError(400, 'invalid_input', `${field}を入力してください`);
  if (s.length > max) throw new HttpError(400, 'invalid_input', `${field}は${max}文字以内で入力してください`);
  return s;
}

export function num(v, { min = -Infinity, max = Infinity, field = '値', integer = false } = {}) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || (integer && !Number.isInteger(n)) || n < min || n > max) {
    throw new HttpError(400, 'invalid_input', `${field}の値が正しくありません`);
  }
  return n;
}
