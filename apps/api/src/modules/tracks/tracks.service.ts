import { Injectable } from '@nestjs/common';
import { prisma } from '@musicai/database';
import type { CreateTrackDto } from '@musicai/shared-types';

@Injectable()
export class TracksService {
  async createTrack(userId: string, dto: CreateTrackDto) {
    const cost = this.calcCost(dto.model, dto.durationSeconds);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.credits < cost) {
      throw new Error('Insufficient credits');
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
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: cost } },
    });

    return track;
  }

  async getTrack(id: string) {
    return prisma.track.findUniqueOrThrow({ where: { id } });
  }

  async getUserTracks(userId: string, limit = 10, offset = 0) {
    return prisma.track.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  private calcCost(model: string, durationSec?: number): number {
    if (model === 'lyria-3-clip-preview') return 1;
    if (!durationSec || durationSec <= 60) return 3;
    return 5;
  }
}
