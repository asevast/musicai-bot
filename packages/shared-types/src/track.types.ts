export type LyriaModel = 'lyria-3-pro-preview' | 'lyria-3-clip-preview';

export type TrackType = 'full_song' | 'clip' | 'instrumental';

export type TrackStatus = 'queued' | 'processing' | 'done' | 'failed';

export type Intensity = 'low' | 'medium' | 'high' | 'epic';

export interface TrackParameters {
  bpm?: number;
  intensity?: Intensity;
  durationSeconds?: number;
  language?: string;
}

export interface CreateTrackDto {
  model: LyriaModel;
  type: TrackType;
  prompt: string;
  negativePrompt?: string;
  lyrics?: string;
  /**
   * When false, uses custom lyrics as-is without AI rewriting.
   * Should be set to false when user provides custom lyrics.
   */
  promptRewriter?: boolean;
  bpm?: number;
  intensity?: Intensity;
  durationSeconds?: number;
  language?: string;
  imageBase64?: string;
  imageMimeType?: string;
  telegramId: string;
  chatId: number;
  messageId: number;
  isRegeneration?: boolean;
  sourceTrackId?: string;
}
