import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getScanById } from '@/lib/storage';
import { ScanDetail as ScanDetailType } from '@/types';
import { formatDateTime, formatDuration } from '@/lib/ipValidator';
import StatusBadge from '@/components/features/StatusBadge';
import RiskBadge from '@/components/features/RiskBadge';
import SeverityBadge from '@/components/features/SeverityBadge';
import VulnerabilityMatrix from '@/components/features/VulnerabilityMatrix';
import { generatePDFReport } from '@/lib/pdfReport';
import {
  ArrowLeft, Download, RefreshCw, Shield, Server,
  AlertTriangle, CheckCircle2, Info, Terminal, Cpu
} from 'lucide-react';
import { SCAN_PROFILES } from '@/constants/scanProfiles';

export default function ScanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scan, setScan] = useState<ScanDetailType | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'findings' | 'info' | 'raw'>('findings');

  useEffect(() => {
    if (id) {
      const detail = getScanById(id);
      if (!detail) navigate('/history');
      else setScan(detail);
    }
  }, [id]);

  if (!scan) return null;

  const profile = SCAN_PROFILES.find(p => p.id === scan.scan_type);
  const criticals = scan.findings.filter(f => f.severity === 'critical');
  const highs = scan.findings.filter(f => f.severity === 'high');
  const mediums = scan.findings.filter(f => f.severity === 'medium');
  const lows = scan.findings.filter(f => f.severity === 'low');

  const handleDownload = async () => {
    setIsDownloading(true);
    await generatePDFReport(scan);
    setIsDownloading(false);
  };

  const maxCVSS = scan.findings.reduce((max, f) => Math.max(max, f.cvss_score ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-slate-500 hover:text-slate-300">Dashboard</Link>
        <span className="text-slate-700">/</span>
        <Link to="/history" className="text-slate-500 hover:text-slate-300">Scan History</Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300 font-mono">{scan.target_ip}</span>
      </div>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link to="/history" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors flex-shrink-0 mt-1">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white font-mono">{scan.target_ip}</h1>
                <StatusBadge status={scan.status} />
                {scan.risk_rating && <RiskBadge rating={scan.risk_rating} size="md" />}
              </div>
              {scan.hostname && (
                <div className="text-slate-400 text-sm mt-0.5 font-mono">{scan.hostname}</div>
              )}
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                <span>{profile?.icon} {profile?.label}</span>
                <span>📅 {formatDateTime(scan.start_time)}</span>
                {scan.end_time && <span>⏱ {formatDuration(scan.start_time, scan.end_time)}</span>}
                {scan.os_detection && <span>🖥 {scan.os_detection}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              to="/scan/new"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Re-run
            </Link>
            {scan.status === 'completed' && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-colors text-sm disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                {isDownloading ? 'Generating...' : 'Download PDF Report'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Critical', count: criticals.length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: '🔴' },
          { label: 'High', count: highs.length, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: '🟠' },
          { label: 'Medium', count: mediums.length, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: '🟡' },
          { label: 'Low', count: lows.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: '🔵' },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 text-center ${s.bg}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.count}</div>
            <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Max CVSS indicator */}
      {maxCVSS > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className={`text-4xl font-bold font-mono ${
              maxCVSS >= 9 ? 'text-red-400' : maxCVSS >= 7 ? 'text-orange-400' : maxCVSS >= 4 ? 'text-yellow-400' : 'text-blue-400'
            }`}>{maxCVSS.toFixed(1)}</div>
            <div className="text-slate-500 text-xs text-center">Max CVSS</div>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  maxCVSS >= 9 ? 'bg-red-500' : maxCVSS >= 7 ? 'bg-orange-500' : maxCVSS >= 4 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${(maxCVSS / 10) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>0.0</span><span>Low</span><span>Medium</span><span>High</span><span>Critical 10.0</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-800">
          {[
            { key: 'findings', label: 'Vulnerability Matrix', icon: AlertTriangle, count: scan.findings.length },
            { key: 'info', label: 'Host Information', icon: Server, count: null },
            { key: 'raw', label: 'Nmap Command', icon: Terminal, count: null },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== null && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                  tab.count > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'findings' && (
            <VulnerabilityMatrix findings={scan.findings} />
          )}

          {activeTab === 'info' && (
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Server, label: 'Target IP', value: scan.target_ip },
                { icon: Cpu, label: 'Hostname', value: scan.hostname || 'Not resolved' },
                { icon: Shield, label: 'OS Detection', value: scan.os_detection || 'Not detected' },
                { icon: Info, label: 'MAC Address', value: scan.mac_address || 'Not available' },
                { icon: CheckCircle2, label: 'Scan Status', value: scan.status },
                { icon: Terminal, label: 'Scan Profile', value: profile?.label || scan.scan_type },
                { icon: Info, label: 'Start Time', value: formatDateTime(scan.start_time) },
                { icon: Info, label: 'End Time', value: scan.end_time ? formatDateTime(scan.end_time) : '—' },
                { icon: Info, label: 'Duration', value: scan.end_time ? formatDuration(scan.start_time, scan.end_time) : '—' },
                { icon: AlertTriangle, label: 'Total Findings', value: String(scan.findings.length) },
                { icon: Info, label: 'Open Ports', value: String(new Set(scan.findings.map(f => f.port)).size) },
                { icon: Shield, label: 'Overall Risk', value: scan.risk_rating || 'Unknown' },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-3 p-3 bg-black/20 border border-slate-800 rounded-lg">
                  <row.icon className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-slate-500 text-xs font-mono">{row.label}</div>
                    <div className="text-white text-sm font-medium mt-0.5">{row.value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="space-y-4">
              <div className="bg-black border border-slate-800 rounded-lg p-4 font-mono text-sm">
                <div className="text-slate-500 text-xs mb-2 font-mono"># Backend: Node.js child_process.spawn (no shell injection risk)</div>
                <div className="text-emerald-400">
                  <span className="text-slate-500">spawn(</span>
                  <span className="text-yellow-300">'/usr/bin/nmap'</span>
                  <span className="text-slate-500">, [</span>
                </div>
                <div className="text-yellow-300 pl-4">
                  {profile?.args.map(arg => `'${arg}'`).join(', ')},
                </div>
                <div className="text-yellow-300 pl-4">
                  '-oX', <span className="text-emerald-300">'/tmp/scan_{scan.id}.xml'</span>,
                </div>
                <div className="text-yellow-300 pl-4">
                  '<span className="text-emerald-300">{scan.target_ip}</span>'
                </div>
                <div className="text-slate-500">])</div>
                <div className="mt-3 pt-3 border-t border-slate-800 text-slate-500 text-xs">
                  # Temp XML: /tmp/scan_{scan.id}.xml (auto-cleaned post-parse)<br />
                  # Results stored: /var/lib/vapt-app/database.sqlite<br />
                  # Scope check: net.isIP() + RFC1918 validation BEFORE spawn
                </div>
              </div>
              <div className="bg-black border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-400">
                <div className="text-emerald-400 mb-2"># Equivalent CLI command:</div>
                <div className="text-white">sudo /usr/bin/nmap {profile?.args.join(' ')} -oX /tmp/scan_{scan.id}.xml {scan.target_ip}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
