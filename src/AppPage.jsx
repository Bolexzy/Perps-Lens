import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchAccountInfo,
  fetchBalanceHistory,
  fetchEquityHistory,
  fetchFundingHistory,
  fetchOpenOrders,
  fetchOrderHistory,
  fetchPortfolioVolume,
  fetchPositions,
  fetchTradeHistory,
} from './api/pacificaLive.js';
import { getAIInsight } from './api/claude.js';
import {
  computeAccountSnapshot,
  computeBalanceHistoryTable,
  computeEquityStats,
  computeFundingStats,
  computeFundingBreakdown,
  computeFundingHistoryTable,
  computeOrderHistoryTable,
  computeOpenOrdersTable,
  computeOverviewCards,
  computePerformanceChartData,
  computePortfolioRingMetrics,
  computePerformanceStats,
  computePositionRisks,
  computePositionsTable,
  computePayoutsTable,
  computeTradeStats,
  computeTradeHistoryTable,
} from './lib/pacificaDashboard.js';

import { TopBar } from './components/TopBar.jsx';
import { AIInsightCard } from './components/AIInsightCard.jsx';
import { OverviewDashboard } from './components/OverviewDashboard.jsx';
import { ActivityTabs } from './components/ActivityTabs.jsx';

export default function AppPage() {
  const [wallet, setWallet] = useState('');
  const [analysedWallet, setAnalysedWallet] = useState('');
  const [range, setRange] = useState('30D');

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [toastError, setToastError] = useState(null);

  const [rawFunding, setRawFunding] = useState(null);
  const [rawTrades, setRawTrades] = useState(null);
  const [rawPositions, setRawPositions] = useState(null);
  const [rawEquity, setRawEquity] = useState(null);
  const [rawAccount, setRawAccount] = useState(null);
  const [rawPortfolioVolume, setRawPortfolioVolume] = useState(null);
  const [rawBalanceHistory, setRawBalanceHistory] = useState(null);
  const [rawOpenOrders, setRawOpenOrders] = useState(null);
  const [rawOrderHistory, setRawOrderHistory] = useState(null);

  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const fundingStats = useMemo(() => computeFundingStats(rawFunding ?? []), [rawFunding]);
  const tradeStats = useMemo(() => computeTradeStats(rawTrades ?? []), [rawTrades]);
  const positionRisks = useMemo(() => computePositionRisks(rawPositions ?? []), [rawPositions]);
  const equityStats = useMemo(() => computeEquityStats(rawEquity ?? []), [rawEquity]);
  const accountSnapshot = useMemo(() => computeAccountSnapshot(rawAccount), [rawAccount]);

  const performanceStats = useMemo(
    () =>
      computePerformanceStats({
        trades: rawTrades ?? [],
        equity: rawEquity ?? [],
        accountInfo: rawAccount,
        volumeInfo: rawPortfolioVolume,
        range,
      }),
    [range, rawAccount, rawEquity, rawPortfolioVolume, rawTrades]
  );
  const fundingBreakdown = useMemo(
    () => computeFundingBreakdown(rawFunding ?? [], range),
    [range, rawFunding]
  );
  const ringMetrics = useMemo(
    () =>
      computePortfolioRingMetrics({
        funding: rawFunding ?? [],
        positions: rawPositions ?? [],
        accountInfo: rawAccount,
        range,
      }),
    [range, rawAccount, rawFunding, rawPositions]
  );
  const overviewCards = useMemo(
    () =>
      computeOverviewCards({
        trades: rawTrades ?? [],
        positions: rawPositions ?? [],
        accountInfo: rawAccount,
        volumeInfo: rawPortfolioVolume,
        range,
      }),
    [range, rawAccount, rawPortfolioVolume, rawPositions, rawTrades]
  );
  const chartData = useMemo(
    () => computePerformanceChartData({ equity: rawEquity ?? [], trades: rawTrades ?? [], range }),
    [range, rawEquity, rawTrades]
  );
  const positionRows = useMemo(() => computePositionsTable(rawPositions ?? []), [rawPositions]);
  const tradeRows = useMemo(
    () => computeTradeHistoryTable(rawTrades ?? [], range),
    [range, rawTrades]
  );
  const fundingRows = useMemo(
    () => computeFundingHistoryTable(rawFunding ?? [], range),
    [range, rawFunding]
  );
  const openOrderRows = useMemo(() => computeOpenOrdersTable(rawOpenOrders ?? []), [rawOpenOrders]);
  const orderHistoryRows = useMemo(
    () => computeOrderHistoryTable(rawOrderHistory ?? []),
    [rawOrderHistory]
  );
  const balanceRows = useMemo(
    () => computeBalanceHistoryTable(rawBalanceHistory ?? []),
    [rawBalanceHistory]
  );
  const payoutRows = useMemo(
    () => computePayoutsTable(rawFunding ?? [], range),
    [range, rawFunding]
  );

  const triggerAI = useCallback(async (nextFundingStats, nextTradeStats, nextPositionRisks, nextEquityStats) => {
    setAiLoading(true);
    setAiInsight('');
    setAiError(null);

    try {
      const text = await getAIInsight({
        fundingStats: nextFundingStats,
        tradeStats: nextTradeStats,
        positionRisks: nextPositionRisks,
        equityStats: nextEquityStats,
      });
      setAiInsight(text);
    } catch (error) {
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const handleAnalyse = useCallback(async () => {
    const address = wallet.trim();
    if (!address) return;

    setLoading(true);
    setFetchError(null);
    setAnalysedWallet(address);

    setRawFunding(null);
    setRawTrades(null);
    setRawPositions(null);
    setRawEquity(null);
    setRawAccount(null);
    setRawPortfolioVolume(null);
    setRawBalanceHistory(null);
    setRawOpenOrders(null);
    setRawOrderHistory(null);
    setAiInsight('');
    setAiError(null);

    try {
      const [account, funding, trades, positions, equity, portfolioVolume, balanceHistory, openOrders, orderHistory] =
        await Promise.allSettled([
        fetchAccountInfo(address),
        fetchFundingHistory(address),
        fetchTradeHistory(address, range),
        fetchPositions(address),
        fetchEquityHistory(address, range),
        fetchPortfolioVolume(address),
        fetchBalanceHistory(address),
        fetchOpenOrders(address),
        fetchOrderHistory(address),
        ]);

      const nextAccount = account.status === 'fulfilled' ? account.value : null;
      const nextFunding = funding.status === 'fulfilled' ? funding.value : [];
      const nextTrades = trades.status === 'fulfilled' ? trades.value : [];
      const nextPositions = positions.status === 'fulfilled' ? positions.value : [];
      const nextEquity = equity.status === 'fulfilled' ? equity.value : [];
      const nextPortfolioVolume = portfolioVolume.status === 'fulfilled' ? portfolioVolume.value : null;
      const nextBalanceHistory = balanceHistory.status === 'fulfilled' ? balanceHistory.value : [];
      const nextOpenOrders = openOrders.status === 'fulfilled' ? openOrders.value : [];
      const nextOrderHistory = orderHistory.status === 'fulfilled' ? orderHistory.value : [];

      setRawAccount(nextAccount);
      setRawFunding(nextFunding);
      setRawTrades(nextTrades);
      setRawPositions(nextPositions);
      setRawEquity(nextEquity);
      setRawPortfolioVolume(nextPortfolioVolume);
      setRawBalanceHistory(nextBalanceHistory);
      setRawOpenOrders(nextOpenOrders);
      setRawOrderHistory(nextOrderHistory);

      const nextFundingStats = computeFundingStats(nextFunding);
      const nextTradeStats = computeTradeStats(nextTrades);
      const nextPositionRisks = computePositionRisks(nextPositions);
      const nextEquityStats = computeEquityStats(nextEquity);

      const requestResults = [
        account,
        funding,
        trades,
        positions,
        equity,
        portfolioVolume,
        balanceHistory,
        openOrders,
        orderHistory,
      ];
      const failures = requestResults
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason?.message);

      if (failures.length === requestResults.length) {
        setFetchError('All API calls failed. Check the wallet address or try again later.');
      } else if (failures.length > 0) {
        setFetchError(`Some data unavailable: ${failures.join('; ')}`);
      }

      if (nextFundingStats || nextTradeStats || nextPositionRisks.length || nextEquityStats) {
        triggerAI(nextFundingStats, nextTradeStats, nextPositionRisks, nextEquityStats);
      }
    } catch (error) {
      setFetchError(error.message);
    } finally {
      setLoading(false);
    }
  }, [range, triggerAI, wallet]);

  const hasData =
    rawFunding?.length > 0 ||
    rawTrades?.length > 0 ||
    rawPositions?.length > 0 ||
    rawEquity?.length > 0 ||
    !!rawAccount;

  const analysisRan = rawFunding !== null;

  useEffect(() => {
    if (!fetchError) return undefined;

    setToastError(fetchError);
    const timeoutId = window.setTimeout(() => setToastError(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [fetchError]);

  useEffect(() => {
    if (!analysedWallet || !analysisRan) return;

    let cancelled = false;

    fetchEquityHistory(analysedWallet, range)
      .then((rows) => {
        if (!cancelled) setRawEquity(rows);
      })
      .catch((error) => {
        if (!cancelled) setFetchError((current) => current ?? error.message);
      });

    fetchTradeHistory(analysedWallet, range)
      .then((rows) => {
        if (!cancelled) setRawTrades(rows);
      })
      .catch((error) => {
        if (!cancelled) setFetchError((current) => current ?? error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [analysedWallet, analysisRan, range]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_left_bottom,_rgba(82,198,255,0.12),_transparent_22%),radial-gradient(circle_at_right_top,_rgba(82,198,255,0.08),_transparent_28%),linear-gradient(180deg,_#020507_0%,_#03080c_20%,_#06111c_62%,_#020507_100%)] text-white antialiased">
      <TopBar wallet={wallet} setWallet={setWallet} onAnalyse={handleAnalyse} loading={loading} />

      {toastError ? (
        <div className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-30 mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="ml-auto w-full max-w-xl rounded-xl border border-amber-500/30 bg-[#1b1307]/92 px-4 py-3 text-[13px] text-amber-300 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md">
            {toastError}
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:py-8">
        {!hasData && !loading && !analysisRan ? <LandingHero /> : null}
        {!hasData && !loading && analysisRan && !fetchError ? <NoActivity wallet={analysedWallet} /> : null}

        {(hasData || loading) && (
          <>
            <section className="lg:relative lg:flex lg:flex-col">
              <OverviewDashboard
                range={range}
                onRangeChange={setRange}
                performanceStats={performanceStats}
                fundingBreakdown={fundingBreakdown}
                ringMetrics={ringMetrics}
                overviewCards={overviewCards}
                chartData={chartData}
                loading={loading}
                accountSnapshot={accountSnapshot}
              />
            </section>

            <section className="lg:relative lg:flex lg:h-[calc(100vh-7.5rem)] lg:min-h-0 lg:shrink-0 lg:flex-col lg:overflow-hidden lg:pt-2">
              <ActivityTabs
                positions={positionRows}
                openOrders={openOrderRows}
                trades={tradeRows}
                orderHistory={orderHistoryRows}
                funding={fundingRows}
                balances={balanceRows}
                payouts={payoutRows}
                loading={loading}
                range={range}
              />
            </section>

            <AIInsightCard
              insight={aiInsight}
              loading={aiLoading}
              error={aiError}
              onRefresh={
                hasData
                  ? () => triggerAI(fundingStats, tradeStats, positionRisks, equityStats)
                  : undefined
              }
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-12 border-t border-white/[0.06] bg-[#060e1a]/80">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {/* top row */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-7 w-7 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-sky-400/15 blur-[8px]" />
              <img
                src="https://app.pacifica.fi/imgs/logo.svg"
                alt=""
                width="20"
                height="20"
                decoding="async"
                className="relative h-5 w-auto"
                style={{ color: 'transparent' }}
              />
            </div>
            <div>
              <span className="text-[13px] font-semibold text-white/80">
                Perps<span className="text-sky-400"> Lens</span>
              </span>
              <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-slate-500">by Pacifica</span>
            </div>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-slate-500">
            <a href="https://app.pacifica.fi"   target="_blank" rel="noreferrer" className="transition hover:text-white/75">Protocol</a>
            <a href="https://docs.pacifica.fi"  target="_blank" rel="noreferrer" className="transition hover:text-white/75">Docs</a>
            <a href="https://status.pacifica.fi" target="_blank" rel="noreferrer" className="transition hover:text-white/75">Status</a>
            <a href="https://x.com/Bolexzyy__" target="_blank" rel="noreferrer" className="transition hover:text-white/75">X / Twitter</a>
          </nav>
        </div>

        {/* divider */}
        <div className="my-4 border-t border-white/[0.04]" />

        {/* bottom row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <span>
            Built by{' '}
            <span className="text-white/50">Tife</span>
            <span className="mx-1 text-rose-500/70">×</span>
            <span className="text-white/50">Gtek</span>
            <span className="mx-2 text-white/10">·</span>
            <span className="uppercase tracking-[0.16em] text-sky-400/50">Next-gen analytics</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-pulse" />
            All systems operational
          </span>
        </div>
      </div>
    </footer>
  );
}

function NoActivity({ wallet }) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-slate-500/10 blur-[16px]" />
        <div className="relative grid h-14 w-14 place-items-center rounded-full border border-slate-700/60 bg-slate-800/50">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
      </div>
      <h2 className="text-[20px] font-semibold text-white/70">No Pacifica activity found</h2>
      <p className="mt-2 max-w-sm text-[14px] text-slate-500">
        This wallet has no trading history on Pacifica perps. Try a different address.
      </p>
      {wallet ? (
        <p className="mt-4 max-w-xs break-all rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 font-mono text-[11px] text-slate-600">
          {wallet}
        </p>
      ) : null}
    </div>
  );
}

const FEATURES = [
  {
    color: '#38bdf8',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 13.5 7.5 9l4 4 5.5-6 4 4.5" />
        <path strokeLinecap="round" d="M3 20h18" />
      </svg>
    ),
    title: 'Performance',
    desc: 'Equity curves, win rate, and PnL across custom time ranges.',
  },
  {
    color: '#f87171',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 3" />
      </svg>
    ),
    title: 'Funding Intel',
    desc: 'Break down funding costs per market and spot fee drains.',
  },
  {
    color: '#34d399',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      </svg>
    ),
    title: 'Risk Monitor',
    desc: 'Liquidation distance, position sizing, and exposure heat.',
  },
  {
    color: '#AFA9EC',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
      </svg>
    ),
    title: 'AI Brief',
    desc: 'Claude AI synthesises your data into plain-language risk summaries.',
  },
];

const PILLS = [
  { label: 'Performance',      color: '#38bdf8' },
  { label: 'Funding split',    color: '#f87171' },
  { label: 'Range-aware chart',color: '#34d399' },
  { label: 'Position tables',  color: '#f59e0b' },
  { label: 'AI insight',       color: '#AFA9EC' },
];

const STEPS = [
  {
    n: '01',
    title: 'Paste Wallet',
    desc: 'Enter any Solana wallet into the search bar at the top of the page.',
  },
  {
    n: '02',
    title: 'Live Fetch',
    desc: 'Nine Pacifica API feeds pulled in parallel — trades, funding, positions, equity.',
  },
  {
    n: '03',
    title: 'Review Insights',
    desc: 'Explore interactive dashboards and your Claude AI risk brief.',
  },
];

function LandingHero() {
  return (
    <div className="relative w-full overflow-hidden">
      {/* ── Ambient background orbs ─────────────────────────────── */}
      <div
        className="pointer-events-none absolute left-[10%] top-0 h-[480px] w-[480px] -translate-y-1/3 rounded-full bg-sky-500/[0.08] blur-[110px] animate-orb-pulse"
      />
      <div
        className="pointer-events-none absolute right-[8%] top-1/4 h-[360px] w-[360px] rounded-full bg-indigo-500/[0.07] blur-[90px] animate-orb-pulse"
        style={{ animationDelay: '2.5s' }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 left-1/3 h-[280px] w-[280px] rounded-full bg-emerald-500/[0.05] blur-[80px] animate-orb-pulse"
        style={{ animationDelay: '4s' }}
      />

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center px-4 pb-20 pt-16 text-center sm:pt-20">

        {/* Live badge */}
        <div
          className="animate-fade-up mb-8 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/5 px-4 py-1.5"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
          <span className="text-[11px] font-medium tracking-wide text-sky-300">
            Live · Solana Mainnet · Pacifica Protocol
          </span>
        </div>

        {/* Hero title */}
        <h1
          className="animate-fade-up gradient-text-animated mb-5 max-w-[760px] text-[40px] font-bold leading-[1.08] tracking-tight sm:text-[52px] lg:text-[62px]"
          style={{ animationDelay: '0.06s' }}
        >
          Decode Your<br className="hidden sm:block" /> Perps Performance
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-up mb-8 max-w-[520px] text-[15px] leading-relaxed text-slate-400"
          style={{ animationDelay: '0.12s' }}
        >
          Surface funding revenue, PnL curves, liquidation risk, and a Claude AI
          risk brief — all from your Pacifica perpetuals history.
        </p>

        {/* Feature pills */}
        <div
          className="animate-fade-up mb-12 flex flex-wrap justify-center gap-2"
          style={{ animationDelay: '0.18s' }}
        >
          {PILLS.map(({ label, color }) => (
            <span
              key={label}
              className="rounded-full border px-3 py-1 text-[12px] font-medium"
              style={{ borderColor: `${color}40`, color, background: `${color}10` }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Stats strip */}
        <div
          className="animate-fade-up mb-14 grid w-full max-w-lg grid-cols-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]"
          style={{ animationDelay: '0.22s' }}
        >
          {[
            { value: 'Real-time', label: 'On-chain data' },
            { value: '9 feeds',   label: 'API endpoints'  },
            { value: 'Claude AI', label: 'Risk analysis'  },
          ].map(({ value, label }, i) => (
            <div
              key={label}
              className={`flex flex-col items-center gap-0.5 px-4 py-4 ${i > 0 ? 'border-l border-white/[0.05]' : ''}`}
            >
              <span className="text-[14px] font-semibold text-white/80">{value}</span>
              <span className="text-[11px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div
          className="animate-fade-up mb-14 grid w-full max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: '0.28s' }}
        >
          {FEATURES.map(({ color, icon, title, desc }) => (
            <div
              key={title}
              className="glass-card group flex flex-col gap-3 rounded-2xl p-5 text-left"
            >
              {/* icon badge */}
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `${color}14`, color }}
              >
                {icon}
              </div>
              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-white/85">{title}</h3>
                <p className="text-[12px] leading-relaxed text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div
          className="animate-fade-up w-full max-w-3xl"
          style={{ animationDelay: '0.34s' }}
        >
          {/* section label */}
          <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
            How it works
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} className="relative">
                {/* connector line */}
                {i < STEPS.length - 1 && (
                  <div className="absolute right-0 top-5 hidden h-px w-1/2 translate-x-full bg-gradient-to-r from-white/10 to-transparent sm:block" />
                )}
                <div className="glass-card rounded-2xl p-5 text-left">
                  <span
                    className="mb-3 block text-[11px] font-bold tracking-[0.12em]"
                    style={{ color: '#38bdf8' }}
                  >
                    {n}
                  </span>
                  <h4 className="mb-1.5 text-[13px] font-semibold text-white/80">{title}</h4>
                  <p className="text-[12px] leading-relaxed text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
