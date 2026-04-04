import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { prisma } from '@musicai/database';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const telegramId = request.headers['x-telegram-id'] as string;

    if (!telegramId) {
      throw new UnauthorizedException('Telegram ID is required');
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = user;
    return true;
  }
}

declare module 'express' {
  interface Request {
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
