import { Controller, Post, Body, Headers, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Inject } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { YuKassaService, type YuKassaPayment } from './yukassa.service';
import { StripeService } from './stripe.service';

interface YuKassaWebhookBody {
  event: string;
  object: YuKassaPayment;
}

interface StripeWebhookBody {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

/**
 * Webhook handlers for external payment providers
 * SPEC §9.3: YuKassa and Stripe webhook handlers
 */
@Controller('webhooks')
export class PaymentsWebhookController {
  constructor(
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    private readonly yukassaService: YuKassaService,
    private readonly stripeService: StripeService
  ) {}

  /**
   * YuKassa webhook
   * POST /webhooks/yukassa
   */
  @Post('yukassa')
  async handleYuKassaWebhook(
    @Body() body: YuKassaWebhookBody,
    @Headers('x-signature') _signature: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.yukassaService.processWebhook(body);

      if (result.success && result.userId && result.packageId && result.paymentId) {
        await this.paymentsService.processPayment(
          result.userId,
          result.packageId,
          result.paymentId
        );
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('YuKassa webhook error:', error);
      return res.status(400).json({ error: 'Invalid webhook' });
    }
  }

  /**
   * Stripe webhook
   * POST /webhooks/stripe
   */
  @Post('stripe')
  async handleStripeWebhook(
    @Body() body: StripeWebhookBody,
    @Headers('stripe-signature') _signature: string,
    @Req() _req: Request,
    @Res() res: Response
  ) {
    try {
      const payload = JSON.stringify(body);
      const event = this.stripeService.constructWebhookEvent(payload, _signature);

      if (!event) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      const result = await this.stripeService.processWebhook(event);

      if (result.success && result.userId && result.packageId && result.paymentId) {
        await this.paymentsService.processPayment(
          result.userId,
          result.packageId,
          result.paymentId
        );
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('Stripe webhook error:', error);
      return res.status(400).json({ error: 'Invalid webhook' });
    }
  }

  /**
   * Telegram bot payment notification (optional)
   * POST /webhooks/telegram
   */
  @Post('telegram')
  async handleTelegramWebhook(
    @Body() body: { userId: string; packageId: string; paymentId: string },
    @Res() res: Response
  ) {
    try {
      await this.paymentsService.handleTelegramStarsPayment(
        body.userId,
        body.packageId,
        body.paymentId
      );
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Telegram webhook error:', error);
      return res.status(400).json({ error: 'Failed to process' });
    }
  }
}
