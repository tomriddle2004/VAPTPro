import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllScans, getAllFindings } from '@/lib/storage';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  TrendingUp, BarChart2, Server, Shield, AlertTriangle, Terminal,
} from 'lucide-react';

type Range = '7d' | '30d' | 'all';

// ── Custom tooltip ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs shadow-2xl pointer-events-none">
      <div className="font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <strong style={{ color: p.color }}>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ── CVSS bucket config ────────────────────────────────────────────────────────
const CVSS_BUCKETS = [
  { range: '0.0–3.9', label: 'Low',      color: '#3b82f6', textColor: 'text-blue-400'    },
  { range: '4.0–6.9', label: 'Medium',   color: '#eab308', textColor: 'text-yellow-400'  },
  { range: '7.0–8.9', label: 'High',     color: '#f97316', textColor: 'text-orange-400'  },
  { range: '9.0–10', label: 'Critical',  color: '#ef4444', textColor: 'text-red-400'     },
];

const TOP_COLORS = ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'];

const RISK_STYLES: Record<string, string> = {
  Critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  High:     'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Medium:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Low:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Clean:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export default function Trends() {
  const [range, setRange] = useState<Range>('all');

  const allScans   = useMemo(() => getAllScans(), []);
  const allFindings = useMemo(() => getAllFindings(), []);

  // Completed scans filtered by time range, sorted ascending
  const completedScans = useMemo(() => {
    const sorted = allScans
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (range === 'all') return sorted;
    const cutoff = Date.now() - (range === '7d' ? 7 : 30) * 86_400_000;
    return sorted.filter(s => new Date(s.start_time).getTime() >= cutoff);
  }, [allScans, range]);

  // ── Chart datasets ────────────────────────────────────────────────────────
  const timelineData = useMemo(() =>
    completedScans.map(s => ({
      date:     new Date(s.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      findings: s.findings_count ?? 0,
      ip:       s.target_ip,
    })),
  [completedScans]);

  const cvssData = useMemo(() => {
    const buckets = CVSS_BUCKETS.map(b => ({ ...b, count: 0 }));
    allFindings.forEach(f => {
      const s = f.cvss_score ?? 0;
      if (s === 0) return;
      if (s >= 9.0)      buckets[3].count++;
      else if (s >= 7.0) buckets[2].count++;
      else if (s >= 4.0) buckets[1].count++;
      else               buckets[0].count++;
    });
    return buckets;
  }, [allFindings]);

  const topServicesData = useMemo(() => {
    const map = new Map<string, number>();
    allFindings.forEach(f => {
      const key = `${f.port} · ${f.service}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([service, count]) => ({ service, count }));
  }, [allFindings]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalFindings   = completedScans.reduce((s, c) => s + (c.findings_count ?? 0), 0);
  const criticalScans   = completedScans.filter(s => s.risk_rating === 'Critical').length;
  const avgFindings     = completedScans.length > 0 ? (totalFindings / completedScans.length).toFixed(1) : '—';
  const maxCVSS         = allFindings.reduce((max, f) => Math.max(max, f.cvss_score ?? 0), 0);

  const empty = completedScans.length === 0;

  const STAT_CARDS = [
    { label: 'Completed Scans',     value: completedScans.length, Icon: Shield,         color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Total Findings',      value: totalFindings,         Icon: AlertTriangle,  color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20'   },
    { label: 'Critical Risk Scans', value: criticalScans,         Icon: BarChart2,      color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20'         },
    { label: 'Avg Findings / Scan', value: avgFindings,           Icon: TrendingUp,     color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20'   },
  ];

  const maxTopCount = topServicesData[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            Security Trends &amp; Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Aggregated intelligence across {allScans.filter(s => s.status === 'completed').length} completed assessments
          </p>
        </div>

        {/* Time range pill */}
        <div
          className="flex items-center gap-0.5 p-1 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          {(['7d', '30d', 'all'] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === r
                  ? 'bg-indigo-500 text-white shadow-md'
                  : ''
              }`}
              style={range === r ? {} : { color: 'var(--text-secondary)' }}
            >
              {r === 'all' ? 'All Time' : r === '30d' ? 'Last 30 Days' : 'Last 7 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, Icon, color, bg }) => (
          <div key={label} className={`border rounded-xl p-4 ${bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
            <div className={`text-3xl font-bold font-mono ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Max CVSS callout ── */}
      {maxCVSS > 0 && (
        <div
          className="flex items-center gap-4 border rounded-xl px-5 py-4"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <div className={`text-4xl font-bold font-mono ${maxCVSS >= 9 ? 'text-red-400' : maxCVSS >= 7 ? 'text-orange-400' : 'text-yellow-400'}`}>
            {maxCVSS.toFixed(1)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Highest CVSS score across all findings
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
              <div
                className={`h-full rounded-full ${maxCVSS >= 9 ? 'bg-red-500' : maxCVSS >= 7 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                style={{ width: `${(maxCVSS / 10) * 100}%`, transition: 'width 0.8s ease' }}
              />
            </div>
            <div className="flex justify-between text-[10px] mt-1 font-mono" style={{ color: 'var(--text-faint)' }}>
              <span>0.0</span><span>Low</span><span>Medium</span><span>High</span><span>10.0</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {empty ? (
        <div
          className="border rounded-xl p-16 flex flex-col items-center justify-center gap-4 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <TrendingUp className="w-14 h-14 text-slate-600" />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            No scan data {range !== 'all' ? `in the last ${range}` : 'yet'}
          </h3>
          <p className="text-sm max-w-md" style={{ color: 'var(--text-secondary)' }}>
            Complete at least one vulnerability scan to start seeing trends and analytics visualizations.
          </p>
          <Link to="/scan/new"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-sm transition-colors mt-2">
            <Terminal className="w-4 h-4" />Launch First Scan
          </Link>
        </div>
      ) : (
        <>
          {/* ── 1. Findings over time line chart ── */}
          <div
            className="border rounded-xl p-5"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Findings Over Time
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Total vulnerabilities discovered per completed assessment
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {completedScans.length} data point{completedScans.length !== 1 ? 's' : ''}
              </span>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={timelineData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--border-muted)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="findings"
                  name="Findings"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#0f172a' }}
                  activeDot={{ r: 7, stroke: '#6366f1', strokeWidth: 2, fill: '#818cf8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── 2 & 3. CVSS + Top services ── */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* CVSS distribution */}
            <div
              className="border rounded-xl p-5"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="mb-4">
                <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <BarChart2 className="w-4 h-4 text-orange-400" />
                  CVSS Score Distribution
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Findings bucketed by CVSS severity range (scored findings only)
                </p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cvssData} margin={{ top: 8, right: 10, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Findings" radius={[5, 5, 0, 0]} maxBarSize={56}>
                    {cvssData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 services */}
            <div
              className="border rounded-xl p-5"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="mb-4">
                <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Server className="w-4 h-4 text-cyan-400" />
                  Top 5 Exposed Services &amp; Ports
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Most frequently discovered open ports across all scans
                </p>
              </div>

              {topServicesData.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No service data available</p>
                </div>
              ) : (
                <div className="space-y-4 mt-2">
                  {topServicesData.map((s, i) => {
                    const pct = (s.count / maxTopCount) * 100;
                    return (
                      <div key={s.service}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-bold text-cyan-400 w-4 text-center">{i + 1}</span>
                            {s.service}
                          </span>
                          <span
                            className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: TOP_COLORS[i] + '25', color: TOP_COLORS[i] }}
                          >
                            {s.count}×
                          </span>
                        </div>
                        <div
                          className="h-2.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--bg-input)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: TOP_COLORS[i] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── 4. Risk rating distribution ── */}
          <div
            className="border rounded-xl p-5"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <h2 className="font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
              <Shield className="w-4 h-4 text-emerald-400" />
              Risk Rating Distribution
              <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
                ({completedScans.length} total completed scans)
              </span>
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {(['Critical', 'High', 'Medium', 'Low', 'Clean'] as const).map(rating => {
                const count = completedScans.filter(s => s.risk_rating === rating).length;
                const pct = completedScans.length ? Math.round((count / completedScans.length) * 100) : 0;
                return (
                  <div key={rating} className={`border rounded-xl p-3 text-center ${RISK_STYLES[rating]}`}>
                    <div className="text-2xl font-bold font-mono">{count}</div>
                    <div className="text-xs mt-0.5 font-medium">{rating}</div>
                    <div className="text-xs font-mono opacity-60 mt-0.5">{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
