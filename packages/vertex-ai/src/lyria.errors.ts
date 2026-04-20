export enum LyriaErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INTERNAL = 'INTERNAL',
  RECITATION_FILTER = 'RECITATION_FILTER',
  VOCAL_LIKENESS = 'VOCAL_LIKENESS',
}

export interface RetryConfig {
  retry: boolean;
  delay: number;
  maxAttempts: number;
}

export const RETRY_CONFIG: Record<LyriaErrorCode, RetryConfig> = {
  [LyriaErrorCode.QUOTA_EXCEEDED]: { retry: true, delay: 60_000, maxAttempts: 5 },
  [LyriaErrorCode.INTERNAL]: { retry: true, delay: 5_000, maxAttempts: 3 },
  [LyriaErrorCode.INVALID_ARGUMENT]: { retry: false, delay: 0, maxAttempts: 0 },
  [LyriaErrorCode.PERMISSION_DENIED]: { retry: false, delay: 0, maxAttempts: 0 },
  [LyriaErrorCode.RECITATION_FILTER]: { retry: false, delay: 0, maxAttempts: 0 },
  [LyriaErrorCode.VOCAL_LIKENESS]: { retry: false, delay: 0, maxAttempts: 0 },
} as const;

export function mapVertexError(error: unknown): LyriaErrorCode {
  const msg = String(error);
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED'))
    return LyriaErrorCode.QUOTA_EXCEEDED;
  if (msg.includes('400') || msg.includes('INVALID_ARGUMENT'))
    return LyriaErrorCode.INVALID_ARGUMENT;
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED'))
    return LyriaErrorCode.PERMISSION_DENIED;
  if (msg.includes('recitation')) return LyriaErrorCode.RECITATION_FILTER;
  if (msg.includes('vocal_likeness')) return LyriaErrorCode.VOCAL_LIKENESS;
  return LyriaErrorCode.INTERNAL;
}

export class LyriaGenerationError extends Error {
  constructor(
    message: string,
    public code?: LyriaErrorCode
  ) {
    super(message);
    this.name = 'LyriaGenerationError';
  }
}
