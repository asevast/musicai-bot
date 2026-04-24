import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { init, miniApp, themeParams, viewport, backButton } from '@telegram-apps/sdk-react';
import App from './App';
import './app.css';

function Root() {
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function initTelegramSDK() {
      try {
        console.log('[Debug] Starting SDK init...');

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
        setError(e instanceof Error ? e.message : 'Failed to initialize');
      }
    }

    void initTelegramSDK();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error: {error}</p>
          <p className="text-sm text-gray-500">Please open this app in Telegram</p>
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
