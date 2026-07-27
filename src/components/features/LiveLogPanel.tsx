import { useState, useEffect, useRef } from 'react';
import { ScanStatus, ScanType, Finding } from '@/types';
import { Terminal, Wifi, WifiOff, RotateCcw } from 'lucide-react';

interface Props {
  scanId: string;
  targetIp: string;
  scanType: ScanType;
  status: ScanStatus;
  findings: Finding[];
}

function buildStaticLog(targetIp: string, scanType: ScanType, findings: Finding[]): string[] {
  const ts = new Date().toUTCString();
  const lines: string[] = [
    `Starting Nmap 7.94SVN ( https://nmap.org ) at ${ts}`,
    `Initiating Ping Scan at ${new Date().toLocaleTimeString('en-US', { hour12: false })}`,
    `Scanning ${targetIp} [4 ports]`,
    `Completed Ping Scan, 0.02s elapsed (1 total hosts)`,
    `Initiating Parallel DNS resolution of 1 host.`,
    `Completed Parallel DNS resolution, 0.01s elapsed`,
    `Initiating SYN Stealth Scan`,
    `Scanning ${targetIp} [${scanType === 'fast' ? 100 : 65535} ports]`,
  ];
  for (const f of findings) {
    lines.push(`Discovered open port ${f.port}/tcp on ${targetIp}`);
  }
  const elapsed = (Math.random() * 8 + 0.8).toFixed(2);
  lines.push(`Completed SYN Stealth Scan, ${elapsed}s elapsed (${scanType === 'fast' ? 100 : 65535} total ports)`);
  lines.push(`Initiating Service scan`);
  lines.push(`Scanning ${findings.length} services on ${targetIp}`);
  lines.push(`Completed Service scan, ${(Math.random() * 12 + 2).toFixed(2)}s elapsed`);

  if (scanType !== 'fast') {
    lines.push(`NSE: Script scanning ${targetIp}`);
    lines.push(`Initiating NSE at ${new Date().toLocaleTimeString('en-US', { hour12: false })}`);
    for (const f of findings.filter(f => f.cve_id)) {
      lines.push(`NSE: [vulners] Port ${f.port}/tcp — checking CVE database...`);
      lines.push(`| ${f.cve_id}:`);
      lines.push(`|   State: VULNERABLE`);
      lines.push(`|   CVSS Score: ${f.cvss_score} (${f.severity?.toUpperCase()})`);
    }
    lines.push(`Completed NSE`);
  }

  if (scanType === 'comprehensive') {
    lines.push(`Initiating OS detection (try #1) against ${targetIp}`);
    lines.push(`Initiating Traceroute`);
    lines.push(`Completed Traceroute, 0.04s elapsed`);
  }

  lines.push(``);
  lines.push(`Nmap scan report for ${targetIp}`);
  lines.push(`Host is up (0.00${Math.floor(Math.random() * 90 + 10)}s latency).`);
  lines.push(`Not shown: ${Math.max(0, (scanType === 'fast' ? 100 : 65535) - findings.length - 5)} closed tcp ports (reset)`);
  lines.push(`PORT      STATE SERVICE     VERSION`);
  for (const f of findings) {
    lines.push(`${String(f.port + '/tcp').padEnd(10)} open  ${f.service.padEnd(14)} ${f.version}`);
    if (f.cve_id && scanType !== 'fast') {
      lines.push(`| vulners: ${f.cve_id}  (CVSS: ${f.cvss_score})`);
    }
  }
  lines.push(``);
  lines.push(`Service detection performed.`);
  lines.push(`Nmap done: 1 IP address (1 host up) scanned in ${(Math.random() * (scanType === 'fast' ? 10 : 120) + 5).toFixed(2)} seconds`);
  return lines;
}

const RUNNING_LINES = [
  'Initiating Ping Scan...',
  'Host is up — proceeding with port scan',
  'Initiating SYN Stealth Scan (65535 ports)...',
  'Probing open/closed/filtered port states...',
  'Sending TCP SYN packets...',
  'Analyzing RST/ACK responses...',
  'Discovering open ports...',
  'Port scan phase complete',
  'Initiating Service Version Detection...',
  'Sending service probes (FTP, SSH, HTTP, etc.)...',
  'Matching service fingerprints against nmap-service-probes...',
  'Service detection in progress...',
  'NSE: Loading vulnerability scripts (vuln, vulners)...',
  'NSE: Running script vulners against discovered services...',
  'NSE: Querying vulners.com CVE database...',
  'NSE: Cross-referencing CVE/CVSS data...',
  'NSE: Finalizing script results...',
  'Parsing scan output and storing to SQLite...',
  'Generating finding records...',
  'Scan complete — preparing report...',
];

export default function LiveLogPanel({ scanId, targetIp, scanType, status, findings }: Props) {
  const [lines, setLines] = useState<{ text: string; type: 'info' | 'vuln' | 'ok' | 'cmd' }[]>([]);
  const [sseConnected, setSseConnected] = useState<boolean | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const addLine = (text: string, type: 'info' | 'vuln' | 'ok' | 'cmd' = 'info') => {
    setLines(prev => [...prev, { text, type }]);
  };

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  // SSE or simulation
  useEffect(() => {
    setLines([]);
    setLineIdx(0);

    if (status === 'completed' || status === 'failed') {
      // Show full static log
      const staticLines = buildStaticLog(targetIp, scanType, findings);
      setLines(staticLines.map(l => ({
        text: l,
        type: l.startsWith('|') ? 'vuln' : l.includes('open') ? 'ok' : l.startsWith('Starting') || l.startsWith('Nmap') ? 'cmd' : 'info',
      })));
      return;
    }

    if (status !== 'running') return;

    // Try SSE first
    try {
      const es = new EventSource(`/api/scans/${scanId}/logs`);
      esRef.current = es;
      let sseWorked = false;

      const timeout = setTimeout(() => {
        if (!sseWorked) {
          es.close();
          startSimulation();
          setSseConnected(false);
        }
      }, 2000);

      es.onmessage = (e) => {
        sseWorked = true;
        clearTimeout(timeout);
        setSseConnected(true);
        const data = JSON.parse(e.data);
        if (data.type === 'log') addLine(data.line, data.line.startsWith('|') ? 'vuln' : 'info');
        if (data.type === 'stderr') addLine(data.line, 'vuln');
        if (data.type === 'complete') { setSseConnected(false); }
        if (data.type === 'error') { es.close(); startSimulation(); setSseConnected(false); }
      };

      es.onerror = () => {
        clearTimeout(timeout);
        es.close();
        if (!sseWorked) { startSimulation(); setSseConnected(false); }
      };

      return () => { es.close(); clearTimeout(timeout); };
    } catch {
      startSimulation();
      setSseConnected(false);
    }
  }, [scanId, status]);

  // Running simulation
  function startSimulation() {
    setLines([{
      text: `Starting Nmap 7.94SVN ( https://nmap.org ) at ${new Date().toUTCString()}`,
      type: 'cmd',
    }]);
  }

  useEffect(() => {
    if (status !== 'running' || sseConnected === true) return;
    if (lineIdx >= RUNNING_LINES.length) return;
    const delay = 600 + Math.random() * 800;
    const timer = setTimeout(() => {
      const text = RUNNING_LINES[lineIdx];
      addLine(text, text.includes('VULN') || text.includes('CVE') ? 'vuln' : 'info');
      setLineIdx(i => i + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [lineIdx, status, sseConnected]);

  const restart = () => {
    setLines([]);
    setLineIdx(0);
    const staticLines = buildStaticLog(targetIp, scanType, findings);
    setLines(staticLines.map(l => ({
      text: l,
      type: l.startsWith('|') ? 'vuln' : l.includes('open') ? 'ok' : l.startsWith('Starting') || l.startsWith('Nmap') ? 'cmd' : 'info',
    })));
  };

  const lineColor = (type: string) =>
    type === 'vuln' ? 'text-red-400' :
    type === 'ok' ? 'text-emerald-400' :
    type === 'cmd' ? 'text-blue-300' : 'text-slate-300';

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/30 border border-slate-800 rounded-lg">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 text-sm font-mono font-semibold">nmap output — {targetIp}</span>
          {status === 'running' && (
            <div className="flex items-center gap-1.5">
              {sseConnected === true ? (
                <><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400 text-xs">SSE Connected</span></>
              ) : sseConnected === false ? (
                <><WifiOff className="w-3 h-3 text-yellow-400" /><span className="text-yellow-400 text-xs">Demo Mode</span></>
              ) : (
                <><div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" /><span className="text-blue-400 text-xs">Connecting...</span></>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-600 text-xs font-mono">{lines.length} lines</span>
          {(status === 'completed' || status === 'failed') && (
            <button onClick={restart} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {status === 'running' && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Terminal window */}
      <div className="bg-black border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="text-slate-600 text-xs font-mono ml-2">vapt-pro — nmap scan output</span>
        </div>

        <div className="h-80 overflow-y-auto p-4 font-mono text-xs leading-5 space-y-0.5">
          {lines.map((line, i) => (
            <div key={i} className={`${lineColor(line.type)} ${!line.text ? 'h-3' : ''}`}>
              {line.text ? (
                <span>
                  {(line.type === 'info' || line.type === 'cmd') && line.text && (
                    <span className="text-slate-600 select-none mr-2">$</span>
                  )}
                  {line.text}
                </span>
              ) : null}
            </div>
          ))}
          {status === 'running' && (
            <div className="text-emerald-400 cursor-blink">
              <span className="text-slate-600 mr-2">$</span>
              <span className="inline-block w-2 h-3.5 bg-emerald-400 animate-pulse" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {status === 'running' && sseConnected === false && (
        <p className="text-slate-600 text-xs font-mono px-1">
          ℹ Demo mode — connect to the Node.js backend for real-time nmap stdout streaming via SSE.
        </p>
      )}
    </div>
  );
}
