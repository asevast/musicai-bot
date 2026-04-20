export type LyriaModel = 'lyria-3-pro-preview' | 'lyria-3-clip-preview';

export interface LyriaRequest {
  prompt: string;
  model: LyriaModel;
  vocal?: boolean;
  lyrics?: string;
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
