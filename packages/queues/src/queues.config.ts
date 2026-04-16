export const QUEUES = {
  SYNTH_PRO_URGENT: 'synth-pro-urgent',
  SYNTH_PRO_NORMAL: 'synth-pro-normal',
  SYNTH_CLIP: 'synth-clip',
  SYNTH_DLQ: 'synth-dlq',
  NOTIFY: 'notify',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const QUEUE_OPTIONS = {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: false,
  },
} as const;

export const WORKER_CONFIG = {
  [QUEUES.SYNTH_PRO_URGENT]: { concurrency: 2, limiter: { max: 8, duration: 60_000 } },
  [QUEUES.SYNTH_PRO_NORMAL]: { concurrency: 3, limiter: { max: 8, duration: 60_000 } },
  [QUEUES.SYNTH_CLIP]: { concurrency: 5, limiter: { max: 9, duration: 60_000 } },
  [QUEUES.NOTIFY]: { concurrency: 10 },
} as const;
