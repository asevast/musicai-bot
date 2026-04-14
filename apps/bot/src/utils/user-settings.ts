import type { Intensity, LyriaModel } from '@musicai/shared-types';

export type NotificationMode = 'all' | 'important' | 'off';

export interface UserSettings {
  language?: string;
  intensity?: Intensity;
  notifications?: NotificationMode;
  model?: LyriaModel;
}

const VALID_LANGUAGES = new Set(['en', 'de', 'es', 'fr', 'hi', 'ja', 'ko', 'pt']);
const VALID_INTENSITIES = new Set(['low', 'medium', 'high', 'epic']);
const VALID_NOTIFICATIONS = new Set(['all', 'important', 'off']);
const VALID_MODELS = new Set(['lyria-3-pro-preview', 'lyria-3-clip-preview']);

export function parseUserSettings(value: unknown): UserSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const settings: UserSettings = {};

  if (typeof source.language === 'string' && VALID_LANGUAGES.has(source.language)) {
    settings.language = source.language;
  }

  if (typeof source.intensity === 'string' && VALID_INTENSITIES.has(source.intensity)) {
    settings.intensity = source.intensity as Intensity;
  }

  if (
    typeof source.notifications === 'string' &&
    VALID_NOTIFICATIONS.has(source.notifications)
  ) {
    settings.notifications = source.notifications as NotificationMode;
  }

  if (typeof source.model === 'string' && VALID_MODELS.has(source.model)) {
    settings.model = source.model as LyriaModel;
  }

  return settings;
}

export function formatLanguage(value?: string): string {
  const labels: Record<string, string> = {
    en: 'English',
    de: 'German',
    es: 'Spanish',
    fr: 'French',
    hi: 'Hindi',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese',
  };

  return value ? labels[value] ?? value.toUpperCase() : 'Not set';
}

export function formatIntensity(value?: Intensity): string {
  const labels: Record<NonNullable<Intensity>, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    epic: 'Epic',
  };

  return value ? labels[value] : 'Not set';
}

export function formatNotifications(value?: NotificationMode): string {
  const labels: Record<NotificationMode, string> = {
    all: 'All',
    important: 'Important only',
    off: 'Off',
  };

  return value ? labels[value] : 'Not set';
}

export function formatModel(value?: LyriaModel): string {
  const labels: Record<LyriaModel, string> = {
    'lyria-3-clip-preview': 'Clip',
    'lyria-3-pro-preview': 'Pro',
  };

  return value ? labels[value] : 'Not set';
}

export function buildSettingsSummary(settings: UserSettings): string {
  return (
    `🌐 Language: ${formatLanguage(settings.language)}\n` +
    `🎚️ Intensity: ${formatIntensity(settings.intensity)}\n` +
    `🔔 Notifications: ${formatNotifications(settings.notifications)}\n` +
    `🎭 Model: ${formatModel(settings.model)}`
  );
}
