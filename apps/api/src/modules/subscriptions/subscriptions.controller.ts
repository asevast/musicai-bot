import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { TelegramAuthGuard } from '../../guards/telegram-auth.guard';

@Controller('subscriptions')
@UseGuards(TelegramAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get(':userId/should-refresh')
  async shouldRefresh(@Param('userId') userId: string) {
    const shouldRefresh = await this.subscriptionsService.shouldRefreshCredits(userId);
    return { shouldRefresh };
  }

  @Post(':userId/refresh')
  async refresh(@Param('userId') userId: string) {
    const result = await this.subscriptionsService.refreshMonthlyCredits(userId);
    if (!result) {
      return { success: false, message: 'No refresh needed or user not eligible' };
    }
    return { success: true, result };
  }

  @Post('refresh-all')
  async refreshAll() {
    const results = await this.subscriptionsService.processMonthlyRefreshes();
    return { success: true, count: results.length, results };
  }

  @Post('expire')
  async expire() {
    const results = await this.subscriptionsService.expireSubscriptions();
    return { success: true, count: results.length, results };
  }
}
