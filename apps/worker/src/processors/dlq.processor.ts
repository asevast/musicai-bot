import { Job, Queue } from 'bullmq';
import { prisma } from '@musicai/database';
import { QUEUES, QUEUE_OPTIONS } from '@musicai/queues';

export interface DLQPayload {
  trackId: string;
  userId: string;
  originalJobId?: string;
  errorCode?: string;
  errorMessage?: string;
  failedAt: string;
  attemptCount: number;
  lyriaRequest: {
    model: string;
    prompt: string;
  };
}

export class DLQProcessor {
  private dlqQueue: Queue;

  constructor() {
    this.dlqQueue = new Queue(QUEUES.SYNTH_DLQ, QUEUE_OPTIONS);
  }

  async addToDLQ(payload: DLQPayload): Promise<void> {
    await this.dlqQueue.add('failed-job', payload, {
      jobId: `dlq-${payload.trackId}`,
      removeOnComplete: false,
      removeOnFail: false,
    });

    console.log(`[DLQ] Added job ${payload.trackId} to dead letter queue`);
  }

  async process(job: Job<DLQPayload>): Promise<void> {
    const { trackId, userId, errorCode, errorMessage, failedAt, attemptCount } = job.data;

    console.log(`[DLQ] Processing dead job:`, {
      trackId,
      userId,
      errorCode,
      failedAt,
      attemptCount,
    });

    // Update synth job record with final failure status
    await prisma.synthJob.updateMany({
      where: { trackId },
      data: {
        errorCode: errorCode || 'MAX_ATTEMPTS_EXCEEDED',
        errorMessage: errorMessage || `Failed after ${attemptCount} attempts`,
        finishedAt: new Date(),
      },
    });

    // Ensure credits are refunded
    const synthJob = await prisma.synthJob.findFirst({
      where: { trackId },
      include: { track: true },
    });

    if (synthJob?.track.creditsCharged && synthJob.track.creditsCharged > 0) {
      const existingRefund = await prisma.creditTransaction.findFirst({
        where: {
          userId,
          trackId,
          type: 'refund',
        },
      });

      if (!existingRefund) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: synthJob.track.creditsCharged } },
          }),
          prisma.creditTransaction.create({
            data: {
              userId,
              amount: synthJob.track.creditsCharged,
              type: 'refund',
              description: `DLQ refund for failed generation (${trackId.slice(0, 8)})`,
              trackId,
            },
          }),
        ]);

        console.log(`[DLQ] Refunded ${synthJob.track.creditsCharged} credits to user ${userId}`);
      }
    }

    // Update track status to failed
    await prisma.track.update({
      where: { id: trackId },
      data: { status: 'failed' },
    });

    // Alert/logging for monitoring
    console.error('[DLQ] Job moved to DLQ:', {
      trackId,
      userId,
      errorCode,
      errorMessage,
      attemptCount,
    });
  }

  async getDLQStats(): Promise<{
    total: number;
    byErrorCode: Record<string, number>;
    recentFailures: Array<{
      trackId: string;
      errorCode: string;
      failedAt: Date;
    }>;
  }> {
    const jobs = await this.dlqQueue.getJobs(['completed', 'failed', 'waiting']);

    const byErrorCode: Record<string, number> = {};
    const recentFailures: Array<{ trackId: string; errorCode: string; failedAt: Date }> = [];

    for (const job of jobs) {
      if (!job) continue;

      const errorCode = job.data.errorCode || 'UNKNOWN';
      byErrorCode[errorCode] = (byErrorCode[errorCode] || 0) + 1;

      recentFailures.push({
        trackId: job.data.trackId,
        errorCode,
        failedAt: new Date(job.data.failedAt),
      });
    }

    // Sort by date descending and take last 10
    recentFailures.sort((a, b) => b.failedAt.getTime() - a.failedAt.getTime());

    return {
      total: jobs.length,
      byErrorCode,
      recentFailures: recentFailures.slice(0, 10),
    };
  }

  async retryJob(trackId: string): Promise<boolean> {
    const jobs = await this.dlqQueue.getJobs(['waiting', 'delayed']);
    const job = jobs.find((j) => j?.data?.trackId === trackId);

    if (!job) {
      console.log(`[DLQ] Job ${trackId} not found in DLQ`);
      return false;
    }

    // Reset track to queued status
    await prisma.track.update({
      where: { id: trackId },
      data: { status: 'queued' },
    });

    await prisma.synthJob.updateMany({
      where: { trackId },
      data: {
        errorCode: null,
        errorMessage: null,
        attempts: 0,
      },
    });

    // Remove from DLQ
    await job.remove();

    console.log(`[DLQ] Retrying job ${trackId}`);
    return true;
  }
}
