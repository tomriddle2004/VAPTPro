import { ScanType } from '@/types';
import { Loader2, Terminal, X } from 'lucide-react';
import { SCAN_PROFILES } from '@/constants/scanProfiles';

interface Props {
  ip: string;
  scanType: ScanType;
  progress: number;
  message: string;
  onCancel: () => void;
}

export default function ScanProgress({ ip, scanType, progress, message, onCancel }: Props) {
  const profile = SCAN_PROFILES.find(p => p.id === scanType);

  return (
    <div className="bg-[#0b1426] border border-emerald-500/30 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Scan In Progress</h3>
            <p className="text-slate-400 text-sm font-mono">{ip}</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>

      {/* Profile info */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>{profile?.icon}</span>
        <span>{profile?.label}</span>
        <span className="text-slate-600">•</span>
        <span className="font-mono text-xs">nmap {profile?.args.join(' ')}</span>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 font-mono">{message}</span>
          <span className="text-emerald-400 font-mono font-bold">{progress}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>
      </div>

      {/* Terminal output */}
      <div className="bg-black/40 border border-slate-800 rounded-lg p-3 font-mono text-xs">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
          <Terminal className="w-3 h-3 text-slate-500" />
          <span className="text-slate-500">stdout — /tmp/scan_{Date.now()}.xml</span>
        </div>
        <div className="text-emerald-400 space-y-1">
          <div className="text-slate-500">$ /usr/bin/nmap {profile?.args.join(' ')} {ip}</div>
          <div>Starting Nmap 7.94SVN ( https://nmap.org )</div>
          <div className="text-yellow-400/80">{message}</div>
          {progress >= 30 && <div className="text-slate-400">Host is up (0.0031s latency).</div>}
          {progress >= 60 && <div>Not shown: 980 closed tcp ports (reset)</div>}
          {progress >= 80 && <div className="text-emerald-400">PORT      STATE SERVICE</div>}
          {progress >= 90 && (
            <div className="text-emerald-300 animate-pulse">
              Nmap scan report for {ip}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
