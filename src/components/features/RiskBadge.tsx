import { Scan } from '@/types';

interface Props {
  rating: Scan['risk_rating'];
  size?: 'sm' | 'md' | 'lg';
}

const CONFIG: Record<string, { label: string; className: string }> = {
  Critical: { label: '⚠ CRITICAL', className: 'bg-red-500/20 text-red-400 border-red-500/40' },
  High: { label: '▲ HIGH', className: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  Medium: { label: '◆ MEDIUM', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  Low: { label: '▼ LOW', className: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  Clean: { label: '✓ CLEAN', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
};

export default function RiskBadge({ rating, size = 'sm' }: Props) {
  const cfg = CONFIG[rating ?? 'Clean'];
  return (
    <span
      className={`inline-flex items-center border rounded-md font-mono font-bold tracking-wide ${cfg.className} ${
        size === 'sm' ? 'text-[10px] px-2 py-0.5' :
        size === 'md' ? 'text-xs px-3 py-1' :
        'text-sm px-4 py-1.5'
      }`}
    >
      {cfg.label}
    </span>
  );
}
