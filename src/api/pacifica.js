/**
 * Pacifica API client
 * Base: https://api.pacifica.fi/api/v1
 * Dev proxy: /proxy/pacifica → strips prefix, forwards to base
 */

const BUILDER_CODE = import.meta.env.VITE_BUILDER_CODE || 'pacificalens';

function buildUrl(path, params = {}) {
  const base = import.meta.env.DEV ? '/proxy/pacifica' : 'https://api.pacifica.fi/api/v1';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) sp.set(k, String(v));
  }
  sp.set('builder_code', BUILDER_CODE);
  return `${base}${path}?${sp.toString()}`;
}

async function apiFetch(path, params = {}) {
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  // 404 means no data for this account — treat as empty, not an error
  if (res.status === 404) return { data: [] };
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Pacifica API ${path}: ${res.status} — ${text}`);
  }
  return res.json();
}

// Normalize: handles both { data: [...] } and plain arrays
function toArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.result)) return raw.result;
  if (Array.isArray(raw.records)) return raw.records;
  return [];
}

export async function fetchFundingHistory(account) {
  const raw = await apiFetch('/funding/history', { account, limit: 500 });
  return toArray(raw);
}

export async function fetchTradeHistory(account) {
  const raw = await apiFetch('/trades/history', { account, limit: 500 });
  return toArray(raw);
}

export async function fetchPositions(account) {
  const raw = await apiFetch('/positions', { account });
  return toArray(raw);
}

export async function fetchEquityHistory(account) {
  const raw = await apiFetch('/account/equity_history', { account });
  return toArray(raw);
}
