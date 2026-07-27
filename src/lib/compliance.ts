import { Finding, EvaluatedControl, FrameworkResult, ComplianceFrameworkId, RemediationItem } from '@/types';

interface ControlDef {
  id: string;
  name: string;
  category: string;
  description: string;
  weight: number;
  remediation: string;
  matchServices?: string[];
  matchPorts?: number[];
  requiresCVE?: boolean;
}

// ─── OWASP Top 10 2021 ────────────────────────────────────────────────────────
const OWASP_CONTROLS: ControlDef[] = [
  {
    id: 'A01:2021', name: 'Broken Access Control', category: 'Authorization', weight: 9,
    description: 'Restrictions on authenticated users are not properly enforced, allowing attackers to act outside their intended permissions.',
    remediation: 'Implement server-side access control. Deny by default. Log access control failures. Rate limit API and controller access.',
    matchServices: ['http', 'https', 'apache', 'nginx', 'tomcat', 'rdp', 'smb', 'microsoft-ds', 'ms-wbt', 'netbios'],
    matchPorts: [80, 443, 8080, 8443, 3389, 445, 139, 4848],
  },
  {
    id: 'A02:2021', name: 'Cryptographic Failures', category: 'Cryptography', weight: 8,
    description: 'Failures related to cryptography exposing sensitive data in transit or at rest. Includes weak protocols (SSLv3, TLS 1.0) and cleartext transmission.',
    remediation: 'Enforce TLS 1.2+ for all communications. Disable SSLv3/TLS 1.0/1.1. Use AES-256 for data at rest. Implement HSTS.',
    matchServices: ['ssl', 'ftp', 'telnet', 'smtp', 'ldap', 'pop3', 'imap', 'http'],
    matchPorts: [21, 23, 25, 80, 110, 143, 389],
  },
  {
    id: 'A03:2021', name: 'Injection', category: 'Input Validation', weight: 9,
    description: 'Untrusted data sent to an interpreter as part of a command or query. SQL, NoSQL, OS, and LDAP injection.',
    remediation: 'Use parameterized queries and ORMs. Validate/sanitize all input. Apply least-privilege to DB accounts. Use OWASP ESAPI.',
    matchServices: ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'mssql', 'mariadb', 'oracle'],
    matchPorts: [3306, 5432, 27017, 6379, 9200, 1433, 1521],
  },
  {
    id: 'A04:2021', name: 'Insecure Design', category: 'Architecture', weight: 7,
    description: 'Missing or ineffective control design. Absence of threat modeling and secure design patterns.',
    remediation: 'Apply threat modeling (STRIDE). Implement defense-in-depth. Conduct security design reviews before deployment.',
    matchServices: ['zookeeper', 'redis', 'mongodb', 'elasticsearch', 'kafka'],
    matchPorts: [2181, 2888, 3888, 9092, 2379, 4001],
  },
  {
    id: 'A05:2021', name: 'Security Misconfiguration', category: 'Configuration', weight: 8,
    description: 'Insecure default configurations, incomplete configurations, open cloud storage, unnecessary features enabled, and verbose error messages.',
    remediation: 'Harden all configurations per CIS Benchmarks. Remove default credentials. Disable unused features. Implement WAF rules.',
    matchServices: ['http-proxy', 'snmp', 'glassfish', 'jboss', 'jenkins', 'tomcat'],
    matchPorts: [161, 162, 4848, 8888, 9090, 10000, 7001, 7002, 8161, 61616],
  },
  {
    id: 'A06:2021', name: 'Vulnerable and Outdated Components', category: 'Patch Management', weight: 7,
    description: 'Using components with known vulnerabilities. Includes libraries, frameworks, and other modules with unpatched CVEs.',
    remediation: 'Maintain a software inventory. Subscribe to CVE feeds. Implement automated dependency scanning. Apply security patches promptly.',
    requiresCVE: true,
  },
  {
    id: 'A07:2021', name: 'Authentication Failures', category: 'Authentication', weight: 8,
    description: 'Broken authentication allowing attackers to assume other users\' identities through compromised passwords, keys, or session tokens.',
    remediation: 'Implement MFA. Use strong password policies. Rate-limit login attempts. Rotate session tokens. Disable default accounts.',
    matchServices: ['ssh', 'ftp', 'rdp', 'ms-wbt', 'vnc', 'telnet', 'ldap', 'smtp'],
    matchPorts: [22, 21, 3389, 5900, 23, 389, 636, 25],
  },
  {
    id: 'A08:2021', name: 'Data Integrity Failures', category: 'Integrity', weight: 7,
    description: 'Code and infrastructure that do not protect against integrity violations. Includes insecure deserialization.',
    remediation: 'Verify digital signatures on updates. Use secure deserialization libraries. Implement code integrity monitoring.',
    matchServices: ['java', 'tomcat', 'jenkins', 'jboss', 'glassfish', 'weblogic'],
    matchPorts: [8009, 8080, 8443, 4848, 7001, 8161, 61616],
  },
  {
    id: 'A09:2021', name: 'Logging & Monitoring Failures', category: 'Monitoring', weight: 6,
    description: 'Insufficient logging, detection, monitoring, and active response allows breaches to go undetected.',
    remediation: 'Enable comprehensive event logging. Deploy SIEM. Set up real-time alerting. Establish incident response playbooks.',
    matchServices: ['syslog', 'snmp'],
    matchPorts: [514, 161, 162],
  },
  {
    id: 'A10:2021', name: 'SSRF', category: 'Web Security', weight: 6,
    description: 'Server-Side Request Forgery allows attackers to induce the server-side application to make HTTP requests to an unintended location.',
    remediation: 'Sanitize and validate all client-supplied URLs. Implement network segmentation. Use allowlists for outbound connections.',
    matchServices: ['http', 'https', 'squid', 'proxy', 'nginx'],
    matchPorts: [80, 443, 8080, 3128, 8888],
  },
];

// ─── CIS Controls v8 ──────────────────────────────────────────────────────────
const CIS_CONTROLS: ControlDef[] = [
  {
    id: 'CIS-1', name: 'Enterprise Asset Inventory', category: 'Asset Management', weight: 6,
    description: 'Actively manage all enterprise hardware assets connected to the network to ensure security monitoring and response.',
    remediation: 'Deploy network scanning tools. Maintain automated asset inventory. Use agent-based discovery.',
  },
  {
    id: 'CIS-2', name: 'Software Asset Inventory', category: 'Asset Management', weight: 6,
    description: 'Actively manage all software to ensure only authorized software is installed and can execute.',
    remediation: 'Maintain software inventory. Implement application allowlisting. Review installed software monthly.',
    requiresCVE: true,
  },
  {
    id: 'CIS-4', name: 'Secure Configuration', category: 'Config Management', weight: 9,
    description: 'Establish and maintain the secure configuration of enterprise assets and software per hardening benchmarks.',
    remediation: 'Apply CIS Benchmarks. Implement configuration management (Ansible/Chef). Conduct automated configuration audits.',
    matchServices: ['http', 'admin', 'glassfish', 'weblogic', 'jboss', 'jenkins', 'tomcat'],
    matchPorts: [4848, 8161, 61616, 7001, 7002, 9090, 10000, 8080],
  },
  {
    id: 'CIS-5', name: 'Account Management', category: 'Identity', weight: 8,
    description: 'Use processes and tools to assign and manage authorization to credentials for accounts.',
    remediation: 'Audit all accounts. Remove stale accounts. Enforce strong passwords. Implement PAM solutions.',
    matchServices: ['ssh', 'ftp', 'rdp', 'ldap', 'kerberos', 'smb', 'microsoft-ds'],
    matchPorts: [22, 21, 3389, 389, 636, 88, 445],
  },
  {
    id: 'CIS-6', name: 'Access Control Management', category: 'Access Control', weight: 8,
    description: 'Use processes and tools to create, assign, manage, and revoke access credentials and privileges.',
    remediation: 'Implement least-privilege RBAC. Review permissions quarterly. Remove unnecessary database access.',
    matchServices: ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'mssql'],
    matchPorts: [3306, 5432, 27017, 6379, 9200, 1433],
  },
  {
    id: 'CIS-7', name: 'Vulnerability Management', category: 'Vuln Management', weight: 9,
    description: 'Continuously acquire, assess, and act on new information to identify vulnerabilities and minimize the window of exposure.',
    remediation: 'Automate vulnerability scanning. Patch critical CVEs within 24h, high within 7 days. Track remediation KPIs.',
    requiresCVE: true,
  },
  {
    id: 'CIS-12', name: 'Network Infrastructure', category: 'Network Security', weight: 8,
    description: 'Establish, implement, and actively manage network devices to prevent exploitation of network services.',
    remediation: 'Segment networks with VLANs. Implement firewall rules. Disable unnecessary services. Use VPN for remote access.',
    matchServices: ['rdp', 'vnc', 'telnet', 'ms-wbt', 'netbios', 'microsoft-ds', 'snmp'],
    matchPorts: [3389, 5900, 23, 161, 162, 139, 445, 135],
  },
  {
    id: 'CIS-16', name: 'Application Software Security', category: 'AppSec', weight: 8,
    description: 'Manage the security lifecycle of in-house and acquired software to prevent, detect, and remediate weaknesses.',
    remediation: 'Implement SDLC security gates. Conduct SAST/DAST. Perform code reviews. Deploy WAF.',
    matchServices: ['http', 'https', 'tomcat', 'apache', 'nginx', 'glassfish', 'weblogic'],
    matchPorts: [80, 443, 8080, 8443, 4848, 7001],
  },
  {
    id: 'CIS-18', name: 'Penetration Testing', category: 'Assessment', weight: 7,
    description: 'Test the effectiveness and resiliency of enterprise assets through identifying and exploiting weaknesses.',
    remediation: 'Conduct annual penetration tests. Perform red team exercises. Validate remediation of all critical findings.',
  },
];

// ─── NIST SP 800-53 Rev 5 ────────────────────────────────────────────────────
const NIST_CONTROLS: ControlDef[] = [
  {
    id: 'AC-2', name: 'Account Management', category: 'Access Control', weight: 8,
    description: 'Manage system accounts including establishing, enabling, modifying, disabling, and removing accounts as required.',
    remediation: 'Implement automated account lifecycle management. Review accounts quarterly. Disable inactive accounts after 90 days.',
    matchServices: ['ssh', 'ftp', 'rdp', 'ldap', 'smb', 'microsoft-ds'],
    matchPorts: [22, 21, 3389, 389, 445, 139],
  },
  {
    id: 'AC-17', name: 'Remote Access', category: 'Access Control', weight: 7,
    description: 'Establish and document usage restrictions and configuration/implementation guidance for remote access.',
    remediation: 'Enforce VPN with MFA for remote access. Log and monitor all sessions. Use privileged access workstations.',
    matchServices: ['rdp', 'ssh', 'vnc', 'ms-wbt', 'telnet'],
    matchPorts: [3389, 22, 5900, 23],
  },
  {
    id: 'IA-2', name: 'Multi-Factor Authentication', category: 'Identification & Auth', weight: 9,
    description: 'Implement multi-factor authentication for access to privileged accounts and non-privileged accounts.',
    remediation: 'Enforce MFA for all remote access and privileged operations. Use hardware tokens or authenticator apps.',
    matchServices: ['ssh', 'rdp', 'ftp', 'ms-wbt', 'vnc', 'ldap'],
    matchPorts: [22, 3389, 21, 5900, 389],
  },
  {
    id: 'IA-5', name: 'Authenticator Management', category: 'Identification & Auth', weight: 7,
    description: 'Manage authenticators including initial distribution, replacement, revocation, and recovery.',
    remediation: 'Enforce strong passwords. Rotate credentials every 90 days. Eliminate all default credentials immediately.',
    matchServices: ['mysql', 'postgresql', 'redis', 'mongodb', 'ftp', 'smtp'],
    matchPorts: [3306, 5432, 6379, 27017, 21, 25],
  },
  {
    id: 'SC-8', name: 'Transmission Confidentiality', category: 'System Protection', weight: 8,
    description: 'Implement cryptographic mechanisms to prevent unauthorized disclosure of information during transmission.',
    remediation: 'Enforce TLS 1.2+ for all data in transit. Implement certificate pinning. Use HSTS. Disable cleartext protocols.',
    matchServices: ['ftp', 'telnet', 'http', 'smtp', 'ldap', 'pop3', 'imap'],
    matchPorts: [21, 23, 80, 25, 389, 143, 110],
  },
  {
    id: 'SC-28', name: 'Protection of Data at Rest', category: 'System Protection', weight: 7,
    description: 'Implement cryptographic mechanisms to prevent unauthorized disclosure and modification of information at rest.',
    remediation: 'Encrypt databases at rest using AES-256. Implement full-disk encryption. Use HSMs for key management.',
    matchServices: ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'mssql'],
    matchPorts: [3306, 5432, 27017, 6379, 9200, 1433],
  },
  {
    id: 'SI-2', name: 'Flaw Remediation', category: 'System Integrity', weight: 9,
    description: 'Identify, report, and correct information system flaws. Test software updates before installation.',
    remediation: 'Patch critical CVEs within 24h, high within 7 days, medium within 30 days. Implement automated patching.',
    requiresCVE: true,
  },
  {
    id: 'CM-6', name: 'Configuration Settings', category: 'Config Management', weight: 8,
    description: 'Establish and document configuration settings that reflect the most restrictive mode consistent with operational requirements.',
    remediation: 'Apply CIS/DISA STIG baselines. Implement configuration drift detection. Conduct weekly configuration audits.',
    matchServices: ['tomcat', 'apache', 'nginx', 'glassfish', 'jboss', 'mysql', 'postgresql'],
    matchPorts: [80, 443, 8080, 8443, 3306, 5432],
  },
  {
    id: 'CM-7', name: 'Least Functionality', category: 'Config Management', weight: 8,
    description: 'Configure the system to provide only essential capabilities, prohibiting or restricting the use of unnecessary functions.',
    remediation: 'Disable all unnecessary services and ports. Remove unused software. Apply egress filtering and application firewall rules.',
    matchServices: ['netbios', 'snmp', 'zookeeper', 'activemq', 'rmi', 'finger'],
    matchPorts: [135, 139, 445, 161, 162, 2181, 9092, 8161, 61616, 79],
  },
  {
    id: 'RA-5', name: 'Vulnerability Scanning', category: 'Risk Assessment', weight: 8,
    description: 'Monitor and scan for vulnerabilities in the system and hosted applications periodically and when new vulnerabilities are identified.',
    remediation: 'Implement continuous authenticated vulnerability scanning. Track and report vulnerability metrics. Validate remediation.',
    requiresCVE: true,
  },
  {
    id: 'AU-2', name: 'Event Logging', category: 'Audit & Accountability', weight: 7,
    description: 'Identify the types of events that the system is capable of logging to support after-the-fact investigations.',
    remediation: 'Enable comprehensive event logging. Centralize logs to SIEM. Define and enforce log retention policies (1+ year).',
    matchServices: ['syslog', 'snmp'],
    matchPorts: [514, 161, 162],
  },
];

// ─── Matching Logic ───────────────────────────────────────────────────────────
function matchesFinding(finding: Finding, control: ControlDef): boolean {
  if (control.requiresCVE) return !!finding.cve_id;
  if (control.matchServices?.some(s => finding.service.toLowerCase().includes(s.toLowerCase()))) return true;
  if (control.matchPorts?.includes(finding.port)) return true;
  return false;
}

function hasRelevantScope(findings: Finding[], control: ControlDef): boolean {
  if (control.requiresCVE) return findings.length > 0;
  return findings.some(f =>
    control.matchServices?.some(s => f.service.toLowerCase().includes(s.toLowerCase())) ||
    control.matchPorts?.includes(f.port)
  );
}

// ─── Framework Evaluation ─────────────────────────────────────────────────────
export function evaluateFramework(frameworkId: ComplianceFrameworkId, allFindings: Finding[]): FrameworkResult {
  const controls =
    frameworkId === 'owasp' ? OWASP_CONTROLS :
    frameworkId === 'cis' ? CIS_CONTROLS : NIST_CONTROLS;

  const meta = {
    owasp: { name: 'OWASP Top 10', version: '2021' },
    cis: { name: 'CIS Controls', version: 'v8.0' },
    nist: { name: 'NIST SP 800-53', version: 'Rev 5' },
  }[frameworkId];

  let passed = 0, failed = 0, na = 0;
  let totalWeight = 0, passedWeight = 0;

  const evaluatedControls: EvaluatedControl[] = controls.map(control => {
    const affected = allFindings.filter(f => matchesFinding(f, control));
    const hasScope = allFindings.length > 0 && hasRelevantScope(allFindings, control);

    let status: 'pass' | 'fail' | 'na';
    if (affected.length > 0) {
      status = 'fail'; failed++;
    } else if (!hasScope) {
      status = 'na'; na++;
    } else {
      status = 'pass'; passed++;
    }

    if (status !== 'na') {
      totalWeight += control.weight;
      if (status === 'pass') passedWeight += control.weight;
    }

    const maxCVSS = affected.reduce((m, f) => Math.max(m, f.cvss_score ?? 0), 0);

    return {
      id: control.id,
      name: control.name,
      category: control.category,
      description: control.description,
      weight: control.weight,
      remediation: control.remediation,
      status,
      affectedFindings: affected,
      maxCVSS,
    };
  });

  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  return {
    id: frameworkId,
    name: meta.name,
    version: meta.version,
    score,
    controls: evaluatedControls,
    passed,
    failed,
    na,
  };
}

// ─── Remediation Queue ────────────────────────────────────────────────────────
const LOW_EFFORT_IDS = ['A02:2021', 'SC-8', 'CIS-7', 'SI-2', 'RA-5', 'A06:2021'];
const HIGH_EFFORT_IDS = ['A04:2021', 'CIS-18', 'A08:2021', 'AU-2'];

function getEffort(control: EvaluatedControl): 'Low' | 'Medium' | 'High' {
  if (LOW_EFFORT_IDS.includes(control.id)) return 'Low';
  if (HIGH_EFFORT_IDS.includes(control.id)) return 'High';
  return 'Medium';
}

export function getRemediationQueue(result: FrameworkResult): RemediationItem[] {
  return result.controls
    .filter(c => c.status === 'fail')
    .sort((a, b) => {
      if (b.maxCVSS !== a.maxCVSS) return b.maxCVSS - a.maxCVSS;
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.affectedFindings.length - a.affectedFindings.length;
    })
    .map((control, index) => ({
      priority: index + 1,
      control,
      findingCount: control.affectedFindings.length,
      maxCVSS: control.maxCVSS,
      estimatedEffort: getEffort(control),
    }));
}

export const FRAMEWORK_DEFS = [
  { id: 'owasp' as ComplianceFrameworkId, name: 'OWASP Top 10', version: '2021', icon: '🌐', color: 'text-blue-400' },
  { id: 'cis' as ComplianceFrameworkId, name: 'CIS Controls', version: 'v8.0', icon: '🛡', color: 'text-emerald-400' },
  { id: 'nist' as ComplianceFrameworkId, name: 'NIST SP 800-53', version: 'Rev 5', icon: '🏛', color: 'text-purple-400' },
];
