import { Severity } from '@/types';

interface Props {
  severity: Severity;
  size?: 'sm' | 'md';
}

const CONFIG: Record<Severity, { label: string; className: string }> = {
  critical: { label: 'CRITICAL', className: 'bg-red-500/20 text-red-400 border-red-500/40' },
  high: { label: 'HIGH', className: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  medium: { label: 'MEDIUM', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  low: { label: 'LOW', className: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  info: { label: 'INFO', className: 'bg-slate-500/20 text-slate-400 border-slate-500/40' },
};

export default function SeverityBadge({ severity, size = 'sm' }: Props) {
  const cfg = CONFIG[severity] ?? CONFIG.info;
  return (
    <span
      className={`inline-flex items-center border rounded font-mono font-bold tracking-wider ${cfg.className} ${
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
      }`}
    >
      {cfg.label}
    </span>
  );
}
