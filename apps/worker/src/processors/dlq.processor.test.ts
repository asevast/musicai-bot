import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  synthJob: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  track: {
    update: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
  creditTransaction: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn((ops) => Promise.all(ops)),
};

vi.mock('@musicai/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('@musicai/queues', () => ({
  QUEUES: { SYNTH_DLQ: 'synth-dlq' },
  QUEUE_OPTIONS: {},
}));

import { DLQProcessor, DLQPayload } from './dlq.processor';

describe('DLQProcessor', () => {
  let processor: DLQProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new DLQProcessor();
  });

  describe('process', () => {
    it('should update synth job with error details', async () => {
      const mockJob = {
        data: {
          trackId: 'track-123',
          userId: 'user-456',
          errorCode: 'VERTEX_ERROR',
          errorMessage: 'API failed',
          failedAt: new Date().toISOString(),
          attemptCount: 5,
          lyriaRequest: { model: 'pro', prompt: 'test' },
        },
      } as any;

      mockPrisma.synthJob.findFirst.mockResolvedValue({
        track: { creditsCharged: 5 },
      });
      mockPrisma.creditTransaction.findFirst.mockResolvedValue(null);

      await processor.process(mockJob);

      expect(mockPrisma.synthJob.updateMany).toHaveBeenCalledWith({
        where: { trackId: 'track-123' },
        data: expect.objectContaining({
          errorCode: 'VERTEX_ERROR',
          errorMessage: 'API failed',
        }),
      });
    });

    it('should refund credits if not already refunded', async () => {
      const mockJob = {
        data: {
          trackId: 'track-123',
          userId: 'user-456',
          errorCode: 'VERTEX_ERROR',
          errorMessage: 'API failed',
          failedAt: new Date().toISOString(),
          attemptCount: 5,
          lyriaRequest: { model: 'pro', prompt: 'test' },
        },
      } as any;

      mockPrisma.synthJob.findFirst.mockResolvedValue({
        track: { creditsCharged: 5 },
      });
      mockPrisma.creditTransaction.findFirst.mockResolvedValue(null);

      await processor.process(mockJob);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should not refund if already refunded', async () => {
      const mockJob = {
        data: {
          trackId: 'track-123',
          userId: 'user-456',
          errorCode: 'VERTEX_ERROR',
          errorMessage: 'API failed',
          failedAt: new Date().toISOString(),
          attemptCount: 5,
          lyriaRequest: { model: 'pro', prompt: 'test' },
        },
      } as any;

      mockPrisma.synthJob.findFirst.mockResolvedValue({
        track: { creditsCharged: 5 },
      });
      mockPrisma.creditTransaction.findFirst.mockResolvedValue({ id: 'refund-123' });

      await processor.process(mockJob);

      // Should not call refund transaction
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should update track status to failed', async () => {
      const mockJob = {
        data: {
          trackId: 'track-123',
          userId: 'user-456',
          errorCode: 'VERTEX_ERROR',
          errorMessage: 'API failed',
          failedAt: new Date().toISOString(),
          attemptCount: 5,
          lyriaRequest: { model: 'pro', prompt: 'test' },
        },
      } as any;

      mockPrisma.synthJob.findFirst.mockResolvedValue({
        track: { creditsCharged: 0 },
      });
      mockPrisma.creditTransaction.findFirst.mockResolvedValue(null);

      await processor.process(mockJob);

      expect(mockPrisma.track.update).toHaveBeenCalledWith({
        where: { id: 'track-123' },
        data: { status: 'failed' },
      });
    });
  });
});
