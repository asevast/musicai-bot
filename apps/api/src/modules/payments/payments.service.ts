import { Inject, Injectable } from '@nestjs/common';
import { prisma } from '@musicai/database';
import { CreditsService } from '../credits/credits.service';

export interface PaymentPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: 'XTR' | 'RUB';
}

export const PACKAGES: Record<string, PaymentPackage> = {
  pack_s: { id: 'pack_s', name: 'Pack S', credits: 20, price: 79, currency: 'RUB' },
  pack_m: { id: 'pack_m', name: 'Pack M', credits: 100, price: 299, currency: 'RUB' },
  pack_l: { id: 'pack_l', name: 'Pack L', credits: 300, price: 699, currency: 'RUB' },
  pro: { id: 'pro', name: 'Pro', credits: 150, price: 299, currency: 'RUB' },
  unlimited: { id: 'unlimited', name: 'Unlimited', credits: 0, price: 799, currency: 'RUB' },
};

@Injectable()
export class PaymentsService {
  constructor(@Inject(CreditsService) private readonly creditsService: CreditsService) {}

  getPackage(packageId: string): PaymentPackage | undefined {
    return PACKAGES[packageId];
  }

  getAllPackages(): PaymentPackage[] {
    return Object.values(PACKAGES);
  }

  async processPayment(
    userId: string,
    packageId: string,
    paymentId: string
  ): Promise<{ success: boolean; credits?: number; error?: string }> {
    const pkg = this.getPackage(packageId);

    if (!pkg) {
      return { success: false, error: 'Invalid package' };
    }

    if (pkg.id === 'unlimited') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: 'unlimited',
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return { success: true, credits: 0 };
    }

    if (pkg.id === 'pro') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: 'pro',
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await this.creditsService.addCredits(
        userId,
        pkg.credits,
        'buy',
        `Pro subscription (${pkg.name})`,
        paymentId
      );

      return { success: true, credits: pkg.credits };
    }

    await this.creditsService.addCredits(
      userId,
      pkg.credits,
      'buy',
      `Credit pack purchase (${pkg.name})`,
      paymentId
    );

    return { success: true, credits: pkg.credits };
  }

  async handleTelegramStarsPayment(
    userId: string,
    packageId: string,
    telegramPaymentId: string
  ): Promise<{ success: boolean; credits?: number; error?: string }> {
    return this.processPayment(userId, packageId, telegramPaymentId);
  }
}
