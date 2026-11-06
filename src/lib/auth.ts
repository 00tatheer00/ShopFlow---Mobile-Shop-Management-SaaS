import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import type { AuthUser, UserRole } from '@/lib/types';

/**
 * Get the currently authenticated user with their shop context.
 * Deduplicated per-request using React cache() to eliminate duplicate auth roundtrips.
 * Redirects to /login if not authenticated.
 */
export const getAuthUser = cache(async (): Promise<AuthUser> => {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // 1. Fetch user role and shop association directly
  let resolvedRole: UserRole = 'cashier';
  let resolvedShopId: string | null = null;
  let resolvedShop: AuthUser['shop'] = undefined;

  // Try standard authenticated client first
  const { data: suData, error: suError } = await supabase
    .from('shop_users')
    .select('role, shop_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (suData?.role) {
    resolvedRole = suData.role as UserRole;
    resolvedShopId = suData.shop_id || null;
  } else {
    // Resilient Fallback: If RLS or NULL shop_id blocked query, use privileged adminClient
    const adminClient = getAdminClient();
    if (adminClient) {
      const { data: adminSu } = await adminClient
        .from('shop_users')
        .select('role, shop_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminSu?.role) {
        resolvedRole = adminSu.role as UserRole;
        resolvedShopId = adminSu.shop_id || null;
      }
    }
  }

  // 2. If attached to a shop, fetch shop details
  if (resolvedShopId) {
    const adminClient = getAdminClient() || supabase;
    const { data: shopRecord } = await adminClient
      .from('shops')
      .select('id, name, slug, city, status')
      .eq('id', resolvedShopId)
      .maybeSingle();

    if (shopRecord) {
      resolvedShop = shopRecord as AuthUser['shop'];
    }
  }

  // 3. Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: profile?.email || user.email || '',
    full_name: profile?.full_name || user.email || '',
    role: resolvedRole,
    shop_id: resolvedShopId,
    shop: resolvedShop,
  };
});

/**
 * Require a specific role. Redirects to /unauthorized if role doesn't match.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized');
  }

  // Check if shop is active and not soft-deleted (for non-super-admin users)
  if (user.role !== 'super_admin') {
    const shopWithDeleted = user.shop as { status?: string; deleted_at?: string | null } | undefined;
    if (!shopWithDeleted || shopWithDeleted.deleted_at || shopWithDeleted.status !== 'active') {
      redirect('/shop-suspended');
    }
  }

  return user;
}

/**
 * Require super admin access.
 */
export async function requireSuperAdmin(): Promise<AuthUser> {
  return requireRole(['super_admin']);
}

/**
 * Require shop-level access (any shop role).
 * Automatically redirects super_admin to /admin instead of showing Access Denied.
 */
export async function requireShopAccess(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (user.role === 'super_admin') {
    redirect('/admin');
  }
  return requireRole(['shop_owner', 'manager', 'cashier']);
}

/**
 * Require shop owner access.
 * Automatically redirects super_admin to /admin instead of showing Access Denied.
 */
export async function requireShopOwner(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (user.role === 'super_admin') {
    redirect('/admin');
  }
  return requireRole(['shop_owner']);
}

export { hasPermission } from './permissions';
