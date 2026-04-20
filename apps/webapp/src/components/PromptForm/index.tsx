import { useState } from 'react';
import {
  Input,
  Select,
  Textarea,
  Caption,
  Button,
} from '@telegram-apps/telegram-ui';
import type { TrackType, Intensity } from '@musicai/shared-types';

const TRACK_TYPES: { value: TrackType; label: string }[] = [
  { value: 'full_song', label: 'Full Song (up to 3 min)' },
  { value: 'clip', label: 'Clip (30 sec)' },
  { value: 'instrumental', label: 'Instrumental' },
];

const LANGUAGES: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'pt', label: 'Portuguese' },
];

const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'epic', label: 'Epic' },
];

interface PromptFormData {
  prompt: string;
  type: TrackType;
  language: string;
  lyrics: string;
  bpm: number;
  intensity: Intensity;
}

interface PromptFormProps {
  onSubmit: (data: PromptFormData) => void;
  isSubmitting: boolean;
}

export function PromptForm({ onSubmit, isSubmitting }: PromptFormProps): JSX.Element {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<TrackType>('full_song');
  const [language, setLanguage] = useState('en');
  const [lyrics, setLyrics] = useState('');
  const [bpm, setBpm] = useState(120);
  const [intensity, setIntensity] = useState<Intensity>('medium');
  const [promptError, setPromptError] = useState('');

  const handleSubmit = (): void => {
    if (prompt.length < 10) {
      setPromptError('Prompt must be at least 10 characters');
      return;
    }
    if (prompt.length > 1000) {
      setPromptError('Prompt must be at most 1000 characters');
      return;
    }
    if (lyrics.length > 2000) {
      setPromptError('Lyrics must be at most 2000 characters');
      return;
    }
    if (bpm < 60 || bpm > 200) {
      setPromptError('BPM must be between 60 and 200');
      return;
    }

    setPromptError('');
    onSubmit({
      prompt,
      type,
      language,
      lyrics: lyrics.trim() || undefined,
      bpm,
      intensity,
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <Textarea
          placeholder="Describe the music you want to create..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />
        <div className="flex justify-between mt-1">
          <Caption className="text-gray-500">
            {prompt.length}/1000
          </Caption>
          {promptError && (
            <Caption className="text-red-500">{promptError}</Caption>
          )}
        </div>
      </div>

      <div>
        <Caption className="text-gray-500 mb-1">Track Type</Caption>
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as TrackType)}
        >
          {TRACK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Caption className="text-gray-500 mb-1">Language</Caption>
        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Caption className="text-gray-500 mb-1">Lyrics (optional)</Caption>
        <Textarea
          placeholder="Enter custom lyrics or leave empty for AI-generated lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          rows={4}
        />
        <Caption className="text-gray-500 mt-1">{lyrics.length}/2000</Caption>
      </div>

      <div>
        <Caption className="text-gray-500 mb-1">BPM: {bpm}</Caption>
        <Input
          type="range"
          min={60}
          max={200}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <Caption className="text-gray-500 mb-1">Intensity</Caption>
        <Select
          value={intensity}
          onChange={(e) => setIntensity(e.target.value as Intensity)}
        >
          {INTENSITIES.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </Select>
      </div>

      <Button
        stretched
        mode="primary"
        onClick={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting || prompt.length < 10}
      >
        Create Track
      </Button>
    </div>
  );
}
