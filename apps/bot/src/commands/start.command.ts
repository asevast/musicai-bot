import { Context } from 'grammy';

export const startCommand = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('Error: User not found');
  }

  await ctx.reply(
    `🎵 *Welcome to MusicAI Bot!*\n\n` +
      `👤 *Your Profile:*\n` +
      `• Credits: ${user.credits}\n` +
      `• Tier: ${user.subscriptionTier}\n\n` +
      `📝 *Commands:*\n` +
      `/create - Create a new track\n` +
      `/history - View your track history\n` +
      `/profile - View your profile\n` +
      `/buy - Buy credits\n\n` +
      `May the Force be with you! 🌟`,
    { parse_mode: 'Markdown' }
  );
};
