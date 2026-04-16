/**
 * Shared card primitives used by all four stat cards and the AI card.
 *
 * Accents: purple | green | amber | salmon | (default = purple)
 */

const THEME = {
  purple: {
    bg: 'bg-[#1e1a4a]',
    border: 'border-[#AFA9EC]/40',
    glow: 'shadow-[0_0_40px_rgba(175,169,236,0.08)]',
    gradient: 'bg-[radial-gradient(circle_at_top_left,rgba(96,84,220,0.18),transparent_60%)]',
  },
  green: {
    bg: 'bg-[#041f19]',
    border: 'border-[#5DCAA5]/40',
    glow: 'shadow-[0_0_40px_rgba(93,202,165,0.08)]',
    gradient: 'bg-[radial-gradient(circle_at_top_left,rgba(8,80,65,0.4),transparent_60%)]',
  },
  amber: {
    bg: 'bg-[#1e1000]',
    border: 'border-[#EF9F27]/40',
    glow: 'shadow-[0_0_40px_rgba(239,159,39,0.08)]',
    gradient: 'bg-[radial-gradient(circle_at_top_left,rgba(99,56,6,0.5),transparent_60%)]',
  },
  salmon: {
    bg: 'bg-[#200d07]',
    border: 'border-[#F0997B]/40',
    glow: 'shadow-[0_0_40px_rgba(240,153,123,0.08)]',
    gradient: 'bg-[radial-gradient(circle_at_top_left,rgba(113,43,19,0.5),transparent_60%)]',
  },
};

export function CardShell({ accent = 'purple', children, className = '' }) {
  const t = THEME[accent] ?? THEME.purple;
  return (
    <div
      className={`overflow-hidden rounded-2xl border ${t.border} ${t.glow} ${t.bg} relative ${className}`}
    >
      {/* Subtle radial glow overlay */}
      <div className={`pointer-events-none absolute inset-0 ${t.gradient}`} />
      {/* Bottom edge shimmer */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative p-5">{children}</div>
    </div>
  );
}

export function CardSkeleton({ accent = 'purple' }) {
  const t = THEME[accent] ?? THEME.purple;
  return (
    <div className={`overflow-hidden rounded-2xl border ${t.border} ${t.bg} p-5`}>
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-16 rounded bg-white/10" />
        <div className="h-7 w-28 rounded bg-white/10" />
        <div className="h-3 w-20 rounded bg-white/10" />
        <div className="mt-4 space-y-2 border-t border-white/8 pt-3">
          <div className="h-3 w-full rounded bg-white/8" />
          <div className="h-3 w-3/4 rounded bg-white/8" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ accent = 'purple', title, sub }) {
  return (
    <CardShell accent={accent}>
      <p className="text-[13px] font-medium text-white/50">{title}</p>
      <p className="mt-1 text-[12px] text-white/25">{sub}</p>
    </CardShell>
  );
}
