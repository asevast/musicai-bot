/**
 * i18n Module - Internationalization support for MusicAI Bot
 * SPEC §5, §6: i18n middleware implementation
 */

import type { Context } from 'grammy';
import enRaw from './locales/en.json';
import ruRaw from './locales/ru.json';

export type SupportedLocale = 'en' | 'ru';

interface Translations {
  [key: string]: string;
}

const en: Translations = enRaw as Translations;
const ru: Translations = ruRaw as Translations;

const locales: Record<SupportedLocale, Translations> = {
  en,
  ru,
};

const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * Get user's locale from context
 * Falls back to 'en' if not set
 */
export function getLocale(ctx: Context): SupportedLocale {
  const session = (ctx as any).session;
  const locale = session?.locale;
  if (locale && locale in locales) {
    return locale as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Set user's locale in session
 */
export function setLocale(ctx: Context, locale: SupportedLocale): void {
  const session = (ctx as any).session;
  if (session) {
    session.locale = locale;
  }
}

/**
 * Interpolate template string with values
 * Replaces {key} with corresponding value from params
 */
function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get translated string for the given key
 * Falls back to English if translation not found
 */
export function t(
  locale: SupportedLocale,
  key: string,
  params: Record<string, string | number> = {}
): string {
  const template = locales[locale]?.[key] ?? locales[DEFAULT_LOCALE]?.[key] ?? key;
  return interpolate(template, params);
}

/**
 * Translation helper bound to context
 * Usage: ctx.t('key', { param: 'value' })
 */
export function translate(
  ctx: Context,
  key: string,
  params?: Record<string, string | number>
): string {
  const locale = getLocale(ctx);
  return t(locale, key, params);
}

/**
 * Get all supported locales
 */
export function getSupportedLocales(): { code: SupportedLocale; name: string; flag: string }[] {
  return [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ];
}

/**
 * Check if locale is supported
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return locale in locales;
}
