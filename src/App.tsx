import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Dashboard from '@/pages/Dashboard';
import NewScan from '@/pages/NewScan';
import ScanDetail from '@/pages/ScanDetail';
import ScanHistory from '@/pages/ScanHistory';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#060d1a] text-white">
        <Header />
        <main className="max-w-[1400px] mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan/new" element={<NewScan />} />
            <Route path="/scan/:id" element={<ScanDetail />} />
            <Route path="/history" element={<ScanHistory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {/* Footer */}
        <footer className="border-t border-slate-900 mt-16 py-6 px-6">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-slate-600 text-sm font-mono">
              VAPT Pro v2.4.1 — Vulnerability Assessment & Reporting Platform
            </div>
            <div className="flex items-center gap-4 text-slate-700 text-xs font-mono">
              <span>Nmap 7.94</span>
              <span>•</span>
              <span>Node.js 18+</span>
              <span>•</span>
              <span>SQLite 3</span>
              <span>•</span>
              <span>Linux Native</span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
