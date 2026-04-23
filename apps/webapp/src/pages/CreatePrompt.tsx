import React from 'react';
import { useNavigate } from 'react-router';
import { StepDots } from '../components/StepDots';
import { useWizardStore } from '../store/wizard.store';

const intensityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  epic: 'Epic',
};

export function CreatePrompt(): React.ReactElement {
  const navigate = useNavigate();
  const { prompt, intensity, duration, updateField } = useWizardStore();

  const charCount = prompt.length;
  const maxChars = 1000;

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/create')}
            className="text-xs text-[#5B5FC7] min-w-7"
          >
            ←
          </button>
          <h1 className="text-sm font-medium">Новый трек</h1>
          <span className="text-xs text-gray-400">2/4</span>
        </div>

        {/* Step Dots */}
        <StepDots currentStep={2} />

        {/* Title */}
        <h2 className="text-base font-medium mb-1">Описание</h2>
        <p className="text-xs text-gray-400 mb-4">Что за трек хотите создать?</p>

        {/* Prompt Textarea */}
        <textarea
          value={prompt}
          onChange={(e) => updateField('prompt', e.target.value)}
          placeholder="Опишите музыку..."
          rows={4}
          className="w-full p-3 rounded-xl border border-gray-200 text-sm resize-none focus:border-[#5B5FC7] focus:outline-none"
          maxLength={maxChars}
        />
        <div className="text-right text-xs text-gray-400 mt-1 mb-4">
          {charCount} / {maxChars}
        </div>

        {/* Intensity Slider */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Интенсивность</span>
            <span className="text-[#5B5FC7] font-medium">{intensityLabels[intensity]}</span>
          </div>
          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={['low', 'medium', 'high', 'epic'].indexOf(intensity)}
            onChange={(e) => {
              const intensities = ['low', 'medium', 'high', 'epic'] as const;
              updateField('intensity', intensities[Number(e.target.value)]);
            }}
            className="w-full accent-[#5B5FC7]"
          />
        </div>

        {/* Duration Slider */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Длительность</span>
            <span className="text-[#5B5FC7] font-medium">{duration} сек</span>
          </div>
          <input
            type="range"
            min={30}
            max={184}
            step={1}
            value={duration}
            onChange={(e) => updateField('duration', Number(e.target.value))}
            className="w-full accent-[#5B5FC7]"
          />
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button className="py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl transition-transform active:scale-[0.98]">
            Negative prompt
          </button>
          <button
            onClick={() => navigate('/create/lang')}
            className="py-2.5 text-sm font-medium text-white bg-[#5B5FC7] rounded-xl transition-transform active:scale-[0.98]"
          >
            Далее →
          </button>
        </div>
      </div>
    </div>
  );
}
