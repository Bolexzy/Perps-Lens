import { CardShell, CardSkeleton, EmptyState } from './CardShell.jsx';

export function EquityTrendCard({ stats, loading }) {
  if (loading) return <CardSkeleton accent="salmon" />;
  if (!stats) return <EmptyState accent="salmon" title="Equity trend" sub="No data yet" />;

  const returnPositive = stats.return30d >= 0;
  const returnColour = returnPositive ? 'text-[#F5C4B3]' : 'text-rose-400';
  const returnSign = returnPositive ? '+' : '';

  return (
    <CardShell accent="salmon">
      <span className="inline-block rounded-md bg-[#F0997B]/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase text-[#F0997B]">
        30 DAYS
      </span>
      <h3 className="mt-3 text-[13px] font-medium text-[#F0997B]">Equity trend</h3>

      <p className={`mt-1 text-[32px] font-bold leading-none tracking-tight ${returnColour}`}>
        {returnSign}{stats.return30d.toFixed(2)}%
      </p>
      <p className="mt-1 text-[12px] text-[#F0997B]">30-day return</p>

      <dl className="mt-4 space-y-1.5 border-t border-[#F0997B]/15 pt-3">
        <Row label="Max drawdown" value={`−${stats.maxDrawdown.toFixed(2)}%`} colour="text-rose-400" />
        <Row label="Peak equity" value={`$${stats.peak.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} colour="text-[#F5C4B3]" />
        <Row label="Current equity" value={`$${stats.current.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} colour="text-[#F5C4B3]" />
      </dl>
    </CardShell>
  );
}

function Row({ label, value, colour }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[12px] text-[#F0997B]/70">{label}</dt>
      <dd className={`text-[12px] font-medium tabular-nums ${colour}`}>{value}</dd>
    </div>
  );
}
