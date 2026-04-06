import { Worker } from 'bullmq';
import { loadEnv } from '@musicai/config';
import { prisma } from '@musicai/database';
import { LyriaClient } from '@musicai/vertex-ai';
import { QUEUES, QUEUE_OPTIONS, WORKER_CONFIG } from '@musicai/queues';
import { SynthJobProcessor } from './processors/synth-job.processor';
import { NotifyProcessor } from './processors/notify.processor';

const env = loadEnv();

async function main() {
  const lyriaClient = new LyriaClient(env.GOOGLE_CLOUD_PROJECT, env.VERTEX_AI_LOCATION);
  const synthJobProcessor = new SynthJobProcessor(prisma, lyriaClient, env.GCS_BUCKET_NAME);
  const notifyProcessor = new NotifyProcessor(prisma);

  const workers = [
    new Worker(
      QUEUES.SYNTH_PRO_URGENT,
      (job) => synthJobProcessor.process(job),
      {
        connection: QUEUE_OPTIONS.connection,
        concurrency: WORKER_CONFIG[QUEUES.SYNTH_PRO_URGENT].concurrency,
        limiter: WORKER_CONFIG[QUEUES.SYNTH_PRO_URGENT].limiter,
      },
    ),
    new Worker(
      QUEUES.SYNTH_PRO_NORMAL,
      (job) => synthJobProcessor.process(job),
      {
        connection: QUEUE_OPTIONS.connection,
        concurrency: WORKER_CONFIG[QUEUES.SYNTH_PRO_NORMAL].concurrency,
        limiter: WORKER_CONFIG[QUEUES.SYNTH_PRO_NORMAL].limiter,
      },
    ),
    new Worker(
      QUEUES.SYNTH_CLIP,
      (job) => synthJobProcessor.process(job),
      {
        connection: QUEUE_OPTIONS.connection,
        concurrency: WORKER_CONFIG[QUEUES.SYNTH_CLIP].concurrency,
        limiter: WORKER_CONFIG[QUEUES.SYNTH_CLIP].limiter,
      },
    ),
    new Worker(
      QUEUES.NOTIFY,
      (job) => notifyProcessor.process(job),
      {
        connection: QUEUE_OPTIONS.connection,
        concurrency: WORKER_CONFIG[QUEUES.NOTIFY].concurrency,
      },
    ),
  ];

  console.log('Workers started');

  process.on('SIGTERM', async () => {
    await Promise.all(workers.map((w) => w.close()));
    await prisma.$disconnect();
  });
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
