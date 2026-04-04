import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CreditsService } from './credits.service';

@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('user/:userId')
  async getUserCredits(@Param('userId') userId: string) {
    return { credits: await this.creditsService.getUserCredits(userId) };
  }

  @Post('add')
  async addCredits(
    @Body()
    body: {
      userId: string;
      amount: number;
      type: 'earn' | 'buy' | 'bonus' | 'refund';
      description: string;
      paymentId?: string;
      trackId?: string;
    },
  ) {
    await this.creditsService.addCredits(
      body.userId,
      body.amount,
      body.type,
      body.description,
      body.paymentId,
      body.trackId,
    );
    return { success: true };
  }

  @Get('history/:userId')
  async getTransactionHistory(
    @Param('userId') userId: string,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return this.creditsService.getTransactionHistory(
      userId,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }
}
