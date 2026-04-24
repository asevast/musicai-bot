import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { prisma } from '@musicai/database';
import { validate, parse } from '@telegram-apps/init-data-node';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const initDataRaw = request.headers['x-telegram-init-data'] as string;
    const telegramIdHeader = request.headers['x-telegram-id'] as string;

    // Reject if both authentication methods are present (security: prevent auth confusion)
    if (initDataRaw && telegramIdHeader) {
      throw new UnauthorizedException(
        'Cannot use both init data and telegram ID headers simultaneously'
      );
    }

    // Try X-Telegram-Init-Data header first (Mini App authentication)
    if (initDataRaw) {
      const botToken = process.env.BOT_TOKEN;
      if (!botToken) {
        throw new UnauthorizedException('BOT_TOKEN not configured');
      }

      try {
        // Validate init data signature
        validate(initDataRaw, botToken);

        // Parse init data to extract user info
        const initData = parse(initDataRaw);
        const telegramId = initData.user?.id;

        if (!telegramId) {
          throw new UnauthorizedException('Invalid init data: user not found');
        }

        const user = await prisma.user.findUnique({
          where: { telegramId: BigInt(telegramId) },
        });

        if (!user) {
          throw new UnauthorizedException('User not found');
        }

        request.user = user;
        return true;
      } catch (error) {
        throw new UnauthorizedException(
          error instanceof Error ? error.message : 'Invalid init data'
        );
      }
    }

    // Fall back to X-Telegram-Id header (existing bot->API authentication)
    const telegramId = request.headers['x-telegram-id'] as string;

    if (!telegramId) {
      throw new UnauthorizedException('Telegram ID or init data is required');
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
