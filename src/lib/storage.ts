import { Scan, ScanDetail, Finding } from '@/types';
import { MOCK_SCANS, MOCK_FINDINGS_BY_SCAN, getMockScanDetail } from './mockData';

const SCANS_KEY = 'vapt_scans';
const FINDINGS_KEY = 'vapt_findings';

function loadScans(): Scan[] {
  try {
    const raw = localStorage.getItem(SCANS_KEY);
    return raw ? JSON.parse(raw) : [...MOCK_SCANS];
  } catch {
    return [...MOCK_SCANS];
  }
}

function saveScans(scans: Scan[]): void {
  localStorage.setItem(SCANS_KEY, JSON.stringify(scans));
}

function loadFindings(): Record<string, Finding[]> {
  try {
    const raw = localStorage.getItem(FINDINGS_KEY);
    return raw ? JSON.parse(raw) : { ...MOCK_FINDINGS_BY_SCAN };
  } catch {
    return { ...MOCK_FINDINGS_BY_SCAN };
  }
}

function saveFindings(findings: Record<string, Finding[]>): void {
  localStorage.setItem(FINDINGS_KEY, JSON.stringify(findings));
}

export function getAllScans(): Scan[] {
  return loadScans().sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );
}

export function getScanById(id: string): ScanDetail | null {
  const scans = loadScans();
  const scan = scans.find(s => s.id === id);
  if (!scan) return getMockScanDetail(id);
  const allFindings = loadFindings();
  const findings = allFindings[id] || MOCK_FINDINGS_BY_SCAN[id] || [];
  return {
    ...scan,
    findings,
    os_detection: 'Unknown (Frontend Demo)',
    hostname: undefined,
    mac_address: undefined,
    total_ports_scanned: 1000,
  };
}

export function createScan(scan: Scan): void {
  const scans = loadScans();
  scans.push(scan);
  saveScans(scans);
}

export function updateScan(id: string, updates: Partial<Scan>): void {
  const scans = loadScans();
  const idx = scans.findIndex(s => s.id === id);
  if (idx !== -1) {
    scans[idx] = { ...scans[idx], ...updates };
    saveScans(scans);
  }
}

export function saveFindingsForScan(scanId: string, findings: Finding[]): void {
  const allFindings = loadFindings();
  allFindings[scanId] = findings;
  saveFindings(allFindings);
}

export function deleteAllScans(): void {
  localStorage.removeItem(SCANS_KEY);
  localStorage.removeItem(FINDINGS_KEY);
}

export function getAllFindings(): Finding[] {
  return Object.values(loadFindings()).flat();
}

export function getAllScanDetails(): ScanDetail[] {
  const scans = loadScans();
  const allFindings = loadFindings();
  return scans
    .filter(s => s.status === 'completed')
    .map(scan => ({
      ...scan,
      findings: allFindings[scan.id] || MOCK_FINDINGS_BY_SCAN[scan.id] || [],
      os_detection: undefined,
      hostname: undefined,
      mac_address: undefined,
      total_ports_scanned: undefined,
    }));
}

export function addScanTag(scanId: string, tag: string): void {
  const scans = loadScans();
  const idx = scans.findIndex(s => s.id === scanId);
  if (idx !== -1) {
    const existing = scans[idx].tags || [];
    if (!existing.includes(tag)) {
      scans[idx] = { ...scans[idx], tags: [...existing, tag] };
      saveScans(scans);
    }
  }
}

export function removeScanTag(scanId: string, tag: string): void {
  const scans = loadScans();
  const idx = scans.findIndex(s => s.id === scanId);
  if (idx !== -1) {
    scans[idx] = { ...scans[idx], tags: (scans[idx].tags || []).filter(t => t !== tag) };
    saveScans(scans);
  }
}

export function getAllTags(): string[] {
  const set = new Set<string>();
  loadScans().forEach(s => (s.tags || []).forEach(t => set.add(t)));
  return Array.from(set).sort();
}

// Initialize storage with mock data on first load
if (!localStorage.getItem(SCANS_KEY)) {
  saveScans(MOCK_SCANS);
  saveFindings(MOCK_FINDINGS_BY_SCAN);
}
