export type SubscriptionTier = 'free' | 'pro' | 'unlimited';

export interface UserProfile {
  id: string;
  telegramId: bigint;
  username: string | null;
  firstName: string | null;
  credits: number;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt: Date | null;
  defaultSettings: Record<string, unknown>;
  createdAt: Date;
}

export interface UserStats {
  totalTracks: number;
  totalCreditsSpent: number;
  tracksByStatus: Record<string, number>;
}
