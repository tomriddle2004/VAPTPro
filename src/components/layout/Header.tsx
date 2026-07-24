import { Link, useLocation } from 'react-router-dom';
import { Shield, Activity, History, FileText, Settings, Terminal } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: Activity },
  { to: '/scan/new', label: 'New Scan', icon: Terminal },
  { to: '/history', label: 'Scan History', icon: History },
];

export default function Header() {
  const { pathname } = useLocation();

  return (
    <header className="bg-[#0b1426] border-b border-emerald-900/40 sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-none tracking-tight">VAPT</span>
            <span className="text-emerald-400 font-bold text-lg leading-none tracking-tight"> Pro</span>
            <div className="text-[10px] text-slate-500 leading-none mt-0.5 font-mono">v2.4.1 • Linux</div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-mono">ENGINE READY</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors">
            <Settings className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
