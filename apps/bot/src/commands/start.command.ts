import { Context } from 'grammy';
import { loadEnv } from '@musicai/config';
import { mainMenuKeyboard } from '../keyboards/main-menu.keyboard';

export const startCommand = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('Error: User not found');
  }

  const tierEmoji = {
    free: '🌟',
    pro: '💎',
    unlimited: '👑',
  }[user.subscriptionTier];

  await ctx.reply(
    `🎵 *Welcome to MusicAI Bot!*\n\n` +
      `👤 *Your Profile:*\n` +
      `• Credits: ${user.credits}\n` +
      `${tierEmoji} Tier: ${user.subscriptionTier}\n\n` +
      `📝 *Commands:*\n` +
      `/create - Create a new track\n` +
      `/history - View your track history\n` +
      `/library - Browse community tracks\n` +
      `/profile - View your profile\n` +
      `/settings - Configure defaults\n` +
      `/buy - Buy credits\n\n` +
      `May the Force be with you! 🌟`,
    {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard(loadEnv().WEBAPP_URL || 'https://app.musicai.bot'),
    }
  );
};
