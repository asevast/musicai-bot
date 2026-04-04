import { Queue } from 'bullmq';
import { QUEUES, QUEUE_OPTIONS } from '../queues.config';
import type { NotifyPayload } from '@musicai/shared-types';

export class NotifyJobProducer {
  private queue: Queue;

  constructor() {
    this.queue = new Queue(QUEUES.NOTIFY, QUEUE_OPTIONS);
  }

  async addNotifyJob(payload: NotifyPayload): Promise<void> {
    await this.queue.add('notify', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
