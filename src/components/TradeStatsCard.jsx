import { CardShell, CardSkeleton, EmptyState } from './CardShell.jsx';

export function TradeStatsCard({ stats, loading }) {
  if (loading) return <CardSkeleton accent="green" />;
  if (!stats) return <EmptyState accent="green" title="Trade stats" sub="No data yet" />;

  const winPct = (stats.winRate * 100).toFixed(1);
  const avgColour = stats.avgPnl >= 0 ? 'text-[#9FE1CB]' : 'text-rose-400';
  const totalColour = stats.totalPnl >= 0 ? 'text-[#9FE1CB]' : 'text-rose-400';

  return (
    <CardShell accent="green">
      <GreenBadge>CLOSED TRADES</GreenBadge>
      <h3 className="mt-3 text-[13px] font-medium text-[#5DCAA5]">Trade stats</h3>

      <p className="mt-1 text-[32px] font-bold leading-none tracking-tight text-[#9FE1CB]">
        {winPct}%
      </p>
      <p className="mt-1 text-[12px] text-[#5DCAA5]">win rate ({stats.total} trades)</p>

      <dl className="mt-4 space-y-1.5 border-t border-[#5DCAA5]/15 pt-3">
        <Row label="Avg PnL" value={`${stats.avgPnl >= 0 ? '+' : ''}$${stats.avgPnl.toFixed(2)}`} colour={avgColour} />
        <Row label="Total realised" value={`${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(2)}`} colour={totalColour} />
        <Row label="Best market" value={stats.bestMarket} colour="text-[#9FE1CB]" />
      </dl>
    </CardShell>
  );
}

function Row({ label, value, colour }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[12px] text-[#5DCAA5]/70">{label}</dt>
      <dd className={`text-[12px] font-medium tabular-nums ${colour}`}>{value}</dd>
    </div>
  );
}

function GreenBadge({ children }) {
  return (
    <span className="inline-block rounded-md bg-[#5DCAA5]/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase text-[#5DCAA5]">
      {children}
    </span>
  );
}
