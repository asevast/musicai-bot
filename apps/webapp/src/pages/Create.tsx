import React, { useState } from 'react';
import { Title, Snackbar } from '@telegram-apps/telegram-ui';
import { PromptForm } from '../components/PromptForm';
import { apiClient } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useTracksStore } from '../store/tracks.store';
import type { CreateTrackDto, LyriaModel } from '@musicai/shared-types';

interface PromptFormData {
  prompt: string;
  type: 'full_song' | 'clip' | 'instrumental' | 'variants';
  language: string;
  lyrics?: string;
  bpm: number;
  intensity: 'low' | 'medium' | 'high' | 'epic';
}

export function Create(): React.ReactElement {
  const { user } = useTelegram();
  const addTrack = useTracksStore((state) => state.addTrack);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData: PromptFormData): Promise<void> => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const model: LyriaModel =
        formData.type === 'clip' ? 'lyria-3-clip-preview' : 'lyria-3-pro-preview';

      const dto: Omit<CreateTrackDto, 'telegramId' | 'chatId' | 'messageId'> & {
        telegramId: string;
        chatId: number;
        messageId: number;
      } = {
        model,
        type: formData.type,
        prompt: formData.prompt,
        lyrics: formData.lyrics,
        bpm: formData.bpm,
        intensity: formData.intensity,
        language: formData.language,
        telegramId: String(user.id),
        chatId: 0,
        messageId: 0,
      };

      const response = await apiClient.post('tracks', { json: dto }).json<{
        id: string;
        title: string;
        status: 'queued';
        createdAt: string;
        type: string;
      }>();

      addTrack({
        id: response.id,
        title: response.title,
        status: response.status,
        createdAt: response.createdAt,
        type: response.type,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to create track. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="p-4 pb-20">
        <Title level="2" weight="1" className="mb-4">
          Create New Track
        </Title>

        <PromptForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>

      {error && <Snackbar description={error} onClose={() => setError(null)} duration={5000} />}

      {success && (
        <Snackbar
          description="Track created successfully!"
          onClose={() => setSuccess(false)}
          duration={3000}
        />
      )}
    </div>
  );
}
