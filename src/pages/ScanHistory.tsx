import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllScans, getAllTags } from '@/lib/storage';
import { Scan, ScanType, ScanStatus } from '@/types';
import { formatDateTime, formatDuration } from '@/lib/ipValidator';
import StatusBadge from '@/components/features/StatusBadge';
import RiskBadge from '@/components/features/RiskBadge';
import TagChip from '@/components/features/TagChip';
import { History, Search, Filter, ArrowRight, Shield, Eye, Download, Tag, X } from 'lucide-react';
import { generatePDFReport } from '@/lib/pdfReport';
import { getScanById } from '@/lib/storage';

export default function ScanHistory() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ScanType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ScanStatus | 'all'>('all');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    setScans(getAllScans());
    setAvailableTags(getAllTags());
  }, []);

  const toggleTagFilter = (tag: string) => {
    setFilterTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  };

  const filtered = scans.filter(s => {
    if (search && !s.target_ip.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && s.scan_type !== filterType) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterTags.length > 0) {
      const scanTags = s.tags || [];
      if (!filterTags.some(t => scanTags.includes(t))) return false;
    }
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
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-muted)' }}>
              <History className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
            Scan History
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {scans.length} total assessment{scans.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <Link
          to="/scan/new"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-sm transition-colors"
        >
          + New Scan
        </Link>
      </div>

      {/* Filters */}
      <div
        className="border rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Row 1: Search + type + status */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by IP or domain…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border rounded-lg pl-9 pr-4 py-2 text-sm font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-muted)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1 flex-wrap">
            <Filter className="w-4 h-4 mr-1 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            {(['all', 'fast', 'vulnerability', 'comprehensive'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === t
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'border'
                }`}
                style={filterType !== t ? { borderColor: 'var(--border-muted)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)' } : {}}
              >
                {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 flex-wrap">
            {(['all', 'completed', 'failed', 'running'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === s
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'border'
                }`}
                style={filterStatus !== s ? { borderColor: 'var(--border-muted)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)' } : {}}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Tag filter (only if tags exist) */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t" style={{ borderTopColor: 'var(--border-subtle)' }}>
            <Tag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Filter by label:</span>
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTagFilter(tag)}
                className={`transition-all ${filterTags.includes(tag) ? 'opacity-100 ring-2 ring-emerald-400/40' : 'opacity-60 hover:opacity-90'}`}
              >
                <TagChip tag={tag} size="sm" />
              </button>
            ))}
            {filterTags.length > 0 && (
              <button
                onClick={() => setFilterTags([])}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors hover:bg-red-500/10 hover:text-red-400"
                style={{ borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
              >
                <X className="w-3 h-3" />Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      {(search || filterType !== 'all' || filterStatus !== 'all' || filterTags.length > 0) && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {scans.length} scans
        </p>
      )}

      {/* Table */}
      <div
        className="border rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b text-xs font-mono"
          style={{ borderBottomColor: 'var(--border-subtle)', color: 'var(--text-faint)' }}
        >
          <span>TARGET</span>
          <span>TYPE</span>
          <span>STATUS</span>
          <span>RISK</span>
          <span>FINDINGS</span>
          <span>ACTIONS</span>
        </div>

        <div className="divide-y" style={{ '--tw-divide-color': 'var(--border-subtle)' } as React.CSSProperties}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No scans match your filters.</p>
              <Link to="/scan/new" className="text-emerald-400 text-sm mt-2 hover:underline">
                Launch a new scan →
              </Link>
            </div>
          ) : (
            filtered.map(scan => (
              <div
                key={scan.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
                style={{ borderBottomColor: 'var(--border-subtle)' }}
              >
                {/* Target */}
                <div className="min-w-0">
                  <div className="font-mono font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{scan.target_ip}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDateTime(scan.start_time)}</div>
                  {scan.end_time && (
                    <div className="text-xs" style={{ color: 'var(--text-faint)' }}>⏱ {formatDuration(scan.start_time, scan.end_time)}</div>
                  )}
                  {/* Tags row */}
                  {(scan.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(scan.tags || []).map(tag => (
                        <TagChip key={tag} tag={tag} size="sm" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Type */}
                <div>
                  <span
                    className="px-2 py-0.5 border rounded text-xs font-mono capitalize"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                  >
                    {scan.scan_type}
                  </span>
                </div>

                {/* Status */}
                <div><StatusBadge status={scan.status} /></div>

                {/* Risk */}
                <div>
                  {scan.risk_rating
                    ? <RiskBadge rating={scan.risk_rating} />
                    : <span className="text-xs" style={{ color: 'var(--text-faint)' }}>—</span>
                  }
                </div>

                {/* Findings count */}
                <div>
                  {typeof scan.findings_count === 'number' ? (
                    <span className={`text-lg font-bold font-mono ${scan.findings_count > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                      {scan.findings_count}
                    </span>
                  ) : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/scan/${scan.id}`}
                    className="p-2 rounded-lg border transition-colors"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {scan.status === 'completed' && (
                    <button
                      onClick={(e) => handleDownload(scan.id, e)}
                      disabled={downloadingId === scan.id}
                      className="p-2 rounded-lg border transition-colors hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
                      title="Download PDF Report"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    to="/scan/new"
                    className="p-2 rounded-lg border transition-colors hover:bg-white/10"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}
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
