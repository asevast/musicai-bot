import type { LyriaModel } from './track.types';

export interface SynthJobPayload {
  trackId: string;
  userId: string;
  telegramId: string;
  chatId: number;
  messageId: number;
  lyriaRequest: {
    model: LyriaModel;
    prompt: string;
    negativePrompt?: string;
    vocal?: boolean;
    lyrics?: string;
    bpm?: number;
    intensity?: 'low' | 'medium' | 'high' | 'epic';
    durationSeconds?: number;
    language?: string;
    imageBase64?: string;
    imageMimeType?: string;
  };
  batchGroupId?: string;
  batchIndex?: number;
  batchTotal?: number;
}

export interface NotifyPayload {
  chatId: number;
  messageId?: number;
  text: string;
  trackId?: string;
  gcsUrl?: string;
  errorCode?: string;
}
