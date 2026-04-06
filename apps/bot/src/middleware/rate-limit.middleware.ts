import { MiddlewareFn } from 'grammy';
import { loadEnv } from '@musicai/config';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const generateLimits = new Map<string, RateLimitEntry>();
const commandLimits = new Map<string, RateLimitEntry>();

export const generateRateLimit: MiddlewareFn = async (ctx, next) => {
  const env = loadEnv();
  const key = String(ctx.from?.id ?? 'unknown');
  const now = Date.now();
  const windowMs = 60_000;

  const entry = generateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    generateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (entry.count >= env.GENERATE_RATE_LIMIT_PER_MIN) {
    return ctx.reply(
      `⏳ Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`
    );
  }

  entry.count++;
  return next();
};

export const commandRateLimit: MiddlewareFn = async (ctx, next) => {
  const env = loadEnv();
  const key = String(ctx.from?.id ?? 'unknown');
  const now = Date.now();
  const windowMs = 60_000;

  const entry = commandLimits.get(key);
  if (!entry || now > entry.resetAt) {
    commandLimits.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (entry.count >= env.COMMAND_RATE_LIMIT_PER_MIN) {
    return ctx.reply(
      `⏳ Too many commands. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`
    );
  }

  entry.count++;
  return next();
};
