import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield, Activity, Terminal, History, Network,
  ShieldCheck, Calendar, Bell, List, GitCompare,
  Sun, Moon, Menu, X, TrendingUp, Tag,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const NAV_LINKS = [
  { to: '/',             label: 'Dashboard',  icon: Activity   },
  { to: '/scan/new',     label: 'New Scan',   icon: Terminal   },
  { to: '/history',      label: 'History',    icon: History    },
  { to: '/topology',     label: 'Topology',   icon: Network    },
  { to: '/trends',       label: 'Trends',     icon: TrendingUp },
  { to: '/compliance',   label: 'Compliance', icon: ShieldCheck },
  { to: '/scheduler',    label: 'Scheduler',  icon: Calendar   },
  { to: '/compare',      label: 'Compare',    icon: GitCompare  },
  { to: '/allowlist',    label: 'Allowlist',  icon: List       },
  { to: '/notifications',label: 'Alerts',     icon: Bell       },
];

export default function Header() {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on outside click
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [drawerOpen]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <>
      {/* ── Main header ────────────────────────────────────────────────────── */}
      <header
        className="border-b sticky top-0 z-50"
        style={{ backgroundColor: 'var(--header-bg)', borderBottomColor: 'var(--header-border)' }}
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
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

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'hover:bg-white/5'
                  }`}
                  style={active ? {} : { color: 'var(--text-secondary)' }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden xl:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Engine status — desktop only */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[10px] font-mono">ENGINE READY</span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: isDark ? 'rgba(234,179,8,0.1)' : 'rgba(100,116,139,0.1)',
                borderColor: isDark ? 'rgba(234,179,8,0.3)' : 'var(--border-muted)',
              }}
            >
              {isDark
                ? <Sun  className="w-4 h-4 text-yellow-400" />
                : <Moon className="w-4 h-4 text-slate-500"  />
              }
            </button>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setDrawerOpen(o => !o)}
              className="md:hidden w-9 h-9 rounded-lg border flex items-center justify-center transition-colors"
              style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--bg-card)' }}
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`fixed top-0 left-0 h-full w-72 z-[70] flex flex-col transition-transform duration-300 ease-out md:hidden`}
        style={{
          backgroundColor: 'var(--header-bg)',
          borderRight: '1px solid var(--header-border)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 h-14 flex-shrink-0 border-b"
          style={{ borderBottomColor: 'var(--header-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
              VAPT <span className="text-emerald-400">Pro</span>
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'hover:bg-white/5'
                }`}
                style={active ? {} : { color: 'var(--text-secondary)' }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer — theme toggle */}
        <div
          className="flex-shrink-0 px-5 py-4 border-t space-y-3"
          style={{ borderTopColor: 'var(--header-border)' }}
        >
          {/* Engine status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-mono">ENGINE READY</span>
          </div>

          {/* Theme row */}
          <button
            onClick={() => { toggle(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isDark
              ? <><Sun  className="w-4 h-4 text-yellow-400" /><span>Switch to Light Mode</span></>
              : <><Moon className="w-4 h-4 text-slate-500"  /><span>Switch to Dark Mode</span></>
            }
          </button>

          <div className="text-[10px] font-mono text-center" style={{ color: 'var(--text-faint)' }}>
            VAPT Pro v2.5 — Linux Native
          </div>
        </div>
      </div>
    </>
  );
}
