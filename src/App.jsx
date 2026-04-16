import { useState, useMemo, useCallback } from 'react';

import { fetchFundingHistory, fetchTradeHistory, fetchPositions, fetchEquityHistory } from './api/pacifica.js';
import { getAIInsight } from './api/claude.js';
import {
  computeFundingStats,
  computeTradeStats,
  computePositionRisks,
  computeEquityStats,
  computePerformanceStats,
  computeFundingBreakdown,
  computeRingMetrics,
  computeOverviewCards,
  computeEquityChartData,
  mapPositionsForTable,
  mapTradesForTable,
  mapFundingForTable,
} from './lib/compute.js';

import { TopBar } from './components/TopBar.jsx';
import { OverviewDashboard } from './components/OverviewDashboard.jsx';
import { ActivityTabs } from './components/ActivityTabs.jsx';
import { AIInsightCard } from './components/AIInsightCard.jsx';

const BG =
  'radial-gradient(circle at 15% 85%, rgba(82,198,255,0.10) 0%, transparent 40%), radial-gradient(circle at 85% 10%, rgba(82,198,255,0.07) 0%, transparent 35%), linear-gradient(180deg, #020507 0%, #03080c 20%, #06111c 62%, #020507 100%)';

export default function App() {
  // ── Wallet ─────────────────────────────────────────────────────
  const [wallet, setWallet] = useState('');
  const [analysedWallet, setAnalysedWallet] = useState('');

  // ── Shared time range ──────────────────────────────────────────
  const [range, setRange] = useState('30D');

  // ── Fetch state ────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // ── Raw API data ───────────────────────────────────────────────
  const [rawFunding,   setRawFunding]   = useState(null);
  const [rawTrades,    setRawTrades]    = useState(null);
  const [rawPositions, setRawPositions] = useState(null);
  const [rawEquity,    setRawEquity]    = useState(null);

  // ── AI state ───────────────────────────────────────────────────
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState(null);

  // ── Legacy derived (AI insight) ────────────────────────────────
  const fundingStats  = useMemo(() => computeFundingStats(rawFunding   ?? []), [rawFunding]);
  const tradeStats    = useMemo(() => computeTradeStats(rawTrades      ?? []), [rawTrades]);
  const positionRisks = useMemo(() => computePositionRisks(rawPositions ?? []), [rawPositions]);
  const equityStats   = useMemo(() => computeEquityStats(rawEquity     ?? []), [rawEquity]);

  // ── OverviewDashboard derived ──────────────────────────────────
  const performanceStats = useMemo(
    () => computePerformanceStats(rawTrades ?? [], rawFunding ?? [], rawEquity ?? [], range),
    [rawTrades, rawFunding, rawEquity, range],
  );
  const fundingBreakdown = useMemo(
    () => computeFundingBreakdown(rawFunding ?? [], range),
    [rawFunding, range],
  );
  const ringMetrics = useMemo(
    () => computeRingMetrics(rawPositions ?? [], rawFunding ?? [], range),
    [rawPositions, rawFunding, range],
  );
  const overviewCards = useMemo(
    () => computeOverviewCards(rawEquity ?? [], rawTrades ?? []),
    [rawEquity, rawTrades],
  );
  const chartData = useMemo(
    () => computeEquityChartData(rawEquity ?? [], rawTrades ?? [], rawFunding ?? [], range),
    [rawEquity, rawTrades, rawFunding, range],
  );

  // ── ActivityTabs derived ───────────────────────────────────────
  const tablePositions = useMemo(() => mapPositionsForTable(rawPositions ?? []), [rawPositions]);
  const tableTrades    = useMemo(() => mapTradesForTable(rawTrades       ?? []), [rawTrades]);
  const tableFunding   = useMemo(() => mapFundingForTable(rawFunding     ?? []), [rawFunding]);

  // ── AI insight ─────────────────────────────────────────────────
  const triggerAI = useCallback(async (fStats, tStats, pRisks, eStats) => {
    setAiLoading(true);
    setAiInsight('');
    setAiError(null);
    try {
      const text = await getAIInsight({
        fundingStats: fStats, tradeStats: tStats,
        positionRisks: pRisks, equityStats: eStats,
      });
      setAiInsight(text);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }, []);

  // ── Analyse ────────────────────────────────────────────────────
  const handleAnalyse = useCallback(async () => {
    const addr = wallet.trim();
    if (!addr) return;

    setLoading(true);
    setFetchError(null);
    setAnalysedWallet(addr);
    setRawFunding(null); setRawTrades(null);
    setRawPositions(null); setRawEquity(null);
    setAiInsight(''); setAiError(null);

    try {
      const [funding, trades, positions, equity] = await Promise.allSettled([
        fetchFundingHistory(addr), fetchTradeHistory(addr),
        fetchPositions(addr),     fetchEquityHistory(addr),
      ]);

      const f = funding.status   === 'fulfilled' ? funding.value   : [];
      const t = trades.status    === 'fulfilled' ? trades.value    : [];
      const p = positions.status === 'fulfilled' ? positions.value : [];
      const e = equity.status    === 'fulfilled' ? equity.value    : [];

      setRawFunding(f); setRawTrades(t);
      setRawPositions(p); setRawEquity(e);

      const fStats = computeFundingStats(f);
      const tStats = computeTradeStats(t);
      const pRisks = computePositionRisks(p);
      const eStats = computeEquityStats(e);

      const failures = [funding, trades, positions, equity]
        .filter((r) => r.status === 'rejected')
        .map((r) => r.reason?.message);
      if (failures.length === 4) {
        setFetchError('All API calls failed. Check the wallet address or try again later.');
      } else if (failures.length > 0) {
        setFetchError(`Some data unavailable: ${failures.join('; ')}`);
      }

      if (fStats || tStats || pRisks.length || eStats) {
        triggerAI(fStats, tStats, pRisks, eStats);
      }
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet, triggerAI]);

  const hasData =
    rawFunding?.length > 0 || rawTrades?.length > 0 ||
    rawPositions?.length > 0 || rawEquity?.length > 0;
  const analysisRan = rawFunding !== null;

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          SCREEN 1 — locked to 100dvh, clips at viewport bottom
      ══════════════════════════════════════════════════════════ */}
      <div
        className="flex h-dvh flex-col overflow-hidden text-white antialiased"
        style={{ background: BG }}
      >
        {/* Sticky nav — wallet search lives here */}
        <TopBar
          wallet={wallet}
          setWallet={setWallet}
          onAnalyse={handleAnalyse}
          loading={loading}
        />

        {/* Main area fills remaining viewport height */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-6">

          {fetchError && (
            <div className="mb-3 shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-2.5 text-[13px] text-amber-300">
              {fetchError}
            </div>
          )}

          {/* Landing */}
          {!hasData && !loading && !analysisRan && (
            <div className="flex flex-1 items-center justify-center">
              <LandingHero />
            </div>
          )}

          {/* No activity */}
          {!hasData && !loading && analysisRan && !fetchError && (
            <div className="flex flex-1 items-center justify-center">
              <NoActivity wallet={analysedWallet} />
            </div>
          )}

          {/* Dashboard — fills remaining height exactly */}
          {(hasData || loading) && (
            <div className="min-h-0 flex-1">
              <OverviewDashboard
                range={range}
                onRangeChange={setRange}
                performanceStats={performanceStats}
                fundingBreakdown={fundingBreakdown}
                ringMetrics={ringMetrics}
                overviewCards={overviewCards}
                chartData={chartData}
                loading={loading}
              />
            </div>
          )}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SCREEN 2 — natural document flow, scroll into view
      ══════════════════════════════════════════════════════════ */}
      {(hasData || loading) && (
        <div
          className="border-t border-white/6 px-4 pb-12 pt-6 text-white sm:px-6"
          style={{ background: BG }}
        >
          {analysedWallet && (
            <p className="mb-4 font-mono text-[11px] text-slate-600">{analysedWallet}</p>
          )}

          <ActivityTabs
            positions={tablePositions}
            openOrders={[]}
            trades={tableTrades}
            orderHistory={[]}
            funding={tableFunding}
            balances={[]}
            payouts={[]}
            loading={loading}
            range={range}
          />

          <div className="mt-6">
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
          </div>
        </div>
      )}
    </>
  );
}

function NoActivity({ wallet }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full border border-slate-700 bg-slate-800/60">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      </div>
      <h2 className="text-[20px] font-semibold text-white/70">No Pacifica activity found</h2>
      <p className="mt-2 max-w-sm text-[14px] text-slate-500">
        This wallet has no trading history on Pacifica perps. Try a different address.
      </p>
      {wallet && (
        <p className="mt-3 max-w-xs break-all font-mono text-[11px] text-slate-600">{wallet}</p>
      )}
    </div>
  );
}

function LandingHero() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-6 h-10 w-10">
       <img alt="" width="32" height="32" decoding="async" data-nimg="1" className="h-8 w-auto" style={{ color: 'transparent' }} src="https://app.pacifica.fi/imgs/logo.svg"></img>
      </div>
      <h2 className="text-[26px] font-semibold tracking-tight text-white">
        Paste a Solana wallet to begin
      </h2>
      <p className="mt-2 max-w-md text-[15px] text-slate-500">
        PacificaLens pulls your trading history from the Pacifica perps API and surfaces
        funding costs, win rate, liquidation risk, and an AI-generated risk summary.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {[
          { label: 'Funding cost',       color: '#AFA9EC' },
          { label: 'Trade stats',        color: '#5DCAA5' },
          { label: 'Liq. risk',          color: '#EF9F27' },
          { label: 'Equity trend',       color: '#F0997B' },
          { label: 'AI insight · Claude',color: '#38bdf8' },
        ].map(({ label, color }) => (
          <span
            key={label}
            className="rounded-full border px-3 py-1 text-[12px] font-medium"
            style={{ borderColor: color + '40', color, background: color + '12' }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
