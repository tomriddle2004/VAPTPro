import { Severity, Scan, Finding } from '@/types';

export interface AlertRule {
  id: string;
  name: string;
  /** IP, CIDR, domain, or '*' for all targets */
  target_pattern: string;
  severity_threshold: Severity;
  /** Simulated email address for delivery */
  email: string;
  enabled: boolean;
  created_at: string;
}

export interface AlertEvent {
  id: string;
  rule_id: string;
  rule_name: string;
  scan_id: string;
  target_ip: string;
  severity: Severity;
  finding_count: number;
  triggered_at: string;
  delivered: boolean;
  email: string;
}

const RULES_KEY = 'vapt_alert_rules';
const EVENTS_KEY = 'vapt_alert_events';

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4, high: 3, medium: 2, low: 1, info: 0,
};

// ── Persistence helpers ─────────────────────────────────────────────────────

export function loadRules(): AlertRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveRules(rules: AlertRule[]): void {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function loadEvents(): AlertEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveEvents(events: AlertEvent[]): void {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export function createRule(rule: Omit<AlertRule, 'id' | 'created_at'>): AlertRule {
  const r: AlertRule = {
    ...rule,
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  const rules = loadRules();
  rules.push(r);
  saveRules(rules);
  return r;
}

export function updateRule(id: string, patch: Partial<AlertRule>): void {
  const rules = loadRules();
  const idx = rules.findIndex(r => r.id === id);
  if (idx !== -1) { rules[idx] = { ...rules[idx], ...patch }; saveRules(rules); }
}

export function deleteRule(id: string): void {
  saveRules(loadRules().filter(r => r.id !== id));
}

export function clearEvents(): void {
  localStorage.removeItem(EVENTS_KEY);
}

// ── Target matching ─────────────────────────────────────────────────────────

function ipToNum(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) | parseInt(oct, 10), 0) >>> 0;
}

function matchesCIDR(ip: string, cidr: string): boolean {
  const [base, prefix] = cidr.split('/');
  if (!base || prefix === undefined) return false;
  const prefixNum = parseInt(prefix, 10);
  if (isNaN(prefixNum)) return false;
  const mask = prefixNum === 0 ? 0 : (~0 << (32 - prefixNum)) >>> 0;
  return (ipToNum(ip) & mask) === (ipToNum(base) & mask);
}

function matchesPattern(target: string, pattern: string): boolean {
  if (!pattern || pattern === '*') return true;

  const p = pattern.trim().toLowerCase();
  const t = target.trim().toLowerCase();

  // Exact match
  if (p === t) return true;

  // CIDR match (only if pattern contains '/')
  if (p.includes('/') && /^\d/.test(p)) {
    try { return matchesCIDR(t, p); } catch { return false; }
  }

  // Glob/wildcard domain match  e.g. *.corp.local
  if (p.includes('*')) {
    const regex = new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    return regex.test(t);
  }

  return false;
}

// ── Check & log alerts ──────────────────────────────────────────────────────

export function checkAndLogAlerts(scan: Scan, findings: Finding[]): AlertEvent[] {
  const rules = loadRules().filter(r => r.enabled);
  if (rules.length === 0) return [];

  const events = loadEvents();
  const newEvents: AlertEvent[] = [];

  for (const rule of rules) {
    if (!matchesPattern(scan.target_ip, rule.target_pattern)) continue;

    // Find findings that meet or exceed the severity threshold
    const matched = findings.filter(
      f => SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER[rule.severity_threshold]
    );
    if (matched.length === 0) continue;

    // Highest severity in matched set
    const topSeverity = matched.reduce<Severity>((top, f) =>
      SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[top] ? f.severity : top,
      rule.severity_threshold
    );

    const event: AlertEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rule_id: rule.id,
      rule_name: rule.name,
      scan_id: scan.id,
      target_ip: scan.target_ip,
      severity: topSeverity,
      finding_count: matched.length,
      triggered_at: new Date().toISOString(),
      delivered: true, // simulated
      email: rule.email,
    };
    newEvents.push(event);
  }

  if (newEvents.length > 0) {
    events.push(...newEvents);
    // Keep latest 200 events
    saveEvents(events.slice(-200));
  }

  return newEvents;
}
