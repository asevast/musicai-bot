import { Bot, Context } from 'grammy';
import { loadEnv } from '@musicai/config';
import { prisma } from '@musicai/database';
import { startCommand } from './commands/start.command';

export type BotContext = Context;

export function setupBot(bot: Bot<BotContext>) {
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

  bot.command('start', startCommand);

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
