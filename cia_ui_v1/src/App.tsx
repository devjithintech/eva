import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import CandidatesPage from './pages/CandidatesPage';
import DetailPage from './pages/DetailPage';
import PeerFitPage from './pages/PeerFitPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Landing page - no AppShell wrapper, full screen */}
        <Route path="/" element={<LandingPage />} />

        {/* All other pages are wrapped in AppShell (Topbar + ChatPanel) */}
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/candidates" element={<CandidatesPage />} />
          <Route path="/candidates/:id" element={<DetailPage />} />
          <Route path="/candidates/:id/peer-fit" element={<PeerFitPage />} />
        </Route>

        {/* Catch-all: redirect to Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
