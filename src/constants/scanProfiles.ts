import { NmapProfile } from '@/types';

export const SCAN_PROFILES: NmapProfile[] = [
  {
    id: 'fast',
    label: 'Fast Scan',
    description: 'Quick port discovery with service version detection',
    args: ['-F', '-sV', '--open'],
    estimated_time: '30–60 seconds',
    icon: '⚡',
  },
  {
    id: 'vulnerability',
    label: 'Vulnerability Scan',
    description: 'Service fingerprinting with NSE vuln/vulners scripts',
    args: ['-sV', '--script', 'vuln,vulners', '--open'],
    estimated_time: '2–5 minutes',
    icon: '🔍',
  },
  {
    id: 'comprehensive',
    label: 'Comprehensive Scan',
    description: 'Full OS detection, scripts, traceroute, vuln analysis',
    args: ['-A', '-sC', '--script', 'vuln,vulners', '--open'],
    estimated_time: '5–15 minutes',
    icon: '🛡️',
  },
];

export const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
};

export const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  info: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export const RFC1918_RANGES = [
  { prefix: '10.', label: '10.0.0.0/8' },
  { prefix: '172.16.', label: '172.16.0.0/12', rangeStart: 16, rangeEnd: 31 },
  { prefix: '192.168.', label: '192.168.0.0/16' },
  { prefix: '127.', label: '127.0.0.0/8 (loopback)' },
];
