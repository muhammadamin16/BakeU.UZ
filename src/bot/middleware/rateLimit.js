export function createRateLimiter({
  limit = 10,
  windowMs = 60000,
  maxKeys = 10000,
} = {}) {
  const buckets = new Map();
  return (key, now = Date.now()) => {
    for (const [k, v] of buckets) {
      if (v.until <= now) buckets.delete(k);
      else break;
    }
    let b = buckets.get(key);
    if (!b || b.until <= now) {
      if (buckets.size >= maxKeys) return false;
      b = { count: 0, until: now + windowMs };
      buckets.delete(key);
      buckets.set(key, b);
    }
    b.count++;
    return b.count <= limit;
  };
}
