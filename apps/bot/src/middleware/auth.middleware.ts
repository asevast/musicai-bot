import { MiddlewareFn } from 'grammy';
import { prisma } from '@musicai/database';

export const authMiddleware: MiddlewareFn = async (ctx, next) => {
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
};
