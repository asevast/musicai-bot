import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { init, miniApp, themeParams, viewport, backButton } from '@telegram-apps/sdk-react';
import App from './App';
import './app.css';

// Check if running outside Telegram (dev mode)
const isDev = process.env.NODE_ENV === 'development';

function Root() {
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isTelegramEnv, setIsTelegramEnv] = useState(false);

  useEffect(() => {
    async function initTelegramSDK() {
      try {
        console.log('[Debug] Starting SDK init...');

        // Check if we're in Telegram WebApp
        const tgWebApp = (window as unknown as { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp;
        setIsTelegramEnv(!!tgWebApp);

        // Initialize Telegram Mini App SDK
        console.log('[Debug] Calling init()...');
        init();
        console.log('[Debug] init() completed');

        // Mount and expand viewport
        console.log('[Debug] Mounting viewport...');
        await viewport.mount();
        console.log('[Debug] Viewport mounted, expanding...');
        viewport.expand();

        // Mount theme params for theme synchronization
        console.log('[Debug] Mounting themeParams...');
        await themeParams.mount();

        // Mount mini app
        console.log('[Debug] Mounting miniApp...');
        await miniApp.mount();

        // Mount back button
        console.log('[Debug] Mounting backButton...');
        await backButton.mount();

        console.log('[Debug] All SDK components mounted!');
        setIsReady(true);
      } catch (e) {
        console.error('[Debug] Telegram SDK init error:', e);
        // In dev mode, allow app to continue without Telegram
        if (isDev) {
          console.log('[Debug] Dev mode: continuing without Telegram SDK...');
          setIsReady(true);
        } else {
          setError(e instanceof Error ? e.message : 'Failed to initialize');
        }
      }
    }

    void initTelegramSDK();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error: {error}</p>
          <p className="text-sm text-gray-500 mb-4">Please open this app in Telegram</p>
          {isDev && (
            <button
              onClick={() => {
                console.log('[Debug] Forcing dev mode...');
                setIsReady(true);
                setError(null);
              }}
              className="px-4 py-2 bg-[#5B5FC7] text-white rounded-lg text-sm font-medium"
            >
              Continue in Dev Mode
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Root />);
