import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Play, ToggleLeft, ToggleRight, Clock, Shield } from 'lucide-react';
import { ScheduledScan, ScanType, ScheduleFrequency } from '@/types';
import { getAllSchedules, createSchedule, updateSchedule, deleteSchedule, computeNextRun, getOccurrencesInRange, DAY_NAMES, DAY_SHORT } from '@/lib/scheduler';
import { validateScanTarget } from '@/lib/ipValidator';
import { SCAN_PROFILES } from '@/constants/scanProfiles';
import { simulateScan } from '@/lib/simulateScan';
import { useNavigate } from 'react-router-dom';

const FREQ_OPTIONS: { id: ScheduleFrequency; label: string; icon: string }[] = [
  { id: 'daily', label: 'Daily', icon: '📅' },
  { id: 'weekly', label: 'Weekly', icon: '📆' },
  { id: 'monthly', label: 'Monthly', icon: '🗓' },
];

function formatNextRun(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = Math.round(diffMs / 3600000);
  if (diffH < 1) return 'in < 1 hour';
  if (diffH < 24) return `in ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return 'tomorrow';
  return `in ${diffD} days`;
}

function MiniCalendar({ schedules }: { schedules: ScheduledScan[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 13); // 14 days lookahead
  end.setHours(23, 59, 59, 999);

  // Build day map
  const dayMap: Record<string, ScheduledScan[]> = {};
  for (const sched of schedules.filter(s => s.enabled)) {
    const occs = getOccurrencesInRange(sched, today, end);
    for (const occ of occs) {
      const key = occ.toDateString();
      dayMap[key] = [...(dayMap[key] ?? []), sched];
    }
  }

  const days: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {DAY_SHORT.map(d => (
        <div key={d} className="text-center text-[10px] text-slate-600 font-mono py-1">{d}</div>
      ))}
      {/* Fill leading empty cells */}
      {Array.from({ length: today.getDay() }).map((_, i) => <div key={`e${i}`} />)}
      {days.map(day => {
        const key = day.toDateString();
        const scans = dayMap[key] ?? [];
        const isToday = day.toDateString() === new Date().toDateString();
        return (
          <div key={key} className={`relative rounded-lg p-1.5 min-h-[44px] ${
            isToday ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-slate-900/50 border border-slate-800'
          }`}>
            <div className={`text-xs font-mono font-bold ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}>
              {day.getDate()}
            </div>
            {scans.slice(0, 2).map((s, i) => (
              <div key={i} title={`${s.name} — ${s.time}`}
                className="text-[8px] truncate rounded px-0.5 mt-0.5 font-mono"
                style={{ background: s.scan_type === 'comprehensive' ? '#7c2d12' : s.scan_type === 'vulnerability' ? '#1e3a5f' : '#064e3b', color: '#fff' }}>
                {s.time}
              </div>
            ))}
            {scans.length > 2 && <div className="text-[8px] text-slate-600">+{scans.length - 2}</div>}
          </div>
        );
      })}
    </div>
  );
}

const INITIAL_FORM = {
  name: '', target_ip: '', scan_type: 'fast' as ScanType,
  frequency: 'weekly' as ScheduleFrequency,
  time: '08:00', day_of_week: 1, day_of_month: 1, enabled: true,
};

export default function Scheduler() {
  const [schedules, setSchedules] = useState<ScheduledScan[]>([]);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { setSchedules(getAllSchedules()); }, []);

  const refresh = () => setSchedules(getAllSchedules());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError('Schedule name is required.'); return; }
    const v = validateScanTarget(form.target_ip);
    if (!v.valid) { setError(v.error); return; }
    createSchedule({
      name: form.name.trim(),
      target_ip: form.target_ip.trim(),
      scan_type: form.scan_type,
      frequency: form.frequency,
      time: form.time,
      day_of_week: form.frequency === 'weekly' ? form.day_of_week : undefined,
      day_of_month: form.frequency === 'monthly' ? form.day_of_month : undefined,
      enabled: true,
    });
    setForm({ ...INITIAL_FORM });
    refresh();
  };

  const handleRunNow = (sched: ScheduledScan) => {
    setRunningId(sched.id);
    simulateScan(sched.target_ip, sched.scan_type, {
      onProgress: () => {},
      onComplete: (scan) => { setRunningId(null); navigate(`/scan/${scan.id}`); },
      onError: () => setRunningId(null),
    });
  };

  const toggleEnabled = (id: string, enabled: boolean) => {
    updateSchedule(id, { enabled: !enabled });
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteSchedule(id);
    refresh();
  };

  const upcoming = schedules.filter(s => s.enabled).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          Scan Scheduler
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure recurring scans — requires the backend server for automated execution</p>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 h-fit">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />Schedule a Scan
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs font-mono mb-1 block">SCHEDULE NAME</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Weekly Web Server Scan"
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
            </div>

            <div>
              <label className="text-slate-400 text-xs font-mono mb-1 block">TARGET IP (RFC 1918 only)</label>
              <input value={form.target_ip} onChange={e => setForm(f => ({ ...f, target_ip: e.target.value }))}
                placeholder="192.168.1.100"
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
            </div>

            <div>
              <label className="text-slate-400 text-xs font-mono mb-1 block">SCAN PROFILE</label>
              <div className="grid grid-cols-3 gap-2">
                {SCAN_PROFILES.map(p => (
                  <button key={p.id} type="button" onClick={() => setForm(f => ({ ...f, scan_type: p.id }))}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      form.scan_type === p.id ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}>
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs font-mono mb-1 block">FREQUENCY</label>
              <div className="grid grid-cols-3 gap-2">
                {FREQ_OPTIONS.map(f => (
                  <button key={f.id} type="button" onClick={() => setForm(fm => ({ ...fm, frequency: f.id }))}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      form.frequency === f.id ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}>
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs font-mono mb-1 block">TIME (24h)</label>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
              </div>
              {form.frequency === 'weekly' && (
                <div>
                  <label className="text-slate-400 text-xs font-mono mb-1 block">DAY OF WEEK</label>
                  <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: +e.target.value }))}
                    className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50">
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}
              {form.frequency === 'monthly' && (
                <div>
                  <label className="text-slate-400 text-xs font-mono mb-1 block">DAY OF MONTH</label>
                  <input type="number" min={1} max={28} value={form.day_of_month}
                    onChange={e => setForm(f => ({ ...f, day_of_month: +e.target.value }))}
                    className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit"
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />Add Schedule
          </button>
        </form>

        {/* Right panel */}
        <div className="space-y-5">
          {/* Calendar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />14-Day Schedule View
            </h2>
            <MiniCalendar schedules={schedules} />
          </div>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />Next Scheduled Runs
              </h2>
              <div className="space-y-2">
                {upcoming.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-semibold truncate">{s.name}</div>
                      <div className="text-slate-500 text-xs font-mono">{s.target_ip} • {s.scan_type}</div>
                    </div>
                    <div className="text-blue-400 text-xs font-mono flex-shrink-0">{formatNextRun(s.next_run)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedules list */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">All Schedules ({schedules.length})</h2>
            </div>
            {schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Calendar className="w-10 h-10 text-slate-700" />
                <p className="text-slate-500 text-sm">No scheduled scans. Create one using the form.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {schedules.map(sched => (
                  <div key={sched.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${sched.enabled ? 'text-white' : 'text-slate-500'}`}>{sched.name}</span>
                        <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-400 capitalize">{sched.frequency}</span>
                        <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-400">{sched.scan_type}</span>
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5 font-mono">
                        {sched.target_ip} • {sched.time}
                        {sched.frequency === 'weekly' && ` every ${DAY_SHORT[sched.day_of_week ?? 1]}`}
                        {sched.frequency === 'monthly' && ` on day ${sched.day_of_month}`}
                        {' • '}Next: {formatNextRun(sched.next_run)}
                      </div>
                      {sched.run_count > 0 && (
                        <div className="text-slate-600 text-[10px] mt-0.5">{sched.run_count} run{sched.run_count !== 1 ? 's' : ''} completed</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleRunNow(sched)} disabled={runningId === sched.id}
                        className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-colors disabled:opacity-50" title="Run Now">
                        {runningId === sched.id ? (
                          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        ) : <Play className="w-4 h-4" />}
                      </button>
                      <button onClick={() => toggleEnabled(sched.id, sched.enabled)}
                        className={`p-2 rounded-lg border transition-colors ${sched.enabled ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'}`}
                        title={sched.enabled ? 'Disable' : 'Enable'}>
                        {sched.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(sched.id)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
