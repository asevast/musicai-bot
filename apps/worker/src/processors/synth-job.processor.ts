import { Job, Queue } from 'bullmq';
import { prisma } from '@musicai/database';
import { LyriaClient } from '@musicai/vertex-ai';
import { mapVertexError, RETRY_CONFIG } from '@musicai/vertex-ai';
import { QUEUES, QUEUE_OPTIONS } from '@musicai/queues';
import { storageService } from '@musicai/storage';
import type { SynthJobPayload, NotifyPayload } from '@musicai/shared-types';

export class SynthJobProcessor {
  private notifyQueue: Queue;

  constructor(
    private readonly prismaInstance: typeof prisma,
    private readonly lyriaClient: LyriaClient
  ) {
    this.notifyQueue = new Queue(QUEUES.NOTIFY, QUEUE_OPTIONS);
  }

  async process(job: Job<SynthJobPayload>): Promise<void> {
    const { trackId, lyriaRequest, chatId, messageId } = job.data;

    await this.prismaInstance.track.update({
      where: { id: trackId },
      data: { status: 'processing' },
    });

    await this.prismaInstance.synthJob.update({
      where: { trackId },
      data: { startedAt: new Date(), bullJobId: job.id },
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
}
