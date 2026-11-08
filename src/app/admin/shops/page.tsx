import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { ShopsClient, type ShopListItem } from './shops-client';
import { lazyPurgeExpiredShopsAction } from '@/app/admin/actions';

export const metadata: Metadata = {
  title: 'All Shops | Super Admin',
};

export default async function AdminShopsPage(props: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const adminClient = getAdminClient();
  const db = adminClient || supabase;
  const searchParams = await props.searchParams;

  const search = searchParams.search || '';
  const status = searchParams.status || 'all';
  const page = Number(searchParams.page) || 1;
  const perPage = 15;

  // If viewing trash, trigger lazy cleanup of expired shops (> 30 days)
  if (status === 'trash') {
    await lazyPurgeExpiredShopsAction();
  }

  // Fetch count badges for each tab in parallel
  const [
    { count: allCount },
    { count: activeCount },
    { count: suspendedCount },
    { count: deactivatedCount },
    { count: trashCount },
  ] = await Promise.all([
    db.from('shops').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('shops').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'active'),
    db.from('shops').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'suspended'),
    db.from('shops').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'deactivated'),
    db.from('shops').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null),
  ]);

  let query = db
    .from('shops')
    .select(
      `
      id, name, slug, display_shop_id, city, address, phone, email, logo_url,
      status, plan_id, subscription_status, subscription_started_at,
      subscription_expires_at, deleted_at, deleted_by, created_at, updated_at,
      plans(name),
      shop_users(
        role,
        profiles(full_name, email, phone)
      ),
      shop_subscriptions(
        due_date,
        status,
        billing_month
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  // Filter based on tab: Trashed shops appear exclusively in the trash tab
  if (status === 'trash') {
    query = query.not('deleted_at', 'is', null);
  } else if (status === 'active' || status === 'suspended' || status === 'deactivated') {
    query = query.is('deleted_at', null).eq('status', status);
  } else {
    // 'all' tab: all non-trashed shops
    query = query.is('deleted_at', null);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,city.ilike.%${search}%,display_shop_id.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: rawShops, count, error: queryError } = await query;
  if (queryError) {
    console.error('Admin shops query error:', queryError);
  }

  type OwnerProfile = { full_name: string; email: string; phone?: string | null } | null;

  interface RawShopRow {
    id: string;
    name: string;
    slug: string;
    display_shop_id: string | null;
    city: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    status: 'active' | 'suspended' | 'deactivated';
    plan_id: string | null;
    subscription_status?: 'trialing' | 'active' | 'past_due' | 'cancelled' | null;
    subscription_started_at?: string | null;
    subscription_expires_at?: string | null;
    deleted_at?: string | null;
    deleted_by?: string | null;
    created_at: string;
    updated_at: string;
    plans?: { name: string } | null;
    shop_users?: {
      role: string;
      profiles?: OwnerProfile;
    }[];
    shop_subscriptions?: {
      due_date: string;
      status: string;
      billing_month: string;
    }[];
  }

  const shops: ShopListItem[] = ((rawShops || []) as unknown as RawShopRow[]).map((s) => {
    const ownerMember = s.shop_users?.find((u) => u.role === 'shop_owner');
    const latestSub = s.shop_subscriptions && s.shop_subscriptions.length > 0 ? s.shop_subscriptions[0] : null;
    const dueDate = latestSub?.due_date || s.subscription_expires_at || null;

    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      display_shop_id: s.display_shop_id || 'N/A',
      city: s.city,
      address: s.address,
      phone: s.phone,
      email: s.email,
      logo_url: s.logo_url,
      status: s.status,
      plan_id: s.plan_id,
      plan_name: s.plans?.name || 'Standard',
      subscription_status: s.subscription_status,
      subscription_started_at: s.subscription_started_at,
      subscription_expires_at: s.subscription_expires_at,
      subscription_due_date: dueDate,
      deleted_at: s.deleted_at || null,
      deleted_by: s.deleted_by || null,
      owner: ownerMember?.profiles || null,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  });

  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <ShopsClient
      shops={shops}
      totalCount={count || 0}
      currentPage={page}
      totalPages={totalPages}
      initialSearch={search}
      currentStatus={status}
      tabCounts={{
        all: allCount || 0,
        active: activeCount || 0,
        suspended: suspendedCount || 0,
        deactivated: deactivatedCount || 0,
        trash: trashCount || 0,
      }}
    />
  );
}
