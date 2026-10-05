import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ShopsClient, type ShopListItem } from './shops-client';

export const metadata: Metadata = {
  title: 'All Shops',
};

export default async function AdminShopsPage(props: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  const search = searchParams.search || '';
  const status = searchParams.status || '';
  const page = Number(searchParams.page) || 1;
  const perPage = 15;

  let query = supabase
    .from('shops')
    .select(
      `
      id, name, slug, display_shop_id, city, address, phone, email, logo_url,
      status, plan_id, subscription_status, subscription_started_at,
      subscription_expires_at, created_at, updated_at,
      plans(name),
      shop_users(
        role,
        profiles(full_name, email, phone)
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,city.ilike.%${search}%,display_shop_id.ilike.%${search}%`
    );
  }

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: rawShops, count } = await query;

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
    created_at: string;
    updated_at: string;
    plans?: { name: string } | null;
    shop_users?: {
      role: string;
      profiles?: OwnerProfile;
    }[];
  }

  const shops: ShopListItem[] = ((rawShops || []) as unknown as RawShopRow[]).map((s) => {
    const ownerMember = s.shop_users?.find((u) => u.role === 'shop_owner');
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
      initialStatus={status}
    />
  );
}
