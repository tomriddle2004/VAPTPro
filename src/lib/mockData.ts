import { Scan, ScanDetail, Finding } from '@/types';

export const MOCK_FINDINGS_BY_SCAN: Record<string, Finding[]> = {
  'scan-001': [
    {
      id: 'f-001', scan_id: 'scan-001', port: 22, protocol: 'tcp',
      service: 'ssh', version: 'OpenSSH 7.4', state: 'open',
      cve_id: 'CVE-2018-15473', cvss_score: 5.3, severity: 'medium',
      description: 'OpenSSH through 7.7 is prone to a user enumeration vulnerability due to not delaying bailout for an invalid authenticating user until after the packet containing the request has been fully parsed.',
      remediation: 'Upgrade OpenSSH to version 7.8 or later. Apply OS vendor patches. Restrict SSH access to known IP ranges via firewall rules.',
      script_output: 'sshv1: Server supports SSHv1\n  ssh-hostkey:\n    1024 ac:00:a0:1a (RSA1)\n    2048 20:3d:2d:44 (RSA)',
    },
    {
      id: 'f-002', scan_id: 'scan-001', port: 80, protocol: 'tcp',
      service: 'http', version: 'Apache httpd 2.4.6', state: 'open',
      cve_id: 'CVE-2017-7679', cvss_score: 9.8, severity: 'critical',
      description: 'Apache HTTP Server mod_mime buffer overread: Possible remote code execution via malicious request if mod_mime is enabled. CVSSv3 Base Score: 9.8 CRITICAL.',
      remediation: 'Upgrade Apache to 2.4.26 or later. Disable mod_mime if not needed. Apply security headers: X-Content-Type-Options, X-Frame-Options.',
      script_output: 'http-server-header: Apache/2.4.6 (CentOS)\nhttp-title: Apache HTTP Server Test Page\nhttp-methods: GET HEAD POST OPTIONS TRACE\n  Potentially risky methods: TRACE',
    },
    {
      id: 'f-003', scan_id: 'scan-001', port: 443, protocol: 'tcp',
      service: 'ssl/https', version: 'Apache 2.4.6 / TLS 1.0', state: 'open',
      cve_id: 'CVE-2014-3566', cvss_score: 3.4, severity: 'low',
      description: 'POODLE (Padding Oracle On Downgraded Legacy Encryption): SSLv3 protocol vulnerability allows MITM attacks to decrypt encrypted traffic.',
      remediation: 'Disable SSLv3 and TLS 1.0/1.1. Enforce TLS 1.2 minimum. Configure strong cipher suites. Use HSTS header.',
      script_output: 'ssl-poodle: VULNERABLE\n  State: VULNERABLE\n  IDs: CVE:CVE-2014-3566\n  Risk factor: Medium\n  POODLE is a client vulnerability...',
    },
    {
      id: 'f-004', scan_id: 'scan-001', port: 3306, protocol: 'tcp',
      service: 'mysql', version: 'MySQL 5.5.60', state: 'open',
      cve_id: 'CVE-2016-6662', cvss_score: 9.8, severity: 'critical',
      description: 'MySQL remote code execution via configuration file manipulation. An unauthenticated attacker may create/overwrite a MySQL configuration file and execute arbitrary code with root privileges.',
      remediation: 'Upgrade MySQL to 5.5.52+ or 5.6.33+ or 5.7.15+. Restrict port 3306 to localhost only. Use mysql_secure_installation. Apply principle of least privilege to DB accounts.',
      script_output: 'mysql-info:\n  Protocol: 10\n  Version: 5.5.60-MariaDB\n  Status: Autocommit\n  Salt: vulnerable_config_file_writable',
    },
    {
      id: 'f-005', scan_id: 'scan-001', port: 21, protocol: 'tcp',
      service: 'ftp', version: 'vsftpd 2.3.4', state: 'open',
      cve_id: 'CVE-2011-2523', cvss_score: 10.0, severity: 'critical',
      description: 'vsftpd 2.3.4 backdoor: A smiley face backdoor was intentionally introduced in vsftpd 2.3.4 allowing unauthenticated remote code execution. CVSS 10.0.',
      remediation: 'Immediately remove vsftpd 2.3.4 and upgrade to 3.0.3+. Disable anonymous FTP. Use SFTP instead. Restrict FTP to internal network only.',
      script_output: 'ftp-vsftpd-backdoor:\n  VULNERABLE:\n  vsFTPd version 2.3.4 backdoor\n  State: VULNERABLE (Exploitable)\n  IDs: CVE:CVE-2011-2523',
    },
    {
      id: 'f-006', scan_id: 'scan-001', port: 8080, protocol: 'tcp',
      service: 'http-proxy', version: 'Squid 3.1.23', state: 'open',
      severity: 'info',
      description: 'Open HTTP proxy detected running Squid 3.1.23. No direct CVE identified but proxy misconfiguration may allow traffic forwarding and reconnaissance.',
      remediation: 'Restrict proxy access to authorized internal clients only. Upgrade to Squid 4.x. Enable access control lists (ACLs).',
    },
  ],
  'scan-002': [
    {
      id: 'f-007', scan_id: 'scan-002', port: 445, protocol: 'tcp',
      service: 'microsoft-ds', version: 'Samba 4.5.9', state: 'open',
      cve_id: 'CVE-2017-7494', cvss_score: 9.8, severity: 'critical',
      description: 'SambaCry: Samba versions 3.5.0 and later before 4.6.4, 4.5.10, 4.4.14 are vulnerable to a remote code execution vulnerability, allowing a malicious client to upload a shared library to a writable share and then cause the server to load and execute it.',
      remediation: 'Upgrade Samba to 4.6.4+, 4.5.10+, or 4.4.14+. Set "nt pipe support = no" in smb.conf as workaround. Restrict SMB to trusted networks.',
      script_output: 'smb-vuln-cve-2017-7494:\n  VULNERABLE:\n  Samba RCE vulnerability CVE-2017-7494\n  State: VULNERABLE',
    },
    {
      id: 'f-008', scan_id: 'scan-002', port: 139, protocol: 'tcp',
      service: 'netbios-ssn', version: 'Samba smbd 3.X', state: 'open',
      cve_id: 'CVE-2008-4250', cvss_score: 10.0, severity: 'high',
      description: 'MS08-067: NetAPI buffer overflow allows unauthenticated remote code execution via crafted RPC request to netapi32.dll.',
      remediation: 'Apply Microsoft patch MS08-067. Disable NetBIOS over TCP/IP. Block ports 135,139,445 at firewall perimeter.',
    },
    {
      id: 'f-009', scan_id: 'scan-002', port: 3389, protocol: 'tcp',
      service: 'ms-wbt-server', version: 'RDP', state: 'open',
      cve_id: 'CVE-2019-0708', cvss_score: 9.8, severity: 'critical',
      description: 'BlueKeep: Pre-authentication remote code execution vulnerability in Windows Remote Desktop Services. Wormable. CVSS 9.8.',
      remediation: 'Apply Microsoft security update for CVE-2019-0708. Enable Network Level Authentication (NLA). Restrict RDP to VPN/internal network. Disable RDP if not needed.',
      script_output: 'rdp-vuln-ms12-020:\n  VULNERABLE\n  Remote Desktop vulnerability\n  MS12-020',
    },
  ],
  'scan-003': [
    {
      id: 'f-010', scan_id: 'scan-003', port: 9200, protocol: 'tcp',
      service: 'elasticsearch', version: 'Elasticsearch 5.6.5', state: 'open',
      severity: 'high',
      cvss_score: 7.5,
      description: 'Elasticsearch running without authentication on public interface. Unauthenticated access allows full data read/write including deletion of indices.',
      remediation: 'Enable X-Pack security (elasticsearch.yml: xpack.security.enabled: true). Bind to localhost only. Place behind authentication proxy. Update to 7.x or 8.x.',
    },
    {
      id: 'f-011', scan_id: 'scan-003', port: 6379, protocol: 'tcp',
      service: 'redis', version: 'Redis 3.2.12', state: 'open',
      cve_id: 'CVE-2022-0543', cvss_score: 10.0, severity: 'critical',
      description: 'Redis Lua sandbox escape: Allows executing arbitrary Lua bytecode, leading to RCE on the host system. CVSS 10.0 in some distributions.',
      remediation: 'Upgrade Redis to 6.2.7+, 7.0.1+. Bind to localhost (bind 127.0.0.1). Set requirepass in redis.conf. Disable Lua scripting if unused (disable-commands EVAL).',
    },
    {
      id: 'f-012', scan_id: 'scan-003', port: 27017, protocol: 'tcp',
      service: 'mongodb', version: 'MongoDB 3.6.8', state: 'open',
      severity: 'high', cvss_score: 7.5,
      description: 'MongoDB running without authentication. All databases accessible without credentials. Ransomware frequently targets exposed MongoDB instances.',
      remediation: 'Enable MongoDB authentication (--auth flag or security.authorization: enabled). Bind to localhost. Upgrade to MongoDB 6.x. Implement IP allowlist.',
    },
  ],
};

const now = new Date();
const ts = (offsetHours: number) => {
  const d = new Date(now.getTime() - offsetHours * 3600000);
  return d.toISOString();
};

export const MOCK_SCANS: Scan[] = [
  {
    id: 'scan-001',
    target_ip: '192.168.1.105',
    scan_type: 'comprehensive',
    status: 'completed',
    start_time: ts(48),
    end_time: ts(47.7),
    findings_count: 6,
    risk_rating: 'Critical',
  },
  {
    id: 'scan-002',
    target_ip: '10.0.0.50',
    scan_type: 'vulnerability',
    status: 'completed',
    start_time: ts(24),
    end_time: ts(23.8),
    findings_count: 3,
    risk_rating: 'Critical',
  },
  {
    id: 'scan-003',
    target_ip: '172.16.0.10',
    scan_type: 'vulnerability',
    status: 'completed',
    start_time: ts(6),
    end_time: ts(5.9),
    findings_count: 3,
    risk_rating: 'High',
  },
  {
    id: 'scan-004',
    target_ip: '192.168.0.1',
    scan_type: 'fast',
    status: 'completed',
    start_time: ts(2),
    end_time: ts(1.98),
    findings_count: 0,
    risk_rating: 'Clean',
  },
  {
    id: 'scan-005',
    target_ip: '192.168.1.200',
    scan_type: 'fast',
    status: 'failed',
    start_time: ts(1),
    findings_count: 0,
  },
];

export const getMockScanDetail = (scanId: string): ScanDetail | null => {
  const scan = MOCK_SCANS.find(s => s.id === scanId);
  if (!scan) return null;
  const findings = MOCK_FINDINGS_BY_SCAN[scanId] || [];
  return {
    ...scan,
    findings,
    os_detection: scanId === 'scan-001' ? 'Linux 3.X|4.X (Ubuntu 16.04)' : scanId === 'scan-002' ? 'Windows Server 2008 R2' : 'Unknown',
    hostname: scanId === 'scan-001' ? 'web-server-01.internal' : scanId === 'scan-002' ? 'DC01.corp.local' : undefined,
    mac_address: '00:0C:29:AB:CD:EF',
    total_ports_scanned: scanId === 'scan-001' ? 65535 : 1000,
  };
};
