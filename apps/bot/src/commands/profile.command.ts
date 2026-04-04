import { Context } from 'grammy';
import { prisma } from '@musicai/database';

export const profileCommand = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('Error: User not found');
  }

  const totalTracks = await prisma.track.count({ where: { userId: user.id } });
  const doneTracks = await prisma.track.count({
    where: { userId: user.id, status: 'done' },
  });
  const totalCreditsSpent = await prisma.track.aggregate({
    where: { userId: user.id, status: 'done' },
    _sum: { creditsCharged: true },
  });

  const tierEmoji = {
    free: '🌟',
    pro: '💎',
    unlimited: '👑',
  }[user.subscriptionTier];

  await ctx.reply(
    `👤 *Profile*\n\n` +
      `🆔 ID: \`${user.id.slice(0, 8)}...\`\n` +
      `💰 Credits: ${user.credits}\n` +
      `${tierEmoji} Tier: ${user.subscriptionTier}\n\n` +
      `📊 *Stats:*\n` +
      `• Total tracks: ${totalTracks}\n` +
      `• Completed: ${doneTracks}\n` +
      `• Credits spent: ${totalCreditsSpent._sum.creditsCharged ?? 0}\n\n` +
      `Use /buy to get more credits!`,
    { parse_mode: 'Markdown' },
  );
};
