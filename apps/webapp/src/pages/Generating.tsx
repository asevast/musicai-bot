import React from 'react';
import { CheckIcon, PlayIcon, CloudIcon } from '../components/icons';

// Message icon for Telegram stage
function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

interface Stage {
  id: string;
  label: string;
  status: 'done' | 'active' | 'pending';
  icon: 'check' | 'play' | 'cloud' | 'message';
}

const stages: Stage[] = [
  { id: '1', label: 'Промпт улучшен', status: 'done', icon: 'check' },
  { id: '2', label: 'Задача в очереди Lyria 3', status: 'done', icon: 'check' },
  { id: '3', label: 'Генерация аудио', status: 'active', icon: 'play' },
  { id: '4', label: 'Сохранение в облако', status: 'pending', icon: 'cloud' },
  { id: '5', label: 'Отправка в Telegram', status: 'pending', icon: 'message' },
];

export function Generating(): React.ReactElement {
  const progress = 62;
  const eta = 38;

  return (
    <div className="min-h-screen bg-white">
      <div className="p-4 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center py-3">
          <h1 className="text-sm font-medium">Генерация</h1>
        </div>

        {/* Wave Bars Visualization */}
        <div className="flex items-center justify-center gap-1 h-20 py-6">
          {[12, 28, 36, 20, 32, 16, 24, 38, 18, 20, 28, 16].map((height, i) => (
            <div
              key={i}
              className={`w-1 rounded-sm bg-[#5B5FC7] animate-bar-${(i % 8) + 1}`}
              style={{
                height: `${height}px`,
                opacity: i % 2 === 0 ? 0.9 : i % 3 === 0 ? 1 : 0.6,
              }}
            />
          ))}
        </div>

        {/* Status */}
        <div className="text-center mb-1">
          <p className="text-sm font-medium text-gray-900">Создаём трек...</p>
        </div>
        <div className="text-center mb-6">
          <p className="text-xs text-gray-400">Осталось ~{eta} секунд</p>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-[#5B5FC7] rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>

        {/* Stage List */}
        <div className="space-y-2">
          {stages.map((stage) => (
            <div key={stage.id} className="flex items-center gap-3">
              {/* Stage Icon */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  stage.status === 'done'
                    ? 'bg-[#DCFCE7]'
                    : stage.status === 'active'
                    ? 'bg-[#EEF2FF]'
                    : 'bg-gray-100'
                }`}
              >
                {stage.status === 'done' && (
                  <CheckIcon className="w-3 h-3 fill-[#16A34A]" />
                )}
                {stage.status === 'active' && (
                  <PlayIcon className="w-3 h-3 fill-[#5B5FC7]" />
                )}
                {stage.status === 'pending' && stage.icon === 'cloud' && (
                  <CloudIcon className="w-3 h-3 fill-gray-400" />
                )}
                {stage.status === 'pending' && stage.icon === 'message' && (
                  <MessageIcon className="w-3 h-3 fill-gray-400" />
                )}
              </div>

              {/* Stage Label */}
              <span
                className={`text-xs ${
                  stage.status === 'done'
                    ? 'text-gray-900'
                    : stage.status === 'active'
                    ? 'text-[#5B5FC7] font-medium'
                    : 'text-gray-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
