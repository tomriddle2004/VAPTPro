import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import {
  AlertRule, AlertEvent, createRule, deleteRule, updateRule, loadRules, loadEvents, clearEvents, saveEvents,
} from '@/lib/notifications';
import { Severity } from '@/types';
import SeverityBadge from '@/components/features/SeverityBadge';
import { formatDateTime } from '@/lib/ipValidator';

const SEVERITY_OPTIONS: Severity[] = ['critical', 'high', 'medium', 'low'];

const BLANK_FORM = {
  name: '',
  target_pattern: '*',
  severity_threshold: 'high' as Severity,
  email: '',
  enabled: true,
};

function EventIcon({ sev }: { sev: Severity }) {
  if (sev === 'critical' || sev === 'high')
    return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  if (sev === 'medium')
    return <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />;
  return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
}

function TimeAgo({ iso }: { iso: string }) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return <span>just now</span>;
  if (diffMin < 60) return <span>{diffMin}m ago</span>;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return <span>{diffH}h ago</span>;
  return <span>{Math.floor(diffH / 24)}d ago</span>;
}

export default function Notifications() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'rules' | 'events'>('rules');

  const refresh = () => {
    setRules(loadRules());
    setEvents(loadEvents().sort((a, b) => b.triggered_at.localeCompare(a.triggered_at)));
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Rule name is required.'); return; }
    if (!form.email.trim()) { setError('Email address is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Enter a valid email address.'); return; }
    createRule({ ...form, name: form.name.trim(), email: form.email.trim() });
    setForm({ ...BLANK_FORM });
    refresh();
  };

  const handleToggle = (id: string, enabled: boolean) => {
    updateRule(id, { enabled: !enabled });
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteRule(id);
    refresh();
  };

  const handleClearEvents = () => {
    clearEvents();
    refresh();
  };

  // ── Simulate a test alert ──────────────────────────────────────────────────
  const handleTest = (rule: AlertRule) => {
    const testEvent: AlertEvent = {
      id: `evt-test-${Date.now()}`,
      rule_id: rule.id,
      rule_name: rule.name,
      scan_id: 'test-scan',
      target_ip: rule.target_pattern === '*' ? '192.168.1.100' : rule.target_pattern,
      severity: rule.severity_threshold,
      finding_count: 3,
      triggered_at: new Date().toISOString(),
      delivered: true,
      email: rule.email,
    };
    const evts = loadEvents();
    evts.push(testEvent);
    saveEvents(evts.slice(-200));
    refresh();
  };

  const unreadCount = events.filter(e => {
    const age = Date.now() - new Date(e.triggered_at).getTime();
    return age < 3600000; // last 1h
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center relative">
              <Bell className="w-4 h-4 text-yellow-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            Alert Notifications
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Configure email alert rules — triggered when scans yield matching findings
          </p>
        </div>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors">
          <RefreshCw className="w-4 h-4" />Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        {/* Create rule form */}
        <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 h-fit">
          <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Plus className="w-4 h-4 text-yellow-400" />New Alert Rule
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>RULE NAME</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Critical findings on web servers"
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-yellow-500/50"
                style={{ color: 'var(--text-primary)' }} />
            </div>

            <div>
              <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>TARGET PATTERN</label>
              <input value={form.target_pattern} onChange={e => setForm(f => ({ ...f, target_pattern: e.target.value }))}
                placeholder="* (all) | 10.0.0.0/8 | 192.168.1.100 | corp.local"
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-yellow-500/50"
                style={{ color: 'var(--text-primary)' }} />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Supports: <code>*</code> (all), IPv4, CIDR notation, domain patterns (<code>*.corp.local</code>)
              </p>
            </div>

            <div>
              <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>MINIMUM SEVERITY</label>
              <div className="grid grid-cols-4 gap-1.5">
                {SEVERITY_OPTIONS.map(sev => (
                  <button key={sev} type="button" onClick={() => setForm(f => ({ ...f, severity_threshold: sev }))}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors capitalize ${
                      form.severity_threshold === sev
                        ? sev === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/40'
                          : sev === 'high'   ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                          : sev === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}>
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>ALERT EMAIL</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="security@company.com"
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-yellow-500/50"
                style={{ color: 'var(--text-primary)' }} />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit"
            className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />Create Alert Rule
          </button>

          {/* Info banner */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-300/80 text-xs leading-relaxed">
              Alert rules evaluate after each scan completes. In production, email delivery is handled by the Node.js backend's SMTP transport. Events are logged here for simulation.
            </p>
          </div>
        </form>

        {/* Right panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            {([['rules', `Rules (${rules.length})`], ['events', `Event Log (${events.length})`]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setActiveTab(k)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === k ? 'border-yellow-400 text-yellow-400 bg-yellow-500/5' : 'border-transparent text-slate-400 hover:text-white'
                }`}>{l}</button>
            ))}
          </div>

          {activeTab === 'rules' && (
            <div>
              {rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Bell className="w-10 h-10 text-slate-700" />
                  <p className="text-slate-500 text-sm">No alert rules configured. Create one using the form.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {rules.map(rule => (
                    <div key={rule.id} className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${rule.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: rule.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {rule.name}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold capitalize ${
                            rule.severity_threshold === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : rule.severity_threshold === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            : rule.severity_threshold === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}>{rule.severity_threshold}+</span>
                        </div>
                        <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                          Target: <span className="text-emerald-400">{rule.target_pattern}</span>
                          {' → '}<span className="text-blue-400">{rule.email}</span>
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Created {formatDateTime(rule.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => handleToggle(rule.id, rule.enabled)}
                          className={`p-2 rounded-lg border transition-colors ${
                            rule.enabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'
                          }`} title={rule.enabled ? 'Disable' : 'Enable'}>
                          {rule.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(rule.id)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              {events.length > 0 && (
                <div className="px-4 py-2 border-b border-slate-800 flex justify-end">
                  <button onClick={handleClearEvents} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                    Clear all events
                  </button>
                </div>
              )}
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <CheckCircle2 className="w-10 h-10 text-slate-700" />
                  <p className="text-slate-500 text-sm">No alert events yet. Events appear when scans match your rules.</p>
                  <p className="text-xs text-slate-600">Run a scan from the New Scan page to trigger rules.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
                  {events.map(evt => (
                    <div key={evt.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <EventIcon sev={evt.severity} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{evt.rule_name}</span>
                          <SeverityBadge severity={evt.severity} />
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                            DELIVERED
                          </span>
                        </div>
                        <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
                          <span className="text-emerald-400">{evt.target_ip}</span>
                          {' → '}{evt.finding_count} finding{evt.finding_count !== 1 ? 's' : ''}
                          {' → '}<span className="text-blue-400">{evt.email}</span>
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          <TimeAgo iso={evt.triggered_at} /> · {formatDateTime(evt.triggered_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
