import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

// Page placeholders -- replaced by later tickets
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import CandidatesPage from './pages/CandidatesPage'
import DetailPage from './pages/DetailPage'
import PeerFitPage from './pages/PeerFitPage'
import AppShell from './components/layout/AppShell'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Landing lives outside AppShell - no sidebar/topbar needed */}
        <Route path="/" element={<LandingPage />} />

        {/* All other routes wrapped in AppShell (Topbar + ChatPanel) */}
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/candidates" element={<CandidatesPage />} />
          <Route path="/candidates/:id" element={<DetailPage />} />
          <Route path="/candidates/:id/peer-fit" element={<PeerFitPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
