import { Bot, Context, session } from 'grammy';
import { conversations } from '@grammyjs/conversations';
import { loadEnv } from '@musicai/config';
import { prisma } from '@musicai/database';
import { startCommand } from './commands/start.command';
import { createCommand, createTrackScene } from './commands/create.command';
import { historyCommand } from './commands/history.command';
import { profileCommand } from './commands/profile.command';
import { buyCommand } from './commands/buy.command';
import { settingsCommand } from './commands/settings.command';
import { deleteAccountCommand, confirmDeleteAccount } from './commands/delete-account.command';
import { libraryCommand } from './commands/library.command';
import { mainMenuKeyboard } from './keyboards/main-menu.keyboard';

export type BotContext = Context;

export function setupBot(bot: Bot<BotContext>) {
  bot.use(
    session({
      initial: () => ({}),
    })
  );

  bot.use(conversations());

  bot.use(async (ctx, next) => {
    const telegramId = BigInt(ctx.from?.id ?? 0);
    if (telegramId === 0n) return next();

    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          username: ctx.from?.username,
          firstName: ctx.from?.first_name,
          credits: 10,
        },
      });
    }

    ctx.user = user;
    return next();
  });

  bot.use(createTrackScene);

  bot.command('start', startCommand);
  bot.command('create', createCommand);
  bot.command('history', historyCommand);
  bot.command('profile', profileCommand);
  bot.command('buy', buyCommand);
  bot.command('settings', settingsCommand);
  bot.command('library', libraryCommand);
  bot.command('delete_account', deleteAccountCommand);

  bot.callbackQuery('create_track', async (ctx) => {
    await (ctx as any).conversation?.enter('create-track');
  });

  bot.callbackQuery('history', historyCommand);
  bot.callbackQuery('profile', profileCommand);
  bot.callbackQuery('buy_credits', buyCommand);
  bot.callbackQuery('settings', settingsCommand);
  bot.callbackQuery('library', libraryCommand);

  bot.callbackQuery('confirm_delete', async (ctx) => {
    await ctx.answerCallbackQuery();
    await confirmDeleteAccount(ctx);
  });

  bot.callbackQuery('cancel_delete', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('❌ Account deletion cancelled.');
  });

  bot.callbackQuery('main_menu', async (ctx) => {
    await ctx.editMessageText('🎵 *MusicAI Bot*', {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard(),
    });
  });

  bot.catch((err) => {
    console.error('Bot error:', err);
  });
}

declare module 'grammy' {
  export interface Context {
    user?: {
      id: string;
      telegramId: bigint;
      username: string | null;
      firstName: string | null;
      credits: number;
      subscriptionTier: string;
    };
  }
}
