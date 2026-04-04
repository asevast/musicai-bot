import { Worker } from 'bullmq';
import { loadEnv } from '@musicai/config';
import { prisma } from '@musicai/database';
import { LyriaClient } from '@musicai/vertex-ai';
import { SynthJobProcessor } from './processors/synth-job.processor';

const env = loadEnv();

const QUEUES = {
  SYNTH_PRO_URGENT: 'synth:pro:urgent',
  SYNTH_PRO_NORMAL: 'synth:pro:normal',
  SYNTH_CLIP: 'synth:clip',
} as const;

async function main() {
  const lyriaClient = new LyriaClient(env.GOOGLE_CLOUD_PROJECT, env.VERTEX_AI_LOCATION);
  const synthJobProcessor = new SynthJobProcessor(prisma, lyriaClient, env.GCS_BUCKET_NAME);

  const workers = [
    new Worker(QUEUES.SYNTH_PRO_URGENT, (job) => synthJobProcessor.process(job), {
      connection: { host: 'localhost', port: 6379 },
      concurrency: 2,
    }),
    new Worker(QUEUES.SYNTH_PRO_NORMAL, (job) => synthJobProcessor.process(job), {
      connection: { host: 'localhost', port: 6379 },
      concurrency: 3,
    }),
    new Worker(QUEUES.SYNTH_CLIP, (job) => synthJobProcessor.process(job), {
      connection: { host: 'localhost', port: 6379 },
      concurrency: 5,
    }),
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
