import { BrowserRouter, Routes, Route } from 'react-router';
import { Home } from './pages/Home';
import { Create } from './pages/Create';
import { Library } from './pages/Library';
import { Profile } from './pages/Profile';
import { Track } from './pages/Track';
import { BottomNav } from './components/BottomNav';

function App() {
  return (
    <BrowserRouter>
      <div className="pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/library" element={<Library />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/track/:id" element={<Track />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  );
}

export default App;
