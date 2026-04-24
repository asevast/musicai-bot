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
        // Initialize Telegram Mini App SDK
        init();

        // Mount and expand viewport
        await viewport.mount();
        viewport.expand();

        // Mount theme params for theme synchronization
        await themeParams.mount();

        // Mount mini app
        await miniApp.mount();

        // Mount back button
        await backButton.mount();

        setIsReady(true);
      } catch (e) {
        console.error('Telegram SDK init error:', e);
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
