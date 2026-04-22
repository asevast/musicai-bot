import type { LyriaRequest, LyriaResponse } from './lyria.types';
import { LyriaGenerationError } from './lyria.errors';
import { CircuitBreaker } from './circuit-breaker';

export class LyriaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(apiKey: string, baseUrl = 'https://routerai.ru/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60_000,
      monitorInterval: 10_000,
    });
  }

  async generate(req: LyriaRequest): Promise<LyriaResponse> {
    return this.circuitBreaker.execute(async () => {
      const model =
        req.model === 'lyria-3-clip-preview'
          ? 'google/lyria-3-clip-preview'
          : 'google/lyria-3-pro-preview';

      let promptText = req.prompt;
      if (req.lyrics && req.promptRewriter === false) {
        promptText = `${req.prompt}\n\nLyrics:\n${req.lyrics.trim()}`;
      }

      const userContent: string | object[] =
        req.imageBase64 && req.imageMimeType
          ? [
              { type: 'text', text: promptText },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${req.imageMimeType};base64,${req.imageBase64}`,
                },
              },
            ]
          : promptText;

      const requestBody: Record<string, unknown> = {
        model,
        messages: [{ role: 'user', content: userContent }],
        stream: true,
      };

      if (req.vocal !== undefined) {
        requestBody.vocal = req.vocal;
      }
      if (req.bpm) {
        requestBody.bpm = req.bpm;
      }
      if (req.intensity) {
        requestBody.intensity = req.intensity;
      }
      if (req.durationSeconds) {
        requestBody.durationSeconds = req.durationSeconds;
      }
      if (req.language) {
        requestBody.language = req.language;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(200_000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new LyriaGenerationError(`Lyria API error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new LyriaGenerationError('No response body from Lyria API');
      }

      const audioChunks: string[] = [];
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('data: ')) {
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.error) {
                  throw new LyriaGenerationError(
                    `Lyria API error: ${parsed.error.code || 'UNKNOWN'} - ${parsed.error.message || JSON.stringify(parsed.error)}`
                  );
                }

                const delta = parsed.choices?.[0]?.delta;
                const audio = delta?.audio as { data?: string } | undefined;
                if (audio?.data) {
                  audioChunks.push(audio.data);
                }
              } catch (e) {
                if (e instanceof LyriaGenerationError) throw e;
              }
            }
          }
        }

        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                const audio = parsed.choices?.[0]?.delta?.audio as { data?: string } | undefined;
                if (audio?.data) {
                  audioChunks.push(audio.data);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
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
    });
  }
}
