// Simple HTTP Basic Auth gate. This app stores business contact data, so it
// must never be reachable without credentials. Defaults are intentionally
// absent — if ADMIN_PASSWORD isn't set, the server refuses to start rather
// than running wide open.

function basicAuth(req, res, next) {
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASSWORD;

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    const u = decoded.slice(0, sep);
    const p = decoded.slice(sep + 1);
    if (u === user && p === pass) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="golf-sales-system"');
  return res.status(401).send('認証が必要です');
}

module.exports = { basicAuth };
