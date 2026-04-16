import { CardShell, CardSkeleton, EmptyState } from './CardShell.jsx';

export function FundingCostCard({ stats, loading }) {
  if (loading) return <CardSkeleton accent="purple" />;
  if (!stats) return <EmptyState accent="purple" title="Funding cost" sub="No data yet" />;

  const sign = stats.sign < 0 ? '−' : '+';
  const colour = stats.sign < 0 ? 'text-[#CECBF6]' : 'text-emerald-300';

  return (
    <CardShell accent="purple">
      <Badge accent="purple">PERP FEES</Badge>
      <h3 className="mt-3 text-[13px] font-medium text-[#AFA9EC]">Funding cost</h3>

      <p className={`mt-1 text-[32px] font-bold leading-none tracking-tight ${colour}`}>
        {sign}${stats.totalMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="mt-1 text-[12px] text-[#AFA9EC]">{stats.direction} this month</p>

      <dl className="mt-4 space-y-1.5 border-t border-[#AFA9EC]/15 pt-3">
        <Row label="Daily avg" value={`${sign}$${stats.dailyAvg.toFixed(2)}/day`} accent="purple" />
        <Row label="Payments" value={`${stats.count} events`} accent="purple" />
      </dl>
    </CardShell>
  );
}

function Row({ label, value, accent }) {
  const valueColour = accent === 'purple' ? 'text-[#CECBF6]' : 'text-[#9FE1CB]';
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[12px] text-[#AFA9EC]/70">{label}</dt>
      <dd className={`text-[12px] font-medium tabular-nums ${valueColour}`}>{value}</dd>
    </div>
  );
}

function Badge({ children, accent }) {
  const cls =
    accent === 'purple'
      ? 'bg-[#AFA9EC]/15 text-[#AFA9EC]'
      : 'bg-[#5DCAA5]/15 text-[#5DCAA5]';
  return (
    <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase ${cls}`}>
      {children}
    </span>
  );
}

export { Badge, Row };
