export const TIME_RANGE_OPTIONS = ['1D', '7D', '30D', 'ALL'];

const RANGE_TO_SECONDS = {
  '1D': 1 * 86400,
  '7D': 7 * 86400,
  '30D': 30 * 86400,
  ALL: Infinity,
};

const num = (obj, ...keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && !Number.isNaN(+value)) return +value;
  }
  return 0;
};

const str = (obj, ...keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return '';
};

const ts = (obj) =>
  num(obj, 'timestamp', 'ts', 'time', 'created_at', 'createdAt', 'settled_at', 'updated_at');

const round = (value, digits = 2) => Number(value.toFixed(digits));

const sortByTime = (rows = []) => [...rows].filter((row) => ts(row) > 0).sort((a, b) => ts(a) - ts(b));

const getCutoff = (range) => {
  if (range === 'ALL') return 0;
  return Date.now() / 1000 - (RANGE_TO_SECONDS[range] ?? RANGE_TO_SECONDS['30D']);
};

const formatLabel = (unixSeconds, range) => {
  const date = new Date(unixSeconds * 1000);
  if (range === '1D') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (range === 'ALL') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getTradePnl = (row) => num(row, 'pnl', 'realized_pnl', 'realizedPnl', 'profit_loss');

const getFundingAmount = (row) => num(row, 'amount', 'payment', 'funding_amount', 'fee');

const getEquityValue = (row) =>
  num(row, 'equity', 'account_equity', 'balance', 'total_equity');

const getTradeVolume = (row) => {
  const direct = num(
    row,
    'notional',
    'volume',
    'quote_size',
    'quoteSize',
    'trade_value',
    'position_value',
    'value'
  );
  if (direct) return Math.abs(direct);

  const size = Math.abs(num(row, 'size', 'quantity', 'qty', 'base_size', 'filled_size'));
  const price = num(row, 'price', 'fill_price', 'fillPrice', 'avg_price', 'execution_price');
  return size && price ? size * price : 0;
};

const getRangeBadge = (range) => (range === 'ALL' ? 'all time' : range.toLowerCase());

function computeDrawdown(values = []) {
  let peak = -Infinity;
  let maxDrawdown = 0;

  for (const value of values) {
    if (value > peak) peak = value;
    const drawdown = peak > 0 ? ((peak - value) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}

function computeSharpeFromEquity(values = []) {
  if (values.length < 3) return null;

  const returns = [];
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (!previous) continue;
    returns.push((current - previous) / previous);
  }

  if (returns.length < 2) return null;

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  if (!stdDev) return null;
  return mean / stdDev * Math.sqrt(returns.length);
}

function getSeriesWindow(rows = [], range = '30D') {
  const sorted = sortByTime(rows);
  if (!sorted.length || range === 'ALL') return sorted;

  const cutoff = getCutoff(range);
  const previousRows = sorted.filter((row) => ts(row) < cutoff);
  const inRangeRows = sorted.filter((row) => ts(row) >= cutoff);
  const baseline = previousRows.at(-1);

  if (baseline && (!inRangeRows.length || ts(inRangeRows[0]) !== ts(baseline))) {
    return [baseline, ...inRangeRows];
  }

  return inRangeRows;
}

export function filterRowsByRange(rows = [], range = '30D') {
  const cutoff = getCutoff(range);
  return sortByTime(rows).filter((row) => ts(row) >= cutoff);
}

export function computeFundingBreakdown(rows = [], range = '30D') {
  const scopedRows = filterRowsByRange(rows, range);
  const paid = scopedRows.reduce((sum, row) => {
    const amount = getFundingAmount(row);
    return amount < 0 ? sum + Math.abs(amount) : sum;
  }, 0);
  const received = scopedRows.reduce((sum, row) => {
    const amount = getFundingAmount(row);
    return amount > 0 ? sum + amount : sum;
  }, 0);
  const total = paid + received;

  return {
    paid: round(paid),
    received: round(received),
    net: round(received - paid),
    paidPct: total ? Math.round((paid / total) * 100) : 0,
    label: range === 'ALL' ? 'All-time funding' : `${range} funding`,
    count: scopedRows.length,
  };
}

export function computePositionRisks(rows = []) {
  return rows
    .map((row) => {
      const side = str(row, 'side', 'direction', 'position_side').toLowerCase();
      const markPrice = num(row, 'mark_price', 'markPrice', 'current_price', 'oracle_price');
      const liqPrice = num(row, 'liquidation_price', 'liqPrice', 'liq_price', 'bankruptcy_price');
      const entryPrice = num(row, 'entry_price', 'entryPrice', 'avg_entry_price');
      const size = num(row, 'size', 'position_size', 'quantity', 'base_size');
      const unrealisedPnl = num(row, 'unrealized_pnl', 'unrealisedPnl', 'unrealizedPnl', 'upnl');
      const market = str(row, 'market', 'market_name', 'symbol') || 'UNKNOWN';

      let distancePct = 0;
      if (markPrice && liqPrice) {
        distancePct = Math.abs((markPrice - liqPrice) / markPrice) * 100;
      }

      const riskLevel =
        distancePct < 10 ? 'critical' : distancePct < 20 ? 'high' : distancePct < 50 ? 'medium' : 'low';

      return { market, side, size, entryPrice, markPrice, liqPrice, unrealisedPnl, distancePct, riskLevel };
    })
    .sort((left, right) => left.distancePct - right.distancePct);
}

export function computePerformanceStats({ trades = [], equity = [], range = '30D' }) {
  const equityWindow = getSeriesWindow(equity, range);
  const scopedTrades = filterRowsByRange(trades, range);
  const equityValues = equityWindow.map(getEquityValue).filter((value) => value || value === 0);

  const currentEquity = equityValues.at(-1) ?? 0;
  const startEquity = equityValues[0] ?? currentEquity;
  const pnl = scopedTrades.reduce((sum, row) => sum + getTradePnl(row), 0);
  const volume = scopedTrades.reduce((sum, row) => sum + getTradeVolume(row), 0);
  const returnPct = startEquity ? ((currentEquity - startEquity) / startEquity) * 100 : 0;

  return {
    equity: currentEquity,
    pnl: round(pnl),
    volume: round(volume),
    returnPct,
    sharpe: computeSharpeFromEquity(equityValues),
    maxDrawdown: computeDrawdown(equityValues),
    rangeLabel: getRangeBadge(range),
  };
}

export function computeOverviewCards({
  trades = [],
  funding = [],
  positions = [],
  equity = [],
  range = '30D',
}) {
  const scopedTrades = filterRowsByRange(trades, range);
  const scopedFunding = filterRowsByRange(funding, range);
  const latestEquity = sortByTime(equity).map(getEquityValue).at(-1) ?? 0;
  const positionRisks = computePositionRisks(positions);
  const worstPosition = positionRisks[0];
  const fundingNet = scopedFunding.reduce((sum, row) => sum + getFundingAmount(row), 0);
  const scopedVolume = scopedTrades.reduce((sum, row) => sum + getTradeVolume(row), 0);
  const wins = scopedTrades.filter((row) => getTradePnl(row) > 0).length;
  const winRate = scopedTrades.length ? (wins / scopedTrades.length) * 100 : 0;

  return [
    {
      key: 'equity',
      label: 'Account equity',
      value: latestEquity,
      format: 'currency',
      badge: 'live',
      badgeTone: 'neutral',
    },
    {
      key: 'volume',
      label: `Trading volume (${getRangeBadge(range)})`,
      value: scopedVolume,
      format: 'compactCurrency',
      badge: `${scopedTrades.length} trades`,
      badgeTone: scopedTrades.length ? 'positive' : 'neutral',
    },
    {
      key: 'funding',
      label: `Funding (${getRangeBadge(range)})`,
      value: fundingNet,
      format: 'signedCurrency',
      badge: fundingNet < 0 ? 'paid' : fundingNet > 0 ? 'received' : 'flat',
      badgeTone: fundingNet < 0 ? 'negative' : fundingNet > 0 ? 'positive' : 'neutral',
    },
    {
      key: 'positions',
      label: 'Open positions',
      value: positions.length,
      format: 'number',
      badge: worstPosition
        ? `${worstPosition.market} ${round(worstPosition.distancePct, 1)}% to liq`
        : 'no exposure',
      badgeTone: worstPosition
        ? worstPosition.riskLevel === 'critical' || worstPosition.riskLevel === 'high'
          ? 'negative'
          : 'neutral'
        : 'neutral',
      subValue: scopedTrades.length ? `${round(winRate, 1)}% win rate` : undefined,
    },
  ];
}

export function computePerformanceChartData({ equity = [], trades = [], range = '30D' }) {
  const equityPoints = getSeriesWindow(equity, range)
    .map((row) => ({ time: ts(row), equity: getEquityValue(row) }))
    .filter((point) => point.time > 0);
  const tradePoints = filterRowsByRange(trades, range)
    .map((row) => ({ time: ts(row), pnl: getTradePnl(row) }))
    .filter((point) => point.time > 0);

  const times = [...new Set([...equityPoints.map((point) => point.time), ...tradePoints.map((point) => point.time)])]
    .sort((left, right) => left - right);

  if (!times.length) return [];

  let equityIndex = 0;
  let tradeIndex = 0;
  let latestEquity = equityPoints[0]?.equity ?? null;
  let cumulativePnl = 0;

  return times.map((time) => {
    while (equityIndex < equityPoints.length && equityPoints[equityIndex].time <= time) {
      latestEquity = equityPoints[equityIndex].equity;
      equityIndex += 1;
    }

    while (tradeIndex < tradePoints.length && tradePoints[tradeIndex].time <= time) {
      cumulativePnl += tradePoints[tradeIndex].pnl;
      tradeIndex += 1;
    }

    return {
      time,
      label: formatLabel(time, range),
      fullLabel: new Date(time * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: range === '1D' ? '2-digit' : undefined,
        minute: range === '1D' ? '2-digit' : undefined,
      }),
      equity: latestEquity,
      pnl: round(cumulativePnl),
    };
  });
}

export function computePositionsTable(rows = []) {
  return rows.map((row, index) => {
    const market = str(row, 'market', 'market_name', 'symbol') || 'UNKNOWN';
    const side = str(row, 'side', 'direction', 'position_side').toUpperCase() || 'N/A';
    const size = num(row, 'size', 'position_size', 'quantity', 'base_size');
    const markPrice = num(row, 'mark_price', 'markPrice', 'current_price', 'oracle_price');
    const entryPrice = num(row, 'entry_price', 'entryPrice', 'avg_entry_price');
    const breakevenPrice = num(row, 'breakeven_price', 'break_even_price', 'breakEvenPrice') || entryPrice;
    const positionValue =
      Math.abs(num(row, 'position_value', 'notional', 'value')) || Math.abs(size * markPrice);
    const unrealisedPnl = num(row, 'unrealized_pnl', 'unrealisedPnl', 'unrealizedPnl', 'upnl');
    const liqPrice = num(row, 'liquidation_price', 'liqPrice', 'liq_price', 'bankruptcy_price');
    const margin = num(row, 'margin', 'collateral', 'initial_margin', 'position_margin');
    const funding = num(row, 'funding', 'accrued_funding', 'net_funding', 'cum_funding');
    const roiBase = margin || positionValue;
    const roiPct = roiBase ? (unrealisedPnl / roiBase) * 100 : 0;

    return {
      id: `${market}-${side}-${index}`,
      market,
      side,
      size,
      positionValue,
      entryPrice,
      breakevenPrice,
      markPrice,
      pnl: unrealisedPnl,
      roiPct,
      liqPrice,
      margin,
      funding,
    };
  });
}

export function computeTradeHistoryTable(rows = [], range = 'ALL') {
  return filterRowsByRange(rows, range)
    .slice()
    .sort((left, right) => ts(right) - ts(left))
    .slice(0, 100)
    .map((row, index) => ({
      id: `${ts(row)}-${index}`,
      time: ts(row),
      market: str(row, 'market', 'market_name', 'symbol', 'pair') || 'UNKNOWN',
      side: str(row, 'side', 'direction', 'trade_side').toUpperCase() || 'N/A',
      size: num(row, 'size', 'quantity', 'qty', 'base_size', 'filled_size'),
      price: num(row, 'price', 'fill_price', 'fillPrice', 'avg_price', 'execution_price'),
      pnl: getTradePnl(row),
      fee: num(row, 'fee', 'fees', 'trading_fee'),
    }));
}

export function computeFundingHistoryTable(rows = [], range = 'ALL') {
  return filterRowsByRange(rows, range)
    .slice()
    .sort((left, right) => ts(right) - ts(left))
    .slice(0, 100)
    .map((row, index) => ({
      id: `${ts(row)}-${index}`,
      time: ts(row),
      market: str(row, 'market', 'market_name', 'symbol', 'pair') || 'UNKNOWN',
      side: str(row, 'side', 'direction', 'position_side').toUpperCase() || 'N/A',
      amount: num(row, 'size', 'amount_size', 'position_size', 'quantity', 'base_size'),
      rate: num(row, 'rate', 'funding_rate', 'fundingRate'),
      payout: getFundingAmount(row),
    }));
}
