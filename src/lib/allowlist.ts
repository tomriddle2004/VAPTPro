export type AllowlistTargetType = 'ip' | 'cidr' | 'domain';

export interface AllowlistTarget {
  id: string;
  type: AllowlistTargetType;
  value: string;
  comment: string;
  added_at: string;
}

const KEY = 'vapt_allowlist';

const DEFAULTS: AllowlistTarget[] = [
  { id: 'def-1', type: 'cidr', value: '10.0.0.0/8',       comment: 'Class A private (corporate internal)',  added_at: '2024-01-01T00:00:00Z' },
  { id: 'def-2', type: 'cidr', value: '172.16.0.0/12',    comment: 'Class B private (data-center VLAN)',    added_at: '2024-01-01T00:00:00Z' },
  { id: 'def-3', type: 'cidr', value: '192.168.0.0/16',   comment: 'Class C private (office/home network)', added_at: '2024-01-01T00:00:00Z' },
  { id: 'def-4', type: 'cidr', value: '127.0.0.0/8',      comment: 'Loopback (localhost)',                  added_at: '2024-01-01T00:00:00Z' },
];

export function loadAllowlist(): AllowlistTarget[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...DEFAULTS];
}

export function saveAllowlist(entries: AllowlistTarget[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function addEntry(entry: Omit<AllowlistTarget, 'id' | 'added_at'>): AllowlistTarget {
  const e: AllowlistTarget = {
    ...entry,
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    added_at: new Date().toISOString(),
  };
  const list = loadAllowlist();
  list.push(e);
  saveAllowlist(list);
  return e;
}

export function removeEntry(id: string): void {
  saveAllowlist(loadAllowlist().filter(e => e.id !== id));
}

export function resetToDefaults(): void {
  saveAllowlist([...DEFAULTS]);
}

// ── YAML export ─────────────────────────────────────────────────────────────

export function generateYAML(entries: AllowlistTarget[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# VAPT Pro — Targets Allowlist`,
    `# Generated: ${date}`,
    `# Copy this file to /etc/vapt-app/targets.yaml on your Linux server`,
    ``,
    `allowlist:`,
  ];
  for (const e of entries) {
    const key = e.type === 'domain' ? 'domain' : 'ip';
    lines.push(`  - ${key}: ${e.value}`);
    if (e.comment) lines.push(`    comment: "${e.comment}"`);
  }
  lines.push('');
  return lines.join('\n');
}

// ── Type detection helper ────────────────────────────────────────────────────

export function detectType(value: string): AllowlistTargetType {
  if (value.includes('/')) return 'cidr';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return 'ip';
  return 'domain';
}
