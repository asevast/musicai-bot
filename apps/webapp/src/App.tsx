import { BrowserRouter, Routes, Route } from 'react-router';

function HomePage() {
  return <div>Home Page</div>;
}

function CreatePage() {
  return <div>Create Track Page</div>;
}

function LibraryPage() {
  return <div>Library Page</div>;
}

function ProfilePage() {
  return <div>Profile Page</div>;
}

function TrackPage() {
  return <div>Track Detail Page</div>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/track/:id" element={<TrackPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
