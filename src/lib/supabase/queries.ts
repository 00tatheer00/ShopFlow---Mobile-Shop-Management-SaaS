import type { createClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Supabase/PostgREST returns at most 1000 rows per request by default.
// Anything that sums money over "all rows" must page through results,
// otherwise totals silently stop growing once a shop passes 1000 rows.
const PAGE_SIZE = 1000;
const MAX_PAGES = 200; // hard safety stop (200k rows)

/**
 * Fetch every row of a query by paging with .range().
 * `build` must return a fresh query builder each time (builders are single-use).
 */
export async function fetchAllRows<T>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }> },
  options: { silent?: boolean } = {}
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (!options.silent) console.error('fetchAllRows error:', error);
      break;
    }
    const batch = (data as T[] | null) || [];
    if (batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * Make free-text safe for PostgREST `.or()` / `.ilike()` filters.
 * Commas, parentheses and dots are filter syntax; % and _ are wildcards.
 */
export function sanitizeSearch(raw: string | undefined | null, maxLength = 60): string {
  if (!raw) return '';
  return raw
    .replace(/[,()%_*\\."':]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Escape LIKE wildcards so a name is matched literally by .ilike(). */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export interface UdhaarBalanceRow {
  customer_id: string;
  balance_after: number;
  last_activity: string;
}

/**
 * Latest udhaar balance per customer for a shop.
 * Uses the `customer_udhaar_balances` view (migration 017) when available,
 * otherwise falls back to paging through the full ledger.
 */
export async function getLatestUdhaarBalances(
  supabase: ServerClient,
  shopId: string,
  customerIds?: string[]
): Promise<Map<string, UdhaarBalanceRow>> {
  const result = new Map<string, UdhaarBalanceRow>();
  if (customerIds && customerIds.length === 0) return result;

  // 1. Fast path: DB view (one row per customer)
  const viewRows = await fetchAllRows<UdhaarBalanceRow>(() => {
    let q = supabase
      .from('customer_udhaar_balances')
      .select('customer_id, balance_after, last_activity')
      .eq('shop_id', shopId)
      .order('customer_id', { ascending: true });
    if (customerIds) q = q.in('customer_id', customerIds);
    return q;
  }, { silent: true }); // view may not exist before migration 017

  if (viewRows && viewRows.length > 0) {
    for (const row of viewRows) result.set(row.customer_id, row);
    return result;
  }

  // 2. Fallback: scan ledger newest-first, keep first row per customer
  const ledger = await fetchAllRows<{ customer_id: string; balance_after: number; created_at: string }>(() => {
    let q = supabase
      .from('udhaar_ledger')
      .select('customer_id, balance_after, created_at')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (customerIds) q = q.in('customer_id', customerIds);
    return q;
  });

  for (const entry of ledger) {
    if (!result.has(entry.customer_id)) {
      result.set(entry.customer_id, {
        customer_id: entry.customer_id,
        balance_after: entry.balance_after,
        last_activity: entry.created_at,
      });
    }
  }
  return result;
}

/** Latest udhaar balance for a single customer (authoritative, newest row). */
export async function getCustomerBalance(
  supabase: ServerClient,
  shopId: string,
  customerId: string
): Promise<number> {
  const { data } = await supabase
    .from('udhaar_ledger')
    .select('balance_after')
    .eq('shop_id', shopId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.balance_after || 0;
}
