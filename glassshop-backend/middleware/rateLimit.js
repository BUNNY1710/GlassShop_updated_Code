// Lightweight in-memory fixed-window rate limiter — no external dependency.
// Per-IP. Suitable for a single-process deployment; for multi-instance use a
// shared store (Redis). Defaults are conservative and do not affect normal use.
function rateLimit({ windowMs = 60_000, max = 60, message } = {}) {
  const hits = new Map(); // key -> { count, reset }

  // Occasional sweep so the map doesn't grow unbounded.
  function maybeSweep(now) {
    if (Math.random() > 0.02) return;
    for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  }

  return (req, res, next) => {
    const now = Date.now();
    maybeSweep(now);
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    let e = hits.get(key);
    if (!e || now > e.reset) { e = { count: 0, reset: now + windowMs }; hits.set(key, e); }
    e.count += 1;
    if (e.count > max) {
      const retryAfter = Math.ceil((e.reset - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message || 'Too many requests. Please slow down.', retryAfter });
    }
    next();
  };
}

module.exports = rateLimit;
