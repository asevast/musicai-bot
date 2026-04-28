import { BrowserRouter, Routes, Route } from 'react-router';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { useMemo, type ReactNode } from 'react';
import { Home } from './pages/Home';
import { CreateType } from './pages/CreateType';
import { CreatePrompt } from './pages/CreatePrompt';
import { CreateLanguage } from './pages/CreateLanguage';
import { CreateConfirm } from './pages/CreateConfirm';
import { Generating } from './pages/Generating';
import { Library } from './pages/Library';
import { Profile } from './pages/Profile';
import { BuyCredits } from './pages/BuyCredits';
import { Track } from './pages/Track';
import { Settings } from './pages/Settings';
import { BottomNav } from './components/BottomNav';

type Platform = 'ios' | 'base';

function usePlatform(): Platform {
  return useMemo(() => {
    if (typeof window === 'undefined') return 'base';
    const tg = (window as unknown as { Telegram?: { WebApp?: { platform?: string } } }).Telegram?.WebApp;
    const platform = tg?.platform?.toLowerCase() ?? '';
    // Telegram platform can be: ios, android, macos, tdesktop, web, etc.
    // We treat ios as iOS style, everything else as base style
    return platform === 'ios' ? 'ios' : 'base';
  }, []);
}

function App() {
  const platform = usePlatform();
  return (
    <AppRoot platform={platform}>
      <BrowserRouter>
        <div className="pb-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateType />} />
            <Route path="/create/prompt" element={<CreatePrompt />} />
            <Route path="/create/lang" element={<CreateLanguage />} />
            <Route path="/create/confirm" element={<CreateConfirm />} />
            <Route path="/generating" element={<Generating />} />
            <Route path="/library" element={<Library />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/buy" element={<BuyCredits />} />
            <Route path="/track/:id" element={<Track />} />
            <Route path="/settings" element={<Settings />} />
        </Routes>
        </div>
        <BottomNav />
      </BrowserRouter>
    </AppRoot>
  );
}

export default App;
