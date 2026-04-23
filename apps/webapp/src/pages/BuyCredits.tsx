import React from 'react';
import { ChevronRightIcon } from '../components/icons';

interface PackOption {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: 'star' | 'rub';
  popular?: boolean;
  description: string;
}

interface SubscriptionOption {
  id: string;
  name: string;
  credits: string;
  dailyLimit: string;
  price: number;
}

const packs: PackOption[] = [
  {
    id: 's',
    name: 'Pack S',
    credits: 20,
    price: 79,
    currency: 'star',
    description: '~4 трека',
  },
  {
    id: 'm',
    name: 'Pack M',
    credits: 100,
    price: 299,
    currency: 'star',
    description: '~20 треков',
    popular: true,
  },
  {
    id: 'l',
    name: 'Pack L',
    credits: 300,
    price: 699,
    currency: 'star',
    description: '~60 треков',
  },
];

const subscriptions: SubscriptionOption[] = [
  {
    id: 'pro',
    name: 'Pro',
    credits: '150 кр/мес',
    dailyLimit: '20 треков/день',
    price: 299,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    credits: '∞ кредитов',
    dailyLimit: '50 треков/день',
    price: 799,
  },
];

export function BuyCredits(): React.ReactElement {
  const currentBalance = 80;

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center py-3">
          <h1 className="text-sm font-medium">Кредиты</h1>
        </div>

        {/* Balance Header */}
        <div className="bg-[#EEF2FF] rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-xs text-[#5B5FC7]">Текущий баланс</span>
          <span className="text-lg font-medium text-[#5B5FC7]">{currentBalance} кр.</span>
        </div>

        {/* One-time Packs */}
        <h2 className="text-sm font-medium mb-3">Разовые паки</h2>
        <div className="space-y-2 mb-6">
          {packs.map((pack) => (
            <button
              key={pack.id}
              className={`w-full p-3 rounded-xl border flex items-center justify-between transition-colors ${
                pack.popular
                  ? 'border-[#5B5FC7] relative'
                  : 'border-gray-100'
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-2 left-3 bg-[#5B5FC7] text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                  Популярный
                </span>
              )}
              <div className="text-left">
                <div className="text-xs font-medium">{pack.name}</div>
                <div className="text-xs text-gray-400">
                  {pack.credits} кредитов · {pack.description}
                </div>
              </div>
              <div className="bg-[#EEF2FF] text-[#5B5FC7] text-xs font-medium rounded-lg px-2 py-1">
                {pack.price} ⭐
              </div>
            </button>
          ))}
        </div>

        {/* Subscriptions */}
        <h2 className="text-sm font-medium mb-3">Подписки</h2>
        <div className="space-y-2">
          {subscriptions.map((sub) => (
            <button
              key={sub.id}
              className="w-full p-3 rounded-xl border border-gray-100 flex items-center justify-between transition-colors"
            >
              <div className="text-left">
                <div className="text-xs font-medium">{sub.name}</div>
                <div className="text-xs text-gray-400">
                  {sub.credits} · {sub.dailyLimit}
                </div>
              </div>
              <div className="bg-[#EEF2FF] text-[#5B5FC7] text-xs font-medium rounded-lg px-2 py-1">
                {sub.price} ₽/мес
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
