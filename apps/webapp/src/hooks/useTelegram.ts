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

interface ThemeParams {
  bgColor?: string;
  textColor?: string;
  hintColor?: string;
  linkColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  secondaryBgColor?: string;
  headerBgColor?: string;
  accentTextColor?: string;
  sectionBgColor?: string;
  sectionHeaderTextColor?: string;
  subtitleTextColor?: string;
  destructiveTextColor?: string;
}

interface UseTelegramReturn {
  initDataRaw: string | null;
  user: TelegramUser | null;
  themeParams: ThemeParams | null;
  startParam: string | null;
}

export function useTelegram(): UseTelegramReturn {
  const launchParams = useMemo(() => {
    try {
      return retrieveLaunchParams();
    } catch {
      // Not running inside Telegram Mini App
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

  const themeParams = useMemo((): ThemeParams | null => {
    if (!launchParams?.themeParams) return null;
    const t = launchParams.themeParams;
    return {
      bgColor: t.bgColor,
      textColor: t.textColor,
      hintColor: t.hintColor,
      linkColor: t.linkColor,
      buttonColor: t.buttonColor,
      buttonTextColor: t.buttonTextColor,
      secondaryBgColor: t.secondaryBgColor,
      headerBgColor: t.headerBgColor,
      accentTextColor: t.accentTextColor,
      sectionBgColor: t.sectionBgColor,
      sectionHeaderTextColor: t.sectionHeaderTextColor,
      subtitleTextColor: t.subtitleTextColor,
      destructiveTextColor: t.destructiveTextColor,
    };
  }, [launchParams]);

  const startParam = launchParams?.startParam ?? null;

  return {
    initDataRaw,
    user,
    themeParams,
    startParam,
  };
}
