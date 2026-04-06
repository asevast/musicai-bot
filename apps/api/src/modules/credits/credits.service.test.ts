import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@musicai/database', async () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
    },
  };
});

import { CreditsService } from './credits.service';
import { prisma } from '@musicai/database';

describe('CreditsService', () => {
  let service: CreditsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CreditsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserCredits', () => {
    it('should return credits for valid user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ credits: 50 } as any);

      const result = await service.getUserCredits('user-123');

      expect(result).toBe(50);
    });

    it('should throw NotFoundException for invalid user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(service.getUserCredits('invalid-user')).rejects.toThrow('User not found');
    });
  });
});
