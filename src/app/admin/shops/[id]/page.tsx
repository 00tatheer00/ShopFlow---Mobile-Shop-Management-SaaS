import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ShopDetailsClient } from './shop-details-client';
import type { Shop, Plan } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Shop Details',
};

export default async function AdminShopDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await props.params;
  const supabase = await createClient();

  // 1. Fetch Shop details
  const { data: shop } = await supabase
    .from('shops')
    .select(`
      id, name, slug, display_shop_id, city, address, phone, email, logo_url,
      status, plan_id, subscription_status, subscription_started_at,
      subscription_expires_at, created_at, updated_at
    `)
    .eq('id', id)
    .single();

  if (!shop) {
    notFound();
  }

  // 2. Fetch Owner
  const { data: ownerUser } = await supabase
    .from('shop_users')
    .select(`
      id, user_id, role, is_active,
      profiles(full_name, email, phone)
    `)
    .eq('shop_id', id)
    .eq('role', 'shop_owner')
    .maybeSingle();

  // 3. Fetch Plans
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, description, max_users, max_products, price, status, created_at')
    .eq('status', 'active')
    .order('price', { ascending: true });

  // 4. Fetch Audit Logs for this shop
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('id, action, metadata, created_at')
    .eq('shop_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const ownerProfile = (ownerUser?.profiles as unknown as {
    full_name: string;
    email: string;
    phone?: string | null;
  }) || null;

  const owner = ownerUser
    ? {
        id: ownerUser.id,
        user_id: ownerUser.user_id,
        full_name: ownerProfile?.full_name || 'Owner',
        email: ownerProfile?.email || '',
        phone: ownerProfile?.phone || null,
        is_active: ownerUser.is_active,
      }
    : null;

  return (
    <ShopDetailsClient
      shop={shop as Shop}
      owner={owner}
      plans={(plans as Plan[]) || []}
      auditLogs={auditLogs || []}
    />
  );
}
