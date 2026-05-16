import type { Request, Response, NextFunction } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  scope?: "ip" | "user_or_ip";
};

type Bucket = {
  hits: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim()) {
    return fwd.split(",")[0]!.trim();
  }
  return req.ip || "unknown";
}

export function createRateLimit(options: RateLimitOptions) {
  const { windowMs, max, scope = "ip" } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const scopedKey =
      scope === "user_or_ip" && req.authUser?.id
        ? `user:${req.authUser.id}`
        : `ip:${getClientIp(req)}`;
    const key = `${scopedKey}:${req.path}`;
    const existing = buckets.get(key);

    if (!existing || now >= existing.resetAt) {
      buckets.set(key, { hits: 1, resetAt: now + windowMs });
      next();
      return;
    }

    existing.hits += 1;
    if (existing.hits > max) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({ error: "Too many requests. Please try again shortly." });
      return;
    }

    next();
  };
}
