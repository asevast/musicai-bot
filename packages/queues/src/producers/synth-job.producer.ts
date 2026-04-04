import { Queue } from 'bullmq';
import { QUEUES, QUEUE_OPTIONS } from '../queues.config';
import type { SynthJobPayload } from '@musicai/shared-types';

export class SynthJobProducer {
  private queues: Map<string, Queue> = new Map();

  constructor() {
    this.queues.set(QUEUES.SYNTH_PRO_URGENT, new Queue(QUEUES.SYNTH_PRO_URGENT, QUEUE_OPTIONS));
    this.queues.set(QUEUES.SYNTH_PRO_NORMAL, new Queue(QUEUES.SYNTH_PRO_NORMAL, QUEUE_OPTIONS));
    this.queues.set(QUEUES.SYNTH_CLIP, new Queue(QUEUES.SYNTH_CLIP, QUEUE_OPTIONS));
  }

  async addSynthJob(payload: SynthJobPayload, isPaidUser = false): Promise<void> {
    const queueName = this.selectQueue(payload.lyriaRequest.model, isPaidUser);
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const priority = isPaidUser ? 10 : 1;

    await queue.add('synthesize', payload, {
      priority,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  private selectQueue(model: string, isPaidUser: boolean): string {
    if (model === 'lyria-3-clip-preview') {
      return QUEUES.SYNTH_CLIP;
    }

    return isPaidUser ? QUEUES.SYNTH_PRO_URGENT : QUEUES.SYNTH_PRO_NORMAL;
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}
