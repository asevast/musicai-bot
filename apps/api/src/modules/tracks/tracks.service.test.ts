import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./credits.service', () => ({
  CreditsService: class {
    getUserCredits = vi.fn();
  },
}));

vi.mock('@musicai/database', async () => {
  const mockTrack = {
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  };
  return {
    prisma: {
      track: mockTrack,
      synthJob: { create: vi.fn() },
      user: { findUniqueOrThrow: vi.fn() },
    },
  };
});

vi.mock('@musicai/queues', () => ({
  SynthJobProducer: vi.fn().mockImplementation(() => ({
    addSynthJob: vi.fn().mockResolvedValue({ id: 'job-1' }),
  })),
}));

import { TracksService } from './tracks.service';
import { prisma } from '@musicai/database';

describe('TracksService', () => {
  let service: TracksService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TracksService({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calcCost', () => {
    it('should return 1 for clip preview', () => {
      const cost = (service as any).calcCost('lyria-3-clip-preview', 30);
      expect(cost).toBe(1);
    });

    it('should return 3 for short track', () => {
      const cost = (service as any).calcCost('lyria-3', 30);
      expect(cost).toBe(3);
    });

    it('should return 5 for long track', () => {
      const cost = (service as any).calcCost('lyria-3', 120);
      expect(cost).toBe(5);
    });
  });

  describe('getUserTracks', () => {
    it('should return user tracks with pagination', async () => {
      const tracks = [{ id: 'track-1' }, { id: 'track-2' }];
      vi.mocked(prisma.track.findMany).mockResolvedValue(tracks as any);

      const result = await service.getUserTracks('user-1', 10, 0);

      expect(result).toEqual(tracks);
      expect(prisma.track.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });
  });

  describe('updateTrackStatus', () => {
    it('should update track status', async () => {
      const updatedTrack = { id: 'track-1', status: 'processing' };
      vi.mocked(prisma.track.update).mockResolvedValue(updatedTrack as any);

      const result = await service.updateTrackStatus('track-1', 'processing');

      expect(result).toEqual(updatedTrack);
      expect(prisma.track.update).toHaveBeenCalledWith({
        where: { id: 'track-1' },
        data: { status: 'processing' },
      });
    });
  });

  describe('markTrackDone', () => {
    it('should update track with gcs url and duration', async () => {
      const track = { id: 'track-1', status: 'done', gcsUrl: 'https://example.com/track.mp3' };
      vi.mocked(prisma.track.update).mockResolvedValue(track as any);

      const result = await service.markTrackDone('track-1', {
        gcsUrl: 'https://example.com/track.mp3',
        durationSec: 180,
      });

      expect(result).toEqual(track);
      expect(prisma.track.update).toHaveBeenCalledWith({
        where: { id: 'track-1' },
        data: {
          gcsUrl: 'https://example.com/track.mp3',
          durationSec: 180,
        },
      });
    });
  });
});
