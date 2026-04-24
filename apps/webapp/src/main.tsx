import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { init, miniApp, themeParams, viewport, backButton } from '@telegram-apps/sdk-react';
import App from './App';
import './app.css';

function Root() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Initialize Telegram Mini App SDK
      init();

      // Mount and expand viewport
      void viewport.mount();
      viewport.expand();

      // Mount theme params for theme synchronization
      void themeParams.mount();

      // Mount mini app
      void miniApp.mount();

      // Mount back button
      void backButton.mount();
    } catch (e) {
      console.error('Telegram SDK init error:', e);
      setError(e instanceof Error ? e.message : 'Failed to initialize');
    }
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

  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Root />);
