import { useState, useEffect } from 'react';
import { ShieldCheck, Download, RefreshCw, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { ComplianceFrameworkId, FrameworkResult, EvaluatedControl, RemediationItem } from '@/types';
import { evaluateFramework, getRemediationQueue, FRAMEWORK_DEFS } from '@/lib/compliance';
import { getAllFindings } from '@/lib/storage';
import { generateCompliancePDF } from '@/lib/compliancePDF';
import SeverityBadge from '@/components/features/SeverityBadge';

function ScoreRing({ score }: { score: number }) {
  const r = 68, cx = 88, cy = 88, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#eab308' : '#ef4444';
  return (
    <svg width="176" height="176" viewBox="0 0 176 176">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="14" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="14"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="30" fontWeight="bold" fontFamily="monospace">{score}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">POSTURE SCORE</text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill={color} fontSize="8" fontFamily="monospace">
        {score >= 70 ? 'GOOD' : score >= 40 ? 'MODERATE' : 'POOR'}
      </text>
    </svg>
  );
}

function ControlRow({ control, onExpand, expanded }: { control: EvaluatedControl; onExpand: () => void; expanded: boolean }) {
  const statusCfg = {
    pass: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'PASS' },
    fail: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'FAIL' },
    na: { icon: MinusCircle, color: 'text-slate-500', bg: 'bg-slate-800/50 border-slate-700', label: 'N/A' },
  }[control.status];
  const Icon = statusCfg.icon;

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-colors">
      <button onClick={onExpand} className="w-full flex items-center gap-3 p-3 bg-slate-900/50 hover:bg-slate-900 text-left transition-colors">
        <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${
          control.status === 'fail' ? 'bg-red-500' : control.status === 'pass' ? 'bg-emerald-500' : 'bg-slate-600'
        }`} />
        <div className="flex-1 grid grid-cols-[5rem_1fr_6rem_5rem_4.5rem_4rem] gap-2 items-center min-w-0">
          <span className="text-blue-400 font-mono text-xs font-bold">{control.id}</span>
          <span className="text-slate-300 text-sm truncate">{control.name}</span>
          <span className="text-slate-500 text-xs truncate">{control.category}</span>
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border ${statusCfg.bg} ${statusCfg.color}`}>
            <Icon className="w-3 h-3" />{statusCfg.label}
          </span>
          <span className={`text-sm font-mono font-bold text-center ${control.affectedFindings.length > 0 ? 'text-orange-400' : 'text-slate-600'}`}>
            {control.affectedFindings.length > 0 ? control.affectedFindings.length : '—'}
          </span>
          <span className={`text-sm font-mono font-bold text-center ${
            control.maxCVSS >= 9 ? 'text-red-400' : control.maxCVSS >= 7 ? 'text-orange-400' :
            control.maxCVSS >= 4 ? 'text-yellow-400' : 'text-slate-600'
          }`}>
            {control.maxCVSS > 0 ? control.maxCVSS.toFixed(1) : '—'}
          </span>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="border-t border-slate-800 bg-black/20 p-4 grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-slate-500 text-xs font-mono mb-1">DESCRIPTION</p>
            <p className="text-slate-400 text-sm leading-relaxed">{control.description}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs font-mono mb-1">REMEDIATION</p>
            <p className="text-emerald-300/70 text-sm leading-relaxed">{control.remediation}</p>
            {control.affectedFindings.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {control.affectedFindings.slice(0, 4).map(f => (
                  <span key={f.id} className="text-[10px] px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-slate-400">
                    {f.port}/{f.protocol} {f.service}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Compliance() {
  const [activeFramework, setActiveFramework] = useState<ComplianceFrameworkId>('owasp');
  const [result, setResult] = useState<FrameworkResult | null>(null);
  const [queue, setQueue] = useState<RemediationItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pass' | 'fail' | 'na'>('all');
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'matrix' | 'queue'>('matrix');

  useEffect(() => {
    const findings = getAllFindings();
    const r = evaluateFramework(activeFramework, findings);
    setResult(r);
    setQueue(getRemediationQueue(r));
    setExpanded(null);
  }, [activeFramework]);

  if (!result) return null;

  const filtered = result.controls.filter(c => filter === 'all' || c.status === filter);

  const handleExport = async () => {
    setExporting(true);
    await generateCompliancePDF(result);
    setExporting(false);
  };

  const effortColor = (e: string) =>
    e === 'Low' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
    e === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
    'bg-red-500/20 text-red-400 border-red-500/30';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            Compliance Analyzer
          </h1>
          <p className="text-slate-400 text-sm mt-1">Framework gap analysis across all completed scans</p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-60">
          <Download className="w-4 h-4" />
          {exporting ? 'Generating...' : 'Export PDF Report'}
        </button>
      </div>

      {/* Framework selector */}
      <div className="flex gap-2 flex-wrap">
        {FRAMEWORK_DEFS.map(f => (
          <button key={f.id} onClick={() => setActiveFramework(f.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              activeFramework === f.id
                ? 'bg-emerald-500/20 border-emerald-500/40 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}>
            <span>{f.icon}</span>
            <span>{f.name}</span>
            <span className={`text-xs font-mono ${activeFramework === f.id ? 'text-emerald-400' : 'text-slate-600'}`}>{f.version}</span>
          </button>
        ))}
      </div>

      {/* Score + Stats */}
      <div className="grid md:grid-cols-[auto_1fr] gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
          <ScoreRing score={result.score} />
          <div className="text-slate-400 text-sm mt-1 font-semibold">{result.name} {result.version}</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Controls Passed', value: result.passed, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Controls Failed', value: result.failed, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
            { label: 'Not Applicable', value: result.na, color: 'text-slate-500', bg: 'bg-slate-800 border-slate-700' },
            { label: 'Total Controls', value: result.controls.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Findings Mapped', value: result.controls.reduce((s, c) => s + c.affectedFindings.length, 0), color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
            { label: 'Pass Rate', value: `${result.score}%`, color: result.score >= 70 ? 'text-emerald-400' : result.score >= 40 ? 'text-yellow-400' : 'text-red-400', bg: 'bg-slate-900 border-slate-800' },
          ].map(s => (
            <div key={s.label} className={`border rounded-xl p-4 ${s.bg}`}>
              <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-800">
          {([['matrix', 'Control Gap Matrix'], ['queue', 'Remediation Queue']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setActiveTab(k)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === k ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400 hover:text-white'
              }`}>{l}</button>
          ))}
        </div>

        {activeTab === 'matrix' && (
          <div className="p-4 space-y-3">
            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 text-xs">Filter:</span>
              {(['all', 'fail', 'pass', 'na'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors border ${
                    filter === f ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-slate-400 bg-slate-800 border-slate-700 hover:text-white'
                  }`}>
                  {f === 'all' ? `All (${result.controls.length})` : f === 'fail' ? `Failed (${result.failed})` : f === 'pass' ? `Passed (${result.passed})` : `N/A (${result.na})`}
                </button>
              ))}
              {/* Column headers */}
              <div className="ml-auto hidden md:grid grid-cols-[5rem_1fr_6rem_5rem_4.5rem_4rem] gap-2 pr-8 text-[10px] text-slate-600 font-mono w-full max-w-2xl">
                <span>ID</span><span>CONTROL</span><span>CATEGORY</span><span>STATUS</span><span>FINDINGS</span><span>CVSS</span>
              </div>
            </div>
            <div className="space-y-2">
              {filtered.map(ctrl => (
                <ControlRow key={ctrl.id} control={ctrl}
                  expanded={expanded === ctrl.id}
                  onExpand={() => setExpanded(expanded === ctrl.id ? null : ctrl.id)} />
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-500">No controls match this filter.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="p-4 space-y-3">
            {queue.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold text-lg">No Remediation Required</h3>
                <p className="text-slate-400 text-sm mt-1">All evaluated controls are passing for this framework.</p>
              </div>
            ) : (
              queue.map(item => (
                <div key={item.control.id} className="flex gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold font-mono text-lg ${
                    item.priority <= 3 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    item.priority <= 6 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>{item.priority}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-blue-400 font-mono text-xs font-bold">{item.control.id}</span>
                      <span className="text-white font-semibold text-sm">{item.control.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${effortColor(item.estimatedEffort)}`}>
                        {item.estimatedEffort} Effort
                      </span>
                      {item.maxCVSS > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${
                          item.maxCVSS >= 9 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        }`}>CVSS {item.maxCVSS.toFixed(1)}</span>
                      )}
                    </div>
                    <p className="text-emerald-300/70 text-xs leading-relaxed">{item.control.remediation}</p>
                    {item.control.affectedFindings.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        <span className="text-slate-600 text-[10px]">Affected:</span>
                        {item.control.affectedFindings.slice(0, 5).map(f => (
                          <span key={f.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono">
                            <SeverityBadge severity={f.severity} />
                            <span className="text-slate-400">{f.port}/{f.protocol}</span>
                          </span>
                        ))}
                        {item.control.affectedFindings.length > 5 && (
                          <span className="text-slate-600 text-[10px]">+{item.control.affectedFindings.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-slate-500 text-xs">{item.findingCount} finding{item.findingCount !== 1 ? 's' : ''}</div>
                    <div className="text-slate-600 text-[10px]">{item.control.category}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
