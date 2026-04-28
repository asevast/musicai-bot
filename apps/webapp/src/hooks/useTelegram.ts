import { useMemo } from 'react';
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';

interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  photoUrl?: string;
}

interface InitDataUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  photoUrl?: string;
}

interface InitData {
  user?: InitDataUser;
}

interface LaunchParams {
  initDataRaw?: string;
  initData?: InitData;
  startParam?: string;
}

interface UseTelegramReturn {
  initDataRaw: string | null;
  user: TelegramUser | null;
  startParam: string | null;
}

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

export function useTelegram(): UseTelegramReturn {
  const launchParams = useMemo((): LaunchParams | null => {
    try {
      return retrieveLaunchParams() as LaunchParams;
    } catch {
      // Not running inside Telegram Mini App
      if (isDev) {
        console.log('[useTelegram] Dev mode: using mock launch params');
      }
      return null;
    }
  }, []);

  const initDataRaw = launchParams?.initDataRaw ?? null;

  const user = useMemo((): TelegramUser | null => {
    if (!launchParams?.initData?.user) return null;
    const u = launchParams.initData.user;
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      languageCode: u.languageCode,
      isPremium: u.isPremium,
      photoUrl: u.photoUrl,
    };
  }, [launchParams]);

  const startParam = launchParams?.startParam ?? null;

  return {
    initDataRaw,
    user,
    startParam,
  };
}
