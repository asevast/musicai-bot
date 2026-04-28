import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { loadEnv } from '@musicai/config';
import { prisma, type Track } from '@musicai/database';
import { SynthJobProducer } from '@musicai/queues';
import type { CreateTrackDto, SubscriptionTier } from '@musicai/shared-types';
import { CreditsService } from '../credits/credits.service';
import { ContentFilterService } from '../content/content-filter.service';

@Injectable()
export class TracksService {
  private synthJobProducer = new SynthJobProducer();
  private readonly env = loadEnv();

  constructor(
    @Inject(CreditsService) private readonly creditsService: CreditsService,
    @Inject(ContentFilterService) private readonly contentFilter: ContentFilterService
  ) {}

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

  async createTrack(telegramId: string, dto: CreateTrackDto): Promise<Track> {
    this.validateDto(dto);
    // SPEC §11.4: Content filter check
    const filterResult = await this.contentFilter.checkPrompt(dto.prompt);
    if (!filterResult.allowed) {
      throw new BadRequestException(
        `Content filter: ${filterResult.reason}`
      );
    }


    let user = await prisma.user.findUniqueOrThrow({
      where: { telegramId: Number(telegramId) },
    });

    if (
      user.subscriptionTier !== 'free' &&
      user.subscriptionExpiresAt &&
      user.subscriptionExpiresAt <= new Date()
    ) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionTier: 'free', subscriptionExpiresAt: null },
      });
    }

    const userId = user.id;
    const tier = user.subscriptionTier as SubscriptionTier;

    this.assertAccess(tier, dto);
    await this.assertDailyLimit(userId, tier);

    const cost = this.calcCharge(tier, dto);
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
            vocal: dto.type !== 'instrumental',
            lyrics: dto.lyrics,
            promptRewriter: dto.lyrics ? false : dto.promptRewriter,
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

  private calcCharge(tier: SubscriptionTier, dto: CreateTrackDto): number {
    if (tier === 'unlimited') return 0;
    return this.calcCost(dto);
  }

  private calcCost(dto: CreateTrackDto): number {
    const base = (() => {
      if (dto.model === 'lyria-3-clip-preview') return 1;
      if (!dto.durationSeconds || dto.durationSeconds <= 60) return 3;
      return 5;
    })();
    // Apply 50% discount for regenerations
    return dto.isRegeneration ? Math.max(1, Math.floor(base * 0.5)) : base;
  }
}
