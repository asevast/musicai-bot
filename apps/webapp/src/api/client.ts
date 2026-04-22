import ky from 'ky';

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Get init data from Telegram Mini App launch params
function getInitDataRaw(): string | null {
  if (typeof window === 'undefined') return null;

  // Try to get from Telegram WebApp first
  const webApp = (window as unknown as { Telegram?: { WebApp?: { initData: string } } }).Telegram
    ?.WebApp;
  if (webApp?.initData) {
    return webApp.initData;
  }

  // Fallback to URL query param (for testing outside Telegram)
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tgWebAppData');
}

const initDataRaw = getInitDataRaw();

export const apiClient = ky.create({
  prefixUrl: VITE_API_URL,
  headers: initDataRaw ? { 'X-Telegram-Init-Data': initDataRaw } : {},
  retry: {
    limit: 2,
    methods: ['get', 'post'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
});
