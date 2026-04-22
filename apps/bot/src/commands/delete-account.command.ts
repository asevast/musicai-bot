import { Context, InlineKeyboard } from 'grammy';
import { prisma } from '@musicai/database';

export const deleteAccountCommand = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('Error: User not found');
  }

  const keyboard = new InlineKeyboard()
    .text('⚠️ Yes, Delete My Account', 'confirm_delete')
    .row()
    .text('❌ Cancel', 'cancel_delete');

  await ctx.reply(
    '⚠️ *Delete Account*\n\n' +
      'This action is **irreversible**. All your data will be permanently deleted:\n\n' +
      '• Your profile information\n' +
      '• All generated tracks\n' +
      '• Credit history\n' +
      '• Settings\n\n' +
      'Are you sure you want to proceed?',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  );
};

export const confirmDeleteAccount = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('Error: User not found');
  }

  await prisma.$transaction([
    prisma.creditTransaction.deleteMany({ where: { userId: user.id } }),
    prisma.synthJob.deleteMany({
      where: { track: { userId: user.id } },
    }),
    prisma.track.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  await ctx.reply(
    '✅ *Account Deleted*\n\n' +
      'All your data has been permanently deleted.\n\n' +
      'Thank you for using MusicAI Bot. May the Force be with you! 🌟',
    { parse_mode: 'Markdown' }
  );
};
