import OpenAI from 'openai';
import type { LyriaRequest, LyriaResponse } from './lyria.types';
import { LyriaGenerationError } from './lyria.errors';

export class LyriaClient {
  private readonly client: OpenAI;

  constructor(apiKey: string, baseUrl = 'https://routerai.ru/api/v1') {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });
  }

  async generate(req: LyriaRequest): Promise<LyriaResponse> {
    const model =
      req.model === 'lyria-3-clip-preview'
        ? 'google/lyria-3-clip-preview'
        : 'google/lyria-3-pro-preview';

    const audioChunks: string[] = [];

    const stream = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: req.prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta as Record<string, unknown>;
      const audio = delta?.audio as { data?: string } | undefined;
      if (audio?.data) {
        audioChunks.push(audio.data);
      }
    }

    if (audioChunks.length === 0) {
      throw new LyriaGenerationError('No audio data received from Lyria API');
    }

    const mp3Data = Buffer.from(audioChunks.join(''), 'base64');

    return {
      audioBase64: mp3Data.toString('base64'),
      mimeType: 'audio/mp3',
      revisedPrompt: req.prompt,
    };
  }
}
