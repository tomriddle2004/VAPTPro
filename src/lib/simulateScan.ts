import { ScanType, Scan, Finding, Severity } from '@/types';
import { createScan, updateScan, saveFindingsForScan } from './storage';

const SIMULATED_FINDINGS_POOL: Omit<Finding, 'id' | 'scan_id'>[] = [
  {
    port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 8.2p1', state: 'open',
    cve_id: 'CVE-2023-38408', cvss_score: 9.8, severity: 'critical',
    description: 'OpenSSH ssh-agent Remote Code Execution via forwarded agent socket.',
    remediation: 'Update OpenSSH to 9.3p2+. Disable SSH agent forwarding unless explicitly needed.',
  },
  {
    port: 80, protocol: 'tcp', service: 'http', version: 'nginx 1.18.0', state: 'open',
    severity: 'medium', cvss_score: 5.3,
    description: 'Nginx running with directory listing enabled. Potential information disclosure.',
    remediation: 'Disable autoindex in nginx.conf. Apply security headers. Update to nginx 1.24+.',
  },
  {
    port: 443, protocol: 'tcp', service: 'ssl/https', version: 'OpenSSL 1.1.1f', state: 'open',
    cve_id: 'CVE-2022-0778', cvss_score: 7.5, severity: 'high',
    description: 'OpenSSL infinite loop in BN_mod_sqrt() allows DoS via crafted certificate.',
    remediation: 'Upgrade OpenSSL to 1.1.1n+ or 3.0.2+. Apply vendor security patches.',
  },
  {
    port: 8443, protocol: 'tcp', service: 'https-alt', version: 'Apache Tomcat 9.0.37', state: 'open',
    cve_id: 'CVE-2020-9484', cvss_score: 7.5, severity: 'high',
    description: 'Apache Tomcat RCE via persistent session deserialization via crafted session ID.',
    remediation: 'Upgrade to Tomcat 9.0.35+. Disable PersistentManager if not needed.',
  },
  {
    port: 5432, protocol: 'tcp', service: 'postgresql', version: 'PostgreSQL 12.4', state: 'open',
    severity: 'medium', cvss_score: 4.3,
    description: 'PostgreSQL accessible without TLS. Credentials may be transmitted in plaintext.',
    remediation: 'Enable SSL in postgresql.conf. Restrict pg_hba.conf to localhost. Apply network ACLs.',
  },
  {
    port: 2181, protocol: 'tcp', service: 'zookeeper', version: 'ZooKeeper 3.6.1', state: 'open',
    severity: 'high', cvss_score: 7.5,
    description: 'Apache ZooKeeper exposed without authentication. Allows enumeration and data manipulation.',
    remediation: 'Enable SASL/Kerberos auth. Bind to localhost. Restrict port 2181 via firewall.',
  },
  {
    port: 4848, protocol: 'tcp', service: 'http', version: 'GlassFish 5.0', state: 'open',
    cve_id: 'CVE-2017-1000030', cvss_score: 8.1, severity: 'high',
    description: 'GlassFish admin console accessible. Unauthenticated remote deployment possible.',
    remediation: 'Disable remote admin console. Set strong admin password. Restrict port 4848.',
  },
  {
    port: 25, protocol: 'tcp', service: 'smtp', version: 'Postfix 3.4.14', state: 'open',
    severity: 'low', cvss_score: 3.1,
    description: 'SMTP server allows VRFY command (user enumeration). AUTH not enforced for relaying check.',
    remediation: 'Disable VRFY command in main.cf. Enforce STARTTLS. Enable SPF/DKIM/DMARC.',
  },
];

function generateMockFindings(scanType: ScanType, count: number): Omit<Finding, 'id' | 'scan_id'>[] {
  const pool = [...SIMULATED_FINDINGS_POOL];
  const selected: Omit<Finding, 'id' | 'scan_id'>[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  if (scanType === 'fast') {
    return selected.filter(f => !f.cve_id).slice(0, 2);
  }
  return selected;
}

function getRiskRating(findings: Finding[]): Scan['risk_rating'] {
  if (findings.some(f => f.severity === 'critical')) return 'Critical';
  if (findings.some(f => f.severity === 'high')) return 'High';
  if (findings.some(f => f.severity === 'medium')) return 'Medium';
  if (findings.some(f => f.severity === 'low')) return 'Low';
  return 'Clean';
}

export interface ScanProgressCallback {
  onProgress: (progress: number, message: string) => void;
  onComplete: (scan: Scan, findings: Finding[]) => void;
  onError: (error: string) => void;
}

export function simulateScan(
  ip: string,
  scanType: ScanType,
  callbacks: ScanProgressCallback
): () => void {
  const scanId = `scan-${Date.now()}`;
  const startTime = new Date().toISOString();

  const durations: Record<ScanType, number> = {
    fast: 8000,
    vulnerability: 15000,
    comprehensive: 25000,
  };
  const totalDuration = durations[scanType];
  const findingCounts: Record<ScanType, number> = { fast: 2, vulnerability: 5, comprehensive: 7 };

  const steps = [
    { pct: 5, msg: `Starting nmap against ${ip}...` },
    { pct: 15, msg: 'Performing host discovery (ARP ping)...' },
    { pct: 30, msg: 'SYN scan: probing TCP ports...' },
    { pct: 50, msg: 'Service version detection in progress...' },
    { pct: 65, msg: scanType !== 'fast' ? 'Running NSE vulnerability scripts...' : 'Identifying open ports...' },
    { pct: 80, msg: scanType === 'comprehensive' ? 'OS detection & traceroute...' : 'Finalizing results...' },
    { pct: 90, msg: 'Parsing XML output & storing findings...' },
    { pct: 100, msg: 'Scan complete. Generating report...' },
  ];

  const newScan: Scan = {
    id: scanId, target_ip: ip, scan_type: scanType,
    status: 'running', start_time: startTime, progress: 0,
  };
  createScan(newScan);

  let stepIdx = 0;
  const stepInterval = totalDuration / steps.length;
  let cancelled = false;

  const timer = setInterval(() => {
    if (cancelled) return;
    if (stepIdx < steps.length) {
      const step = steps[stepIdx];
      callbacks.onProgress(step.pct, step.msg);
      updateScan(scanId, { progress: step.pct });
      stepIdx++;
    }
    if (stepIdx >= steps.length) {
      clearInterval(timer);
      if (cancelled) return;

      const mockFindings = generateMockFindings(scanType, findingCounts[scanType]);
      const findings: Finding[] = mockFindings.map((f, i) => ({
        ...f, id: `f-${scanId}-${i}`, scan_id: scanId,
      }));

      const endTime = new Date().toISOString();
      const riskRating = getRiskRating(findings);
      const completedScan: Scan = {
        ...newScan, status: 'completed', end_time: endTime,
        findings_count: findings.length, risk_rating: riskRating, progress: 100,
      };

      updateScan(scanId, {
        status: 'completed', end_time: endTime,
        findings_count: findings.length, risk_rating: riskRating, progress: 100,
      });
      saveFindingsForScan(scanId, findings);
      callbacks.onComplete(completedScan, findings);
    }
  }, stepInterval);

  return () => {
    cancelled = true;
    clearInterval(timer);
    updateScan(scanId, { status: 'failed' });
  };
}
