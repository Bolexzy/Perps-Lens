/**
 * Pacifica API client aligned with the public API docs.
 * Base: https://api.pacifica.fi/api/v1
 * Dev proxy: /proxy/pacifica -> strips prefix, forwards to base
 */

const BUILDER_CODE = import.meta.env.VITE_BUILDER_CODE || 'pacificalens';

function buildUrl(path, params = {}) {
  const base = import.meta.env.DEV ? '/proxy/pacifica' : 'https://api.pacifica.fi/api/v1';
  const sp = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value));
    }
  }

  sp.set('builder_code', BUILDER_CODE);
  return `${base}${path}?${sp.toString()}`;
}

async function apiFetch(path, params = {}) {
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (res.status === 404) return { data: [] };
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Pacifica API ${path}: ${res.status} - ${text}`);
  }

  return res.json();
}

function toArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.result)) return raw.result;
  if (Array.isArray(raw.records)) return raw.records;
  return [];
}

function toObject(raw) {
  if (!raw) return null;
  if (raw.data && !Array.isArray(raw.data)) return raw.data;
  if (!Array.isArray(raw)) return raw;
  return null;
}

async function fetchAllPages(path, params = {}, maxPages = 5) {
  let cursor;
  const rows = [];

  for (let page = 0; page < maxPages; page += 1) {
    const raw = await apiFetch(path, { ...params, cursor });
    rows.push(...toArray(raw));

    if (!raw?.has_more || !raw?.next_cursor) break;
    cursor = raw.next_cursor;
  }

  return rows;
}

function mapRange(range = '30D') {
  if (range === 'ALL') return 'all';
  return String(range).toLowerCase();
}

function getRangeStart(range = '30D') {
  const now = Date.now();
  const map = {
    '1D': 1 * 86400 * 1000,
    '7D': 7 * 86400 * 1000,
    '30D': 30 * 86400 * 1000,
  };

  const delta = map[range];
  return delta ? now - delta : undefined;
}

export async function fetchAccountInfo(account) {
  const raw = await apiFetch('/account', { account });
  return toObject(raw);
}

export async function fetchFundingHistory(account) {
  return fetchAllPages('/funding/history', { account, limit: 100 }, 25);
}

export async function fetchTradeHistory(account, range = 'ALL') {
  return fetchAllPages(
    '/trades/history',
    {
      account,
      start_time: getRangeStart(range),
      end_time: Date.now(),
      limit: 100,
    },
    100
  );
}

export async function fetchPositions(account) {
  const raw = await apiFetch('/positions', { account });
  return toArray(raw);
}

export async function fetchEquityHistory(account, range = '30D') {
  const raw = await apiFetch('/portfolio', {
    account,
    time_range: mapRange(range),
    limit: 200,
  });
  return toArray(raw);
}

export async function fetchPortfolioVolume(account) {
  const raw = await apiFetch('/portfolio/volume', { account });
  return toObject(raw);
}

export async function fetchOpenOrders(account) {
  const raw = await apiFetch('/orders', { account });
  return toArray(raw);
}

export async function fetchBalanceHistory(account) {
  return fetchAllPages('/account/balance/history', { account, limit: 100 }, 25);
}

export async function fetchOrderHistory(account) {
  return fetchAllPages('/orders/history', { account, limit: 100 }, 25);
}
