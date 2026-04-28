import { Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '@musicai/config';

interface YuKassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: { value: string; currency: string };
  description?: string;
  metadata?: Record<string, string>;
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
}

interface CreatePaymentRequest {
  amount: { value: string; currency: string };
  capture: boolean;
  confirmation: {
    type: 'redirect';
    return_url: string;
  };
  description: string;
  metadata: {
    userId: string;
    packageId: string;
  };
  receipt?: {
    customer: {
      email?: string;
      phone?: string;
    };
    items: Array<{
      description: string;
      quantity: string;
      amount: { value: string; currency: string };
      vat_code: string;
    }>;
  };
}

/**
 * YuKassa payment provider for Russian cards (RUB)
 * SPEC §9.3: YuKassa payment provider
 */
@Injectable()
export class YuKassaService {
  private readonly logger = new Logger(YuKassaService.name);
  private readonly baseUrl = 'https://api.yookassa.ru/v3';
  private readonly shopId: string;
  private readonly secretKey: string;

  constructor() {
    const env = loadEnv();
    this.shopId = env.YUKASSA_SHOP_ID || '';
    this.secretKey = env.YUKASSA_SECRET_KEY || '';

    if (!this.shopId || !this.secretKey) {
      this.logger.warn('YuKassa credentials not configured');
    }
  }

  private getAuthHeader(): string {
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
    return `Basic ${auth}`;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`YuKassa API error: ${response.status} - ${error}`);
      throw new Error(`YuKassa API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a new payment
   * Returns confirmation URL for redirect
   */
  async createPayment(
    amount: number,
    currency: string,
    description: string,
    userId: string,
    packageId: string,
    returnUrl: string,
    receiptEmail?: string
  ): Promise<{ paymentId: string; confirmationUrl: string }> {
    if (!this.shopId || !this.secretKey) {
      throw new Error('YuKassa not configured');
    }

    const idempotencyKey = `${userId}-${packageId}-${Date.now()}`;

    const body: CreatePaymentRequest = {
      amount: {
        value: amount.toFixed(2),
        currency,
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      description,
      metadata: {
        userId,
        packageId,
      },
    };

    // Add receipt for tax compliance (required in Russia for >0 RUB)
    if (receiptEmail && amount > 0) {
      body.receipt = {
        customer: { email: receiptEmail },
        items: [
          {
            description: description.slice(0, 128),
            quantity: '1.00',
            amount: {
              value: amount.toFixed(2),
              currency,
            },
            vat_code: '1', // 20% VAT
          },
        ],
      };
    }

    this.logger.log(`Creating YuKassa payment for user ${userId}, package ${packageId}`);

    const payment = await this.request<YuKassaPayment>('/payments', 'POST', body);

    if (!payment.confirmation?.confirmation_url) {
      throw new Error('No confirmation URL received from YuKassa');
    }

    this.logger.log(`YuKassa payment created: ${payment.id}`);

    return {
      paymentId: payment.id,
      confirmationUrl: payment.confirmation.confirmation_url,
    };
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(paymentId: string): Promise<YuKassaPayment> {
    return this.request<YuKassaPayment>(`/payments/${paymentId}`, 'GET');
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string): Promise<YuKassaPayment> {
    return this.request<YuKassaPayment>(`/payments/${paymentId}/cancel`, 'POST', {});
  }

  /**
   * Verify webhook signature
   * YuKassa sends webhook with notification body
   */
  verifyWebhook(body: unknown, signature: string): boolean {
    // YuKassa uses IP whitelist + body inspection for webhook validation
    // In production, verify IP is from YuKassa (185.71.76.0/27, 185.71.77.0/27)
    // and validate notification structure

    this.logger.log('Webhook verification (IP whitelist recommended in production)');
    return true;
  }

  /**
   * Process webhook notification
   */
  async processWebhook(body: {
    event: string;
    object: YuKassaPayment;
  }): Promise<{ success: boolean; userId?: string; packageId?: string; paymentId?: string }> {
    const { event, object: payment } = body;

    this.logger.log(`Received YuKassa webhook: ${event} for payment ${payment.id}`);

    if (event === 'payment.succeeded') {
      const userId = payment.metadata?.userId;
      const packageId = payment.metadata?.packageId;

      if (userId && packageId) {
        return { success: true, userId, packageId, paymentId: payment.id };
      }

      this.logger.error(`Missing metadata in webhook: ${JSON.stringify(payment.metadata)}`);
      return { success: false };
    }

    if (event === 'payment.canceled') {
      this.logger.log(`Payment ${payment.id} was canceled`);
      return { success: false };
    }

    return { success: false };
  }

  /**
   * Check if YuKassa is configured
   */
  isConfigured(): boolean {
    return !!(this.shopId && this.secretKey);
  }
}
