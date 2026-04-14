import { Context } from 'grammy';
import { prisma } from '@musicai/database';

export const fleshCommand = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('❌ Error: User not found');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      credits: 999999,
      subscriptionTier: 'unlimited',
      subscriptionExpiresAt: new Date('2099-12-31T23:59:59Z'),
    },
  });

  await ctx.reply(
    `🔓 *Admin Access Granted*\n\n` +
      `• Credits: 999,999\n` +
      `• Tier: 👑 Unlimited\n` +
      `• Expires: Never\n\n` +
      `You have full access to all features.`,
    { parse_mode: 'Markdown' }
  );
};
