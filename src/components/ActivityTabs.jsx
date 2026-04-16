import { useMemo, useState } from 'react';

export function ActivityTabs({
  positions,
  openOrders,
  trades,
  orderHistory,
  funding,
  balances,
  payouts,
  loading,
  range,
}) {
  const [activeTab, setActiveTab] = useState('positions');

  const rows = useMemo(
    () => ({
      positions,
      openOrders,
      trades,
      orderHistory,
      funding,
      deposits: balances,
      payouts,
    }),
    [balances, funding, openOrders, orderHistory, payouts, positions, trades]
  );

  const tabs = [
    { key: 'positions', label: `Positions (${positions.length})` },
    { key: 'openOrders', label: `Open Orders (${openOrders.length})` },
    { key: 'trades', label: 'Trade History' },
    { key: 'orderHistory', label: 'Order History' },
    { key: 'funding', label: 'Funding History' },
    { key: 'deposits', label: 'Deposits/Withdrawals' },
    { key: 'payouts', label: 'Payouts' },
  ];

  return (
    <div className="relative flex h-[min(70vh,36rem)] min-h-0 flex-col overflow-hidden rounded-none border-0 bg-transparent shadow-none sm:h-[min(72vh,40rem)] lg:h-full">
      <div className="relative z-10 shrink-0 flex flex-wrap border-b border-white/6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`border-b px-3 py-3 text-[12px] font-medium transition sm:px-5 sm:text-[13px] ${
              activeTab === tab.key
                ? 'border-sky-400 text-white'
                : 'border-transparent text-slate-400 hover:text-white/75'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-auto px-0 pb-0 pt-4">
        <div className="min-w-full">
          {loading ? (
            <LoadingTable />
          ) : activeTab === 'positions' ? (
            rows.positions.length ? <PositionsTable rows={rows.positions} /> : <EmptyState message="No open positions" />
          ) : activeTab === 'openOrders' ? (
            rows.openOrders.length ? <OpenOrdersTable rows={rows.openOrders} /> : <EmptyState message="No open orders" />
          ) : activeTab === 'trades' ? (
            rows.trades.length ? (
              <>
                <RangeLabel range={range} />
                <TradesTable rows={rows.trades} />
              </>
            ) : (
              <EmptyState message="No trade history in this time range" />
            )
          ) : activeTab === 'orderHistory' ? (
            rows.orderHistory.length ? <OrderHistoryTable rows={rows.orderHistory} /> : <EmptyState message="No order history" />
          ) : activeTab === 'funding' ? (
            rows.funding.length ? (
              <>
                <RangeLabel range={range} />
                <FundingTable rows={rows.funding} />
              </>
            ) : (
              <EmptyState message="No funding history in this time range" />
            )
          ) : activeTab === 'deposits' ? (
            rows.deposits.length ? <BalanceHistoryTable rows={rows.deposits} /> : <EmptyState message="No deposit or withdrawal history available from the current Pacifica endpoints" />
          ) : rows.payouts.length ? (
            <>
              <RangeLabel range={range} />
              <PayoutsTable rows={rows.payouts} />
            </>
          ) : (
            <EmptyState message="No payout history in this time range" />
          )}
        </div>
      </div>
    </div>
  );
}

function RangeLabel({ range }) {
  return (
    <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-white/28">
      Showing {range === 'ALL' ? 'all available rows' : range.toLowerCase()}
    </p>
  );
}

function PositionsTable({ rows }) {
  return (
    <table className="min-w-full border-collapse text-[12px] sm:text-[13px]">
      <thead>
        <tr className="border-b border-white/8 text-left text-slate-400">
          <HeaderCell>Token</HeaderCell>
          <HeaderCell>Size</HeaderCell>
          <HeaderCell>Position Value</HeaderCell>
          <HeaderCell>Entry / Breakeven Price</HeaderCell>
          <HeaderCell>Mark Price</HeaderCell>
          <HeaderCell>PnL (ROI%)</HeaderCell>
          <HeaderCell>Liq Price</HeaderCell>
          <HeaderCell>Margin</HeaderCell>
          <HeaderCell>Funding</HeaderCell>
          <HeaderCell>TP/SL</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-white/6 text-white/82 last:border-b-0">
            <DataCell>
              <div className="flex items-center gap-3">
                <span className="font-medium text-white">{row.market}</span>
                <SideBadge side={row.side} leverage={row.leverage} />
              </div>
            </DataCell>
            <DataCell>{formatQuantity(row.size)} {row.market}</DataCell>
            <DataCell>{formatMoney(row.positionValue)}</DataCell>
            <DataCell>{formatPrice(row.entryPrice)} / {row.breakevenPrice ? formatPrice(row.breakevenPrice) : '-'}</DataCell>
            <DataCell>{formatPrice(row.markPrice)}</DataCell>
            <DataCell className={row.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {formatSignedMoney(row.pnl, true)} ({formatSignedPercent(row.roiPct)})
            </DataCell>
            <DataCell>{row.liqPrice ? formatPrice(row.liqPrice) : 'N/A'}</DataCell>
            <DataCell>{row.margin ? formatMoney(row.margin) : 'N/A'}{row.isolated ? ' (Isolated)' : ' (Cross)'}</DataCell>
            <DataCell className={row.funding >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {formatSignedMoney(row.funding, true)}
            </DataCell>
            <DataCell>{formatPricePair(row.takeProfit, row.stopLoss)}</DataCell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OpenOrdersTable({ rows }) {
  return (
    <table className="min-w-full border-collapse text-[12px] sm:text-[13px]">
      <thead>
        <tr className="border-b border-white/8 text-left text-slate-400">
          <HeaderCell>Time</HeaderCell>
          <HeaderCell>Order Type</HeaderCell>
          <HeaderCell>Token</HeaderCell>
          <HeaderCell>Side</HeaderCell>
          <HeaderCell>Original Size</HeaderCell>
          <HeaderCell>Filled Size</HeaderCell>
          <HeaderCell>Price</HeaderCell>
          <HeaderCell>Order Value</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-white/6 text-white/82 last:border-b-0">
            <DataCell className="text-white/70">{formatDateTime(row.time)}</DataCell>
            <DataCell>{row.type}</DataCell>
            <DataCell>{row.market}</DataCell>
            <DataCell className={row.side === 'LONG' ? 'text-emerald-300' : 'text-rose-300'}>
              {titleCase(row.side)}
            </DataCell>
            <DataCell>{formatQuantity(row.originalSize)} {row.market}</DataCell>
            <DataCell>{formatQuantity(row.filledSize)} {row.market}</DataCell>
            <DataCell>{row.price ? formatPrice(row.price) : 'Market'}</DataCell>
            <DataCell>{formatMoney(row.orderValue)}</DataCell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TradesTable({ rows }) {
  return (
    <table className="min-w-full border-collapse text-[12px] sm:text-[13px]">
      <thead>
        <tr className="border-b border-white/8 text-left text-slate-400">
          <HeaderCell>Time</HeaderCell>
          <HeaderCell>Token</HeaderCell>
          <HeaderCell>Side</HeaderCell>
          <HeaderCell>Order Type</HeaderCell>
          <HeaderCell>Size</HeaderCell>
          <HeaderCell>Price</HeaderCell>
          <HeaderCell>Trade Value</HeaderCell>
          <HeaderCell>Fees</HeaderCell>
          <HeaderCell>Realized PnL</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-white/6 text-white/82 last:border-b-0">
            <DataCell className="text-white/70">{formatDateTime(row.time)}</DataCell>
            <DataCell>{row.market}</DataCell>
            <DataCell className={row.side.toLowerCase().includes('long') ? 'text-emerald-300' : 'text-rose-300'}>
              {row.side}
            </DataCell>
            <DataCell>{row.eventType}</DataCell>
            <DataCell>{formatQuantity(row.size)} {row.market}</DataCell>
            <DataCell>{formatPrice(row.price)}</DataCell>
            <DataCell>{formatMoney(row.tradeValue)}</DataCell>
            <DataCell className="text-white/70">{formatSignedMoney(-Math.abs(row.fee), true)}</DataCell>
            <DataCell className={row.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {formatSignedMoney(row.pnl, true)}
            </DataCell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrderHistoryTable({ rows }) {
  return (
    <table className="min-w-full border-collapse text-[12px] sm:text-[13px]">
      <thead>
        <tr className="border-b border-white/8 text-left text-slate-400">
          <HeaderCell>Time</HeaderCell>
          <HeaderCell>Token</HeaderCell>
          <HeaderCell>Side</HeaderCell>
          <HeaderCell>Order Type</HeaderCell>
          <HeaderCell>Original Size</HeaderCell>
          <HeaderCell>Filled Size</HeaderCell>
          <HeaderCell>Initial Price</HeaderCell>
          <HeaderCell>Trigger Condition</HeaderCell>
          <HeaderCell>Avg Filled Price</HeaderCell>
          <HeaderCell>Order Value</HeaderCell>
          <HeaderCell>Status</HeaderCell>
          <HeaderCell>Order ID</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-white/6 text-white/82 last:border-b-0">
            <DataCell className="text-white/70">{formatDateTime(row.time)}</DataCell>
            <DataCell>{row.market}</DataCell>
            <DataCell className={row.side === 'LONG' ? 'text-emerald-300' : 'text-rose-300'}>
              {titleCase(row.side)}
            </DataCell>
            <DataCell>{row.type}</DataCell>
            <DataCell>{formatQuantity(row.originalSize)} {row.market}</DataCell>
            <DataCell>{formatQuantity(row.filledSize)} {row.market}</DataCell>
            <DataCell>{row.initialPrice ? formatPrice(row.initialPrice) : 'N/A'}</DataCell>
            <DataCell>{row.triggerCondition}</DataCell>
            <DataCell>{row.averageFilledPrice ? formatPrice(row.averageFilledPrice) : 'N/A'}</DataCell>
            <DataCell>{formatMoney(row.orderValue)}</DataCell>
            <DataCell className={statusTone(row.status)}>{row.status}</DataCell>
            <DataCell className="font-mono text-white/70">{row.orderId}</DataCell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FundingTable({ rows }) {
  return (
    <table className="min-w-full border-collapse text-[12px] sm:text-[13px]">
      <thead>
        <tr className="border-b border-white/8 text-left text-slate-400">
          <HeaderCell>Time</HeaderCell>
          <HeaderCell>Token</HeaderCell>
          <HeaderCell>Side</HeaderCell>
          <HeaderCell>Position Size</HeaderCell>
          <HeaderCell>Payout</HeaderCell>
          <HeaderCell>Rate</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-white/6 text-white/82 last:border-b-0">
            <DataCell className="text-white/70">{formatDateTime(row.time)}</DataCell>
            <DataCell>{row.market}</DataCell>
            <DataCell className={row.side === 'LONG' ? 'text-emerald-300' : 'text-rose-300'}>
              {titleCase(row.side)}
            </DataCell>
            <DataCell>{formatQuantity(row.positionSize)} {row.market}</DataCell>
            <DataCell className={row.payout >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {formatSignedMoney(row.payout, true)}
            </DataCell>
            <DataCell>{formatRatePercent(row.rate)}</DataCell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BalanceHistoryTable({ rows }) {
  return (
    <table className="min-w-full border-collapse text-[12px] sm:text-[13px]">
      <thead>
        <tr className="border-b border-white/8 text-left text-slate-400">
          <HeaderCell>Time</HeaderCell>
          <HeaderCell>Type</HeaderCell>
          <HeaderCell>Amount</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-white/6 text-white/82 last:border-b-0">
            <DataCell className="text-white/70">{formatDateTime(row.time)}</DataCell>
            <DataCell>{row.event}</DataCell>
            <DataCell className={row.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {formatSignedMoney(row.amount, true)}
            </DataCell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PayoutsTable({ rows }) {
  return (
    <table className="min-w-full border-collapse text-[12px] sm:text-[13px]">
      <thead>
        <tr className="border-b border-white/8 text-left text-slate-400">
          <HeaderCell>Time</HeaderCell>
          <HeaderCell>Amount</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-white/6 text-white/82 last:border-b-0">
            <DataCell className="text-white/70">{formatDateTime(row.time)}</DataCell>
            <DataCell className="text-emerald-300">{formatSignedMoney(row.amount, true)}</DataCell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SideBadge({ side, leverage }) {
  const label = leverage ? `${trimValue(leverage)}x ${titleCase(side)}` : titleCase(side);
  return (
    <span
      className={`rounded-md px-2 py-1 text-[11px] font-medium ${
        side === 'LONG' ? 'bg-emerald-400/14 text-emerald-300' : 'bg-rose-400/14 text-rose-300'
      }`}
    >
      {label}
    </span>
  );
}

function LoadingTable() {
  return (
    <div className="animate-pulse space-y-3">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="h-10 rounded-lg bg-white/5" />
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-white/6 bg-white/[0.02] px-6 text-center text-[13px] text-white/28">
      {message}
    </div>
  );
}

function HeaderCell({ children }) {
  return <th className="px-2 py-3 font-normal sm:px-3">{children}</th>;
}

function DataCell({ children, className = '' }) {
  return <td className={`px-2 py-3 align-top sm:px-3 ${className}`}>{children}</td>;
}

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'open' || value === 'partially filled') return 'text-sky-300';
  if (value === 'filled') return 'text-emerald-300';
  if (value === 'cancelled' || value === 'rejected') return 'text-white/70';
  return 'text-white/70';
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatSignedMoney(value, showPlusForZero = false) {
  const safeValue = value ?? 0;
  const absolute = formatMoney(Math.abs(safeValue));
  if (safeValue === 0) return showPlusForZero ? '+$0' : '$0';
  return `${safeValue > 0 ? '+' : '-'}${absolute}`;
}

function formatSignedPercent(value) {
  const safeValue = value ?? 0;
  return `${safeValue > 0 ? '+' : ''}${safeValue.toFixed(2)}%`;
}

function formatQuantity(value) {
  return Number(value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
  });
}

function formatPrice(value) {
  if (!value) return 'N/A';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 4,
  });
}

function formatPricePair(first, second) {
  const firstValue = first ? formatPrice(first) : '-';
  const secondValue = second ? formatPrice(second) : '-';
  return `${firstValue} / ${secondValue}`;
}

function formatRatePercent(value) {
  const pct = (value ?? 0) * 100;
  return `${pct.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })}%`;
}

function trimValue(value) {
  return Number(value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDateTime(value) {
  const timeMs = value > 1e12 ? value : value * 1000;
  return new Date(timeMs).toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}
