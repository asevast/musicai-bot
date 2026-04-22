import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '@musicai/database';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private stores: Map<string, RateLimitStore> = new Map();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number = 60_000
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const key = this.getKey(req);
    const now = Date.now();
    const store = this.stores.get(key);

    if (!store || now > store.resetTime) {
      this.stores.set(key, { count: 1, resetTime: now + this.windowMs });
      this.setRateLimitHeaders(res, 1, this.limit, now + this.windowMs);
      return next();
    }

    if (store.count >= this.limit) {
      throw new ForbiddenException('Rate limit exceeded');
    }

    store.count++;
    this.setRateLimitHeaders(res, store.count, this.limit, store.resetTime);
    next();
  }

  private getKey(req: Request): string {
    const telegramId = req.headers['x-telegram-id'] as string;
    return telegramId ? `telegram:${telegramId}` : `ip:${req.ip}`;
  }

  private setRateLimitHeaders(
    res: Response,
    count: number,
    limit: number,
    resetTime: number
  ): void {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
  }
}

@Injectable()
export class GenerateRateLimitMiddleware extends RateLimitMiddleware {
  constructor() {
    super(parseInt(process.env.GENERATE_RATE_LIMIT_PER_MIN || '5', 10), 60_000);
  }
}

@Injectable()
export class CommandRateLimitMiddleware extends RateLimitMiddleware {
  constructor() {
    super(parseInt(process.env.COMMAND_RATE_LIMIT_PER_MIN || '30', 10), 60_000);
  }
}
