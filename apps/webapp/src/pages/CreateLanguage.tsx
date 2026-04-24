import React from 'react';
import { useNavigate } from 'react-router';
import { StepDots } from '../components/StepDots';
import { useWizardStore } from '../store/wizard.store';

const languages = [
  { code: 'RU', name: 'Русский', flag: '🇷🇺' },
  { code: 'EN', name: 'English', flag: '🇺🇸' },
  { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'FR', name: 'Français', flag: '🇫🇷' },
  { code: 'JA', name: '日本語', flag: '🇯🇵' },
  { code: 'KO', name: '한국어', flag: '🇰🇷' },
];

export function CreateLanguage(): React.ReactElement {
  const navigate = useNavigate();
  const { language, customLyrics, updateField } = useWizardStore();

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/create/prompt')}
            className="text-xs text-[#5B5FC7] min-w-7"
          >
            ←
          </button>
          <h1 className="text-sm font-medium">Новый трек</h1>
          <span className="text-xs text-gray-400">3/4</span>
        </div>

        {/* Step Dots */}
        <StepDots currentStep={3} />

        {/* Title */}
        <h2 className="text-base font-medium mb-1">Язык вокала</h2>
        <p className="text-xs text-gray-400 mb-4">В каком языке петь?</p>

        {/* Language Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {languages.map(({ code, name, flag }) => {
            const isSelected = language === code;
            return (
              <button
                key={code}
                onClick={() => updateField('language', code)}
                className={`p-2.5 rounded-lg border flex items-center gap-2 transition-colors ${
                  isSelected ? 'border-[#5B5FC7] bg-[#EEF2FF]' : 'border-gray-100 bg-white'
                }`}
              >
                <span className="text-lg">{flag}</span>
                <div className="text-left">
                  <div
                    className={`text-xs font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}
                  >
                    {name}
                  </div>
                  <div className={`text-xs ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>
                    {code}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Buttons */}
        <button
          onClick={() => navigate('/create/confirm')}
          className="w-full bg-[#5B5FC7] text-white rounded-xl py-3 text-sm font-medium mb-2 transition-transform active:scale-[0.98]"
        >
          Далее →
        </button>
        <button
          onClick={() => navigate('/create/confirm')}
          className="w-full py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl transition-transform active:scale-[0.98]"
        >
          Свои тексты
        </button>
      </div>
    </div>
  );
}
