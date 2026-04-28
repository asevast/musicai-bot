import { Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@musicai/database';
import { LyriaClient } from '@musicai/vertex-ai';
import { mapVertexError, RETRY_CONFIG } from '@musicai/vertex-ai';
import { QUEUES, QUEUE_OPTIONS } from '@musicai/queues';
import { storageService } from '@musicai/storage';
import type { SynthJobPayload, NotifyPayload, TrackProgressEvent } from '@musicai/shared-types';
import { recordSynthJobDuration, incrementVertexApiErrors } from '@musicai/telemetry';

export class SynthJobProcessor {
  private notifyQueue: Queue;
  private redisPublisher: IORedis;

  constructor(
    private readonly prismaInstance: typeof prisma,
    private readonly lyriaClient: LyriaClient,
    redisUrl: string
  ) {
    this.notifyQueue = new Queue(QUEUES.NOTIFY, QUEUE_OPTIONS);
    this.redisPublisher = new IORedis(redisUrl);
  }

  private async publishProgress(event: TrackProgressEvent): Promise<void> {
    try {
      await this.redisPublisher.publish('track:progress', JSON.stringify(event));
    } catch (error) {
      console.error('[SynthJobProcessor] Failed to publish progress:', error);
    }
  }

  async process(job: Job<SynthJobPayload>): Promise<void> {
    const { trackId, userId, lyriaRequest, chatId, messageId } = job.data;
    const startTime = Date.now();

    // SPEC §13.4: Queue depth monitoring and ETA
    const queueDepth = await this.getQueueDepth();
    const estimatedWaitSec = this.calculateETA(queueDepth, job.opts?.priority);

    if (queueDepth > 5) {
      await this.sendNotify({
        chatId,
        messageId,
        text: `⏳ High queue load! Queue depth: ${queueDepth} jobs. Estimated wait: ~${Math.ceil(estimatedWaitSec / 60)} min.`,
      });
    }

    await this.prismaInstance.track.update({
      where: { id: trackId },
      data: { status: 'processing' },
    });

    await this.prismaInstance.synthJob.update({
      where: { trackId },
      data: { startedAt: new Date(), bullJobId: job.id },
    });

    await this.publishProgress({
      userId,
      trackId,
      status: 'processing',
      etaSec: estimatedWaitSec,
      queuePos: queueDepth,
    });

    await this.sendNotify({
      chatId,
      messageId,
      text: '🎵 Patience you must have, young padawan... Generating your track...',
    });

    let lyriaResponse;
    try {
      const request = {
        ...lyriaRequest,
        language: lyriaRequest.language as
          | 'en'
          | 'de'
          | 'es'
          | 'fr'
          | 'hi'
          | 'ja'
          | 'ko'
          | 'pt'
          | undefined,
        imageMimeType: lyriaRequest.imageMimeType as 'image/jpeg' | 'image/png' | undefined,
      };
      lyriaResponse = await this.lyriaClient.generate(request);
    } catch (err: any) {
      const errorCode = mapVertexError(err);
      const retryConfig = RETRY_CONFIG[errorCode];

      await this.prismaInstance.synthJob.update({
        where: { trackId },
        data: { errorCode, errorMessage: String(err) },
      });

      if (!retryConfig.retry) {
        await this.refund(trackId);
        await this.prismaInstance.track.update({
          where: { id: trackId },
          data: { status: 'failed' },
        });

        await this.publishProgress({
          userId,
          trackId,
          status: 'failed',
          etaSec: 0,
        });

        await this.sendNotify({
          chatId,
          text: '❌ Track generation failed. Credits have been refunded.',
          errorCode,
        });

        return;
      }

      throw Object.assign(err as Error, {
        attemptsMade: job.attemptsMade,
        opts: { delay: retryConfig.delay },
      });
    }

    // Post-Lyria processing (may throw)
    try {
      const audioBuffer = Buffer.from(lyriaResponse.audioBase64, 'base64');
      const storageKey = await storageService.uploadTrack(audioBuffer, trackId);
      const gcsUrl = storageService.getPublicUrl(storageKey);
      const durationSec = this.estimateDuration(audioBuffer);

      await this.prismaInstance.track.update({
        where: { id: trackId },
        data: {
          status: 'done',
          gcsUrl,
          revisedPrompt: lyriaResponse.revisedPrompt,
          durationSec,
        },
      });

      await this.prismaInstance.synthJob.update({
        where: { trackId },
        data: { finishedAt: new Date() },
      });

      await this.publishProgress({
        userId,
        trackId,
        status: 'done',
        gcsUrl,
        etaSec: 0,
      });

      await this.sendNotify({
        chatId,
        messageId,
        text: '✅ Your track is ready!',
        trackId,
      });
    } catch (postError: any) {
      console.error('[SynthJobProcessor] Post-Lyria error:', {
        trackId,
        errorMessage: postError.message,
      });
      await this.refund(trackId);
      await this.prismaInstance.track.update({
        where: { id: trackId },
        data: { status: 'failed' },
      });
      await this.sendNotify({
        chatId,
        messageId,
        text: '❌ Track generation failed after audio generation. Credits have been refunded.',
      });
      return;
    }
  }

  private async sendNotify(payload: NotifyPayload): Promise<void> {
    await this.notifyQueue.add('notify', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  private estimateDuration(buffer: Buffer): number {
    const bitrate = 192000;
    return Math.floor((buffer.length * 8) / bitrate);
  }

  private async refund(trackId: string): Promise<void> {
    const job = await this.prismaInstance.synthJob.findFirst({
      where: { trackId },
      include: { track: true },
    });

    if (!job?.track.creditsCharged) return;

    const existingRefund = await this.prismaInstance.creditTransaction.findFirst({
      where: {
        userId: job.track.userId,
        trackId,
        type: 'refund',
      },
      select: { id: true },
    });

    if (existingRefund) return;

    await this.prismaInstance.$transaction([
      this.prismaInstance.user.update({
        where: { id: job.track.userId },
        data: { credits: { increment: job.track.creditsCharged } },
      }),
      this.prismaInstance.creditTransaction.create({
        data: {
          userId: job.track.userId,
          amount: job.track.creditsCharged,
          type: 'refund',
          description: `Refund for failed generation (${trackId.slice(0, 8)})`,
          trackId,
        },
      }),
    ]);
  }

  /**
   * Get current queue depth across all synth queues
   * SPEC §13.4: Queue depth monitoring
   */
  private async getQueueDepth(): Promise<number> {
    try {
      const redis = this.redisPublisher;
      const queues = ['synth-clip', 'synth-pro-urgent', 'synth-pro-normal'];

      let total = 0;
      for (const queueName of queues) {
        const prioritized = await redis.zcard(`bull:${queueName}:prioritized`);
        const waiting = await redis.llen(`bull:${queueName}:wait`);
        const active = await redis.zcard(`bull:${queueName}:active`);
        total += prioritized + waiting + active;
      }

      return total;
    } catch (error) {
      console.error('[SynthJobProcessor] Failed to get queue depth:', error);
      return 0;
    }
  }

  /**
   * Calculate estimated time until track completion
   * Based on queue position and average generation time
   */
  private calculateETA(queueDepth: number, priority?: number): number {
    const AVG_PROCESSING_TIME_SEC = 45;
    const PRIORITY_BASED_DELAY: Record<number | string, number> = {
      10: 0, // synth-pro-urgent (paid users)
      1: 30, // synth-pro-normal (free users)
      default: 60,
    };

    const baseDelay = PRIORITY_BASED_DELAY[priority ?? 'default'] ?? PRIORITY_BASED_DELAY.default;
    const waitTime = queueDepth * AVG_PROCESSING_TIME_SEC * 0.5 + baseDelay;

    return Math.max(waitTime, 30);
  }
}
