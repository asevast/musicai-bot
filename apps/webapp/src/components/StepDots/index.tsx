import React from 'react';

interface StepDotsProps {
  currentStep: number;
  totalSteps?: number;
}

export function StepDots({ currentStep, totalSteps = 4 }: StepDotsProps): React.ReactElement {
  return (
    <div className="flex gap-1.5 justify-center mb-4">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isDone = step < currentStep;

        return (
          <div
            key={step}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              isActive
                ? 'w-4 bg-[#5B5FC7]'
                : isDone
                ? 'w-1.5 bg-[#5B5FC7]'
                : 'w-1.5 bg-gray-200'
            }`}
          />
        );
      })}
    </div>
  );
}
