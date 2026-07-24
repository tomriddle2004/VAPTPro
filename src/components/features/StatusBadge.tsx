import { ScanStatus } from '@/types';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

interface Props { status: ScanStatus }

export default function StatusBadge({ status }: Props) {
  const configs = {
    completed: { label: 'Completed', icon: CheckCircle2, className: 'text-emerald-400' },
    failed: { label: 'Failed', icon: XCircle, className: 'text-red-400' },
    running: { label: 'Running', icon: Loader2, className: 'text-blue-400 animate-spin' },
    queued: { label: 'Queued', icon: Clock, className: 'text-yellow-400' },
  };
  const cfg = configs[status];
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1.5 text-sm font-medium ${cfg.className}`}>
      <Icon className="w-4 h-4" />
      {cfg.label}
    </span>
  );
}
