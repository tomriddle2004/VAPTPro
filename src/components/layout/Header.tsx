import { Link, useLocation } from 'react-router-dom';
import { Shield, Activity, Terminal, History, Network, ShieldCheck, Calendar, Settings } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: Activity },
  { to: '/scan/new', label: 'New Scan', icon: Terminal },
  { to: '/history', label: 'History', icon: History },
  { to: '/topology', label: 'Topology', icon: Network },
  { to: '/compliance', label: 'Compliance', icon: ShieldCheck },
  { to: '/scheduler', label: 'Scheduler', icon: Calendar },
];

export default function Header() {
  const { pathname } = useLocation();

  return (
    <header className="bg-[#0b1426] border-b border-emerald-900/40 sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-white font-bold text-base leading-none tracking-tight">VAPT</span>
            <span className="text-emerald-400 font-bold text-base leading-none tracking-tight"> Pro</span>
            <div className="text-[9px] text-slate-500 leading-none mt-0.5 font-mono">v2.4.1 • Linux</div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to));
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px] font-mono">ENGINE READY</span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors">
            <Settings className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
