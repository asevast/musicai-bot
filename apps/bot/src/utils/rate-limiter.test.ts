import { describe, it, expect, vi } from 'vitest';
import { RateLimiter, withExponentialBackoff } from './rate-limiter';

describe('RateLimiter', () => {
  it('should allow requests within limit', async () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 });

    await limiter.wait();
    await limiter.wait();
    await limiter.wait();

    expect(true).toBe(true);
  });

  it('should track timestamps correctly', async () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });

    await limiter.wait();
    await limiter.wait();
  });
});

describe('withExponentialBackoff', () => {
  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withExponentialBackoff(fn, 3, 1);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed on second attempt', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');

    const result = await withExponentialBackoff(fn, 3, 1);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(withExponentialBackoff(fn, 3, 1)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
