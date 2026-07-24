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
