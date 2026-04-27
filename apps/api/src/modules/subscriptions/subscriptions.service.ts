import { Injectable } from '@nestjs/common';
import { prisma } from '@musicai/database';
import { CreditsService } from '../credits/credits.service';

export interface SubscriptionRefreshResult {
  userId: string;
  tier: 'pro' | 'unlimited';
  creditsAdded: number;
  previousCredits: number;
  newCredits: number;
  nextRefreshDate: Date;
}

export interface SubscriptionExpiryResult {
  userId: string;
  tier: 'pro' | 'unlimited';
  creditsLost: number;
  downgradedTo: 'free';
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly creditsService: CreditsService) {}

  private readonly PRO_MONTHLY_CREDITS = 150;
  private readonly SUBSCRIPTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Check if a user is eligible for monthly credit refresh
   * (Pro subscribers who haven't been refreshed this month)
   */
  async shouldRefreshCredits(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        creditTransactions: {
          where: {
            type: 'buy',
            description: {
              contains: 'Monthly refresh',
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user || user.subscriptionTier === 'free') {
      return false;
    }

    // Check if subscription is still valid
    if (!user.subscriptionExpiresAt || user.subscriptionExpiresAt <= new Date()) {
      return false;
    }

    // If no previous refresh, or last refresh was >30 days ago
    const lastRefresh = user.creditTransactions[0]?.createdAt;
    if (!lastRefresh) {
      return true;
    }

    const daysSinceRefresh =
      (Date.now() - lastRefresh.getTime()) / (24 * 60 * 60 * 1000);
    return daysSinceRefresh >= 30;
  }

  /**
   * Refresh monthly credits for a Pro/Unlimited subscriber
   */
  async refreshMonthlyCredits(userId: string): Promise<SubscriptionRefreshResult | null> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          subscriptionTier: true,
          credits: true,
          subscriptionExpiresAt: true,
        },
      });

      if (!user || user.subscriptionTier === 'free') {
        return null;
      }

      if (!user.subscriptionExpiresAt || user.subscriptionExpiresAt <= new Date()) {
        return null;
      }

      // Unlimited tiers don't get credits (unlimited tracks)
      if (user.subscriptionTier !== 'pro') {
        return null;
      }

      const previousCredits = user.credits;
      const creditsToAdd = this.PRO_MONTHLY_CREDITS;

      // Add credits
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: creditsToAdd } },
      });

      // Log transaction
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: creditsToAdd,
          type: 'earn',
          description: `Monthly refresh - Pro subscription (${creditsToAdd} credits)`,
        },
      });

      const nextRefreshDate = new Date(Date.now() + this.SUBSCRIPTION_DURATION_MS);

      return {
        userId,
        tier: 'pro',
        creditsAdded: creditsToAdd,
        previousCredits,
        newCredits: previousCredits + creditsToAdd,
        nextRefreshDate,
      };
    });
  }

  /**
   * Process all subscriptions that need credit refresh
   * Returns results of all processed refreshes
   */
  async processMonthlyRefreshes(): Promise<SubscriptionRefreshResult[]> {
    const users = await prisma.user.findMany({
      where: {
        subscriptionTier: { in: ['pro', 'unlimited'] },
        subscriptionExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    const results: SubscriptionRefreshResult[] = [];

    for (const { id } of users) {
      const shouldRefresh = await this.shouldRefreshCredits(id);
      if (shouldRefresh) {
        const result = await this.refreshMonthlyCredits(id);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Check and expire subscriptions that have passed their expiry date
   */
  async expireSubscriptions(): Promise<SubscriptionExpiryResult[]> {
    const expiredUsers = await prisma.user.findMany({
      where: {
        subscriptionTier: { in: ['pro', 'unlimited'] },
        subscriptionExpiresAt: { lte: new Date() },
      },
      select: {
        id: true,
        subscriptionTier: true,
        credits: true,
      },
    });

    const results: SubscriptionExpiryResult[] = [];

    for (const user of expiredUsers) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            subscriptionTier: 'free',
            subscriptionExpiresAt: null,
          },
        });

        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: 0,
            type: 'earn',
            description: 'Subscription expired - downgraded to free tier',
          },
        });
      });

      results.push({
        userId: user.id,
        tier: user.subscriptionTier as 'pro' | 'unlimited',
        creditsLost: user.credits,
        downgradedTo: 'free',
      });
    }

    return results;
  }
}
