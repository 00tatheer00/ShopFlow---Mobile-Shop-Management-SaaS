import { requireSuperAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { SubscriptionsClient } from './subscriptions-client';
import type { Metadata } from 'next';
import type { ShopSubscription, Shop, EmailLog } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Monthly Subscriptions & Billing (Rs. 8,000) | Super Admin',
};

export default async function SubscriptionsPage() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const adminClient = getAdminClient();
  const db = adminClient || supabase;

  // 1. Fetch all subscriptions with shop details (strictly excluding legacy October 2026)
  const { data: subscriptions } = await db
    .from('shop_subscriptions')
    .select(`
      *,
      shop:shops (
        id,
        name,
        display_shop_id,
        city,
        phone,
        email,
        status,
        subscription_status,
        subscription_expires_at
      )
    `)
    .neq('billing_month', '2026-10')
    .order('created_at', { ascending: false });

  // 2. Fetch all shops for complete status tracking
  const { data: shops } = await db
    .from('shops')
    .select('*')
    .order('created_at', { ascending: false });

  // 3. Fetch recent email logs
  const { data: emailLogs } = await db
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <SubscriptionsClient
      initialSubscriptions={(subscriptions || []) as unknown as ShopSubscription[]}
      allShops={(shops || []) as unknown as Shop[]}
      initialEmailLogs={(emailLogs || []) as unknown as EmailLog[]}
    />
  );
}
