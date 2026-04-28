/**
 * i18n Middleware
 * SPEC §5, §6: Adds i18n support to bot context
 * Middleware chain: auth → rateLimit → session → i18n
 */

import type { Context, NextFunction } from 'grammy';
import { getLocale, translate, type SupportedLocale, isSupportedLocale } from '../i18n';
import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';

/**
 * i18n middleware that adds translation helper to context
 */
export function i18nMiddleware() {
  return async (ctx: BotContext, next: NextFunction) => {
    // Add t() helper to context for translations
    (ctx as any).t = (key: string, params?: Record<string, string | number>) => {
      return translate(ctx, key, params);
    };

    // Add getLocale() helper
    (ctx as any).getLocale = () => getLocale(ctx);

    return next();
  };
}

/**
 * Language command handler
 * Allows users to set their preferred language
 */
export async function languageCommand(ctx: BotContext): Promise<void> {
  const user = ctx.user;
  if (!user) {
    await ctx.reply('❌ Error: User not found');
    return;
  }

  const keyboard = new InlineKeyboard()
    .text('🇺🇸 English', 'set_locale_en')
    .text('🇷🇺 Русский', 'set_locale_ru')
    .row()
    .text('⬅️ Back', 'main_menu');

  await ctx.reply(
    '🌐 *Select Language / Выбор Языка*\n\n' +
    'Choose your preferred language:\n' +
    'Выберите предпочитаемый язык:',
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

/**
 * Handle language selection callback
 */
export async function handleLocaleCallback(ctx: BotContext, locale: string): Promise<void> {
  if (!isSupportedLocale(locale)) {
    await ctx.answerCallbackQuery('❌ Invalid language');
    return;
  }

  const session = (ctx as any).session;
  if (session) {
    session.locale = locale;
  }

  const localeNames: Record<SupportedLocale, string> = {
    en: 'English',
    ru: 'Русский',
  };

  await ctx.answerCallbackQuery(`✅ Language set to ${localeNames[locale]}`);

  const messages: Record<SupportedLocale, string> = {
    en: '✅ Language set to English',
    ru: '✅ Язык изменен на Русский',
  };

  await ctx.editMessageText(messages[locale], {
    reply_markup: new InlineKeyboard().text('⬅️ Back', 'main_menu'),
  });
}
