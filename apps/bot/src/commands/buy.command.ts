import { Context, InlineKeyboard } from 'grammy';

export const buyCommand = async (ctx: Context) => {
  const keyboard = new InlineKeyboard()
    .text('🌟 Pack S - 20 cr (79₽)', 'buy_pack_s')
    .row()
    .text('💎 Pack M - 100 cr (299₽)', 'buy_pack_m')
    .row()
    .text('👑 Pack L - 300 cr (699₽)', 'buy_pack_l')
    .row()
    .text('📅 Pro - 150 cr/mo (299₽)', 'buy_pro')
    .row()
    .text('👑 Unlimited - ∞ cr/mo (799₽)', 'buy_unlimited');

  await ctx.reply(
    '💎 *Buy Credits*\n\n' +
      '*Credit Packs (no expiry):*\n' +
      '• Pack S: 20 credits - 79₽\n' +
      '• Pack M: 100 credits - 299₽\n' +
      '• Pack L: 300 credits - 699₽\n\n' +
      '*Subscriptions:*\n' +
      '• Pro: 150 credits/month - 299₽\n' +
      '• Unlimited: 50 tracks/day - 799₽\n\n' +
      'Select a package:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  );
};
