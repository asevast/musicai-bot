import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env only if env vars not already set (host dev)
// In Docker, env vars are set via env_file in docker-compose.yml
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
}

import { Worker } from 'bullmq';
import { loadEnv } from '@musicai/config';
import { prisma } from '@musicai/database';
import { LyriaClient } from '@musicai/vertex-ai';
import { QUEUES, QUEUE_OPTIONS, WORKER_CONFIG } from '@musicai/queues';
import { SynthJobProcessor } from './processors/synth-job.processor';
import { NotifyProcessor } from './processors/notify.processor';

const env = loadEnv();

const lyriaClient = new LyriaClient(env.LYRIA_API_KEY, env.LYRIA_BASE_URL);
const synthProcessor = new SynthJobProcessor(prisma, lyriaClient);
const notifyProcessor = new NotifyProcessor(prisma);

const synthQueues = [QUEUES.SYNTH_PRO_URGENT, QUEUES.SYNTH_PRO_NORMAL, QUEUES.SYNTH_CLIP];

const workers = synthQueues.map((name) => {
  const config = WORKER_CONFIG[name];
  console.log(`[Worker] Listening on queue: ${name} (concurrency: ${config.concurrency})`);
  return new Worker(name, (job) => synthProcessor.process(job), {
    ...QUEUE_OPTIONS,
    concurrency: config.concurrency,
    limiter: config.limiter,
  });
});

const notifyConfig = WORKER_CONFIG[QUEUES.NOTIFY];
console.log(
  `[Worker] Listening on queue: ${QUEUES.NOTIFY} (concurrency: ${notifyConfig.concurrency})`
);
const notifyWorker = new Worker(QUEUES.NOTIFY, (job) => notifyProcessor.process(job), {
  ...QUEUE_OPTIONS,
  concurrency: notifyConfig.concurrency,
});

workers.push(notifyWorker);

for (const w of workers) {
  w.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} on queue ${w.name} failed:`, err.message);
  });
}

console.log('[Worker] All workers started');
