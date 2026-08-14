import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  // Periodic memory cleanup every 5 minutes
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of requests.entries()) {
        if (now > record.resetTime) {
          requests.delete(key);
        }
      }
    },
    5 * 60 * 1000
  ).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const key = email ? `${ip}:${email}` : ip;

    const now = Date.now();
    const record = requests.get(key);

    if (!record || now > record.resetTime) {
      requests.set(key, { count: 1, resetTime: now + options.windowMs });
      next();
      return;
    }

    if (record.count >= options.max) {
      res.status(429).json({
        error:
          options.message ||
          'Too many requests from this client. Please wait a few minutes before trying again.',
      });
      return;
    }

    record.count++;
    next();
  };
}

export const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests per 15 minutes
  message: 'Too many password reset attempts. Please try again after 15 minutes.',
});
