import { Controller, Post, Body, Headers, Req, Res, ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Inject } from '@nestjs/common';
import { loadEnv } from '@musicai/config';
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

/** YuKassa IP ranges for webhook verification */
const YUKASSA_IP_RANGES = [
  { prefix: '185.71.76.0', mask: 27 },
  { prefix: '185.71.77.0', mask: 27 },
];

function isIpInCidr(ip: string, prefix: string, mask: number): boolean {
  const ipInt = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  const prefixInt = prefix.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  const shift = 32 - mask;
  return ipInt >>> shift === prefixInt >>> shift;
}

function isYuKassaIp(ip: string): boolean {
  return YUKASSA_IP_RANGES.some(({ prefix, mask }) => isIpInCidr(ip, prefix, mask));
}

/**
 * Webhook handlers for external payment providers
 * SPEC §9.3: YuKassa and Stripe webhook handlers
 */
@Controller('webhooks')
export class PaymentsWebhookController {
  private readonly telegramWebhookSecret: string;

  constructor(
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    private readonly yukassaService: YuKassaService,
    private readonly stripeService: StripeService
  ) {
    const env = loadEnv();
    this.telegramWebhookSecret = env.TELEGRAM_WEBHOOK_SECRET || '';
  }

  /**
   * YuKassa webhook
   * POST /webhooks/yukassa
   */
  @Post('yukassa')
  async handleYuKassaWebhook(
    @Body() body: YuKassaWebhookBody,
    @Headers('x-signature') _signature: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      // Verify request originates from YuKassa IP range
      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '';
      if (clientIp && !isYuKassaIp(clientIp.replace('::ffff:', ''))) {
        this.yukassaService.logger.warn(
          `YuKassa webhook rejected: IP ${clientIp} not in allowlist`
        );
        return res.status(403).json({ error: 'IP not allowed' });
      }

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
   * Uses raw body for signature verification (re-stringifying breaks HMAC)
   */
  @Post('stripe')
  async handleStripeWebhook(
    @Body() body: StripeWebhookBody,
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      // Use raw body if available (set by raw-body middleware), otherwise fall back
      const rawBody = (req as Request & { rawBody?: string }).rawBody || JSON.stringify(body);
      const event = this.stripeService.constructWebhookEvent(rawBody, signature);

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
   * Protected by secret token in X-Telegram-Webhook-Secret header
   */
  @Post('telegram')
  async handleTelegramWebhook(
    @Body() body: { userId: string; packageId: string; paymentId: string },
    @Headers('x-telegram-webhook-secret') secret: string,
    @Res() res: Response
  ) {
    try {
      if (this.telegramWebhookSecret && secret !== this.telegramWebhookSecret) {
        return res.status(403).json({ error: 'Invalid webhook secret' });
      }

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
