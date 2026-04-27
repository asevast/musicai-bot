import { metrics, Meter, Counter, Histogram, UpDownCounter, ObservableGauge } from '@opentelemetry/api';

// Global meter instance
let meter: Meter;

// Metric instruments
let synthJobDurationMs: Histogram;
let synthJobQueueDepth: ObservableGauge;
let vertexApiErrorsTotal: Counter;
let creditsSpentTotal: Counter;
let telegramMessagesTotal: Counter;
let activeUsersDaily: ObservableGauge;

// In-memory metrics for ObservableGauge
const queueDepths: Map<string, number> = new Map();

export function initializeMetrics(serviceName: string) {
  meter = metrics.getMeter(serviceName, '1.0.0');

  // Synth job duration histogram (ms)
  synthJobDurationMs = meter.createHistogram('synth_job_duration_ms', {
    description: 'Duration of synth job processing in milliseconds',
    unit: 'ms',
    advice: {
      explicitBucketBoundaries: [1000, 5000, 10000, 30000, 60000, 120000],
    },
  });

  // Queue depth gauge
  synthJobQueueDepth = meter.createObservableGauge('synth_job_queue_depth', {
    description: 'Current depth of synth job queues',
    unit: '1',
  });
  synthJobQueueDepth.addCallback((observableResult) => {
    for (const [queueName, depth] of queueDepths) {
      observableResult.observe(depth, { queueName });
    }
  });

  // Vertex API errors counter (by error_code)
  vertexApiErrorsTotal = meter.createCounter('vertex_api_errors_total', {
    description: 'Total number of Vertex AI API errors',
    unit: '1',
  });

  // Credits spent counter
  creditsSpentTotal = meter.createCounter('credits_spent_total', {
    description: 'Total credits spent on track generation',
    unit: '1',
  });

  // Telegram messages counter (by command)
  telegramMessagesTotal = meter.createCounter('telegram_messages_total', {
    description: 'Total Telegram messages processed',
    unit: '1',
  });

  // Active users daily gauge
  activeUsersDaily = meter.createObservableGauge('active_users_daily', {
    description: 'Number of active users in the last 24 hours',
    unit: '1',
  });

  return {
    synthJobDurationMs,
    synthJobQueueDepth,
    vertexApiErrorsTotal,
    creditsSpentTotal,
    telegramMessagesTotal,
    activeUsersDaily,
  };
}

// Helper functions for recording metrics

export function recordSynthJobDuration(durationMs: number, attributes: { model: string; status: string }) {
  synthJobDurationMs?.record(durationMs, attributes);
}

export function setQueueDepth(queueName: string, depth: number) {
  queueDepths.set(queueName, depth);
}

export function incrementVertexApiErrors(errorCode: string) {
  vertexApiErrorsTotal?.add(1, { errorCode });
}

export function incrementCreditsSpent(amount: number, attributes: { tier: string; model: string }) {
  creditsSpentTotal?.add(amount, attributes);
}

export function incrementTelegramMessages(command: string) {
  telegramMessagesTotal?.add(1, { command });
}

export function setActiveUsersDailyCallback(callback: () => number) {
  activeUsersDaily?.addCallback((observableResult) => {
    observableResult.observe(callback());
  });
}

// Export instruments for direct use if needed
export { meter, synthJobDurationMs, vertexApiErrorsTotal, creditsSpentTotal, telegramMessagesTotal };
