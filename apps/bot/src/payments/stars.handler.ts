import { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';
import { prisma } from '@musicai/database';

interface PaymentPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: 'XTR';
}

const PACKAGES: PaymentPackage[] = [
  { id: 'pack_s', name: 'Pack S', credits: 20, price: 79, currency: 'XTR' },
  { id: 'pack_m', name: 'Pack M', credits: 100, price: 299, currency: 'XTR' },
  { id: 'pack_l', name: 'Pack L', credits: 300, price: 699, currency: 'XTR' },
  { id: 'pro', name: 'Pro', credits: 150, price: 299, currency: 'XTR' },
  { id: 'unlimited', name: 'Unlimited', credits: 0, price: 799, currency: 'XTR' },
];

export const buildPaymentInvoice = async (
  ctx: BotContext,
  userId: string,
  packageId: string
): Promise<void> => {
  const pkg = PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    await ctx.reply('❌ Invalid package selected.');
    return;
  }

  const isSubscription = pkg.id === 'pro' || pkg.id === 'unlimited';

  await ctx.api.sendInvoice(
    ctx.chat!.id,
    isSubscription ? `${pkg.name} Subscription` : `${pkg.name} — ${pkg.credits} credits`,
    isSubscription
      ? `${pkg.name}: ${pkg.id === 'pro' ? '150 credits/month + priority queue' : 'Unlimited tracks (50/day)'}`
      : `${pkg.credits} credits for MusicAI track generation. Credits do not expire for 1 year.`,
    JSON.stringify({ type: 'credits', packageId, userId }),
    'XTR',
    [{ label: pkg.name, amount: pkg.price }],
    { provider_token: '' }
  );
};

export const handleSuccessfulPayment = async (ctx: BotContext): Promise<void> => {
  const user = ctx.user;
  if (!user) {
    await ctx.reply('❌ Error: User not found.');
    return;
  }

  try {
    const successfulPayment = ctx.message?.successful_payment;
    if (!successfulPayment) {
      await ctx.reply('❌ No payment data found.');
      return;
    }

    const payload = JSON.parse(successfulPayment.invoice_payload ?? '{}');
    const { packageId, userId } = payload;

    if (!packageId || userId !== user.id) {
      await ctx.reply('❌ Invalid payment data.');
      return;
    }

    const pkg = PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      await ctx.reply('❌ Invalid package.');
      return;
    }

    const telegramPaymentId = successfulPayment.telegram_payment_charge_id;

    if (pkg.id === 'unlimited') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionTier: 'unlimited',
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: 0,
          type: 'buy',
          description: `Unlimited subscription purchased`,
          paymentId: telegramPaymentId,
        },
      });

      await ctx.reply(
        '👑 *Unlimited Subscription Activated!*\n\n' +
          'You now have unlimited track generation (50 tracks/day).\n' +
          'Subscription valid for 30 days.',
        { parse_mode: 'Markdown' }
      );
    } else if (pkg.id === 'pro') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionTier: 'pro',
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: pkg.credits } },
        }),
        prisma.creditTransaction.create({
          data: {
            userId: user.id,
            amount: pkg.credits,
            type: 'buy',
            description: `Pro subscription + ${pkg.credits} credits`,
            paymentId: telegramPaymentId,
          },
        }),
      ]);

      await ctx.reply(
        `💎 *Pro Subscription Activated!*\n\n` +
          `• ${pkg.credits} credits added\n` +
          `• Priority queue access\n` +
          `• Up to 20 tracks/day\n` +
          `• Valid for 30 days\n\n` +
          `Your balance: ${user.credits + pkg.credits} credits`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: pkg.credits } },
        }),
        prisma.creditTransaction.create({
          data: {
            userId: user.id,
            amount: pkg.credits,
            type: 'buy',
            description: `Credit pack: ${pkg.name} (${pkg.credits} credits)`,
            paymentId: telegramPaymentId,
          },
        }),
      ]);

      await ctx.reply(
        `✅ *Payment Successful!*\n\n` +
          `${pkg.credits} credits added to your balance.\n\n` +
          `Your new balance: ${user.credits + pkg.credits} credits`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (err) {
    console.error('Payment processing error:', err);
    await ctx.reply(
      '❌ Error processing payment. Please contact support if credits were not added.'
    );
  }
};

export const paymentKeyboard = (): InlineKeyboard => {
  return new InlineKeyboard()
    .text('🌟 Pack S — 20 cr (79⭐)', 'buy_pack_s')
    .row()
    .text('💎 Pack M — 100 cr (299⭐)', 'buy_pack_m')
    .row()
    .text('👑 Pack L — 300 cr (699⭐)', 'buy_pack_l')
    .row()
    .text('📅 Pro — 150 cr/mo (299⭐)', 'buy_pro')
    .row()
    .text('👑 Unlimited — ∞ (799⭐)', 'buy_unlimited')
    .row()
    .text('🔙 Back to Menu', 'main_menu');
};
