import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateScanTarget } from '@/lib/ipValidator';
import { simulateScan } from '@/lib/simulateScan';
import { SCAN_PROFILES } from '@/constants/scanProfiles';
import { ScanType, Scan, Finding } from '@/types';
import ScanProgress from '@/components/features/ScanProgress';
import { checkAndLogAlerts } from '@/lib/notifications';
import {
  Shield, Terminal, AlertCircle, CheckCircle, Info,
  Target, Clock, AlertTriangle, Globe,
} from 'lucide-react';

export default function NewScan() {
  const navigate = useNavigate();
  const [ip, setIp] = useState('');
  const [scanType, setScanType] = useState<ScanType>('vulnerability');
  const [ipError, setIpError] = useState('');
  const [ipWarning, setIpWarning] = useState('');
  const [ipValid, setIpValid] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null);

  const validateIP = useCallback((value: string) => {
    if (!value) { setIpError(''); setIpWarning(''); setIpValid(null); return; }
    const result = validateScanTarget(value);
    if (result.valid) {
      setIpError('');
      setIpWarning(result.warning ?? '');
      setIpValid(true);
    } else {
      setIpError(result.error);
      setIpWarning('');
      setIpValid(false);
    }
  }, []);

  const handleIPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIp(val);
    validateIP(val);
  };

  const handleLaunch = () => {
    const result = validateScanTarget(ip);
    if (!result.valid) { setIpError(result.error); return; }

    setIsScanning(true);
    setProgress(0);
    setProgressMsg('Initializing...');

    const cancel = simulateScan(ip, scanType, {
      onProgress: (pct, msg) => {
        setProgress(pct);
        setProgressMsg(msg);
      },
      onComplete: (scan: Scan, findings: Finding[]) => {
        setIsScanning(false);
        // Evaluate and log any matching alert rules
        checkAndLogAlerts(scan, findings);
        navigate(`/scan/${scan.id}`);
      },
      onError: (err) => {
        setIsScanning(false);
        setIpError(err);
      },
    });
    setCancelFn(() => cancel);
  };

  const handleCancel = () => {
    cancelFn?.();
    setIsScanning(false);
    setCancelFn(null);
  };

  const selectedProfile = SCAN_PROFILES.find(p => p.id === scanType)!;

  // Quick-fill examples now include domains and public IP
  const EXAMPLES = [
    { label: '192.168.1.1', desc: 'Private IPv4' },
    { label: '10.0.0.50', desc: 'Private IPv4' },
    { label: '192.168.1.0/24', desc: 'CIDR subnet' },
    { label: 'server.corp.local', desc: 'Internal FQDN' },
    { label: '8.8.8.8', desc: 'Public IP (auth required)' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-emerald-400" />
          </div>
          Launch New Vulnerability Scan
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Supports private IPs, public IPs, CIDR subnets, and domain names.
        </p>
      </div>

      {isScanning ? (
        <ScanProgress
          ip={ip}
          scanType={scanType}
          progress={progress}
          message={progressMsg}
          onCancel={handleCancel}
        />
      ) : (
        <div className="space-y-5">
          {/* Target input */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-slate-400" />
              <h2 className="text-white font-semibold">Target Configuration</h2>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Target <span className="text-red-400">*</span>
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                  (IPv4 · CIDR · Domain · Public IP)
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ip}
                  onChange={handleIPChange}
                  placeholder="e.g., 192.168.1.100 or server.corp.local or 192.168.1.0/24"
                  className={`w-full bg-black/40 border rounded-lg px-4 py-3 font-mono placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                    ipValid === true && !ipWarning
                      ? 'border-emerald-500/50 focus:ring-emerald-500/30'
                      : ipValid === true && ipWarning
                      ? 'border-yellow-500/50 focus:ring-yellow-500/30'
                      : ipValid === false
                      ? 'border-red-500/50 focus:ring-red-500/30'
                      : 'border-slate-700 focus:ring-emerald-500/30 focus:border-emerald-500/50'
                  }`}
                  style={{ color: 'var(--text-primary)' }}
                />
                {ipValid === true && !ipWarning && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                )}
                {ipValid === true && ipWarning && (
                  <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400" />
                )}
                {ipValid === false && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                )}
              </div>

              {ipError && (
                <div className="mt-2 flex items-start gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{ipError}</span>
                </div>
              )}

              {ipValid === true && ipWarning && (
                <div className="mt-2 flex items-start gap-2 text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{ipWarning}</span>
                </div>
              )}

              {ipValid === true && !ipWarning && (
                <div className="mt-2 flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Target is within authorized RFC 1918 private scope.</span>
                </div>
              )}
            </div>

            {/* Quick fill */}
            <div className="space-y-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Quick fill:</span>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex.label}
                    onClick={() => { setIp(ex.label); validateIP(ex.label); }}
                    className="group px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    title={ex.desc}
                  >
                    <span className="text-xs font-mono">{ex.label}</span>
                    {ex.desc.includes('Public') && (
                      <Globe className="inline w-3 h-3 ml-1 text-yellow-500 opacity-70" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Extended target info */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300/80 leading-relaxed">
              <span className="font-semibold">Extended target support:</span> Private IPs are fully authorized.
              Public IPs and domains require written authorization — they are accepted but the backend enforces additional validation
              before spawning <code className="font-mono bg-black/30 px-1 rounded">/usr/bin/nmap</code>.
            </div>
          </div>

          {/* Scan profile */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-slate-400" />
              <h2 className="text-white font-semibold">Scan Profile</h2>
            </div>

            <div className="grid gap-3">
              {SCAN_PROFILES.map(profile => (
                <label
                  key={profile.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    scanType === profile.id
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-black/20 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="scanType"
                    value={profile.id}
                    checked={scanType === profile.id}
                    onChange={() => setScanType(profile.id)}
                    className="sr-only"
                  />
                  <div className="text-2xl flex-shrink-0 mt-0.5">{profile.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`font-semibold ${scanType === profile.id ? 'text-emerald-300' : ''}`}
                        style={scanType === profile.id ? {} : { color: 'var(--text-primary)' }}>
                        {profile.label}
                      </span>
                      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Clock className="w-3 h-3" />
                        {profile.estimated_time}
                      </div>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{profile.description}</p>
                    <div className="mt-2 font-mono text-xs text-slate-600 bg-black/30 px-2 py-1 rounded inline-block">
                      nmap {profile.args.join(' ')} {'<target>'}
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center transition-colors ${
                    scanType === profile.id ? 'border-emerald-400' : 'border-slate-600'
                  }`}>
                    {scanType === profile.id && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Security notice */}
          <div className="flex gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-blue-300/80 text-sm space-y-1">
              <p className="font-medium text-blue-300">Security Notice</p>
              <p>Only scan systems you are authorized to test. Unauthorized scanning may violate the Computer Fraud and Abuse Act (CFAA) and equivalent legislation. Ensure you have written permission before proceeding.</p>
            </div>
          </div>

          {/* Launch */}
          <button
            onClick={handleLaunch}
            disabled={!ip || ipValid !== true}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-400 text-black disabled:hover:bg-emerald-500"
          >
            <Terminal className="w-5 h-5" />
            Launch {selectedProfile.label}
            {ipValid && ipWarning && <AlertTriangle className="w-4 h-4 text-yellow-800" />}
          </button>
        </div>
      )}
    </div>
  );
}
