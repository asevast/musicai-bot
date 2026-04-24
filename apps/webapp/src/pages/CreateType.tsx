import React from 'react';
import { useNavigate } from 'react-router';
import { StepDots } from '../components/StepDots';
import { useWizardStore } from '../store/wizard.store';
import type { TrackType } from '../store/wizard.store';

const typeOptions: { type: TrackType; emoji: string; name: string; cost: number }[] = [
  { type: 'full_song', emoji: '🎵', name: 'Полная песня', cost: 5 },
  { type: 'clip', emoji: '✂️', name: 'Клип 30с', cost: 1 },
  { type: 'instrumental', emoji: '🎹', name: 'Инструментал', cost: 3 },
  { type: 'variants', emoji: '🎲', name: '3 варианта', cost: 3 },
];

export function CreateType(): React.ReactElement {
  const navigate = useNavigate();
  const { trackType, updateField } = useWizardStore();

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-7" />
          <h1 className="text-sm font-medium">Новый трек</h1>
          <span className="text-xs text-gray-400">1/4</span>
        </div>

        {/* Step Dots */}
        <StepDots currentStep={1} />

        {/* Title */}
        <h2 className="text-base font-medium mb-1">Тип трека</h2>
        <p className="text-xs text-gray-400 mb-4">Выберите формат генерации</p>

        {/* Type Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {typeOptions.map(({ type, emoji, name, cost }) => {
            const isSelected = trackType === type;
            return (
              <button
                key={type}
                onClick={() => updateField('trackType', type)}
                className={`p-3 rounded-xl border text-center transition-colors ${
                  isSelected ? 'border-[#5B5FC7] bg-[#EEF2FF]' : 'border-gray-100 bg-white'
                }`}
              >
                <div className="text-2xl mb-1">{emoji}</div>
                <div
                  className={`text-xs font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}
                >
                  {name}
                </div>
                <div className={`text-xs ${isSelected ? 'text-[#5B5FC7]' : 'text-gray-400'}`}>
                  {cost} кредит{cost === 1 ? '' : 'а'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => navigate('/create/prompt')}
          className="w-full bg-[#5B5FC7] text-white rounded-xl py-3 text-sm font-medium transition-transform active:scale-[0.98]"
        >
          Далее →
        </button>
      </div>
    </div>
  );
}
