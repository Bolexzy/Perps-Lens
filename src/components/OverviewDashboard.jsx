import { useEffect, useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const RANGE_OPTIONS = [
  { key: '1D', label: '1D' },
  { key: '7D', label: '7D' },
  { key: '30D', label: '30D' },
  { key: 'ALL', label: 'All time' },
];

const CARD_CLASS =
  'relative overflow-hidden rounded-2xl border border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.012)_55%,rgba(255,255,255,0.02)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_22%,transparent_70%,rgba(255,255,255,0.06)_100%)] before:opacity-70 before:content-[\'\'] after:pointer-events-none after:absolute after:inset-px after:rounded-[15px] after:border after:border-white/6 after:content-[\'\']';

export function OverviewDashboard({
  range,
  onRangeChange,
  performanceStats,
  fundingBreakdown,
  ringMetrics,
  overviewCards,
  chartData,
  loading,
}) {
  if (loading) {
    return (
      <div className="grid h-full gap-4 lg:grid-cols-[minmax(16rem,0.92fr)_minmax(0,2.08fr)] xl:grid-cols-[minmax(17.5rem,0.88fr)_minmax(0,2.12fr)]">
        <div className={`${CARD_CLASS} order-2 p-4 lg:order-1 lg:h-full xl:p-5`}>
          <div className="animate-pulse space-y-4">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="mx-auto h-32 w-32 rounded-full bg-white/5" />
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="h-4 rounded bg-white/6" />
              ))}
            </div>
          </div>
        </div>
        <div className="order-1 flex h-full min-h-0 flex-col gap-4 lg:order-2">
          <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className={`${CARD_CLASS} p-3 xl:min-h-[5.25rem]`}>
                <div className="animate-pulse space-y-3">
                  <div className="h-6 w-6 rounded-lg bg-white/8" />
                  <div className="h-3 w-24 rounded bg-white/8" />
                  <div className="h-5 w-24 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
          <div className={`${CARD_CLASS} min-h-[18rem] flex-1 p-4 xl:min-h-0 xl:p-5`}>
            <div className="animate-pulse space-y-4">
              <div className="flex gap-2">
                <div className="h-8 w-28 rounded-full bg-white/8" />
                <div className="h-8 w-16 rounded-full bg-white/8" />
              </div>
              <div className="h-[clamp(14rem,32vh,24rem)] rounded-xl bg-white/5 lg:h-[calc(100%-3rem)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(16rem,0.92fr)_minmax(0,2.08fr)] xl:grid-cols-[minmax(17.5rem,0.88fr)_minmax(0,2.12fr)]">
      <PerformanceCard
        className="order-2 h-full lg:order-1"
        range={range}
        onRangeChange={onRangeChange}
        performanceStats={performanceStats}
        fundingBreakdown={fundingBreakdown}
        ringMetrics={ringMetrics}
      />

      <div className="order-1 flex h-full min-h-0 flex-col gap-4 lg:order-2">
        <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <MiniAnalyticsCard key={card.key} card={card} />
          ))}
        </div>

        <div className="min-h-[18rem] xl:min-h-0 xl:flex-1">
          <PerformanceChart data={chartData} />
        </div>
      </div>
    </div>
  );
}

function PerformanceCard({
  range,
  onRangeChange,
  performanceStats,
  fundingBreakdown,
  ringMetrics,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [ringMode, setRingMode] = useState('funding');
  const wrapRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const activeRingMetric = ringMetrics?.[ringMode] ?? ringMetrics?.funding ?? fallbackFundingMetric(fundingBreakdown);

  return (
    <div className={`${CARD_CLASS} ${className} flex h-full min-h-0 flex-col overflow-visible p-4 xl:p-5`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-sky-300/85 xl:text-[0.65rem]">
          Portfolio
        </span>

        <div ref={wrapRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex items-center gap-2 rounded-lg border border-slate-300/35 px-3 py-1 text-[10px] text-white/65 transition hover:border-slate-200/50 xl:text-[11px]"
          >
            <span>{range === 'ALL' ? 'All' : range}</span>
            <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-white/45" fill="none">
              <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[96px] overflow-hidden rounded-xl border border-white/12 bg-[#0f1923] shadow-2xl">
              {RANGE_OPTIONS.map((option) => {
                const selected = option.key === range;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      onRangeChange(option.key);
                      setOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-[12px] transition ${
                      selected ? 'bg-sky-400/10 text-sky-300' : 'text-white/55 hover:bg-white/6 hover:text-white/85'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 shrink-0 min-h-[11.75rem] xl:min-h-[13rem]">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
          {[
            { key: 'funding', label: 'Funding' },
            { key: 'margin', label: 'Margin' },
            { key: 'exposure', label: 'Exposure' },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRingMode(option.key)}
              className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-medium transition sm:text-[0.68rem] ${
                ringMode === option.key
                  ? 'border-sky-400/40 bg-sky-400/12 text-sky-300'
                  : 'border-white/10 text-white/42 hover:border-white/20 hover:text-white/70'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex justify-center pb-2">
          <PortfolioRing metric={activeRingMetric} />
        </div>
      </div>

      <dl className="mt-3 min-h-0 flex-1 space-y-0.5 overflow-auto pr-1">
        <StatRow label="Equity" value={formatMoneyFixed(performanceStats.equity, 1)} tone="base" />
        <StatRow
          label="PnL"
          value={formatSignedMoneyFixed(performanceStats.pnl, 2)}
          tone={performanceStats.pnl >= 0 ? 'positive' : 'negative'}
        />
        <StatRow label="Trading Volume" value={formatMoneyFixed(performanceStats.volume, 2)} tone="base" />
        <StatRow
          label="Return %"
          value={formatSignedPercent(performanceStats.returnPct)}
          tone={performanceStats.returnPct >= 0 ? 'positive' : 'negative'}
        />
        <StatRow
          label="Sharpe Ratio"
          value={performanceStats.sharpe === null ? 'N/A' : performanceStats.sharpe.toFixed(4)}
          tone="base"
        />
        <StatRow
          label="Max drawdown"
          value={`${Math.abs(performanceStats.maxDrawdown).toFixed(2)}%`}
          tone="base"
        />
      </dl>
    </div>
  );
}

function PortfolioRing({ metric }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const primaryLength = circumference * ((metric?.primaryPct ?? 0) / 100);
  const secondaryLength = circumference - primaryLength;

  return (
    <div className="relative mx-auto flex w-full max-w-[15rem] flex-col items-center">
      <div className="relative h-40 w-36 sm:h-44 sm:w-40">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={metric?.primaryColor ?? 'rgba(248,113,113,0.78)'}
          strokeWidth="10"
          strokeDasharray={`${primaryLength} ${circumference - primaryLength}`}
          strokeDashoffset="0"
          strokeLinecap="round"
          opacity={metric?.primaryValue > 0 ? 1 : 0}
          style={{ transition: 'stroke-dasharray 420ms ease, stroke 320ms ease, opacity 240ms ease' }}
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={metric?.secondaryColor ?? 'rgba(52,211,153,0.78)'}
          strokeWidth="10"
          strokeDasharray={`${secondaryLength} ${circumference - secondaryLength}`}
          strokeDashoffset={-primaryLength}
          strokeLinecap="round"
          opacity={metric?.secondaryValue > 0 ? 1 : 0}
          style={{ transition: 'stroke-dasharray 420ms ease, stroke-dashoffset 420ms ease, stroke 320ms ease, opacity 240ms ease' }}
        />
        </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
        <span className="text-[15px] font-semibold tracking-tight text-white/92 transition-all duration-300 xl:text-[16px]">
          {metric?.centerValue ?? '0%'}
        </span>
        <span className="mt-1 text-[8px] uppercase tracking-[0.1em] text-white/42">
          {metric?.centerCaption ?? 'share'}
        </span>
        <span className="mt-1 max-w-[74px] text-[7px] uppercase leading-[1.25] tracking-[0.08em] text-white/28">
          {metric?.description ?? 'Portfolio split'}
        </span>
      </div>
      </div>

      <div className="mt-3 flex w-full items-start justify-between gap-3 px-1 text-[10px]">
        <MetricPill
          color={metric?.primaryColor}
          label={metric?.primaryLabel}
          value={formatMoney(metric?.primaryValue ?? 0)}
          align="left"
        />
        <MetricPill
          color={metric?.secondaryColor}
          label={metric?.secondaryLabel}
          value={formatMoney(metric?.secondaryValue ?? 0)}
          align="right"
        />
      </div>
    </div>
  );
}

function MetricPill({ color, label, value, align }) {
  return (
    <div className={`flex min-w-0 flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[9px] uppercase tracking-[0.12em] text-white/35">{label}</span>
      </div>
      <span className="mt-1 text-[11px] font-semibold tabular-nums text-white/84">{value}</span>
    </div>
  );
}

function fallbackFundingMetric(breakdown) {
  return {
    primaryLabel: 'Paid',
    secondaryLabel: 'Received',
    primaryValue: breakdown?.paid ?? 0,
    secondaryValue: breakdown?.received ?? 0,
    primaryPct: breakdown?.paidPct ?? 0,
    secondaryPct: 100 - (breakdown?.paidPct ?? 0),
    primaryColor: 'rgba(248,113,113,0.82)',
    secondaryColor: 'rgba(52,211,153,0.82)',
    description: breakdown?.label ?? 'Funding flow',
    centerValue: `${breakdown?.paidPct ?? 0}%`,
    centerCaption: 'paid',
  };
}

function StatRow({ label, value, tone }) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-300'
      : tone === 'negative'
        ? 'text-rose-300'
        : 'text-white/85';

  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-2 last:border-b-0 last:pb-0 xl:py-2.5">
      <dt className="text-[11px] text-slate-400 xl:text-[12px]">{label}</dt>
      <dd className={`shrink-0 text-[13px] font-semibold tabular-nums xl:text-[14px] ${toneClass}`}>{value}</dd>
    </div>
  );
}

function MiniAnalyticsCard({ card }) {
  const isNegativeSignedCurrency = card.format === 'signedCurrency' && Number(card.value) < 0;

  return (
    <div className={`${CARD_CLASS} relative flex h-full min-h-[5.25rem] min-w-0 flex-col justify-between gap-2 overflow-hidden p-3 xl:min-h-[5.5rem]`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/6"
          title={card.hint}
        >
          <CardIcon cardKey={card.key} />
        </div>
        <p className="min-w-0 break-words text-[10px] leading-tight text-slate-400 xl:text-[11px]">{card.label}</p>
      </div>
      <p className={`max-w-full text-[clamp(0.9rem,0.82vw,1.12rem)] font-semibold leading-tight break-words ${isNegativeSignedCurrency ? 'text-rose-300' : 'text-white/88'}`}>
        {formatCardValue(card.value, card.format)}
      </p>
      {card.subValue ? <p className="text-[8px] leading-relaxed text-white/32">{card.subValue}</p> : null}
      {card.badge ? (
        <span
          className={`inline-flex w-fit max-w-full self-start rounded-md px-2 py-1 text-[8px] font-medium leading-none ${badgeTextClass(card.badgeTone)}`}
          style={{ background: badgeGradient(card.badgeTone) }}
        >
          {card.badge}
        </span>
      ) : null}
      {card.linkHref ? (
        <a
          href={card.linkHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit self-start pt-0.5 text-[9px] font-medium text-sky-300 underline decoration-sky-400/60 underline-offset-3 transition hover:text-sky-200"
        >
          {card.linkLabel}
        </a>
      ) : null}
    </div>
  );
}

function CardIcon({ cardKey }) {
  const commonProps = {
    className: 'h-4 w-4 text-white/70',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
  };

  switch (cardKey) {
    case 'equity':
      return (
        <svg viewBox="0 0 16 16" {...commonProps}>
          <rect x="2" y="3" width="12" height="10" rx="1.5" />
          <path d="M5 3V2M11 3V2M2 7h12" />
        </svg>
      );
    case 'volume':
      return (
        <svg viewBox="0 0 16 16" {...commonProps}>
          <path d="M2 12l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'points':
      return (
        <svg viewBox="0 0 16 16" {...commonProps}>
          <path d="M8 2.5 9.7 6l3.8.5-2.7 2.6.7 3.9L8 11.1 4.5 13l.7-3.9L2.5 6.5 6.3 6 8 2.5Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'fees':
      return (
        <svg viewBox="0 0 16 16" {...commonProps}>
          <path d="M8 2v12M4.5 5A2.5 2.5 0 0 1 7 2.5h2a2.5 2.5 0 0 1 0 5H7a2.5 2.5 0 0 0 0 5h2a2.5 2.5 0 0 0 2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 16 16" {...commonProps}>
          <circle cx="8" cy="8" r="5" />
          <path d="M8 5.5v2.5L9.5 9.5" strokeLinecap="round" />
        </svg>
      );
  }
}

function PerformanceChart({ data }) {
  const [showEquity, setShowEquity] = useState(true);
  const [showPnl, setShowPnl] = useState(false);
  const hasSeries = data.length > 0;

  return (
    <div className={`${CARD_CLASS} relative flex h-full min-h-[18rem] flex-col overflow-hidden p-4 xl:min-h-0 xl:p-5`}>
      <div className="mb-4 shrink-0 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEquity((value) => !value)}
          className={`rounded-full border px-3 py-1 text-[11px] transition ${
            showEquity
              ? 'border-sky-400/45 bg-sky-400/12 text-sky-300'
              : 'border-white/14 text-white/38 hover:border-white/22 hover:text-white/65'
          }`}
        >
          Account equity
        </button>
        <button
          type="button"
          onClick={() => setShowPnl((value) => !value)}
          className={`rounded-full border px-3 py-1 text-[11px] transition ${
            showPnl
              ? 'border-emerald-400/45 bg-emerald-400/10 text-emerald-300'
              : 'border-white/14 text-white/38 hover:border-white/22 hover:text-white/65'
          }`}
        >
          PnL
        </button>
      </div>

      {!hasSeries ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-white/6 bg-white/2 text-[13px] text-white/28">
          No equity or trade history in this time range
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={18}
              />
              <YAxis
                yAxisId="equity"
                hide={!showEquity}
                tick={{ fill: 'rgba(56,189,248,0.48)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={72}
                tickFormatter={(value) => compactAxisCurrency(value)}
              />
              <YAxis
                yAxisId="pnl"
                orientation="right"
                hide={!showPnl}
                tick={{ fill: 'rgba(52,211,153,0.48)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={76}
                tickFormatter={(value) => compactAxisCurrency(value, true)}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                yAxisId="equity"
                dataKey="equity"
                name="Equity"
                stroke="#38bdf8"
                strokeWidth={1.6}
                dot={false}
                connectNulls
                hide={!showEquity}
                activeDot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                yAxisId="pnl"
                dataKey="pnl"
                name="PnL"
                stroke="#34d399"
                strokeWidth={1.6}
                dot={false}
                connectNulls
                hide={!showPnl}
                activeDot={{ r: 4, fill: '#34d399', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;

  return (
    <div className="rounded-xl border border-white/12 bg-[#09111f]/96 px-3 py-2.5 text-[12px] shadow-xl backdrop-blur-md">
      <p className="mb-1.5 font-semibold text-white">{point?.fullLabel ?? label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.stroke }} />
          <span className="text-white/42">{entry.name}:</span>
          <span className="font-medium tabular-nums" style={{ color: entry.stroke }}>
            {entry.dataKey === 'pnl' ? formatSignedMoney(entry.value ?? 0) : formatMoney(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

function badgeTextClass(tone) {
  if (tone === 'positive') return 'text-emerald-300';
  if (tone === 'negative') return 'text-rose-300';
  return 'text-slate-300/75';
}

function badgeGradient(tone) {
  if (tone === 'positive')
    return 'linear-gradient(90deg, rgba(52,211,153,0.18) 0%, rgba(52,211,153,0.18) 50%, transparent 100%)';
  if (tone === 'negative')
    return 'linear-gradient(90deg, rgba(248,113,113,0.18) 0%, rgba(248,113,113,0.18) 50%, transparent 100%)';
  return 'linear-gradient(90deg, rgba(148,163,184,0.12) 0%, rgba(148,163,184,0.12) 50%, transparent 100%)';
}

function formatCardValue(value, format) {
  if (format === 'currency') return formatMoney(value);
  if (format === 'currencyExact') return formatMoneyFixed(value, 2);
  if (format === 'compactCurrency') return formatCompactMoney(value);
  if (format === 'compactCurrencyPrecise') return formatCompactMoney(value, 2);
  if (format === 'signedCurrency') return formatSignedMoney(value);
  if (format === 'points') {
    if (value === null || value === undefined || value === '') return 'N/A';
    return Number(value).toLocaleString('en-US');
  }
  if (format === 'fees') {
    return `${(value?.makerPct ?? 0).toFixed(3)}% / ${(value?.takerPct ?? 0).toFixed(3)}%`;
  }
  return Number(value).toLocaleString('en-US');
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value ?? 0);
}

function formatMoneyFixed(value, digits = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value ?? 0);
}

function formatSignedMoney(value) {
  const safeValue = value ?? 0;
  const absolute = formatMoney(Math.abs(safeValue));
  if (safeValue === 0) return '+$0.00';
  return `${safeValue > 0 ? '+' : '-'}${absolute}`;
}

function formatSignedMoneyFixed(value, digits = 2) {
  const safeValue = value ?? 0;
  const absolute = formatMoneyFixed(Math.abs(safeValue), digits);
  if (safeValue === 0) return `+${formatMoneyFixed(0, digits)}`;
  return `${safeValue > 0 ? '+' : '-'}${absolute}`;
}

function formatCompactMoney(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value ?? 0);
}

function formatSignedPercent(value) {
  const safeValue = value ?? 0;
  return `${safeValue > 0 ? '+' : ''}${safeValue.toFixed(2)}%`;
}

function compactAxisCurrency(value, signed = false) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.abs(value ?? 0));

  if (!signed || !value) return value < 0 ? `-${formatted}` : formatted;
  return `${value > 0 ? '+' : '-'}${formatted}`;
}
