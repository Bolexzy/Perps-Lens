import { CardShell, CardSkeleton, EmptyState } from './CardShell.jsx';

const RISK_COLOUR = {
  critical: 'text-rose-400',
  high: 'text-orange-400',
  medium: 'text-[#FAC775]',
  low: 'text-[#EF9F27]',
};

const RISK_BADGE = {
  critical: 'bg-rose-500/20 text-rose-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-[#EF9F27]/20 text-[#FAC775]',
  low: 'bg-[#EF9F27]/10 text-[#EF9F27]',
};

export function LiqRiskCard({ positions, loading }) {
  if (loading) return <CardSkeleton accent="amber" />;
  if (!positions?.length) return <EmptyState accent="amber" title="Liq. risk" sub="No open positions" />;

  const minDist = positions[0]; // riskiest first (sorted in compute.js)

  return (
    <CardShell accent="amber">
      <span className="inline-block rounded-md bg-[#EF9F27]/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase text-[#EF9F27]">
        OPEN POSITIONS
      </span>
      <h3 className="mt-3 text-[13px] font-medium text-[#EF9F27]">Liq. risk</h3>

      <p className={`mt-1 text-[32px] font-bold leading-none tracking-tight ${RISK_COLOUR[minDist.riskLevel]}`}>
        {minDist.distancePct.toFixed(1)}%
      </p>
      <p className="mt-1 text-[12px] text-[#EF9F27]">
        min distance to liquidation · {positions.length} position{positions.length !== 1 ? 's' : ''}
      </p>

      <ul className="mt-4 space-y-2 border-t border-[#EF9F27]/15 pt-3">
        {positions.slice(0, 3).map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold uppercase ${RISK_BADGE[p.riskLevel]}`}>
                {p.riskLevel}
              </span>
              <span className="truncate text-[12px] font-medium text-[#FAC775]">{p.market}</span>
              <span className="shrink-0 text-[11px] text-[#EF9F27]/60">{p.side}</span>
            </div>
            <span className="shrink-0 tabular-nums text-[12px] font-semibold text-[#FAC775]">
              {p.distancePct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}
