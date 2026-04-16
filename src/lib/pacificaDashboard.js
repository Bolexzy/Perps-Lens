export const TIME_RANGE_OPTIONS = ['1D', '7D', '30D', 'ALL'];

const RANGE_TO_MS = {
  '1D': 1 * 86400 * 1000,
  '7D': 7 * 86400 * 1000,
  '30D': 30 * 86400 * 1000,
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

const bool = (obj, ...keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === 'boolean') return value;
  }
  return false;
};

const toMs = (value) => {
  if (!value) return 0;
  return value > 1e12 ? value : value * 1000;
};

const ts = (obj) =>
  toMs(
    num(
      obj,
      'timestamp',
      'ts',
      'time',
      'created_at',
      'createdAt',
      'settled_at',
      'updated_at'
    )
  );

const round = (value, digits = 2) => Number(value.toFixed(digits));

const sortByTime = (rows = []) => [...rows].filter((row) => ts(row) > 0).sort((a, b) => ts(a) - ts(b));

const getCutoff = (range) => {
  if (range === 'ALL') return 0;
  return Date.now() - (RANGE_TO_MS[range] ?? RANGE_TO_MS['30D']);
};

const getRangeLabel = (range) => (range === 'ALL' ? 'all time' : range.toLowerCase());

const formatChartLabel = (timeMs, range) => {
  const date = new Date(timeMs);
  if (range === '1D') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (range === 'ALL') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const normalizeSide = (value) => {
  const side = String(value || '').toLowerCase();
  if (['bid', 'buy', 'long', 'open_long', 'close_short'].includes(side)) return 'LONG';
  if (['ask', 'sell', 'short', 'open_short', 'close_long'].includes(side)) return 'SHORT';
  return side ? side.toUpperCase() : 'N/A';
};

const normalizeTradeSide = (value) => {
  const side = String(value || '').toLowerCase();
  if (['bid', 'buy', 'open_long', 'close_short', 'long'].includes(side)) return 'BUY';
  if (['ask', 'sell', 'open_short', 'close_long', 'short'].includes(side)) return 'SELL';
  return side ? side.toUpperCase() : 'N/A';
};

const normalizeDirectionalSide = (value) => {
  const side = String(value || '').toLowerCase();
  if (['bid', 'buy', 'open_long', 'close_short', 'long'].includes(side)) return 'LONG';
  if (['ask', 'sell', 'open_short', 'close_long', 'short'].includes(side)) return 'SHORT';
  return side ? side.toUpperCase() : 'N/A';
};

const titleCase = (value) =>
  String(value || '')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const getFundingAmount = (row) =>
  num(row, 'payout', 'amount', 'payment', 'funding_amount', 'fee');

const getTradePnl = (row) =>
  num(row, 'pnl', 'realized_pnl', 'realizedPnl', 'profit_loss', 'closed_pnl');

const getEquityValue = (row) =>
  num(row, 'account_equity', 'equity', 'balance', 'total_equity');

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

  const size = Math.abs(num(row, 'size', 'amount', 'quantity', 'qty', 'base_size', 'filled_size'));
  const price = num(
    row,
    'entry_price',
    'fill_price',
    'fillPrice',
    'avg_price',
    'execution_price',
    'price'
  );
  return size && price ? size * price : 0;
};

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

function computeSharpe(values = []) {
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

export function computeFundingStats(rows = []) {
  if (!rows.length) return null;

  const scopedRows = filterRowsByRange(rows, '30D');
  const totalMonth = scopedRows.reduce((sum, row) => sum + getFundingAmount(row), 0);

  return {
    totalMonth: Math.abs(totalMonth),
    dailyAvg: scopedRows.length ? Math.abs(totalMonth) / 30 : 0,
    direction: totalMonth < 0 ? 'paid' : 'received',
    sign: totalMonth < 0 ? -1 : 1,
    count: scopedRows.length,
  };
}

export function computeTradeStats(rows = []) {
  if (!rows.length) return null;

  const pnls = rows.map(getTradePnl);
  const wins = pnls.filter((value) => value > 0).length;
  const totalPnl = pnls.reduce((sum, value) => sum + value, 0);
  const avgPnl = pnls.length ? totalPnl / pnls.length : 0;

  const byMarket = {};
  for (const row of rows) {
    const market = str(row, 'market', 'market_name', 'symbol', 'pair') || 'UNKNOWN';
    byMarket[market] = (byMarket[market] ?? 0) + getTradePnl(row);
  }

  const bestMarket = Object.entries(byMarket).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

  return {
    total: rows.length,
    wins,
    winRate: rows.length ? wins / rows.length : 0,
    avgPnl,
    totalPnl,
    bestMarket,
  };
}

export function computePositionRisks(rows = []) {
  return rows
    .map((row) => {
      const side = normalizeSide(str(row, 'side', 'direction', 'position_side'));
      const markPrice = num(row, 'mark_price', 'markPrice', 'current_price', 'oracle_price');
      const liqPrice = num(row, 'liquidation_price', 'liqPrice', 'liq_price', 'bankruptcy_price');
      const entryPrice = num(row, 'entry_price', 'entryPrice', 'avg_entry_price');
      const size = num(row, 'size', 'amount', 'position_size', 'quantity', 'base_size');
      const unrealisedPnl = num(row, 'unrealized_pnl', 'unrealisedPnl', 'unrealizedPnl', 'upnl');
      const market = str(row, 'market', 'market_name', 'symbol') || 'UNKNOWN';

      let distancePct = 0;
      if (markPrice && liqPrice) {
        distancePct = Math.abs((markPrice - liqPrice) / markPrice) * 100;
      }

      const riskLevel =
        distancePct < 10 ? 'critical' : distancePct < 20 ? 'high' : distancePct < 50 ? 'medium' : 'low';

      return {
        market,
        side,
        size,
        entryPrice,
        markPrice,
        liqPrice,
        unrealisedPnl,
        distancePct,
        riskLevel,
      };
    })
    .sort((a, b) => a.distancePct - b.distancePct);
}

export function computeEquityStats(rows = []) {
  if (!rows.length) return null;

  const sorted = sortByTime(rows);
  const equities = sorted.map(getEquityValue);
  const current = equities.at(-1) ?? 0;
  const thirtyDayWindow = getSeriesWindow(rows, '30D').map(getEquityValue);
  const base = thirtyDayWindow[0] ?? equities[0] ?? 0;

  return {
    current,
    peak: Math.max(...equities),
    return30d: base ? ((current - base) / base) * 100 : 0,
    maxDrawdown: computeDrawdown(equities),
  };
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

export function computeAccountSnapshot(accountInfo = null) {
  if (!accountInfo) return null;

  return {
    equity: num(accountInfo, 'account_equity', 'equity', 'balance'),
    balance: num(accountInfo, 'account_balance', 'balance'),
    available: num(
      accountInfo,
      'available_to_spend',
      'available_to_withdraw',
      'withdrawable',
      'available'
    ),
    marginUsed: num(
      accountInfo,
      'total_margin_used',
      'margin_used',
      'used_margin',
      'total_used_margin'
    ),
    makerFeeRate: num(accountInfo, 'maker_fee', 'maker_fee_bps'),
    takerFeeRate: num(accountInfo, 'taker_fee', 'taker_fee_bps'),
    feeLevel: str(accountInfo, 'fee_level', 'tier') || 'standard',
    positionsCount: num(accountInfo, 'positions_count'),
    openOrders: num(accountInfo, 'orders_count'),
    openStopOrders: num(accountInfo, 'stop_orders_count'),
  };
}

export function computePortfolioVolumeSnapshot(volumeInfo = null) {
  if (!volumeInfo) return null;

  return {
    volume1d: num(volumeInfo, 'volume_1d'),
    volume7d: num(volumeInfo, 'volume_7d'),
    volume14d: num(volumeInfo, 'volume_14d'),
    volume30d: num(volumeInfo, 'volume_30d'),
    volumeAllTime: num(volumeInfo, 'volume_all_time'),
  };
}

export function computePortfolioRingMetrics({
  funding = [],
  positions = [],
  accountInfo = null,
  range = '30D',
}) {
  const scopedFunding = filterRowsByRange(funding, range);
  const account = computeAccountSnapshot(accountInfo);

  const fundingPaid = scopedFunding.reduce((sum, row) => {
    const amount = getFundingAmount(row);
    return amount < 0 ? sum + Math.abs(amount) : sum;
  }, 0);
  const fundingReceived = scopedFunding.reduce((sum, row) => {
    const amount = getFundingAmount(row);
    return amount > 0 ? sum + amount : sum;
  }, 0);

  const marginUsed = account?.marginUsed ?? 0;
  const marginFree = account?.available ?? 0;

  const longExposure = positions.reduce((sum, row) => {
    const side = normalizeSide(str(row, 'side', 'direction', 'position_side'));
    const markPrice = num(row, 'mark_price', 'markPrice', 'current_price', 'oracle_price');
    const size = Math.abs(num(row, 'size', 'amount', 'position_size', 'quantity', 'base_size'));
    const positionValue =
      Math.abs(num(row, 'position_value', 'notional', 'value')) || Math.abs(size * markPrice);
    return side === 'LONG' ? sum + positionValue : sum;
  }, 0);
  const shortExposure = positions.reduce((sum, row) => {
    const side = normalizeSide(str(row, 'side', 'direction', 'position_side'));
    const markPrice = num(row, 'mark_price', 'markPrice', 'current_price', 'oracle_price');
    const size = Math.abs(num(row, 'size', 'amount', 'position_size', 'quantity', 'base_size'));
    const positionValue =
      Math.abs(num(row, 'position_value', 'notional', 'value')) || Math.abs(size * markPrice);
    return side === 'SHORT' ? sum + positionValue : sum;
  }, 0);

  return {
    funding: buildRingMetric({
      key: 'funding',
      label: 'Funding',
      primaryLabel: 'Paid',
      secondaryLabel: 'Received',
      primaryValue: fundingPaid,
      secondaryValue: fundingReceived,
      primaryColor: 'rgba(248,113,113,0.82)',
      secondaryColor: 'rgba(52,211,153,0.82)',
      description: range === 'ALL' ? 'All-time funding flow' : `${range} funding flow`,
      centerValue: `${Math.round(percentOf(fundingPaid, fundingPaid + fundingReceived))}%`,
      centerCaption: 'paid',
    }),
    margin: buildRingMetric({
      key: 'margin',
      label: 'Margin',
      primaryLabel: 'In Use',
      secondaryLabel: 'Free',
      primaryValue: marginUsed,
      secondaryValue: marginFree,
      primaryColor: 'rgba(56,189,248,0.82)',
      secondaryColor: 'rgba(226,232,240,0.58)',
      description: 'Margin utilisation',
      centerValue: `${Math.round(percentOf(marginUsed, marginUsed + marginFree))}%`,
      centerCaption: 'used',
    }),
    exposure: buildRingMetric({
      key: 'exposure',
      label: 'Exposure',
      primaryLabel: 'Long',
      secondaryLabel: 'Short',
      primaryValue: longExposure,
      secondaryValue: shortExposure,
      primaryColor: 'rgba(52,211,153,0.82)',
      secondaryColor: 'rgba(244,63,94,0.82)',
      description: 'Position exposure split',
      centerValue: `${Math.round(percentOf(longExposure, longExposure + shortExposure))}%`,
      centerCaption: 'long',
    }),
  };
}

function percentOf(value, total) {
  return total > 0 ? (value / total) * 100 : 0;
}

function buildRingMetric({
  key,
  label,
  primaryLabel,
  secondaryLabel,
  primaryValue,
  secondaryValue,
  primaryColor,
  secondaryColor,
  description,
  centerValue,
  centerCaption,
}) {
  const total = primaryValue + secondaryValue;
  const primaryPct = percentOf(primaryValue, total);

  return {
    key,
    label,
    primaryLabel,
    secondaryLabel,
    primaryValue: round(primaryValue),
    secondaryValue: round(secondaryValue),
    primaryPct: Math.round(primaryPct),
    secondaryPct: Math.round(100 - primaryPct),
    primaryColor,
    secondaryColor,
    description,
    centerValue,
    centerCaption,
  };
}

export function computePerformanceStats({
  trades = [],
  equity = [],
  accountInfo = null,
  volumeInfo = null,
  range = '30D',
}) {
  const equityWindow = getSeriesWindow(equity, range);
  const scopedTrades = filterRowsByRange(trades, range);
  const equityValues = equityWindow.map(getEquityValue).filter((value) => value || value === 0);
  const account = computeAccountSnapshot(accountInfo);
  const volume = computePortfolioVolumeSnapshot(volumeInfo);
  const pnlSeries = equityWindow.map((row) => num(row, 'pnl'));

  const currentEquity = account?.equity ?? equityValues.at(-1) ?? 0;
  const startEquity = equityValues[0] ?? currentEquity;
  const currentPnl = pnlSeries.at(-1) ?? 0;
  const startPnl = pnlSeries[0] ?? currentPnl;
  const pnl = currentPnl - startPnl;
  const scopedVolume =
    range === '1D'
      ? volume?.volume1d
      : range === '7D'
        ? volume?.volume7d
        : range === '30D'
          ? volume?.volume30d
          : volume?.volumeAllTime ?? scopedTrades.reduce((sum, row) => sum + getTradeVolume(row), 0);
  const returnPct = startEquity ? ((currentEquity - startEquity) / startEquity) * 100 : 0;

  return {
    equity: currentEquity,
    pnl,
    volume: scopedVolume ?? 0,
    returnPct,
    sharpe: computeSharpe(equityValues),
    maxDrawdown: computeDrawdown(equityValues),
    rangeLabel: getRangeLabel(range),
  };
}

export function computeOverviewCards({
  trades = [],
  positions = [],
  accountInfo = null,
  volumeInfo = null,
  range = '30D',
}) {
  const scopedTrades = filterRowsByRange(trades, range);
  const account = computeAccountSnapshot(accountInfo);
  const volume = computePortfolioVolumeSnapshot(volumeInfo);
  const scopedVolume = scopedTrades.reduce((sum, row) => sum + getTradeVolume(row), 0);
  const makerPct = account ? account.makerFeeRate * 100 : 0;
  const takerPct = account ? account.takerFeeRate * 100 : 0;
  const livePositions = account?.positionsCount || positions.length;
  const pointsValue =
    accountInfo?.points ??
    accountInfo?.portfolio_points ??
    accountInfo?.user_points ??
    accountInfo?.trading_points ??
    null;

  return [
    {
      key: 'equity',
      label: 'Account equity',
      hint: 'The total asset value across all accounts.',
      value: account?.equity ?? 0,
      format: 'currencyExact',
      badge: 'live',
      badgeTone: 'neutral',
    },
    {
      key: 'volume',
      label: 'Trading volume',
      hint: 'The total trading volume across all accounts.',
      value: volume?.volumeAllTime ?? scopedVolume,
      format: 'compactCurrencyPrecise',
      badge: livePositions ? `${livePositions} live positions` : 'no live positions',
      badgeTone: livePositions ? 'positive' : 'neutral',
    },
    {
      key: 'points',
      label: 'Points',
      hint: 'Points are shown when the wallet is enrolled in Pacifica points.',
      value: pointsValue,
      format: 'points',
      badge: pointsValue === null ? 'not enrolled' : 'enrolled',
      badgeTone: pointsValue === null ? 'negative' : 'positive',
    },
    {
      key: 'fees',
      label: 'Fees (maker / taker)',
      hint: 'Current fee rates applied to maker and taker executions.',
      value: { makerPct, takerPct },
      format: 'fees',
      badge: null,
      badgeTone: 'neutral',
      linkHref: 'https://docs.pacifica.fi/trading-on-pacifica/trading-fees',
      linkLabel: 'View fee schedule',
    },
  ];
}

export function computePerformanceChartData({ equity = [], trades = [], range = '30D' }) {
  const equityPoints = getSeriesWindow(equity, range)
    .map((row) => ({ time: ts(row), equity: getEquityValue(row), pnl: num(row, 'pnl') }))
    .filter((point) => point.time > 0);
  const times = [...new Set(equityPoints.map((point) => point.time))].sort((a, b) => a - b);

  if (!times.length) return [];

  let equityIndex = 0;
  let latestEquity = equityPoints[0]?.equity ?? null;
  let latestPnl = equityPoints[0]?.pnl ?? 0;
  const baselinePnl = equityPoints[0]?.pnl ?? 0;

  return times.map((time) => {
    while (equityIndex < equityPoints.length && equityPoints[equityIndex].time <= time) {
      latestEquity = equityPoints[equityIndex].equity;
      latestPnl = equityPoints[equityIndex].pnl;
      equityIndex += 1;
    }

    return {
      time,
      label: formatChartLabel(time, range),
      fullLabel: new Date(time).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: range === '1D' ? '2-digit' : undefined,
        minute: range === '1D' ? '2-digit' : undefined,
      }),
      equity: latestEquity,
      pnl: round(latestPnl - baselinePnl),
    };
  });
}

export function computePositionsTable(rows = []) {
  return rows.map((row, index) => {
    const market = str(row, 'market', 'market_name', 'symbol') || 'UNKNOWN';
    const side = normalizeSide(str(row, 'side', 'direction', 'position_side'));
    const size = num(row, 'size', 'amount', 'position_size', 'quantity', 'base_size');
    const markPrice = num(row, 'mark_price', 'markPrice', 'current_price', 'oracle_price');
    const entryPrice = num(row, 'entry_price', 'entryPrice', 'avg_entry_price');
    const breakevenPrice = num(row, 'breakeven_price', 'break_even_price', 'breakEvenPrice') || entryPrice;
    const positionValue =
      Math.abs(num(row, 'position_value', 'notional', 'value')) || Math.abs(size * markPrice);
    const unrealisedPnl = num(row, 'unrealized_pnl', 'unrealisedPnl', 'unrealizedPnl', 'upnl');
    const liqPrice = num(row, 'liquidation_price', 'liqPrice', 'liq_price', 'bankruptcy_price');
    const margin = num(row, 'margin', 'collateral', 'initial_margin', 'position_margin');
    const funding = num(row, 'funding', 'accrued_funding', 'net_funding', 'cum_funding');
    const leverage = num(row, 'leverage', 'initial_leverage', 'position_leverage');
    const roiBase = margin || positionValue;
    const roiPct = roiBase ? (unrealisedPnl / roiBase) * 100 : 0;
    const isolated = bool(row, 'isolated');

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
      leverage,
      isolated,
      takeProfit: num(row, 'take_profit_price', 'tp_price'),
      stopLoss: num(row, 'stop_loss_price', 'sl_price'),
    };
  });
}

export function computeTradeHistoryTable(rows = [], range = 'ALL') {
  return filterRowsByRange(rows, range)
    .slice()
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, 100)
    .map((row, index) => ({
      id: `${ts(row)}-${index}`,
      time: ts(row),
      market: str(row, 'market', 'market_name', 'symbol', 'pair') || 'UNKNOWN',
      side: titleCase(str(row, 'side', 'direction', 'trade_side')).replaceAll('_', ' ') || 'N/A',
      eventType: titleCase(str(row, 'event_type', 'type')) || 'Trade',
      size: num(row, 'size', 'amount', 'quantity', 'qty', 'base_size', 'filled_size'),
      price: num(row, 'entry_price', 'fill_price', 'fillPrice', 'avg_price', 'execution_price', 'price'),
      tradeValue:
        Math.abs(
          num(row, 'trade_value', 'notional', 'value')
        ) ||
        Math.abs(
          num(row, 'size', 'amount', 'quantity', 'qty', 'base_size', 'filled_size') *
            num(row, 'entry_price', 'fill_price', 'fillPrice', 'avg_price', 'execution_price', 'price')
        ),
      pnl: getTradePnl(row),
      fee: num(row, 'fee', 'fees', 'trading_fee'),
    }));
}

export function computeFundingHistoryTable(rows = [], range = 'ALL') {
  return filterRowsByRange(rows, range)
    .slice()
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, 100)
    .map((row, index) => ({
      id: `${ts(row)}-${index}`,
      time: ts(row),
      market: str(row, 'market', 'market_name', 'symbol', 'pair') || 'UNKNOWN',
      side: normalizeSide(str(row, 'side', 'direction', 'position_side')),
      positionSize: num(row, 'size', 'amount_size', 'position_size', 'quantity', 'base_size', 'amount'),
      rate: num(row, 'rate', 'funding_rate', 'fundingRate'),
      payout: getFundingAmount(row),
    }));
}

export function computeOpenOrdersTable(rows = []) {
  return rows
    .sort((a, b) => ts(b) - ts(a))
    .map((row, index) => ({
      id: `${ts(row)}-${index}`,
      time: ts(row),
      market: str(row, 'market', 'market_name', 'symbol', 'pair') || 'UNKNOWN',
      side: normalizeDirectionalSide(str(row, 'side', 'direction', 'trade_side')),
      type: titleCase(str(row, 'order_type', 'type')) || 'Limit',
      originalSize: num(row, 'initial_amount', 'size', 'amount', 'quantity', 'qty', 'base_size'),
      filledSize: num(row, 'filled_size', 'filled_amount'),
      price: num(row, 'price', 'limit_price', 'initial_price'),
      orderValue:
        Math.abs(num(row, 'value', 'order_value')) ||
        Math.abs(
          num(row, 'initial_amount', 'size', 'amount', 'quantity', 'qty', 'base_size') *
            num(row, 'price', 'limit_price', 'initial_price')
        ),
      status: titleCase(str(row, 'status', 'order_status')) || 'Open',
    }));
}

export function computeOrderHistoryTable(rows = []) {
  return rows
    .slice()
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, 100)
    .map((row, index) => {
      const originalSize = num(row, 'amount', 'initial_amount', 'size', 'quantity', 'qty', 'base_size');
      const initialPrice = num(row, 'initial_price', 'price', 'limit_price');
      const averageFilledPrice = num(row, 'average_filled_price', 'avg_filled_price', 'avg_price');
      const stopPrice = num(row, 'stop_price', 'trigger_price');

      return {
        id: `${ts(row)}-${index}`,
        time: ts(row),
        market: str(row, 'market', 'market_name', 'symbol', 'pair') || 'UNKNOWN',
        side: normalizeDirectionalSide(str(row, 'side', 'direction', 'trade_side')),
        type: titleCase(str(row, 'order_type', 'type')) || 'Limit',
        originalSize,
        filledSize: num(row, 'filled_size', 'filled_amount'),
        initialPrice,
        triggerCondition: stopPrice ? `@ ${stopPrice}` : 'N/A',
        averageFilledPrice,
        orderValue:
          Math.abs(num(row, 'value', 'order_value')) || Math.abs(originalSize * initialPrice),
        status: titleCase(str(row, 'status', 'order_status')) || 'N/A',
        orderId: str(row, 'order_id', 'id') || 'N/A',
      };
    });
}

export function computeBalanceHistoryTable(rows = []) {
  return rows
    .filter((row) => {
      const event = str(row, 'event_type', 'event', 'type', 'balance_type', 'reason').toLowerCase();
      return event.includes('deposit') || event.includes('withdraw');
    })
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, 100)
    .map((row, index) => ({
      id: `${ts(row)}-${index}`,
      time: ts(row),
      event: titleCase(str(row, 'event_type', 'event', 'type', 'balance_type', 'reason')) || 'Balance Update',
      amount: num(row, 'amount', 'delta', 'change'),
      balance: num(row, 'balance', 'account_balance', 'equity'),
      status: str(row, 'status') || 'completed',
      txHash: str(row, 'tx_hash', 'transaction_hash', 'signature'),
    }));
}

export function computePayoutsTable(rows = [], range = 'ALL') {
  return filterRowsByRange(rows, range)
    .filter((row) => getFundingAmount(row) > 0)
    .slice()
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, 100)
    .map((row, index) => ({
      id: `${ts(row)}-${index}`,
      time: ts(row),
      amount: getFundingAmount(row),
    }));
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}
