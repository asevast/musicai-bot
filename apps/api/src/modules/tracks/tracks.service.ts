import { Injectable } from '@nestjs/common';
import { prisma } from '@musicai/database';
import type { CreateTrackDto } from '@musicai/shared-types';
import { CreditsService, InsufficientCreditsError } from '../credits/credits.service';

@Injectable()
export class TracksService {
  constructor(private readonly creditsService: CreditsService) {}

  async createTrack(userId: string, dto: CreateTrackDto) {
    const cost = this.calcCost(dto.model, dto.durationSeconds);

    try {
      await this.creditsService.assertAndDeduct(userId, cost, `Track generation (${dto.type})`);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        throw new Error(`Insufficient credits: ${err.current} < ${err.required}`);
      }
      throw err;
    }

    const track = await prisma.track.create({
      data: {
        userId,
        model: dto.model,
        type: dto.type,
        prompt: dto.prompt,
        negativePrompt: dto.negativePrompt,
        lyrics: dto.lyrics,
        parameters: {
          bpm: dto.bpm,
          intensity: dto.intensity,
          durationSeconds: dto.durationSeconds,
          language: dto.language,
        },
        creditsCharged: cost,
        status: 'queued',
        isRegeneration: dto.isRegeneration ?? false,
        sourceTrackId: dto.sourceTrackId,
      },
    });

    await prisma.synthJob.create({
      data: { trackId: track.id },
    });

    return track;
  }

  async getTrack(id: string) {
    return prisma.track.findUniqueOrThrow({
      where: { id },
      include: { user: true, synthJob: true },
    });
  }

  async getUserTracks(userId: string, limit = 10, offset = 0) {
    return prisma.track.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getPublicTracks(limit = 20, offset = 0) {
    return prisma.track.findMany({
      where: { isPublic: true, status: 'done' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
          },
        },
      },
    });
  }

  async updateTrackStatus(id: string, status: 'queued' | 'processing' | 'done' | 'failed') {
    return prisma.track.update({
      where: { id },
      data: { status },
    });
  }

  async markTrackDone(
    id: string,
    data: { gcsUrl: string; revisedPrompt?: string; durationSec?: number },
  ) {
    return prisma.track.update({
      where: { id },
      data,
    });
  }

  private calcCost(model: string, durationSec?: number): number {
    if (model === 'lyria-3-clip-preview') return 1;
    if (!durationSec || durationSec <= 60) return 3;
    return 5;
  }
}
EOF