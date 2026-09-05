function createRateLimit({ windowMs, max, message }) {
  const attempts = new Map();

  return (request, response, next) => {
    const now = Date.now();
    const key = request.ip;
    const entry = attempts.get(key);
    const active = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + windowMs };
    active.count += 1;
    attempts.set(key, active);

    if (active.count > max) {
      response.set("Retry-After", String(Math.ceil((active.resetAt - now) / 1000)));
      return response.status(429).json({ error: message });
    }
    next();
  };
}

module.exports = { createRateLimit };
