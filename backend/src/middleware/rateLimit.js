/**
 * A small fixed-window limiter. Enough to keep a loop or a scraper from
 * burning through the upstream provider's goodwill, without pulling in a
 * dependency for twenty lines of bookkeeping.
 */
function rateLimit({ windowMs = 60_000, max = 60, name = "request" } = {}) {
  const hits = new Map();

  // Drop expired buckets rather than growing forever.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of hits) {
      if (now > bucket.resetAt) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    let bucket = hits.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      hits.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(remaining));

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        message: `Too many ${name}s. Try again in ${retryAfter}s.`,
      });
    }

    return next();
  };
}

module.exports = rateLimit;
