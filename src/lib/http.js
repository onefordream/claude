const MAX_BODY_BYTES = 300 * 1024 * 1024; // 300MB, generous enough for lesson videos

export function readBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error('Request body too large'), { code: 'BODY_TOO_LARGE' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function parseUrlEncoded(bodyBuffer) {
  const params = new URLSearchParams(bodyBuffer.toString('utf8'));
  const result = {};
  for (const [key, value] of params.entries()) result[key] = value;
  return result;
}

export function setCookie(res, cookieString) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', [cookieString]);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookieString]);
  } else {
    res.setHeader('Set-Cookie', [existing, cookieString]);
  }
}

export function encodeFlash(type, message) {
  const json = JSON.stringify({ type, message });
  return `flash=${encodeURIComponent(json)}; Path=/; SameSite=Lax; Max-Age=10`;
}

export function clearFlashCookie() {
  return `flash=; Path=/; SameSite=Lax; Max-Age=0`;
}

export function readFlash(cookies) {
  if (!cookies.flash) return null;
  try {
    return JSON.parse(cookies.flash);
  } catch {
    return null;
  }
}

export function sendHtml(res, status, html, extraCookies = []) {
  for (const c of extraCookies) setCookie(res, c);
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

export function sendJson(res, status, obj, extraCookies = []) {
  for (const c of extraCookies) setCookie(res, c);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

export function redirect(res, location, extraCookies = []) {
  for (const c of extraCookies) setCookie(res, c);
  res.writeHead(302, { Location: location });
  res.end();
}
