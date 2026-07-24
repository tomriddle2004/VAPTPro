/**
 * Client-side IP validation mirroring server-side Node.js net.isIP() + RFC 1918 enforcement.
 * On the actual Linux backend, this is enforced via net.isIP() before spawning nmap.
 */

export type IPValidationResult =
  | { valid: true; type: 'ipv4' | 'ipv6'; isPrivate: boolean; range?: string }
  | { valid: false; error: string };

const RFC1918_PATTERNS = [
  { regex: /^10\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/, range: '10.0.0.0/8' },
  {
    regex: /^172\.(1[6-9]|2\d|3[01])\.(\d{1,3})\.(\d{1,3})$/,
    range: '172.16.0.0/12',
  },
  { regex: /^192\.168\.(\d{1,3})\.(\d{1,3})$/, range: '192.168.0.0/16' },
  { regex: /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/, range: '127.0.0.0/8 (loopback)' },
];

export function validateIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    const n = parseInt(part, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === part;
  });
}

export function isRFC1918(ip: string): { result: boolean; range?: string } {
  for (const pattern of RFC1918_PATTERNS) {
    if (pattern.regex.test(ip)) {
      return { result: true, range: pattern.range };
    }
  }
  return { result: false };
}

export function validateScanTarget(input: string): IPValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { valid: false, error: 'Target IP address is required.' };
  }

  // Basic IPv4 format check
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid format. Enter a valid IPv4 address (e.g., 192.168.1.100).',
    };
  }

  if (!validateIPv4(trimmed)) {
    return {
      valid: false,
      error: 'Invalid IPv4 address. Each octet must be 0–255.',
    };
  }

  const { result, range } = isRFC1918(trimmed);
  if (!result) {
    return {
      valid: false,
      error:
        'BLOCKED: Public or non-RFC 1918 IP address. Only private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) or explicitly whitelisted targets are permitted.',
    };
  }

  return { valid: true, type: 'ipv4', isPrivate: true, range };
}

export function formatDuration(startISO: string, endISO?: string): string {
  const start = new Date(startISO).getTime();
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  const diffMs = end - start;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}
