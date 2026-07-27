export type ScanType = 'fast' | 'vulnerability' | 'comprehensive';
export type ScanStatus = 'running' | 'completed' | 'failed' | 'queued';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Scan {
  id: string;
  target_ip: string;
  scan_type: ScanType;
  status: ScanStatus;
  start_time: string;
  end_time?: string;
  progress?: number;
  findings_count?: number;
  risk_rating?: 'Critical' | 'High' | 'Medium' | 'Low' | 'Clean';
}

export interface Finding {
  id: string;
  scan_id: string;
  port: number;
  protocol: string;
  service: string;
  version: string;
  state: string;
  cve_id?: string;
  cvss_score?: number;
  severity: Severity;
  description: string;
  remediation: string;
  script_output?: string;
}

export interface ScanDetail extends Scan {
  findings: Finding[];
  os_detection?: string;
  hostname?: string;
  mac_address?: string;
  total_ports_scanned?: number;
}

export interface NmapProfile {
  id: ScanType;
  label: string;
  description: string;
  args: string[];
  estimated_time: string;
  icon: string;
}

export interface AllowlistEntry {
  ip?: string;
  subnet?: string;
  comment?: string;
}

// ─── Scheduler ───────────────────────────────────────────────────────────────
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface ScheduledScan {
  id: string;
  name: string;
  target_ip: string;
  scan_type: ScanType;
  frequency: ScheduleFrequency;
  time: string;
  day_of_week?: number;
  day_of_month?: number;
  enabled: boolean;
  created_at: string;
  last_run?: string;
  next_run: string;
  run_count: number;
}

// ─── Compliance ───────────────────────────────────────────────────────────────
export type ComplianceFrameworkId = 'owasp' | 'cis' | 'nist';

export interface EvaluatedControl {
  id: string;
  name: string;
  category: string;
  description: string;
  weight: number;
  remediation: string;
  status: 'pass' | 'fail' | 'na';
  affectedFindings: Finding[];
  maxCVSS: number;
}

export interface FrameworkResult {
  id: ComplianceFrameworkId;
  name: string;
  version: string;
  score: number;
  controls: EvaluatedControl[];
  passed: number;
  failed: number;
  na: number;
}

export interface RemediationItem {
  priority: number;
  control: EvaluatedControl;
  findingCount: number;
  maxCVSS: number;
  estimatedEffort: 'Low' | 'Medium' | 'High';
}
