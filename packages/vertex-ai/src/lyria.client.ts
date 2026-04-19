import type { LyriaRequest, LyriaResponse } from './lyria.types';
import { LyriaGenerationError } from './lyria.errors';

export class LyriaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://routerai.ru/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async generate(req: LyriaRequest): Promise<LyriaResponse> {
    const model =
      req.model === 'lyria-3-clip-preview'
        ? 'google/lyria-3-clip-preview'
        : 'google/lyria-3-pro-preview';

     // Build the request body - use simple text content (OpenAI format)
     const requestBody: Record<string, unknown> = {
       model,
       messages: [
         {
           role: 'user',
           content: req.prompt, // simple string
         },
       ],
       stream: true,
     };

    // Add Lyria-specific parameters directly to the body
    if (req.lyrics) {
      // Ensure lyrics are properly formatted with section markers
      requestBody.lyrics = req.lyrics.trim();
      // When custom lyrics are provided, ensure vocal is true
      requestBody.vocal = true;
      // Disable prompt rewriter to use custom lyrics as-is
      requestBody.promptRewriter = req.promptRewriter ?? false;
    } else if (req.vocal !== undefined) {
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
    if (req.negativePrompt) {
      requestBody.negativePrompt = req.negativePrompt;
    }

    // Debug: Log the request body
    console.log('[LyriaClient] Request body:', JSON.stringify(requestBody, null, 2));

    // Make the fetch request directly
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
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            console.log('[LyriaClient] Received data line (first 200 chars):', data.slice(0, 200));

            try {
              const parsed = JSON.parse(data);

              // Check for API errors
              if (parsed.error) {
                console.error('[LyriaClient] API returned error:', parsed.error);
                throw new LyriaGenerationError(`Lyria API error: ${parsed.error.code || 'UNKNOWN'} - ${parsed.error.message || JSON.stringify(parsed.error)}`);
              }

              const delta = parsed.choices?.[0]?.delta;
              const audio = delta?.audio as { data?: string } | undefined;
              if (audio?.data) {
                audioChunks.push(audio.data);
                console.log(`[LyriaClient] Received audio chunk ${audioChunks.length}: ${audio.data.length} chars`);
              } else {
                // Log if there's no audio data but we got a valid response
                if (Object.keys(parsed).length > 0) {
                  console.log('[LyriaClient] Chunk parsed but no audio:', JSON.stringify(parsed).slice(0, 200));
                }
              }
            } catch (e) {
              // Log parse errors for malformed chunks
              console.warn('[LyriaClient] Failed to parse chunk:', e, 'chunk:', trimmed.slice(0, 200));
            }
          } else {
            // Log other lines for debugging
            if (line.trim()) {
              console.log('[LyriaClient] Non-data line:', line.trim().slice(0, 200));
            }
          }
        }
      }

      // Process any remaining data in buffer
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

    console.log(`[LyriaClient] Final check - audioChunks.length: ${audioChunks.length}`);
    if (audioChunks.length === 0) {
      console.error('[LyriaClient] No audio chunks collected!');
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
