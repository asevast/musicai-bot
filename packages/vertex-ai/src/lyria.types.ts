export type LyriaModel = 'lyria-3-pro-preview' | 'lyria-3-clip-preview';

export interface LyriaRequest {
  prompt: string;
  negativePrompt?: string;
  model: LyriaModel;
  vocal?: boolean;
  lyrics?: string;
  /**
   * When false, uses custom lyrics as-is without AI rewriting.
   * When true (default), AI may modify lyrics for better musical flow.
   * Should be set to false when user provides custom lyrics.
   */
  promptRewriter?: boolean;
  bpm?: number;
  intensity?: 'low' | 'medium' | 'high' | 'epic';
  durationSeconds?: number;
  language?: 'en' | 'de' | 'es' | 'fr' | 'hi' | 'ja' | 'ko' | 'pt';
  imageBase64?: string;
  imageMimeType?: 'image/jpeg' | 'image/png';
}

export interface LyriaResponse {
  audioBase64: string;
  mimeType: 'audio/mp3';
  revisedPrompt?: string;
}
