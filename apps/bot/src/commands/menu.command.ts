import { Context } from 'grammy';
import { loadEnv } from '@musicai/config';
import { mainMenuKeyboard } from '../keyboards/main-menu.keyboard';

export const menuCommand = async (ctx: Context) => {
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
    `🎵 *MusicAI Bot — Main Menu*\n\n` +
      `👤 ${user.username || user.firstName} | ${tierEmoji} ${user.subscriptionTier}\n` +
      `💰 Credits: \`${user.credits}\`\n\n` +
      `Select an option below:`,
    {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard(loadEnv().WEBAPP_URL || 'https://app.musicai.bot'),
    }
  );
};
