// Minimal in-memory rate limiter (no Redis/external store needed at this
// scale — a single Node process is the whole deployment). Used to slow down
// brute-force login attempts and automated registration spam.
//
// State resets on process restart, which is an acceptable trade-off here:
// worst case after a deploy is a brief return to unlimited attempts, not a
// security hole that persists.

const buckets = new Map();

// Periodically forget old entries so this map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.windowStart > entry.windowMs) buckets.delete(key);
  }
}, 10 * 60 * 1000).unref();

/**
 * Returns true if the action identified by `key` is still allowed, and
 * records this attempt. Once `max` attempts happen within `windowMs`,
 * further calls return false until the window rolls over.
 */
export function allowAttempt(key, { max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    buckets.set(key, { windowStart: now, windowMs, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}
