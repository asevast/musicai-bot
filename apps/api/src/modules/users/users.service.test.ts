import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@musicai/database', async () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      track: {
        count: vi.fn(),
      },
    },
  };
});

import { UsersService } from './users.service';
import { prisma } from '@musicai/database';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findByTelegramId', () => {
    it('should return user by telegram ID', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        telegramId: 123n,
      } as any);

      const result = await service.findByTelegramId(123n);

      expect(result).toEqual({ id: 'user-1', telegramId: 123n });
    });

    it('should return null if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await service.findByTelegramId(999n);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user with default credits', async () => {
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-1',
        telegramId: 123n,
        username: 'testuser',
        firstName: 'Test',
        credits: 10,
      } as any);

      const result = await service.create(123n, {
        username: 'testuser',
        firstName: 'Test',
      });

      expect(result.credits).toBe(10);
    });
  });

  describe('getProfile', () => {
    it('should return user profile with track count', async () => {
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
        id: 'user-1',
        telegramId: 123n,
        credits: 50,
        subscriptionTier: 'free',
      } as any);
      vi.mocked(prisma.track.count).mockResolvedValue(5);

      const result = await service.getProfile('user-1');

      expect(result.totalTracks).toBe(5);
    });
  });
});
