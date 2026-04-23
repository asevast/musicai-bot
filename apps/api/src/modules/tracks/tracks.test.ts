import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@musicai/database', async () => {
  return {
    prisma: {
      track: {
        findUniqueOrThrow: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        create: vi.fn(),
      },
      synthJob: { create: vi.fn() },
      user: { findUniqueOrThrow: vi.fn() },
    },
  };
});

vi.mock('@musicai/queues', () => ({
  SynthJobProducer: vi.fn().mockImplementation(() => ({
    addSynthJob: vi.fn().mockResolvedValue({ id: 'job-1' }),
  })),
  getQueueOptions: vi.fn().mockReturnValue({
    connection: { host: 'localhost', port: 6379 },
    defaultJobOptions: { removeOnComplete: { age: 86400, count: 1000 } },
  }),
}));

vi.mock('@musicai/config', () => ({
  loadEnv: vi.fn().mockReturnValue({
    MAX_PROMPT_LENGTH: 1000,
    MAX_LYRICS_LENGTH: 2000,
    FREE_DAILY_TRACKS_LIMIT: 3,
    PRO_DAILY_TRACKS_LIMIT: 20,
  }),
}));

import { TracksService } from './tracks.service';
import { prisma } from '@musicai/database';

describe('TracksService', () => {
  let service: TracksService;
  const creditsService = {
    assertAndDeduct: vi.fn(),
    refund: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TracksService(creditsService as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calcCost', () => {
    it('returns 1 for clip preview', () => {
      expect(
        (service as any).calcCost({ model: 'lyria-3-clip-preview', durationSeconds: 30 })
      ).toBe(1);
    });

    it('returns 3 for short pro track', () => {
      expect((service as any).calcCost({ model: 'lyria-3-pro-preview', durationSeconds: 30 })).toBe(
        3
      );
    });

    it('returns 5 for long track', () => {
      expect(
        (service as any).calcCost({ model: 'lyria-3-pro-preview', durationSeconds: 120 })
      ).toBe(5);
    });
  });

  describe('getUserTracks', () => {
    it('returns user tracks', async () => {
      vi.mocked(prisma.track.findMany).mockResolvedValue([{ id: 't1' }] as any);
      const result = await service.getUserTracks('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('updateTrackStatus', () => {
    it('updates track status', async () => {
      vi.mocked(prisma.track.update).mockResolvedValue({ id: 't1', status: 'done' } as any);
      const result = await service.updateTrackStatus('t1', 'done');
      expect(result.status).toBe('done');
    });
  });

  describe('markTrackDone', () => {
    it('updates track with gcs url', async () => {
      vi.mocked(prisma.track.update).mockResolvedValue({
        id: 't1',
        status: 'done',
        gcsUrl: 'https://example.com/track.mp3',
      } as any);
      const result = await service.markTrackDone('t1', { gcsUrl: 'https://example.com/track.mp3' });
      expect(result.gcsUrl).toBe('https://example.com/track.mp3');
    });
  });

  describe('getPublicTracks', () => {
    it('returns public done tracks', async () => {
      vi.mocked(prisma.track.findMany).mockResolvedValue([{ id: 't1' }] as any);
      const result = await service.getPublicTracks();
      expect(result).toHaveLength(1);
    });
  });
});
