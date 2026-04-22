import { BrowserRouter, Routes, Route } from 'react-router';
import { Create } from './pages/Create';
import { Library } from './pages/Library';
import { Profile } from './pages/Profile';
import { Track } from './pages/Track';

function HomePage() {
  return <div>Home Page</div>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<Create />} />
        <Route path="/library" element={<Library />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/track/:id" element={<Track />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
