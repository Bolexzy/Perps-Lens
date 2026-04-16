import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function PnLChart({ data, loading }) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#5DCAA5]/30 bg-[#041f19] p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 rounded bg-white/10" />
          <div className="h-3 w-64 rounded bg-white/8" />
          <div className="mt-4 h-48 rounded-lg bg-white/5" />
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#5DCAA5]/30 bg-[#041f19] p-5">
        <h3 className="text-[14px] font-semibold text-[#9FE1CB]">Cumulative PnL + funding cost</h3>
        <p className="mt-1 text-[12px] text-[#5DCAA5]/70">Area chart — realised PnL vs funding costs paid over time</p>
        <div className="mt-6 flex h-48 items-center justify-center text-[13px] text-[#5DCAA5]/40">
          No trade history to display
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#5DCAA5]/30 bg-[#041f19] relative">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(8,80,65,0.35),transparent_55%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative p-5">
        <h3 className="text-[14px] font-semibold text-[#9FE1CB]">
          Cumulative PnL + funding cost
        </h3>
        <p className="mt-0.5 text-[12px] text-[#5DCAA5]/70">
          Realised PnL vs funding costs paid over time
        </p>

        <div className="mt-5 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5DCAA5" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#5DCAA5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fundingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D85A30" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#D85A30" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: '#5DCAA5', fontSize: 10, opacity: 0.6 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#5DCAA5', fontSize: 10, opacity: 0.6 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v >= 0 ? '' : ''}${v.toLocaleString()}`}
                width={64}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend content={<ChartLegend />} />

              <Area
                type="monotone"
                dataKey="cumPnl"
                name="Cum. PnL"
                stroke="#5DCAA5"
                fill="url(#pnlGrad)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#5DCAA5', strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="cumFunding"
                name="Funding cost"
                stroke="#D85A30"
                fill="url(#fundingGrad)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 3, fill: '#D85A30', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/12 bg-[#09111f]/95 px-3 py-2.5 text-[12px] shadow-xl backdrop-blur-md">
      <p className="mb-1.5 font-semibold text-white">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.stroke }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-medium tabular-nums" style={{ color: p.stroke }}>
            ${Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartLegend({ payload }) {
  if (!payload?.length) return null;
  return (
    <div className="mt-2 flex items-center gap-5 pl-16">
      {payload.map((p) => (
        <div key={p.value} className="flex items-center gap-1.5">
          <span
            className="h-2 w-5 rounded-full"
            style={{
              background: p.value === 'Funding cost' ? 'none' : p.color,
              opacity: 0.8,
              borderBottom: p.value === 'Funding cost' ? `2px dashed ${p.color}` : 'none',
            }}
          />
          <span className="text-[11px] text-slate-500">{p.value}</span>
        </div>
      ))}
    </div>
  );
}
