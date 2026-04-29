import { Context } from 'grammy';
import { loadEnv } from '@musicai/config';
import { prisma } from '@musicai/database';
import { mainMenuKeyboard } from '../keyboards/main-menu.keyboard';

const REFERRAL_BONUS_CREDITS = 5;

export const startCommand = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('Error: User not found');
  }

  // Parse deep link referral parameter: /start ref=<userId>
  const startPayload = ctx.message?.text?.split(' ')[1];
  if (startPayload && startPayload.startsWith('ref=')) {
    const referrerId = startPayload.replace('ref=', '');

    // Validate referrer exists and is not the same user
    if (referrerId !== user.id) {
      const referrer = await prisma.user.findUnique({
        where: { id: referrerId },
      });

      if (referrer && !user.referredById) {
        // Set referral relationship
        await prisma.user.update({
          where: { id: user.id },
          data: { referredById: referrerId },
        });

        // Award bonus credits to invitee (new user)
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: REFERRAL_BONUS_CREDITS } },
        });

        // Create transaction record for bonus
        await prisma.creditTransaction.create({
          data: {
            userId: user.id,
            amount: REFERRAL_BONUS_CREDITS,
            type: 'bonus',
            description: `Referral bonus for using invite link from ${referrer.username || referrer.firstName || 'user'}`,
          },
        });

        // Notify new user about bonus
        await ctx.reply(
          `🎁 *Welcome Bonus!*

` + `You received +${REFERRAL_BONUS_CREDITS} bonus credits for joining via a referral link!`,
          { parse_mode: 'Markdown' }
        );
      }
    }
  }

  const tierEmoji = {
    free: '🌟',
    pro: '💎',
    unlimited: '👑',
  }[user.subscriptionTier];

  const webAppUrl = loadEnv().WEBAPP_URL || 'https://app.musicai.bot';
  console.log('[startCommand] WEBAPP_URL:', webAppUrl);

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
      reply_markup: mainMenuKeyboard(webAppUrl),
    }
  );
};
