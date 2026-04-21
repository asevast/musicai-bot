import React, { useState, useEffect, useCallback } from 'react';
import { Title, Cell, Caption, Badge, List } from '@telegram-apps/telegram-ui';
import { apiClient } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import type { SubscriptionTier } from '@musicai/shared-types';

interface ProfileResponse {
  id: string;
  username: string | null;
  firstName: string | null;
  credits: number;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt: Date | null;
}

interface CreditsHistoryItem {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
}

interface CreditsHistoryResponse {
  transactions: CreditsHistoryItem[];
  total: number;
}

const tierLabels: Record<SubscriptionTier, string> = {
  free: 'Free',
  pro: 'Pro',
  unlimited: 'Unlimited',
};

const tierColors: Record<SubscriptionTier, string> = {
  free: 'bg-gray-500',
  pro: 'bg-blue-500',
  unlimited: 'bg-purple-500',
};

const transactionLabels: Record<string, string> = {
  earn: 'Earned',
  spend: 'Spent',
  buy: 'Purchased',
  bonus: 'Bonus',
  refund: 'Refund',
};

export function Profile(): React.ReactElement {
  const { user } = useTelegram();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [transactions, setTransactions] = useState<CreditsHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const userResponse = await apiClient
        .get(`users/telegram/${user.id}`)
        .json<{ id: string }>();

      const [profileData, creditsResponse] = await Promise.all([
        apiClient.get(`users/${userResponse.id}/profile`).json<ProfileResponse>(),
        apiClient.get(`credits/history/${user.id}`).json<CreditsHistoryResponse>(),
      ]);

      setProfile(profileData);
      setTransactions(creditsResponse.transactions.slice(0, 5));
    } catch {
      setProfile(null);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="page">
        <div className="p-4">
          <Cell>Loading...</Cell>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <div className="p-4">
          <Cell>Failed to load profile</Cell>
        </div>
      </div>
    );
  }

  const displayName = profile.firstName || profile.username || 'User';

  return (
    <div className="page">
      <div className="p-4 pb-20">
        <Title level="2" weight="1" className="mb-4">
          Profile
        </Title>

        <div className="mb-6">
          <Cell
            subtitle={<Caption className="text-gray-500">@{user?.username || 'user'}</Caption>}
            after={
              <Badge
                type="number"
                mode={profile.subscriptionTier === 'free' ? 'gray' : 'primary'}
                className={`${tierColors[profile.subscriptionTier]} text-white px-2 py-1 rounded`}
              >
                {tierLabels[profile.subscriptionTier]}
              </Badge>
            }
            multiline
          >
            <div className="font-medium text-lg">{displayName}</div>
          </Cell>
        </div>

        <List className="mb-6">
          <Cell
            subtitle={<Caption className="text-gray-500">Available credits</Caption>}
            after={
              <Badge type="number" mode="primary" className="bg-blue-500 text-white px-3 py-1 rounded text-base">
                {profile.credits}
              </Badge>
            }
          >
            Credits Balance
          </Cell>
        </List>

        <div>
          <Title level="3" weight="2" className="mb-3 px-4">
            Recent Transactions
          </Title>
          <List>
            {transactions.length === 0 ? (
              <Cell>
                <Caption className="text-gray-500">No recent transactions</Caption>
              </Cell>
            ) : (
              transactions.map((tx) => (
                <Cell
                  key={tx.id}
                  subtitle={
                    <Caption className="text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </Caption>
                  }
                  after={
                    <Badge
                      type="number"
                      mode={tx.amount > 0 ? 'primary' : 'critical'}
                      className={`${
                        tx.amount > 0 ? 'bg-green-500' : 'bg-red-500'
                      } text-white px-2 py-0.5 rounded`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                    </Badge>
                  }
                >
                  {transactionLabels[tx.type] || tx.type}
                  {tx.description ? ` \u2022 ${tx.description}` : ''}
                </Cell>
              ))
            )}
          </List>
        </div>
      </div>
    </div>
  );
}
