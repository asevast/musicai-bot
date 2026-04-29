import { Controller, Get, Post, Body, Param, Inject, Headers } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { YuKassaService } from './yukassa.service';
import { StripeService } from './stripe.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    @Inject(YuKassaService) private readonly yukassaService: YuKassaService,
    @Inject(StripeService) private readonly stripeService: StripeService
  ) {}

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
    }
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
    }
  ) {
    return this.paymentsService.handleTelegramStarsPayment(
      body.userId,
      body.packageId,
      body.telegramPaymentId
    );
  }

  /**
   * Create YuKassa payment
   * POST /payments/yukassa
   */
  @Post('yukassa')
  async createYuKassaPayment(
    @Body()
    body: {
      userId: string;
      packageId: string;
      returnUrl: string;
      receiptEmail?: string;
    }
  ) {
    const pkg = this.paymentsService.getPackage(body.packageId);
    if (!pkg) {
      return { error: 'Invalid package' };
    }

    if (!this.yukassaService.isConfigured()) {
      return { error: 'YuKassa not configured' };
    }

    try {
      const result = await this.yukassaService.createPayment(
        pkg.price,
        pkg.currency,
        pkg.name,
        body.userId,
        body.packageId,
        body.returnUrl,
        body.receiptEmail
      );
      return result;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Payment creation failed' };
    }
  }

  /**
   * Check YuKassa payment status
   * GET /payments/yukassa/:paymentId
   */
  @Get('yukassa/:paymentId')
  async getYuKassaStatus(@Param('paymentId') paymentId: string) {
    try {
      const payment = await this.yukassaService.getPaymentStatus(paymentId);
      return {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to get status' };
    }
  }

  /**
   * Create Stripe PaymentIntent
   * POST /payments/stripe/intent
   */
  @Post('stripe/intent')
  async createStripeIntent(
    @Body()
    body: {
      userId: string;
      packageId: string;
      receiptEmail?: string;
    }
  ) {
    const pkg = this.paymentsService.getPackage(body.packageId);
    if (!pkg) {
      return { error: 'Invalid package' };
    }

    if (!this.stripeService.isConfigured()) {
      return { error: 'Stripe not configured' };
    }

    try {
      const result = await this.stripeService.createPaymentIntent(
        pkg.price,
        pkg.currency,
        pkg.name,
        body.userId,
        body.packageId,
        body.receiptEmail
      );
      return result;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Payment creation failed' };
    }
  }

  /**
   * Create Stripe Checkout Session
   * POST /payments/stripe/checkout
   */
  @Post('stripe/checkout')
  async createStripeCheckout(
    @Body()
    body: {
      userId: string;
      packageId: string;
      successUrl: string;
      cancelUrl: string;
    }
  ) {
    const pkg = this.paymentsService.getPackage(body.packageId);
    if (!pkg) {
      return { error: 'Invalid package' };
    }

    if (!this.stripeService.isConfigured()) {
      return { error: 'Stripe not configured' };
    }

    try {
      const result = await this.stripeService.createCheckoutSession(
        pkg.price,
        pkg.currency,
        pkg.name,
        body.userId,
        body.packageId,
        body.successUrl,
        body.cancelUrl
      );
      return result;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Session creation failed' };
    }
  }

  /**
   * Get Stripe session status
   * GET /payments/stripe/session/:sessionId
   */
  @Get('stripe/session/:sessionId')
  async getStripeSession(@Param('sessionId') sessionId: string) {
    try {
      const session = await this.stripeService.getCheckoutSession(sessionId);
      return {
        id: session.id,
        status: session.status,
        payment_intent: session.payment_intent,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to get session' };
    }
  }
}
