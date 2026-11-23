import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import type { AuthUser, UserRole } from '@/lib/types';

/**
 * Get the currently authenticated user with their shop context.
 * Deduplicated per request with React cache().
 *
 * Speed: the login token is verified with getClaims() (local JWT check with the
 * project's signing keys; it only calls the Auth server for legacy keys), and
 * role + shop + profile are fetched in ONE parallel round trip instead of 3-4
 * sequential ones. Redirects to /login if not authenticated.
 */
export const getAuthUser = cache(async (): Promise<AuthUser> => {
  const supabase = await createClient();

  const { data: claimsData, error } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (error || !claims?.sub) {
    redirect('/login');
  }

  const userId = claims.sub as string;
  const claimEmail = typeof claims.email === 'string' ? claims.email : '';

  // Server-side read keyed by the VERIFIED user id. The service client avoids
  // RLS edge cases (super admins have no shop) and joins the shop in one query.
  const db = getAdminClient() ?? supabase;

  const [{ data: membership }, { data: profile }] = await Promise.all([
    db
      .from('shop_users')
      .select('role, shop_id, shops:shop_id (id, name, slug, city, status, deleted_at)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    db.from('profiles').select('full_name, email').eq('id', userId).maybeSingle(),
  ]);

  const rawShop = (Array.isArray(membership?.shops) ? membership?.shops[0] : membership?.shops) as
    | { id: string; name: string; slug: string; city: string; status: string; deleted_at?: string | null }
    | null
    | undefined;

  let shop: AuthUser['shop'] = undefined;
  if (rawShop) {
    const { deleted_at, ...shopFields } = rawShop;
    // A shop in the Trash behaves like a deactivated shop (no access)
    shop = { ...shopFields, status: deleted_at ? 'deactivated' : shopFields.status } as AuthUser['shop'];
  }

  return {
    id: userId,
    email: profile?.email || claimEmail,
    full_name: profile?.full_name || claimEmail,
    role: ((membership?.role as UserRole) || 'cashier'),
    shop_id: membership?.shop_id || null,
    shop,
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
