import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  init,
  miniApp,
  themeParams,
  viewport,
  backButton,
} from '@telegram-apps/sdk-react';
import App from './App';
import './app.css';

// Initialize Telegram Mini App SDK
init();

// Mount and expand viewport
void viewport.mount().then(() => {
  viewport.expand();
});

// Mount theme params for theme synchronization
themeParams.mount();

// Mount mini app
miniApp.mount();

// Mount back button
backButton.mount();

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
