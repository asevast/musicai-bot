import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { loadEnv } from '@musicai/config';
import { prisma, type Track } from '@musicai/database';
import { SynthJobProducer, getQueueOptions } from '@musicai/queues';
import type { CreateTrackDto, SubscriptionTier } from '@musicai/shared-types';
import { CreditsService } from '../credits/credits.service';

@Injectable()
export class TracksService {
  private synthJobProducer = new SynthJobProducer();
  private readonly env = loadEnv();

  constructor(private readonly creditsService: CreditsService) {
    console.log('[TracksService] Queue options:', JSON.stringify(getQueueOptions(), null, 2));
  }

  async getPublicTracks(limit = 20, offset = 0): Promise<Track[]> {
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

  async createTrack(userId: string, dto: CreateTrackDto): Promise<Track> {
    this.validateDto(dto);

    const user = await this.getNormalizedUser(userId);
    const tier = user.subscriptionTier as SubscriptionTier;

    this.assertAccess(tier, dto);
    await this.assertDailyLimit(userId, tier);

    const cost = this.calcCharge(tier, dto.model, dto.durationSeconds);
    if (cost > 0) {
      await this.creditsService.assertAndDeduct(userId, cost, 'Track generation');
    }

    const track = await prisma.$transaction(async (tx) => {
      const createdTrack = await tx.track.create({
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

      await tx.synthJob.create({
        data: { trackId: createdTrack.id },
      });

      return createdTrack;
    });

    try {
      await this.synthJobProducer.addSynthJob(
        {
          trackId: track.id,
          userId,
          telegramId: dto.telegramId,
          chatId: dto.chatId,
          messageId: dto.messageId,
          lyriaRequest: {
            model: dto.model,
            prompt: dto.prompt,
            negativePrompt: dto.negativePrompt,
            vocal: dto.type !== 'instrumental',
            lyrics: dto.lyrics,
            bpm: dto.bpm,
            intensity: dto.intensity,
            durationSeconds: dto.durationSeconds,
            language: dto.language,
            imageBase64: dto.imageBase64,
            imageMimeType: dto.imageMimeType,
          },
        },
        tier !== 'free'
      );
    } catch (error) {
      await prisma.track.update({
        where: { id: track.id },
        data: { status: 'failed' },
      });

      await this.creditsService.refund(userId, track.id);
      throw error;
    }

    console.log('[TracksService] Job added to queue, trackId:', track.id);
    return track;
  }

  async getTrack(id: string): Promise<Track> {
    return prisma.track.findUniqueOrThrow({
      where: { id },
      include: { user: true, synthJob: true },
    });
  }

  async getUserTracks(userId: string, limit = 10, offset = 0): Promise<Track[]> {
    return prisma.track.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async updateTrackStatus(
    id: string,
    status: 'queued' | 'processing' | 'done' | 'failed'
  ): Promise<Track> {
    return prisma.track.update({
      where: { id },
      data: { status },
    });
  }

  async markTrackDone(
    id: string,
    data: { gcsUrl: string; revisedPrompt?: string; durationSec?: number }
  ): Promise<Track> {
    return prisma.track.update({
      where: { id },
      data,
    });
  }

  private validateDto(dto: CreateTrackDto): void {
    if (dto.prompt.length < 10 || dto.prompt.length > this.env.MAX_PROMPT_LENGTH) {
      throw new BadRequestException(
        `Prompt must be between 10 and ${this.env.MAX_PROMPT_LENGTH} characters`
      );
    }

    if (dto.negativePrompt && dto.negativePrompt.length > 300) {
      throw new BadRequestException('Negative prompt must be 300 characters or less');
    }

    if (dto.lyrics && dto.lyrics.length > this.env.MAX_LYRICS_LENGTH) {
      throw new BadRequestException(
        `Lyrics must be ${this.env.MAX_LYRICS_LENGTH} characters or less`
      );
    }

    if (dto.type === 'instrumental' && dto.lyrics) {
      throw new BadRequestException('Instrumental tracks cannot have lyrics');
    }

    if (dto.bpm !== undefined && (!Number.isInteger(dto.bpm) || dto.bpm < 60 || dto.bpm > 200)) {
      throw new BadRequestException('BPM must be an integer between 60 and 200');
    }

    if (
      dto.durationSeconds !== undefined &&
      (!Number.isInteger(dto.durationSeconds) ||
        dto.durationSeconds < 30 ||
        dto.durationSeconds > 184)
    ) {
      throw new BadRequestException('Duration must be an integer between 30 and 184 seconds');
    }

    if (dto.model === 'lyria-3-clip-preview' && dto.durationSeconds !== undefined) {
      throw new BadRequestException('Duration control is only supported for the pro model');
    }
  }

  private async getNormalizedUser(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (
      user.subscriptionTier !== 'free' &&
      user.subscriptionExpiresAt &&
      user.subscriptionExpiresAt <= new Date()
    ) {
      return prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: 'free',
          subscriptionExpiresAt: null,
        },
      });
    }

    return user;
  }

  private assertAccess(tier: SubscriptionTier, dto: CreateTrackDto): void {
    if (tier === 'free') {
      if (dto.model !== 'lyria-3-clip-preview' || dto.type !== 'clip') {
        throw new ForbiddenException('Free plan supports clip generation only');
      }
    }
  }

  private async assertDailyLimit(userId: string, tier: SubscriptionTier): Promise<void> {
    const limit = this.getDailyLimit(tier);
    if (!Number.isFinite(limit)) {
      return;
    }

    const startedAt = new Date();
    startedAt.setHours(0, 0, 0, 0);

    const createdToday = await prisma.track.count({
      where: {
        userId,
        createdAt: { gte: startedAt },
      },
    });

    if (createdToday >= limit) {
      throw new ForbiddenException(`Daily track limit reached for the ${tier} plan`);
    }
  }

  private getDailyLimit(tier: SubscriptionTier): number {
    switch (tier) {
      case 'free':
        return this.env.FREE_DAILY_TRACKS_LIMIT;
      case 'pro':
        return this.env.PRO_DAILY_TRACKS_LIMIT;
      case 'unlimited':
        return 50;
      default:
        return this.env.FREE_DAILY_TRACKS_LIMIT;
    }
  }

  private calcCharge(tier: SubscriptionTier, model: string, durationSec?: number): number {
    if (tier === 'unlimited') return 0;
    return this.calcCost(model, durationSec);
  }

  private calcCost(model: string, durationSec?: number): number {
    if (model === 'lyria-3-clip-preview') return 1;
    if (!durationSec || durationSec <= 60) return 3;
    return 5;
  }
}
