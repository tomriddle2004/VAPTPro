/**
 * Client-side target validation — extended to support:
 *  • IPv4 private (RFC 1918) — full authorization
 *  • IPv4 public — allowed with security warning
 *  • CIDR subnets (e.g., 192.168.1.0/24)
 *  • Domain names / FQDNs (e.g., server.corp.local, example.com)
 *
 * On the Linux backend, net.isIP() + scope enforcement runs again before
 * spawning /usr/bin/nmap. Frontend validation is UX-only.
 */

export type TargetCategory = 'ipv4_private' | 'ipv4_public' | 'cidr' | 'domain';

export type IPValidationResult =
  | {
      valid: true;
      category: TargetCategory;
      isPrivate: boolean;
      range?: string;
      /** Set for public IPs and domains — user must acknowledge risk */
      warning?: string;
    }
  | { valid: false; error: string };

// ─── RFC 1918 ranges ────────────────────────────────────────────────────────

const RFC1918 = [
  { regex: /^10\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,               range: '10.0.0.0/8' },
  { regex: /^172\.(1[6-9]|2\d|3[01])\.(\d{1,3})\.(\d{1,3})$/,    range: '172.16.0.0/12' },
  { regex: /^192\.168\.(\d{1,3})\.(\d{1,3})$/,                     range: '192.168.0.0/16' },
  { regex: /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,              range: '127.0.0.0/8 (loopback)' },
];

export function validateIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => {
    const n = parseInt(p, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

export function isRFC1918(ip: string): { result: boolean; range?: string } {
  for (const p of RFC1918) {
    if (p.regex.test(ip)) return { result: true, range: p.range };
  }
  return { result: false };
}

// ─── Domain regex (covers FQDNs and simple hostnames) ───────────────────────

const DOMAIN_REGEX =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,63}$|^[a-zA-Z][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]$/;

// ─── CIDR regex ──────────────────────────────────────────────────────────────

const CIDR_REGEX = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/;

// ─── Main validation ─────────────────────────────────────────────────────────

export function validateScanTarget(input: string): IPValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { valid: false, error: 'Target is required.' };
  }

  // 1. CIDR notation (192.168.1.0/24)
  const cidrMatch = CIDR_REGEX.exec(trimmed);
  if (cidrMatch) {
    const [, baseIP, prefix] = cidrMatch;
    if (!validateIPv4(baseIP)) {
      return { valid: false, error: 'Invalid base IP address in CIDR notation.' };
    }
    const pfx = parseInt(prefix, 10);
    if (pfx < 0 || pfx > 32) {
      return { valid: false, error: 'CIDR prefix must be between 0 and 32.' };
    }
    const { result, range } = isRFC1918(baseIP);
    if (!result) {
      return {
        valid: true,
        category: 'cidr',
        isPrivate: false,
        warning: 'This CIDR includes public address space. Ensure you have explicit authorization before scanning.',
      };
    }
    return { valid: true, category: 'cidr', isPrivate: true, range };
  }

  // 2. IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) {
    if (!validateIPv4(trimmed)) {
      return { valid: false, error: 'Invalid IPv4 address — each octet must be 0–255.' };
    }
    const { result, range } = isRFC1918(trimmed);
    if (result) {
      return { valid: true, category: 'ipv4_private', isPrivate: true, range };
    }
    // Public IP — allowed with warning
    return {
      valid: true,
      category: 'ipv4_public',
      isPrivate: false,
      warning:
        'Public IP detected. Scanning systems you do not own or have explicit written authorization to test may violate laws (CFAA, ECPA). Proceed only with authorization.',
    };
  }

  // 3. Domain name / FQDN
  if (DOMAIN_REGEX.test(trimmed) && !trimmed.includes(' ')) {
    return {
      valid: true,
      category: 'domain',
      isPrivate: false,
      warning:
        'Domain/FQDN target. Ensure the hostname resolves to an authorized IP. Backend will resolve via DNS before scanning.',
    };
  }

  return {
    valid: false,
    error: 'Invalid target. Accepted: IPv4 address (192.168.1.100), CIDR subnet (192.168.1.0/24), or domain name (server.corp.local).',
  };
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function formatDuration(startISO: string, endISO?: string): string {
  const diffMs = (endISO ? new Date(endISO).getTime() : Date.now()) - new Date(startISO).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}
