import { useState, useEffect } from 'react';
import {
  List, Plus, Trash2, Copy, Check, RotateCcw,
  Shield, Globe, Network, AlertTriangle, Info,
} from 'lucide-react';
import {
  AllowlistTarget, AllowlistTargetType,
  loadAllowlist, addEntry, removeEntry, resetToDefaults,
  generateYAML, detectType,
} from '@/lib/allowlist';
import { formatDateTime } from '@/lib/ipValidator';

const TYPE_META: Record<AllowlistTargetType, { label: string; icon: typeof Shield; color: string; bg: string }> = {
  ip:     { label: 'IPv4',   icon: Shield,  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  cidr:   { label: 'CIDR',   icon: Network, color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20'   },
  domain: { label: 'Domain', icon: Globe,   color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20' },
};

export default function Allowlist() {
  const [entries, setEntries] = useState<AllowlistTarget[]>([]);
  const [value, setValue] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const refresh = () => setEntries(loadAllowlist());
  useEffect(() => { refresh(); }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const v = value.trim();
    if (!v) { setError('Target value is required.'); return; }
    // Basic dup check
    if (entries.some(e => e.value.toLowerCase() === v.toLowerCase())) {
      setError('This target is already in the allowlist.'); return;
    }
    const type = detectType(v);
    addEntry({ type, value: v, comment: comment.trim() });
    setValue('');
    setComment('');
    refresh();
  };

  const handleRemove = (id: string, isDefault: boolean) => {
    if (isDefault) {
      if (!window.confirm('Remove a default RFC 1918 range? This may restrict scan scope.')) return;
    }
    removeEntry(id);
    refresh();
  };

  const handleReset = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    resetToDefaults();
    setResetConfirm(false);
    refresh();
  };

  const handleCopyYAML = async () => {
    const yaml = generateYAML(entries);
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = yaml;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const DEFAULT_IDS = new Set(['def-1', 'def-2', 'def-3', 'def-4']);

  const counts = entries.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1; return acc;
  }, {} as Record<string, number>);

  const yaml = generateYAML(entries);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <List className="w-4 h-4 text-blue-400" />
            </div>
            Targets Allowlist
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Authorized scan targets — mirrors <code className="font-mono text-xs bg-black/30 px-1 rounded">/etc/vapt-app/targets.yaml</code> on the Linux backend
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              resetConfirm
                ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}>
            <RotateCcw className="w-4 h-4" />
            {resetConfirm ? 'Confirm Reset' : 'Reset to Defaults'}
          </button>
          <button onClick={handleCopyYAML}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-sm transition-colors">
            {copied ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy YAML</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { type: 'cidr',   label: 'CIDR Subnets',  count: counts.cidr ?? 0 },
          { type: 'ip',     label: 'IPv4 Addresses', count: counts.ip ?? 0 },
          { type: 'domain', label: 'Domains/FQDNs',  count: counts.domain ?? 0 },
        ].map(s => {
          const meta = TYPE_META[s.type as AllowlistTargetType];
          const MetaIcon = meta.icon;
          return (
            <div key={s.type} className={`border rounded-xl p-4 ${meta.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <MetaIcon className={`w-4 h-4 ${meta.color}`} />
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              </div>
              <div className={`text-3xl font-bold font-mono ${meta.color}`}>{s.count}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        {/* Add form */}
        <div className="space-y-5">
          <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Plus className="w-4 h-4 text-blue-400" />Add Target
            </h2>

            <div>
              <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>TARGET VALUE</label>
              <input value={value} onChange={e => { setValue(e.target.value); setError(''); }}
                placeholder="192.168.10.0/24 | 10.5.0.100 | server.corp.local"
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                style={{ color: 'var(--text-primary)' }} />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Type is auto-detected: CIDR if contains /, IP if pure digits, else Domain
              </p>
            </div>

            <div>
              <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>COMMENT (optional)</label>
              <input value={comment} onChange={e => setComment(e.target.value)}
                placeholder="e.g. Production web servers"
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                style={{ color: 'var(--text-primary)' }} />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit"
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />Add to Allowlist
            </button>
          </form>

          {/* Info */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-yellow-300/80 text-xs leading-relaxed space-y-1">
                <p className="font-semibold text-yellow-300">Backend Enforcement</p>
                <p>On the Linux backend, the allowlist is read from <code className="bg-black/30 px-1 rounded font-mono">targets.yaml</code> at startup. Changes made here must be exported (Copy YAML) and deployed to the server to take effect in production.</p>
              </div>
            </div>
          </div>

          {/* YAML preview */}
          <div className="bg-black border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
              <span className="text-xs font-mono text-slate-400">targets.yaml preview</span>
              <button onClick={handleCopyYAML}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
              </button>
            </div>
            <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64 leading-5">
              {yaml}
            </pre>
          </div>
        </div>

        {/* Entries table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Authorized Targets ({entries.length})
            </h2>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Info className="w-3 h-3" />Click rows to remove
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <List className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm">No targets in allowlist.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {/* Header row */}
              <div className="grid grid-cols-[6rem_1fr_2fr_auto] gap-3 px-5 py-2 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>TYPE</span><span>VALUE</span><span>COMMENT</span><span>ADDED</span>
              </div>
              {entries.map(entry => {
                const meta = TYPE_META[entry.type];
                const MetaIcon = meta.icon;
                const isDefault = DEFAULT_IDS.has(entry.id);
                return (
                  <div key={entry.id}
                    className="grid grid-cols-[6rem_1fr_2fr_auto] gap-3 items-center px-5 py-3 hover:bg-white/[0.02] transition-colors group">
                    <div>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-bold ${meta.bg} ${meta.color}`}>
                        <MetaIcon className="w-3 h-3" />{meta.label}
                      </span>
                    </div>
                    <div className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                      {entry.value}
                      {isDefault && <span className="ml-2 text-[9px] text-slate-600">(default)</span>}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {entry.comment || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] hidden lg:block" style={{ color: 'var(--text-muted)' }}>
                        {new Date(entry.added_at).toLocaleDateString()}
                      </span>
                      <button onClick={() => handleRemove(entry.id, isDefault)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
