import { Job, Queue } from 'bullmq';
import { PrismaClient } from '@musicai/database';
import { LyriaClient } from '@musicai/vertex-ai';
import { mapVertexError, RETRY_CONFIG, LyriaErrorCode } from '@musicai/vertex-ai';
import { QUEUES, QUEUE_OPTIONS } from '@musicai/queues';
import type { SynthJobPayload, NotifyPayload } from '@musicai/shared-types';
import { Storage } from '@google-cloud/storage';

export class SynthJobProcessor {
  private notifyQueue: Queue;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly lyriaClient: LyriaClient,
    private readonly bucketName: string,
  ) {
    this.notifyQueue = new Queue(QUEUES.NOTIFY, QUEUE_OPTIONS);
  }

  async process(job: Job<SynthJobPayload>): Promise<void> {
    const { trackId, lyriaRequest, chatId, messageId } = job.data;

    await this.prisma.track.update({
      where: { id: trackId },
      data: { status: 'processing' },
    });

    await this.prisma.synthJob.update({
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
      lyriaResponse = await this.lyriaClient.generate(lyriaRequest);
    } catch (err) {
      const errorCode = mapVertexError(err);
      const retryConfig = RETRY_CONFIG[errorCode];

      await this.prisma.synthJob.update({
        where: { trackId },
        data: { errorCode, errorMessage: String(err) },
      });

      if (!retryConfig.retry) {
        await this.refund(trackId);
        await this.prisma.track.update({
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

    const audioBuffer = Buffer.from(lyriaResponse.audioBase64, 'base64');
    const gcsUrl = await this.uploadToGCS(trackId, audioBuffer);

    const durationSec = this.estimateDuration(audioBuffer);

    await this.prisma.track.update({
      where: { id: trackId },
      data: {
        status: 'done',
        gcsUrl,
        revisedPrompt: lyriaResponse.revisedPrompt,
        durationSec,
      },
    });

    await this.prisma.synthJob.update({
      where: { trackId },
      data: { finishedAt: new Date() },
    });

    await this.sendNotify({
      chatId,
      messageId,
      text: '✅ Your track is ready!',
      trackId,
      gcsUrl,
    });
  }

  private async sendNotify(payload: NotifyPayload): Promise<void> {
    await this.notifyQueue.add('notify', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  private async uploadToGCS(trackId: string, buffer: Buffer): Promise<string> {
    const storage = new Storage();
    const bucket = storage.bucket(this.bucketName);
    const file = bucket.file(`tracks/${trackId}.mp3`);

    await file.save(buffer, {
      contentType: 'audio/mp3',
      metadata: { trackId },
    });

    return `https://storage.googleapis.com/${this.bucketName}/tracks/${trackId}.mp3`;
  }

  private estimateDuration(buffer: Buffer): number {
    const bitrate = 192000;
    return Math.floor((buffer.length * 8) / bitrate);
  }

  private async refund(trackId: string): Promise<void> {
    const job = await this.prisma.synthJob.findFirst({
      where: { trackId },
      include: { track: true },
    });

    if (!job?.track.creditsCharged) return;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: job.track.userId },
        data: { credits: { increment: job.track.creditsCharged } },
      }),
      this.prisma.creditTransaction.create({
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
EOF