import { Context, InlineKeyboard } from 'grammy';
import { prisma } from '@musicai/database';

export const settingsCommand = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('Error: User not found');
  }

  const keyboard = new InlineKeyboard()
    .text('🎵 Default Genre', 'set_genre')
    .row()
    .text('🌍 Default Language', 'set_language')
    .row()
    .text('🎚️ Default Intensity', 'set_intensity')
    .row()
    .text('🎯 Default BPM', 'set_bpm')
    .row()
    .text('🔙 Main Menu', 'main_menu');

  await ctx.reply('⚙️ *Settings*\n\nSelect an option:', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
};
