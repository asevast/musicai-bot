import type { Context, NextFunction } from 'grammy';
import type { BotContext } from '../bot';

interface RateLimiterEntry {
  count: number;
  resetTime: number;
}

export class BotRateLimiter {
  private requests: Map<string, RateLimiterEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly keyGenerator: (ctx: Context) => string;

  constructor(options: {
    maxRequests: number;
    windowMs: number;
    keyGenerator?: (ctx: Context) => string;
  }) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
    this.keyGenerator = options.keyGenerator || ((ctx) => ctx.from?.id?.toString() || 'unknown');
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests) {
      if (entry.resetTime <= now) {
        this.requests.delete(key);
      }
    }
  }

  isRateLimited(key: string): { limited: boolean; remaining: number; resetIn: number } {
    this.cleanup();

    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry || entry.resetTime <= now) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return { limited: false, remaining: this.maxRequests - 1, resetIn: this.windowMs };
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      return {
        limited: true,
        remaining: 0,
        resetIn: entry.resetTime - now,
      };
    }

    return {
      limited: false,
      remaining: this.maxRequests - entry.count,
      resetIn: entry.resetTime - now,
    };
  }

  middleware() {
    return async (ctx: BotContext, next: NextFunction) => {
      const key = this.keyGenerator(ctx);
      const result = this.isRateLimited(key);

      if (result.limited) {
        const seconds = Math.ceil(result.resetIn / 1000);
        await ctx.reply(`⏳ Rate limit exceeded. Please wait ${seconds}s before trying again.`);
        return;
      }

      return next();
    };
  }
}

// SPEC-compliant rate limiters
// Generate: 5 req/min per user
export const generateRateLimiter = new BotRateLimiter({
  maxRequests: 5,
  windowMs: 60_000,
  keyGenerator: (ctx) => `generate:${ctx.from?.id || 'unknown'}`,
});

// Commands: 30 req/min per user
export const commandRateLimiter = new BotRateLimiter({
  maxRequests: 30,
  windowMs: 60_000,
  keyGenerator: (ctx) => `cmd:${ctx.from?.id || 'unknown'}`,
});

// Upload: 10 req/min per user
export const uploadRateLimiter = new BotRateLimiter({
  maxRequests: 10,
  windowMs: 60_000,
  keyGenerator: (ctx) => `upload:${ctx.from?.id || 'unknown'}`,
});
