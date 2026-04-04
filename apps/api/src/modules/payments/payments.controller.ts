import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('packages')
  getPackages() {
    return this.paymentsService.getAllPackages();
  }

  @Get('packages/:id')
  getPackage(@Param('id') id: string) {
    const pkg = this.paymentsService.getPackage(id);
    if (!pkg) {
      return { error: 'Package not found' };
    }
    return pkg;
  }

  @Post('process')
  async processPayment(
    @Body()
    body: {
      userId: string;
      packageId: string;
      paymentId: string;
    },
  ) {
    return this.paymentsService.processPayment(body.userId, body.packageId, body.paymentId);
  }

  @Post('telegram-stars')
  async handleTelegramStarsPayment(
    @Body()
    body: {
      userId: string;
      packageId: string;
      telegramPaymentId: string;
    },
  ) {
    return this.paymentsService.handleTelegramStarsPayment(
      body.userId,
      body.packageId,
      body.telegramPaymentId,
    );
  }
}
