import { Tag, X } from 'lucide-react';

const PREDEFINED: Record<string, string> = {
  production:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  'critical-infra':'bg-red-500/20 text-red-400 border-red-500/40',
  pentest:         'bg-orange-500/20 text-orange-400 border-orange-500/40',
  staging:         'bg-blue-500/20 text-blue-400 border-blue-500/40',
  cloud:           'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  dmz:             'bg-purple-500/20 text-purple-400 border-purple-500/40',
  legacy:          'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  iot:             'bg-pink-500/20 text-pink-400 border-pink-500/40',
};

/** Deterministic fallback color for custom tags */
function hashColor(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffffffff;
  const palette = [
    'bg-violet-500/20 text-violet-400 border-violet-500/40',
    'bg-teal-500/20 text-teal-400 border-teal-500/40',
    'bg-rose-500/20 text-rose-400 border-rose-500/40',
    'bg-lime-500/20 text-lime-400 border-lime-500/40',
    'bg-amber-500/20 text-amber-400 border-amber-500/40',
  ];
  return palette[Math.abs(h) % palette.length];
}

export function getTagStyle(tag: string): string {
  return PREDEFINED[tag] ?? hashColor(tag);
}

interface Props {
  tag: string;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export default function TagChip({ tag, onRemove, size = 'sm' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium select-none
        ${size === 'md' ? 'px-2.5 py-0.5 text-xs' : 'px-2 py-0.5 text-[10px]'}
        ${getTagStyle(tag)}`}
    >
      <Tag className={size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'} />
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:opacity-60 transition-opacity focus:outline-none"
          aria-label={`Remove tag ${tag}`}
        >
          <X className={size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'} />
        </button>
      )}
    </span>
  );
}

/** All pre-defined tag names for the picker */
export const PRESET_TAGS = Object.keys(PREDEFINED);
