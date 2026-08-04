import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Dashboard from '@/pages/Dashboard';
import NewScan from '@/pages/NewScan';
import ScanDetail from '@/pages/ScanDetail';
import ScanHistory from '@/pages/ScanHistory';
import Compliance from '@/pages/Compliance';
import Scheduler from '@/pages/Scheduler';
import NetworkTopology from '@/pages/NetworkTopology';
import Notifications from '@/pages/Notifications';
import Allowlist from '@/pages/Allowlist';
import Compare from '@/pages/Compare';
import Trends from '@/pages/Trends';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <Header />
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
          <Routes>
            <Route path="/"               element={<Dashboard />} />
            <Route path="/scan/new"       element={<NewScan />} />
            <Route path="/scan/:id"       element={<ScanDetail />} />
            <Route path="/history"        element={<ScanHistory />} />
            <Route path="/compliance"     element={<Compliance />} />
            <Route path="/scheduler"      element={<Scheduler />} />
            <Route path="/topology"       element={<NetworkTopology />} />
            <Route path="/notifications"  element={<Notifications />} />
            <Route path="/allowlist"      element={<Allowlist />} />
            <Route path="/compare"        element={<Compare />} />
            <Route path="/trends"         element={<Trends />} />
            <Route path="*"              element={<NotFound />} />
          </Routes>
        </main>
        <footer
          className="border-t mt-16 py-6 px-6"
          style={{ borderTopColor: 'var(--border-subtle)' }}
        >
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
              VAPT Pro v2.6.0 — Vulnerability Assessment &amp; Reporting Platform
            </div>
            <div className="flex items-center gap-4 text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
              <span>Nmap 7.94</span><span>•</span>
              <span>Node.js 18+</span><span>•</span>
              <span>SQLite 3</span><span>•</span>
              <span>Linux Native</span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
