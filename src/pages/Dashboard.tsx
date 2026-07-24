import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAllScans } from '@/lib/storage';
import { Scan } from '@/types';
import { formatDateTime, formatDuration } from '@/lib/ipValidator';
import StatusBadge from '@/components/features/StatusBadge';
import RiskBadge from '@/components/features/RiskBadge';
import { 
  Shield, AlertTriangle, Activity, CheckCircle2, 
  TrendingUp, Target, Zap, ArrowRight, Clock
} from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';

export default function Dashboard() {
  const [scans, setScans] = useState<Scan[]>([]);

  useEffect(() => {
    setScans(getAllScans());
  }, []);

  const completed = scans.filter(s => s.status === 'completed');
  const critical = completed.filter(s => s.risk_rating === 'Critical');
  const totalFindings = completed.reduce((acc, s) => acc + (s.findings_count ?? 0), 0);
  const recent = scans.slice(0, 5);

  const stats = [
    { label: 'Total Scans', value: scans.length, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Critical Risk Hosts', value: critical.length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Total Findings', value: totalFindings, icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { label: 'Clean Hosts', value: completed.filter(s => s.risk_rating === 'Clean').length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden border border-slate-800 min-h-[220px] flex items-end"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1426] via-[#0b1426]/70 to-transparent" />
        <div className="relative z-10 p-8 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-mono tracking-widest">VAPT PRO v2.4.1 — LINUX NATIVE</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                Vulnerability Assessment<br />
                <span className="text-emerald-400">& Reporting Platform</span>
              </h1>
              <p className="text-slate-400 text-sm mt-2 max-w-xl">
                Powered by Nmap 7.94 • SQLite persistence • RFC 1918 scope enforcement • Automated CVE/CVSS reporting
              </p>
            </div>
            <Link
              to="/scan/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Zap className="w-4 h-4" />
              Launch New Scan
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`bg-slate-900 border ${stat.bg} rounded-xl p-5`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${stat.color}`} />
                </div>
              </div>
              <div className={`text-3xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
              <div className="text-slate-500 text-xs mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Scan scope info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-emerald-400" />
          <h2 className="text-white font-semibold">Authorized Scan Scope (targets.yaml)</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { range: '10.0.0.0/8', label: 'Class A Private', count: '16.7M hosts' },
            { range: '172.16.0.0/12', label: 'Class B Private', count: '1.05M hosts' },
            { range: '192.168.0.0/16', label: 'Class C Private', count: '65.5K hosts' },
          ].map(r => (
            <div key={r.range} className="flex items-center gap-3 px-4 py-3 bg-black/30 border border-emerald-900/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <div>
                <div className="text-emerald-300 font-mono text-sm font-semibold">{r.range}</div>
                <div className="text-slate-500 text-xs">{r.label} • {r.count}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs mt-3 font-mono">
          ⚠ Non-RFC 1918 & public IPs are strictly rejected. Scope enforced by server-side net.isIP() + allowlist check before spawning /usr/bin/nmap.
        </p>
      </div>

      {/* Recent scans */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-white font-semibold">Recent Scans</h2>
          </div>
          <Link to="/history" className="text-emerald-400 text-sm hover:text-emerald-300 flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-800">
          {recent.map(scan => (
            <Link
              key={scan.id}
              to={`/scan/${scan.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-white font-mono font-semibold">{scan.target_ip}</span>
                  <StatusBadge status={scan.status} />
                </div>
                <div className="text-slate-500 text-xs mt-0.5 font-mono">
                  {scan.scan_type} • {formatDateTime(scan.start_time)}
                  {scan.end_time && ` • ${formatDuration(scan.start_time, scan.end_time)}`}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                {scan.risk_rating && <RiskBadge rating={scan.risk_rating} />}
                {typeof scan.findings_count === 'number' && (
                  <div className="text-slate-400 text-sm">
                    <span className={scan.findings_count > 0 ? 'text-orange-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {scan.findings_count}
                    </span>
                    <span className="text-slate-600"> findings</span>
                  </div>
                )}
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
