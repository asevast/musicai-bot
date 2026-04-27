import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@musicai/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    creditTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      creditTransaction: {
        create: vi.fn(),
      },
    })),
  },
}));

import { SubscriptionsService } from './subscriptions.service';
import { prisma } from '@musicai/database';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubscriptionsService({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('shouldRefreshCredits', () => {
    it('should return false for free tier users', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'free',
        subscriptionExpiresAt: null,
        creditTransactions: [],
      } as any);

      const result = await service.shouldRefreshCredits('user-123');
      expect(result).toBe(false);
    });

    it('should return false if subscription has expired', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'pro',
        subscriptionExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        creditTransactions: [],
      } as any);

      const result = await service.shouldRefreshCredits('user-123');
      expect(result).toBe(false);
    });

    it('should return true for pro users with no previous refresh', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'pro',
        subscriptionExpiresAt: futureDate,
        creditTransactions: [],
      } as any);

      const result = await service.shouldRefreshCredits('user-123');
      expect(result).toBe(true);
    });

    it('should return true if >30 days since last refresh', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const oldRefresh = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'pro',
        subscriptionExpiresAt: futureDate,
        creditTransactions: [{ createdAt: oldRefresh }],
      } as any);

      const result = await service.shouldRefreshCredits('user-123');
      expect(result).toBe(true);
    });

    it('should return false if <30 days since last refresh', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const recentRefresh = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'pro',
        subscriptionExpiresAt: futureDate,
        creditTransactions: [{ createdAt: recentRefresh }],
      } as any);

      const result = await service.shouldRefreshCredits('user-123');
      expect(result).toBe(false);
    });
  });
});
