/**
 * Pure compute functions — transform raw Pacifica API arrays into
 * the shaped stats objects each card and the chart expect.
 *
 * All field names are normalised to camelCase with fallbacks so the
 * UI never crashes when the API changes its schema.
 */

// ─── Field normalisation helpers ─────────────────────────────────────────────

const num = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && !Number.isNaN(+v)) return +v;
  }
  return 0;
};

const str = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v) return String(v);
  }
  return '';
};

// Normalise to Unix seconds — Pacifica uses ms timestamps (created_at > 1e12)
const toSec = (v) => (v > 1e10 ? v / 1000 : v);
const ts = (obj) => {
  for (const k of ['timestamp', 'ts', 'time', 'created_at', 'createdAt', 'settled_at']) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && !Number.isNaN(+v) && +v !== 0) return toSec(+v);
  }
  return 0;
};

// ─── Period helpers ───────────────────────────────────────────────────────────

function periodCutoff(range) {
  const now = Date.now() / 1000;
  if (range === '1D') return now - 86400;
  if (range === '7D') return now - 7 * 86400;
  if (range === '30D') return now - 30 * 86400;
  return 0;
}

function periodLabel(sec, range) {
  const d = new Date(sec * 1000);
  if (range === '1D')
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Legacy stats (kept for AI insight) ──────────────────────────────────────

export function computeFundingStats(rows = []) {
  if (!rows.length) return null;

  const now = Date.now() / 1000;
  const monthAgo = now - 30 * 86400;

  const thisMonth = rows.filter((r) => ts(r) >= monthAgo);
  const totalMonth = thisMonth.reduce(
    (acc, r) => acc + num(r, 'payout', 'amount', 'payment', 'funding_amount', 'fee'),
    0
  );

  const dailyAvg = thisMonth.length > 0 ? totalMonth / 30 : 0;
  const direction = totalMonth < 0 ? 'paid' : 'received';

  return {
    totalMonth: Math.abs(totalMonth),
    dailyAvg: Math.abs(dailyAvg),
    direction,
    sign: totalMonth < 0 ? -1 : 1,
    count: thisMonth.length,
  };
}

export function computeTradeStats(rows = []) {
  if (!rows.length) return null;

  const pnls = rows.map((r) => num(r, 'pnl', 'realized_pnl', 'realizedPnl', 'profit_loss'));
  const wins = pnls.filter((p) => p > 0).length;
  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const avgPnl = pnls.length ? totalPnl / pnls.length : 0;

  const byMarket = {};
  for (const r of rows) {
    const mkt = str(r, 'market', 'market_name', 'symbol', 'pair') || 'UNKNOWN';
    const pnl = num(r, 'pnl', 'realized_pnl', 'realizedPnl', 'profit_loss');
    byMarket[mkt] = (byMarket[mkt] ?? 0) + pnl;
  }
  const bestMarket =
    Object.entries(byMarket).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

  return { total: rows.length, wins, winRate: rows.length ? wins / rows.length : 0, avgPnl, totalPnl, bestMarket };
}

export function computePositionRisks(rows = []) {
  return rows
    .map((r) => {
      const side = str(r, 'side', 'direction', 'position_side').toLowerCase();
      const markPrice = num(r, 'mark_price', 'markPrice', 'current_price', 'oracle_price');
      const liqPrice = num(r, 'liquidation_price', 'liqPrice', 'liq_price', 'bankruptcy_price');
      const entryPrice = num(r, 'entry_price', 'entryPrice', 'avg_entry_price');
      const size = num(r, 'size', 'position_size', 'quantity', 'base_size');
      const unrealisedPnl = num(r, 'unrealized_pnl', 'unrealisedPnl', 'unrealizedPnl', 'upnl');
      const market = str(r, 'market', 'market_name', 'symbol') || 'UNKNOWN';

      let distancePct = 0;
      if (markPrice && liqPrice) distancePct = Math.abs((markPrice - liqPrice) / markPrice) * 100;

      const riskLevel =
        distancePct < 10 ? 'critical' : distancePct < 20 ? 'high' : distancePct < 50 ? 'medium' : 'low';

      return { market, side, size, entryPrice, markPrice, liqPrice, unrealisedPnl, distancePct, riskLevel };
    })
    .sort((a, b) => a.distancePct - b.distancePct);
}

export function computeEquityStats(rows = []) {
  if (!rows.length) return null;

  const sorted = [...rows].sort((a, b) => ts(a) - ts(b));
  const equities = sorted.map((r) => num(r, 'equity', 'account_equity', 'balance', 'total_equity'));

  const current = equities.at(-1) ?? 0;
  const thirtyDaysAgo = Date.now() / 1000 - 30 * 86400;
  const oldIndex = sorted.findIndex((r) => ts(r) >= thirtyDaysAgo);
  const old = oldIndex >= 0 ? equities[oldIndex] : equities[0];
  const return30d = old ? ((current - old) / old) * 100 : 0;

  let peak = -Infinity;
  let maxDd = 0;
  for (const e of equities) {
    if (e > peak) peak = e;
    const dd = peak > 0 ? ((peak - e) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }

  return { current, peak: Math.max(...equities), return30d, maxDrawdown: maxDd };
}

export function computeChartData(trades = [], funding = []) {
  const events = [];

  for (const t of trades) {
    const time = ts(t);
    const pnl = num(t, 'pnl', 'realized_pnl', 'realizedPnl', 'profit_loss');
    if (time && pnl !== 0) events.push({ time, pnl, funding: 0 });
  }
  for (const f of funding) {
    const time = ts(f);
    const amount = num(f, 'payout', 'amount', 'payment', 'funding_amount', 'fee');
    if (time && amount !== 0) events.push({ time, pnl: 0, funding: amount });
  }

  if (!events.length) return [];
  events.sort((a, b) => a.time - b.time);

  let cumPnl = 0, cumFunding = 0;
  return events.map((e) => {
    cumPnl += e.pnl;
    cumFunding += e.funding;
    const d = new Date(e.time * 1000);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cumPnl: parseFloat(cumPnl.toFixed(2)),
      cumFunding: parseFloat(cumFunding.toFixed(2)),
    };
  });
}

// ─── Performance stats (range-aware) ─────────────────────────────────────────

export function computePerformanceStats(trades = [], funding = [], equityRows = [], range = '30D') {
  const cutoff = periodCutoff(range);

  const sortedAll = [...equityRows].sort((a, b) => ts(a) - ts(b));
  const inRange = sortedAll.filter((r) => ts(r) >= cutoff);
  const equityValues = inRange.map((r) =>
    num(r, 'equity', 'account_equity', 'balance', 'total_equity')
  );
  const currentEquity =
    sortedAll.length > 0
      ? num(sortedAll.at(-1), 'equity', 'account_equity', 'balance', 'total_equity')
      : 0;
  const startEquity = equityValues[0] ?? currentEquity;

  const filteredTrades = trades.filter((r) => ts(r) >= cutoff);
  const tradePnl = filteredTrades.reduce(
    (acc, r) => acc + num(r, 'pnl', 'realized_pnl', 'realizedPnl', 'profit_loss'),
    0
  );

  const filteredFunding = funding.filter((r) => ts(r) >= cutoff);
  const fundingPnl = filteredFunding.reduce((acc, r) => acc + num(r, 'payout'), 0);

  const pnl = tradePnl + fundingPnl;

  const volume = filteredTrades.reduce((acc, r) => {
    const notional = num(r, 'notional', 'trade_value', 'volume');
    if (notional) return acc + Math.abs(notional);
    const size = num(r, 'size', 'quantity', 'base_size');
    const price = num(r, 'price', 'fill_price', 'execution_price', 'avg_price');
    return acc + Math.abs(size * price);
  }, 0);

  const returnPct =
    startEquity > 0 ? ((currentEquity - startEquity) / startEquity) * 100 : 0;

  let peak = -Infinity, maxDrawdown = 0;
  for (const e of equityValues) {
    if (e > peak) peak = e;
    const dd = peak > 0 ? ((peak - e) / peak) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const dailyReturns = [];
  for (let i = 1; i < equityValues.length; i++) {
    if (equityValues[i - 1] > 0)
      dailyReturns.push((equityValues[i] - equityValues[i - 1]) / equityValues[i - 1]);
  }
  let sharpe = null;
  if (dailyReturns.length >= 2) {
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / dailyReturns.length;
    const std = Math.sqrt(variance);
    if (std > 0) sharpe = (mean / std) * Math.sqrt(365);
  }

  return { equity: currentEquity, pnl, volume, returnPct, sharpe, maxDrawdown };
}

// ─── Funding breakdown (ring chart) ──────────────────────────────────────────

export function computeFundingBreakdown(funding = [], range = '30D') {
  const cutoff = periodCutoff(range);
  const filtered = funding.filter((r) => ts(r) >= cutoff);

  let paid = 0, received = 0;
  for (const r of filtered) {
    const payout = num(r, 'payout');
    if (payout < 0) paid += Math.abs(payout);
    else if (payout > 0) received += payout;
  }

  const total = paid + received;
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
  return { paid, received, paidPct, label: 'Funding flow' };
}

// ─── Ring metrics (Portfolio ring modes) ─────────────────────────────────────

export function computeRingMetrics(positions = [], funding = [], range = '30D') {
  const bd = computeFundingBreakdown(funding, range);

  const fundingMetric = {
    primaryLabel: 'Paid',
    secondaryLabel: 'Received',
    primaryValue: bd.paid,
    secondaryValue: bd.received,
    primaryPct: bd.paidPct,
    secondaryPct: 100 - bd.paidPct,
    primaryColor: 'rgba(248,113,113,0.82)',
    secondaryColor: 'rgba(52,211,153,0.82)',
    description: 'Funding flow',
    centerValue: `${bd.paidPct}%`,
    centerCaption: 'paid',
  };

  const isLong = (r) => {
    const s = str(r, 'side', 'direction').toLowerCase();
    return s === 'bid' || s.includes('long');
  };
  const longs = positions.filter(isLong);
  const shorts = positions.filter((r) => !isLong(r));
  const total = positions.length;
  const longPct = total > 0 ? Math.round((longs.length / total) * 100) : 50;

  const marginMetric = {
    primaryLabel: 'Long',
    secondaryLabel: 'Short',
    primaryValue: longs.length,
    secondaryValue: shorts.length,
    primaryPct: longPct,
    secondaryPct: 100 - longPct,
    primaryColor: 'rgba(52,211,153,0.82)',
    secondaryColor: 'rgba(248,113,113,0.82)',
    description: 'Position sides',
    centerValue: `${longPct}%`,
    centerCaption: 'long',
  };

  const upnlField = ['unrealized_pnl', 'unrealisedPnl', 'unrealizedPnl', 'upnl'];
  const longUpnl = longs.reduce((acc, r) => acc + num(r, ...upnlField), 0);
  const shortUpnl = shorts.reduce((acc, r) => acc + num(r, ...upnlField), 0);
  const totalUpnl = Math.abs(longUpnl) + Math.abs(shortUpnl);
  const longExPct = totalUpnl > 0 ? Math.round((Math.abs(longUpnl) / totalUpnl) * 100) : 50;

  const exposureMetric = {
    primaryLabel: 'Long uPnL',
    secondaryLabel: 'Short uPnL',
    primaryValue: longUpnl,
    secondaryValue: shortUpnl,
    primaryPct: longExPct,
    secondaryPct: 100 - longExPct,
    primaryColor: longUpnl >= 0 ? 'rgba(52,211,153,0.82)' : 'rgba(248,113,113,0.82)',
    secondaryColor: shortUpnl >= 0 ? 'rgba(52,211,153,0.82)' : 'rgba(248,113,113,0.82)',
    description: 'Unrealised PnL split',
    centerValue: `${longExPct}%`,
    centerCaption: 'long',
  };

  return { funding: fundingMetric, margin: marginMetric, exposure: exposureMetric };
}

// ─── Overview mini-cards ──────────────────────────────────────────────────────

export function computeOverviewCards(equityRows = [], trades = []) {
  const sortedEq = [...equityRows].sort((a, b) => ts(a) - ts(b));
  const currentEquity =
    sortedEq.length > 0
      ? num(sortedEq.at(-1), 'equity', 'account_equity', 'balance', 'total_equity')
      : 0;

  const allTimeVolume = trades.reduce((acc, r) => {
    const notional = num(r, 'notional', 'trade_value', 'volume');
    if (notional) return acc + Math.abs(notional);
    const size = num(r, 'size', 'quantity', 'base_size');
    const price = num(r, 'price', 'fill_price', 'execution_price', 'avg_price');
    return acc + Math.abs(size * price);
  }, 0);

  return [
    {
      key: 'equity',
      label: 'Account equity',
      value: currentEquity,
      format: 'currency',
      badge: '● Live',
      badgeTone: 'positive',
      hint: 'Current account equity',
    },
    {
      key: 'volume',
      label: 'Trading volume',
      value: allTimeVolume,
      format: 'compactCurrency',
      subValue: 'All time',
      hint: 'Cumulative notional volume',
    },
    {
      key: 'points',
      label: 'Total points',
      value: null,
      format: 'points',
      badge: 'Not enrolled',
      badgeTone: 'neutral',
      hint: 'Pacifica points',
    },
    {
      key: 'fees',
      label: 'Fees (maker/taker)',
      value: { makerPct: 0.01, takerPct: 0.036 },
      format: 'fees',
      subValue: 'Default tier',
      hint: 'Current fee tier',
    },
  ];
}

// ─── Equity + PnL chart data (range-aware) ────────────────────────────────────

export function computeEquityChartData(equityRows = [], trades = [], funding = [], range = '30D') {
  const cutoff = periodCutoff(range);

  // Equity line
  const equityPoints = [...equityRows]
    .sort((a, b) => ts(a) - ts(b))
    .filter((r) => ts(r) >= cutoff)
    .map((r) => ({
      t: ts(r),
      equity: num(r, 'equity', 'account_equity', 'balance', 'total_equity'),
    }));

  // Cumulative PnL line (trades + funding)
  const pnlEvents = [
    ...trades
      .filter((r) => ts(r) >= cutoff)
      .map((r) => ({ t: ts(r), delta: num(r, 'pnl', 'realized_pnl', 'realizedPnl', 'profit_loss') })),
    ...funding
      .filter((r) => ts(r) >= cutoff)
      .map((r) => ({ t: ts(r), delta: num(r, 'payout') })),
  ].sort((a, b) => a.t - b.t);

  let cumPnl = 0;
  const pnlPoints = pnlEvents
    .filter((e) => e.delta !== 0)
    .map((e) => { cumPnl += e.delta; return { t: e.t, pnl: parseFloat(cumPnl.toFixed(2)) }; });

  // Merge both series by timestamp, forward-filling equity into pnl gaps
  const allTimes = [
    ...new Set([...equityPoints.map((p) => p.t), ...pnlPoints.map((p) => p.t)]),
  ].sort((a, b) => a - b);

  if (!allTimes.length) return [];

  const equityMap = new Map(equityPoints.map((p) => [p.t, p.equity]));
  const pnlMap = new Map(pnlPoints.map((p) => [p.t, p.pnl]));

  return allTimes.map((t) => ({
    label: periodLabel(t, range),
    fullLabel: new Date(t * 1000).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }),
    equity: equityMap.get(t) ?? null,
    pnl: pnlMap.get(t) ?? null,
  }));
}

// ─── ActivityTabs row mappers ─────────────────────────────────────────────────

export function mapPositionsForTable(rows = []) {
  const isLong = (r) => {
    const s = str(r, 'side', 'direction').toLowerCase();
    return s === 'bid' || s.includes('long');
  };
  return rows.map((r, i) => ({
    id: r.id ?? r.position_id ?? i,
    market: str(r, 'market', 'market_name', 'symbol', 'pair') || 'UNKNOWN',
    side: isLong(r) ? 'LONG' : 'SHORT',
    size: num(r, 'size', 'position_size', 'quantity', 'base_size'),
    positionValue: num(r, 'position_value', 'notional', 'market_value'),
    entryPrice: num(r, 'entry_price', 'entryPrice', 'avg_entry_price'),
    breakevenPrice: num(r, 'breakeven_price', 'breakevenPrice') || null,
    markPrice: num(r, 'mark_price', 'markPrice', 'current_price', 'oracle_price'),
    pnl: num(r, 'unrealized_pnl', 'unrealisedPnl', 'unrealizedPnl', 'upnl'),
    roiPct: num(r, 'roi', 'roi_pct', 'return_pct'),
    liqPrice: num(r, 'liquidation_price', 'liqPrice', 'liq_price', 'bankruptcy_price') || null,
    margin: num(r, 'margin', 'collateral', 'initial_margin') || null,
    funding: num(r, 'cumulative_funding', 'funding_amount') || 0,
    takeProfit: num(r, 'take_profit', 'tp') || null,
    stopLoss: num(r, 'stop_loss', 'sl') || null,
    leverage: num(r, 'leverage') || null,
    isolated: !!r.isolated,
  }));
}

export function mapTradesForTable(rows = []) {
  const isLong = (r) => {
    const s = str(r, 'side', 'direction').toLowerCase();
    return s === 'bid' || s.includes('buy') || s.includes('long');
  };
  return rows.map((r, i) => ({
    id: r.id ?? r.trade_id ?? i,
    time: ts(r) * 1000,
    market: str(r, 'market', 'market_name', 'symbol', 'pair') || 'UNKNOWN',
    side: isLong(r) ? 'LONG' : 'SHORT',
    eventType: str(r, 'event_type', 'type', 'order_type') || 'Market',
    size: num(r, 'size', 'quantity', 'base_size'),
    price: num(r, 'price', 'fill_price', 'execution_price', 'avg_price', 'entry_price'),
    tradeValue: num(r, 'notional', 'trade_value', 'volume') || 0,
    fee: Math.abs(num(r, 'fee', 'fees', 'trade_fee', 'taker_fee')),
    pnl: num(r, 'pnl', 'realized_pnl', 'realizedPnl', 'profit_loss'),
  }));
}

export function mapFundingForTable(rows = []) {
  return rows.map((r, i) => ({
    id: r.history_id ?? r.id ?? i,
    time: ts(r) * 1000,
    market: str(r, 'symbol', 'market', 'market_name') || 'UNKNOWN',
    side: str(r, 'side') === 'bid' ? 'LONG' : 'SHORT',
    positionSize: num(r, 'amount', 'size', 'position_size'),
    payout: num(r, 'payout'),
    rate: num(r, 'rate', 'funding_rate'),
  }));
}
