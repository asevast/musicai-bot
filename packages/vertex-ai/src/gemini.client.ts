import { LyriaGenerationError } from './lyria.errors';

export interface LyricsGenerationRequest {
  theme: string;
  language?: string;
  style?: string;
}

export interface LyricsGenerationResponse {
  lyrics: string;
}

/**
 * Gemini client for text generation (lyrics, prompts, etc.)
 * Uses the same routerai.ru proxy but with text generation models
 */
export class GeminiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://routerai.ru/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate song lyrics based on theme
   */
  async generateLyrics(req: LyricsGenerationRequest): Promise<LyricsGenerationResponse> {
    const langNames: Record<string, string> = {
      en: 'English',
      de: 'German',
      es: 'Spanish',
      fr: 'French',
      hi: 'Hindi',
      ja: 'Japanese',
      ko: 'Korean',
      pt: 'Portuguese',
      ru: 'Russian',
    };

    const prompt = `Write original song lyrics in ${langNames[req.language || 'en']}.

Theme: ${req.theme}
${req.style ? `Style: ${req.style}` : ''}

Requirements:
- Structure: Verse 1, Chorus, Verse 2, Chorus, Bridge (optional), Final Chorus
- Make it emotional, catchy, and suitable for music generation
- Use proper section markers like [Verse 1], [Chorus], etc.
- Be creative and original

Format your response with clear section markers.`;

    const requestBody = {
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      temperature: 0.8,
      max_tokens: 2000,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(60_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new LyriaGenerationError(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const lyrics = data.choices?.[0]?.message?.content?.trim();

    if (!lyrics) {
      throw new LyriaGenerationError('Empty response from Gemini API');
    }

    return { lyrics };
  }
}
