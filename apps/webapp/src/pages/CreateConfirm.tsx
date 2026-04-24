import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { StepDots } from '../components/StepDots';
import { apiClient } from '../api/client';
import { useWizardStore } from '../store/wizard.store';
import { useTelegram } from '../hooks/useTelegram';
import { useTracksStore } from '../store/tracks.store';
import type { LyriaModel, CreateTrackDto } from '@musicai/shared-types';

const typeLabels: Record<string, string> = {
  full_song: 'Полная песня',
  clip: 'Клип 30с',
  instrumental: 'Инструментал',
  variants: '3 варианта',
};

const typeCosts: Record<string, number> = {
  full_song: 5,
  clip: 1,
  instrumental: 3,
  variants: 3,
};

const intensityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  epic: 'Epic',
};

export function CreateConfirm(): React.ReactElement {
  const navigate = useNavigate();
  const { user } = useTelegram();
  const addTrack = useTracksStore((state) => state.addTrack);
  const { trackType, prompt, intensity, duration, language } = useWizardStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cost = typeCosts[trackType] || 5;

  const handleCreate = async () => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    setIsSubmitting(true);

    try {
      const model: LyriaModel =
        trackType === 'clip' ? 'lyria-3-clip-preview' : 'lyria-3-pro-preview';

      const dto: Omit<CreateTrackDto, 'telegramId' | 'chatId' | 'messageId'> & {
        telegramId: string;
        chatId: number;
        messageId: number;
      } = {
        model,
        type: trackType,
        prompt,
        lyrics: undefined,
        bpm: undefined,
        intensity,
        durationSeconds: duration,
        language,
        telegramId: String(user.id),
        chatId: 0,
        messageId: 0,
      };

      const response = await apiClient
        .post('tracks', { json: dto })
        .json<{ id: string; title: string; status: 'queued'; createdAt: string; type: string }>();

      addTrack({
        id: response.id,
        title: response.title,
        status: response.status,
        createdAt: response.createdAt,
        type: response.type,
      });

      navigate('/generating');
    } catch (error) {
      console.error('Failed to create track:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/create/lang')}
            className="text-xs text-[#5B5FC7] min-w-7"
          >
            ←
          </button>
          <h1 className="text-sm font-medium">Подтверждение</h1>
          <span className="text-xs text-gray-400">4/4</span>
        </div>

        {/* Step Dots */}
        <StepDots currentStep={4} />

        {/* Title */}
        <h2 className="text-base font-medium mb-1">Всё готово</h2>
        <p className="text-xs text-gray-400 mb-4">Проверьте параметры трека</p>

        {/* Summary Card */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
          <div className="space-y-2">
            {/* Type */}
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Тип</span>
              <span className="text-gray-900 font-medium">{typeLabels[trackType]}</span>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Prompt */}
            <div className="text-xs text-gray-600 leading-relaxed line-clamp-2">
              {prompt || 'Upbeat pop song, catchy chorus...'}
            </div>

            <div className="h-px bg-gray-100" />

            {/* Language */}
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Язык</span>
              <span className="text-gray-900 font-medium">{language}</span>
            </div>

            {/* BPM */}
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">BPM</span>
              <span className="text-gray-900 font-medium">Авто</span>
            </div>

            {/* Duration */}
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Длина</span>
              <span className="text-gray-900 font-medium">{duration} сек</span>
            </div>
          </div>
        </div>

        {/* Cost Highlight */}
        <div className="bg-[#EEF2FF] rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-xs font-medium text-[#5B5FC7]">Стоимость</span>
          <span className="text-base font-medium text-[#5B5FC7]">{cost} кредитов</span>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          className="w-full bg-[#5B5FC7] text-white rounded-xl py-3 text-sm font-medium mb-2 transition-transform active:scale-[0.98]"
        >
          Создать трек
        </button>

        {/* Change Button */}
        <button
          onClick={() => navigate('/create')}
          className="w-full py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl transition-transform active:scale-[0.98]"
        >
          Изменить
        </button>
      </div>
    </div>
  );
}
