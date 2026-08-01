import { Link, useLocation } from 'react-router-dom';
import {
  Shield, Activity, Terminal, History, Network,
  ShieldCheck, Calendar, Bell, List, GitCompare,
  Sun, Moon,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const NAV_LINKS = [
  { to: '/',           label: 'Dashboard',  icon: Activity },
  { to: '/scan/new',   label: 'New Scan',   icon: Terminal },
  { to: '/history',    label: 'History',    icon: History },
  { to: '/topology',   label: 'Topology',   icon: Network },
  { to: '/compliance', label: 'Compliance', icon: ShieldCheck },
  { to: '/scheduler',  label: 'Scheduler',  icon: Calendar },
  { to: '/compare',    label: 'Compare',    icon: GitCompare },
  { to: '/allowlist',  label: 'Allowlist',  icon: List },
  { to: '/notifications', label: 'Alerts',  icon: Bell },
];

export default function Header() {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header
      className="border-b sticky top-0 z-50"
      style={{ backgroundColor: 'var(--header-bg)', borderBottomColor: 'var(--header-border)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="font-bold text-base leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>VAPT</span>
            <span className="text-emerald-400 font-bold text-base leading-none tracking-tight"> Pro</span>
            <div className="text-[9px] leading-none mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>v2.5 • Linux</div>
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
                    : 'hover:bg-white/5'
                }`}
                style={active ? {} : { color: 'var(--text-secondary)' }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Engine status */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px] font-mono">ENGINE READY</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all hover:scale-105"
            style={{
              backgroundColor: isDark ? 'rgba(234,179,8,0.1)' : 'rgba(100,116,139,0.1)',
              borderColor: isDark ? 'rgba(234,179,8,0.3)' : 'var(--border-muted)',
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark
              ? <Sun className="w-4 h-4 text-yellow-400" />
              : <Moon className="w-4 h-4 text-slate-500" />
            }
          </button>
        </div>
      </div>
    </header>
  );
}
