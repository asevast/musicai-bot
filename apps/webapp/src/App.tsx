import { BrowserRouter, Routes, Route } from 'react-router';
import { AppRoot } from '@telegram-apps/telegram-ui';
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
import { BottomNav } from './components/BottomNav';

function App() {
  return (
    <AppRoot platform="ios">
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
          </Routes>
        </div>
        <BottomNav />
      </BrowserRouter>
    </AppRoot>
  );
}

export default App;
