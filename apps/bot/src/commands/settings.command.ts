import { Context, InlineKeyboard } from 'grammy';
import { prisma } from '@musicai/database';

export const settingsCommand = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('Error: User not found');
  }

  const settings = user.defaultSettings as Record<string, unknown>;

  const keyboard = new InlineKeyboard()
    .text('🎵 Default Genre', 'set_genre')
    .row()
    .text('🌍 Default Language', 'set_language')
    .row()
    .text('🎚️ Default Intensity', 'set_intensity')
    .row()
    .text('🎯 Default BPM', 'set_bpm')
    .row()
    .text('🔙 Back to Menu', 'main_menu');

  await ctx.reply(
    `⚙️ *Settings*\n\n` +
      `Current defaults:\n` +
      `• Genre: ${settings.genre ?? 'Not set'}\n` +
      `• Language: ${settings.language ?? 'Not set'}\n` +
      `• Intensity: ${settings.intensity ?? 'Not set'}\n` +
      `• BPM: ${settings.bpm ?? 'Auto'}\n\n` +
      `Select an option to change:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  );
};
