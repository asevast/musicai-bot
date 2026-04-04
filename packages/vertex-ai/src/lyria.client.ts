import { VertexAI } from '@google-cloud/vertexai';
import type { LyriaRequest, LyriaResponse, LyriaModel } from './lyria.types';
import { LyriaGenerationError } from './lyria.errors';

export class LyriaClient {
  private readonly vertexAI: VertexAI;
  private readonly location: string;

  constructor(projectId: string, location = 'us-central1') {
    this.vertexAI = new VertexAI({ project: projectId, location });
    this.location = location;
  }

  async generate(req: LyriaRequest): Promise<LyriaResponse> {
    const model = this.vertexAI.preview.getGenerativeModel({
      model: req.model,
    });

    const parts: object[] = [{ text: req.prompt }];

    if (req.imageBase64 && req.imageMimeType) {
      parts.push({
        inlineData: { mimeType: req.imageMimeType, data: req.imageBase64 },
      });
    }

    const generationConfig: Record<string, unknown> = {
      outputMimeType: 'audio/mp3',
      negativePrompt: req.negativePrompt,
      vocal: req.vocal ?? true,
      lyrics: req.lyrics,
      bpm: req.bpm,
      intensity: req.intensity,
      language: req.language ?? 'en',
      promptRewriter: req.promptRewriter ?? true,
    };

    if (req.model === 'lyria-3-pro-preview' && req.durationSeconds) {
      generationConfig.durationSeconds = req.durationSeconds;
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig,
    });

    const audioData = result.response.candidates?.[0]?.content?.parts?.[0];
    if (!audioData?.inlineData) {
      throw new LyriaGenerationError('Empty response from Lyria API');
    }

    return {
      audioBase64: audioData.inlineData.data,
      mimeType: 'audio/mp3',
      revisedPrompt: result.response.candidates?.[0]?.content?.parts?.[1]?.text,
    };
  }
}
