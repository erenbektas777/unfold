'use client';

interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

const PALETTES = [
  ['#6366f1', '#a78bfa'],
  ['#3b82f6', '#38bdf8'],
  ['#8b5cf6', '#ec4899'],
  ['#10b981', '#38bdf8'],
  ['#64748b', '#94a3b8'],
  ['#f59e0b', '#fb7185'],
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function Avatar({ seed, size = 36, className = '' }: AvatarProps) {
  const hash = hashSeed(seed || 'unfold');
  const [c1, c2] = PALETTES[hash % PALETTES.length];
  const cx1 = 10 + (hash % 18);
  const cy1 = 10 + ((hash >> 4) % 18);
  const cx2 = 16 + ((hash >> 8) % 16);
  const cy2 = 14 + ((hash >> 12) % 16);
  const gradId = `av-${hash}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={`shrink-0 rounded-full border border-white/10 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} stopOpacity="0.85" />
          <stop offset="100%" stopColor={c2} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="20" fill="#0f172a" />
      <circle cx={cx1} cy={cy1} r="14" fill={`url(#${gradId})`} opacity="0.7" />
      <circle cx={cx2} cy={cy2} r="9" fill={c2} opacity="0.45" />
    </svg>
  );
}
