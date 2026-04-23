import type { ChangeEvent, TextareaHTMLAttributes } from 'react';

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  showCharCount?: boolean;
}

export function Textarea({
  value,
  onChange,
  maxLength,
  placeholder,
  showCharCount = false,
  className = '',
  ...props
}: TextareaProps) {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  return (
    <div className="w-full">
      <textarea
        value={value}
        onChange={handleChange}
        maxLength={maxLength}
        placeholder={placeholder}
        className={[
          'w-full min-h-[120px] p-3',
          'border border-gray-300 rounded-lg',
          'focus:border-primary focus:ring-1 focus:ring-primary',
          'focus:outline-none resize-vertical',
          'text-gray-900 placeholder:text-gray-400',
          className,
        ].join(' ')}
        {...props}
      />
      {showCharCount && (
        <div className="flex justify-end mt-1">
          <span className="text-sm text-gray-500">
            {value.length} / {maxLength}
          </span>
        </div>
      )}
    </div>
  );
}
