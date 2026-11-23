import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getLatestUdhaarBalances } from '@/lib/supabase/queries';
import type { Customer } from '@/lib/types';
import { UdhaarClient } from './udhaar-client';

export const metadata: Metadata = { title: 'Udhaar (Khata)' };

export default async function UdhaarPage() {
  const user = await requireShopAccess();
  const supabase = await createClient();

  // Parallelize all 4 database queries concurrently in a single round-trip
  const [
    { data: shop },
    { data: customers },
    { data: ledgerEntries },
    balances,
  ] = await Promise.all([
    supabase
      .from('shops')
      .select('name')
      .eq('id', user.shop_id!)
      .maybeSingle(),
    supabase
      .from('customers')
      .select('*')
      .eq('shop_id', user.shop_id!)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('udhaar_ledger')
      .select(`
        id, shop_id, customer_id, sale_id, payment_id, type, amount, balance_after, description, created_at,
        customers(id, name, phone)
      `)
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })
      .limit(100),
    // Latest balance per customer (not capped at 1000 ledger rows)
    getLatestUdhaarBalances(supabase, user.shop_id!),
  ]);

  // Filter customers who have an outstanding balance > 0
  const customersWithBalance = (customers || [])
    .map((c) => ({
      ...c,
      udhaar_balance: balances.get(c.id)?.balance_after || 0,
      last_activity: balances.get(c.id)?.last_activity,
    }))
    .filter((c) => c.udhaar_balance > 0)
    .sort((a, b) => b.udhaar_balance - a.udhaar_balance);

  const totalUdhaar = customersWithBalance.reduce((sum, c) => sum + c.udhaar_balance, 0);

  const recentLedger = (ledgerEntries || []).map((entry) => ({
    id: entry.id,
    shop_id: entry.shop_id,
    customer_id: entry.customer_id,
    sale_id: entry.sale_id,
    payment_id: entry.payment_id,
    type: entry.type,
    amount: entry.amount,
    balance_after: entry.balance_after,
    description: entry.description,
    created_at: entry.created_at,
    customer: (entry.customers as unknown as Customer) || undefined,
  }));

  return (
    <UdhaarClient
      customersWithBalance={customersWithBalance}
      recentLedger={recentLedger}
      totalUdhaar={totalUdhaar}
      debtorsCount={customersWithBalance.length}
      allCustomers={customers || []}
      userRole={user.role}
      shopName={shop?.name || 'Mobile Shop'}
    />
  );
}
