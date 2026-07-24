import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllScans } from '@/lib/storage';
import { Scan, ScanType, ScanStatus } from '@/types';
import { formatDateTime, formatDuration } from '@/lib/ipValidator';
import StatusBadge from '@/components/features/StatusBadge';
import RiskBadge from '@/components/features/RiskBadge';
import { History, Search, Filter, ArrowRight, Shield, Eye, Download } from 'lucide-react';
import { generatePDFReport } from '@/lib/pdfReport';
import { getScanById } from '@/lib/storage';

export default function ScanHistory() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ScanType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ScanStatus | 'all'>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    setScans(getAllScans());
  }, []);

  const filtered = scans.filter(s => {
    if (search && !s.target_ip.includes(search)) return false;
    if (filterType !== 'all' && s.scan_type !== filterType) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  const handleDownload = async (scanId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDownloadingId(scanId);
    const detail = getScanById(scanId);
    if (detail) await generatePDFReport(detail);
    setDownloadingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
              <History className="w-4 h-4 text-slate-400" />
            </div>
            Scan History
          </h1>
          <p className="text-slate-400 text-sm mt-1">{scans.length} total assessments recorded</p>
        </div>
        <Link
          to="/scan/new"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-sm transition-colors"
        >
          + New Scan
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by IP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-slate-500 mr-1" />
          {(['all', 'fast', 'vulnerability', 'comprehensive'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterType === t
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white bg-slate-800 border border-slate-700'
              }`}
            >
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          {(['all', 'completed', 'failed', 'running'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white bg-slate-800 border border-slate-700'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-slate-800 text-slate-500 text-xs font-mono">
          <span>TARGET</span>
          <span>TYPE</span>
          <span>STATUS</span>
          <span>RISK</span>
          <span>FINDINGS</span>
          <span>ACTIONS</span>
        </div>

        <div className="divide-y divide-slate-800">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-slate-500">No scans match your filters.</p>
              <Link to="/scan/new" className="text-emerald-400 text-sm mt-2 hover:underline">
                Launch a new scan →
              </Link>
            </div>
          ) : (
            filtered.map(scan => (
              <div
                key={scan.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors group"
              >
                {/* Target */}
                <div>
                  <div className="text-white font-mono font-semibold">{scan.target_ip}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{formatDateTime(scan.start_time)}</div>
                  {scan.end_time && (
                    <div className="text-slate-600 text-xs">⏱ {formatDuration(scan.start_time, scan.end_time)}</div>
                  )}
                </div>
                {/* Type */}
                <div>
                  <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs font-mono capitalize">
                    {scan.scan_type}
                  </span>
                </div>
                {/* Status */}
                <div><StatusBadge status={scan.status} /></div>
                {/* Risk */}
                <div>{scan.risk_rating ? <RiskBadge rating={scan.risk_rating} /> : <span className="text-slate-600 text-xs">—</span>}</div>
                {/* Findings count */}
                <div>
                  {typeof scan.findings_count === 'number' ? (
                    <span className={`text-lg font-bold font-mono ${scan.findings_count > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                      {scan.findings_count}
                    </span>
                  ) : <span className="text-slate-600">—</span>}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/scan/${scan.id}`}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {scan.status === 'completed' && (
                    <button
                      onClick={(e) => handleDownload(scan.id, e)}
                      disabled={downloadingId === scan.id}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
                      title="Download PDF Report"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    to={`/scan/new`}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="Re-run Scan"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
