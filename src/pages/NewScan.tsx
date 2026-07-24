import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateScanTarget } from '@/lib/ipValidator';
import { simulateScan } from '@/lib/simulateScan';
import { SCAN_PROFILES } from '@/constants/scanProfiles';
import { ScanType, Scan, Finding } from '@/types';
import ScanProgress from '@/components/features/ScanProgress';
import { Shield, Terminal, AlertCircle, CheckCircle, Info, Target, Clock } from 'lucide-react';

export default function NewScan() {
  const navigate = useNavigate();
  const [ip, setIp] = useState('');
  const [scanType, setScanType] = useState<ScanType>('vulnerability');
  const [ipError, setIpError] = useState('');
  const [ipValid, setIpValid] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null);

  const validateIP = useCallback((value: string) => {
    if (!value) { setIpError(''); setIpValid(null); return; }
    const result = validateScanTarget(value);
    if (result.valid) {
      setIpError('');
      setIpValid(true);
    } else {
      setIpError(result.error);
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
    if (!result.valid) {
      setIpError(result.error);
      return;
    }

    setIsScanning(true);
    setProgress(0);
    setProgressMsg('Initializing...');

    const cancel = simulateScan(ip, scanType, {
      onProgress: (pct, msg) => {
        setProgress(pct);
        setProgressMsg(msg);
      },
      onComplete: (scan: Scan, _findings: Finding[]) => {
        setIsScanning(false);
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-emerald-400" />
          </div>
          Launch New Vulnerability Scan
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure and execute an Nmap assessment against an authorized target host.
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
          {/* Target IP */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-slate-400" />
              <h2 className="text-white font-semibold">Target Configuration</h2>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Target IP Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ip}
                  onChange={handleIPChange}
                  placeholder="e.g., 192.168.1.100"
                  className={`w-full bg-black/40 border rounded-lg px-4 py-3 font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                    ipValid === true
                      ? 'border-emerald-500/50 focus:ring-emerald-500/30'
                      : ipValid === false
                      ? 'border-red-500/50 focus:ring-red-500/30'
                      : 'border-slate-700 focus:ring-emerald-500/30 focus:border-emerald-500/50'
                  }`}
                />
                {ipValid === true && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
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

              {ipValid === true && (
                <div className="mt-2 flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Target is within authorized RFC 1918 scope.</span>
                </div>
              )}
            </div>

            {/* Quick fill examples */}
            <div className="flex flex-wrap gap-2">
              <span className="text-slate-600 text-xs self-center">Quick fill:</span>
              {['192.168.1.1', '10.0.0.50', '172.16.0.10', '192.168.100.254'].map(example => (
                <button
                  key={example}
                  onClick={() => { setIp(example); validateIP(example); }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs font-mono rounded transition-colors"
                >
                  {example}
                </button>
              ))}
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
                      <span className={`font-semibold ${scanType === profile.id ? 'text-emerald-300' : 'text-white'}`}>
                        {profile.label}
                      </span>
                      <div className="flex items-center gap-1 text-slate-500 text-xs">
                        <Clock className="w-3 h-3" />
                        {profile.estimated_time}
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">{profile.description}</p>
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

          {/* Info box */}
          <div className="flex gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-blue-300/80 text-sm space-y-1">
              <p className="font-medium text-blue-300">Security Notice</p>
              <p>Only scan systems you are authorized to test. Unauthorized scanning may violate laws including the Computer Fraud and Abuse Act (CFAA). Ensure you have written permission before proceeding.</p>
            </div>
          </div>

          {/* Launch button */}
          <button
            onClick={handleLaunch}
            disabled={!ip || ipValid !== true}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-400 text-black disabled:hover:bg-emerald-500"
          >
            <Terminal className="w-5 h-5" />
            Launch {selectedProfile.label}
          </button>
        </div>
      )}
    </div>
  );
}
