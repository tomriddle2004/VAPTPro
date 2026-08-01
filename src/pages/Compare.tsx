import { useState, useEffect } from 'react';
import { GitCompare, ArrowRight, ArrowLeft, Minus, Plus, RefreshCw } from 'lucide-react';
import { getAllScans, getScanById } from '@/lib/storage';
import { Scan, ScanDetail, Finding } from '@/types';
import SeverityBadge from '@/components/features/SeverityBadge';
import { formatDateTime } from '@/lib/ipValidator';

// ── Diff logic ───────────────────────────────────────────────────────────────

function findingKey(f: Finding) { return `${f.port}/${f.protocol}:${f.service}`; }

interface FindingChange {
  fA: Finding;
  fB: Finding;
  cvssChange: number;
  severityChanged: boolean;
}

interface DiffResult {
  newInB: Finding[];       // In B but not A
  resolvedInA: Finding[];  // In A but not B (resolved)
  changed: FindingChange[]; // In both with score/severity change
  unchanged: FindingChange[]; // In both, no change
}

function computeDiff(scanA: ScanDetail, scanB: ScanDetail): DiffResult {
  const mapA = new Map(scanA.findings.map(f => [findingKey(f), f]));
  const mapB = new Map(scanB.findings.map(f => [findingKey(f), f]));

  const newInB = scanB.findings.filter(f => !mapA.has(findingKey(f)));
  const resolvedInA = scanA.findings.filter(f => !mapB.has(findingKey(f)));

  const common: FindingChange[] = scanA.findings
    .filter(f => mapB.has(findingKey(f)))
    .map(fA => {
      const fB = mapB.get(findingKey(fA))!;
      return {
        fA, fB,
        cvssChange: (fB.cvss_score ?? 0) - (fA.cvss_score ?? 0),
        severityChanged: fA.severity !== fB.severity,
      };
    });

  return {
    newInB,
    resolvedInA,
    changed: common.filter(c => c.cvssChange !== 0 || c.severityChanged),
    unchanged: common.filter(c => c.cvssChange === 0 && !c.severityChanged),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScanSelector({
  label, icon: Icon, accent, scans, selectedId, onChange,
}: {
  label: string;
  icon: typeof ArrowLeft;
  accent: string;
  scans: Scan[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        <Icon className={`w-4 h-4 ${accent}`} />{label}
      </label>
      <select
        value={selectedId}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-500/50"
        style={{ color: 'var(--text-primary)' }}
      >
        <option value="">— Select a scan —</option>
        {scans.filter(s => s.status === 'completed').map(s => (
          <option key={s.id} value={s.id}>
            {s.target_ip} · {s.scan_type} · {new Date(s.start_time).toLocaleDateString()} · {s.findings_count ?? 0} findings
          </option>
        ))}
      </select>
    </div>
  );
}

function CvssChange({ change }: { change: number }) {
  if (change === 0) return <span className="text-slate-500 text-xs">—</span>;
  const up = change > 0;
  return (
    <span className={`text-xs font-bold font-mono ${up ? 'text-red-400' : 'text-emerald-400'}`}>
      {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}
    </span>
  );
}

function FindingRow({ finding, variant, cvssChange }: {
  finding: Finding;
  variant: 'new' | 'resolved' | 'changed' | 'unchanged';
  cvssChange?: number;
}) {
  const bgMap = {
    new:       'bg-red-500/10 border-l-2 border-l-red-500',
    resolved:  'bg-emerald-500/10 border-l-2 border-l-emerald-500',
    changed:   'bg-yellow-500/10 border-l-2 border-l-yellow-500',
    unchanged: 'border-l-2 border-l-transparent',
  };

  return (
    <div className={`grid grid-cols-[2rem_5rem_6rem_1fr_5rem_5rem] gap-2 items-center px-4 py-2.5 text-sm rounded hover:bg-white/[0.02] transition-colors ${bgMap[variant]}`}>
      <div className="flex items-center justify-center">
        {variant === 'new'       && <Plus  className="w-3.5 h-3.5 text-red-400" />}
        {variant === 'resolved'  && <Minus className="w-3.5 h-3.5 text-emerald-400" />}
        {variant === 'changed'   && <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />}
        {variant === 'unchanged' && <span className="w-3.5 h-3.5 rounded-full bg-slate-700 inline-block" />}
      </div>
      <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{finding.port}/{finding.protocol}</span>
      <span className="font-mono text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{finding.service}</span>
      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{finding.version || '—'}</span>
      <div><SeverityBadge severity={finding.severity} /></div>
      <div className="text-center">
        {cvssChange !== undefined
          ? <CvssChange change={cvssChange} />
          : <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              {finding.cvss_score?.toFixed(1) ?? '—'}
            </span>
        }
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Compare() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [scanA, setScanA] = useState<ScanDetail | null>(null);
  const [scanB, setScanB] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setScans(getAllScans()); }, []);

  useEffect(() => {
    if (!idA || !idB || idA === idB) { setDiff(null); setScanA(null); setScanB(null); return; }
    setLoading(true);
    const a = getScanById(idA);
    const b = getScanById(idB);
    if (a && b) {
      setScanA(a); setScanB(b);
      setDiff(computeDiff(a, b));
    }
    setLoading(false);
  }, [idA, idB]);

  const completedScans = scans.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <GitCompare className="w-4 h-4 text-cyan-400" />
          </div>
          Scan Comparison
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Side-by-side findings diff — new vulnerabilities, resolved issues, and CVSS score changes
        </p>
      </div>

      {/* Scan selectors */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 grid sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
        <ScanSelector label="Scan A (Baseline)" icon={ArrowLeft} accent="text-blue-400"
          scans={completedScans} selectedId={idA} onChange={setIdA} />
        <div className="flex items-center justify-center pb-1">
          <GitCompare className="w-6 h-6 text-slate-600" />
        </div>
        <ScanSelector label="Scan B (Comparison)" icon={ArrowRight} accent="text-emerald-400"
          scans={completedScans} selectedId={idB} onChange={setIdB} />
      </div>

      {idA === idB && idA !== '' && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
          Please select two different scans to compare.
        </div>
      )}

      {/* Scan summary cards */}
      {scanA && scanB && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { scan: scanA, label: 'Scan A — Baseline', accent: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { scan: scanB, label: 'Scan B — Comparison', accent: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          ].map(({ scan, label, accent, bg }) => (
            <div key={scan.id} className={`border rounded-xl p-4 ${bg}`}>
              <div className={`text-xs font-mono font-bold mb-2 ${accent}`}>{label}</div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{scan.target_ip}</span>
                <span className="text-xs px-2 py-0.5 bg-slate-800 border border-slate-700 rounded capitalize font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {scan.scan_type}
                </span>
              </div>
              <div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                {formatDateTime(scan.start_time)} · {scan.findings.length} findings
              </div>
              <div className="flex gap-3 mt-3 flex-wrap">
                {(['critical', 'high', 'medium', 'low'] as const).map(sev => {
                  const count = scan.findings.filter(f => f.severity === sev).length;
                  return count > 0 ? (
                    <div key={sev} className="flex items-center gap-1">
                      <SeverityBadge severity={sev} />
                      <span className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{count}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diff summary */}
      {diff && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New Findings', count: diff.newInB.length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: Plus },
            { label: 'Resolved', count: diff.resolvedInA.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Minus },
            { label: 'Score Changed', count: diff.changed.length, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: RefreshCw },
            { label: 'Unchanged', count: diff.unchanged.length, color: 'text-slate-400', bg: 'bg-slate-800 border-slate-700', icon: GitCompare },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`border rounded-xl p-4 ${s.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
                <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.count}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Diff table */}
      {diff && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[2rem_5rem_6rem_1fr_5rem_5rem] gap-2 px-4 py-2.5 bg-black/20 border-b border-slate-800 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            <span></span>
            <span>PORT</span>
            <span>SERVICE</span>
            <span>VERSION</span>
            <span>SEVERITY</span>
            <span className="text-center">CVSS Δ</span>
          </div>

          <div className="divide-y divide-slate-800/50">
            {/* New findings */}
            {diff.newInB.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-red-500/5 flex items-center gap-2">
                  <Plus className="w-3 h-3 text-red-400" />
                  <span className="text-xs font-bold text-red-400">NEW IN SCAN B ({diff.newInB.length})</span>
                </div>
                {diff.newInB.map(f => <FindingRow key={f.id} finding={f} variant="new" />)}
              </div>
            )}

            {/* Resolved */}
            {diff.resolvedInA.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-emerald-500/5 flex items-center gap-2">
                  <Minus className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">RESOLVED (not in B) ({diff.resolvedInA.length})</span>
                </div>
                {diff.resolvedInA.map(f => <FindingRow key={f.id} finding={f} variant="resolved" />)}
              </div>
            )}

            {/* Score/severity changed */}
            {diff.changed.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-yellow-500/5 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400">CHANGED (CVSS / SEVERITY) ({diff.changed.length})</span>
                </div>
                {diff.changed.map(c => <FindingRow key={c.fB.id} finding={c.fB} variant="changed" cvssChange={c.cvssChange} />)}
              </div>
            )}

            {/* Unchanged */}
            {diff.unchanged.length > 0 && (
              <div>
                <div className="px-4 py-1.5 flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>UNCHANGED ({diff.unchanged.length})</span>
                </div>
                {diff.unchanged.map(c => <FindingRow key={c.fB.id} finding={c.fB} variant="unchanged" />)}
              </div>
            )}

            {!diff.newInB.length && !diff.resolvedInA.length && !diff.changed.length && !diff.unchanged.length && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <GitCompare className="w-10 h-10 text-slate-700" />
                <p className="text-slate-500 text-sm">Both scans have no findings to compare.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!diff && !loading && completedScans.length < 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center">
          <GitCompare className="w-12 h-12 text-slate-700" />
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Need at least 2 completed scans</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Run more scans against different targets or the same target at different times to compare results.
          </p>
        </div>
      )}
    </div>
  );
}
