import type { ChangeEvent } from 'react';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  displayValue?: string;
}

export function Slider({ value, min, max, onChange, label, displayValue }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    onChange(newValue);
  };

  return (
    <div className="w-full">
      {(label || displayValue !== undefined) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {displayValue !== undefined && (
            <span className="text-sm text-gray-600">{displayValue}</span>
          )}
        </div>
      )}
      <div className="relative h-1">
        <div className="absolute inset-0 bg-gray-200 rounded" />
        <div
          className="absolute left-0 top-0 h-full bg-primary rounded"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow pointer-events-none"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
}
