import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { AuthUser, UserRole } from '@/lib/types';

/**
 * Get the currently authenticated user with their shop context.
 * Redirects to /login if not authenticated.
 */
export async function getAuthUser(): Promise<AuthUser> {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Get user profile and shop assignment
  const { data: shopUser } = await supabase
    .from('shop_users')
    .select(`
      role,
      shop_id,
      shops:shop_id (
        id,
        name,
        slug,
        city,
        status
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: profile?.email || user.email || '',
    full_name: profile?.full_name || user.email || '',
    role: (shopUser?.role as UserRole) || 'cashier',
    shop_id: shopUser?.shop_id || null,
    shop: shopUser?.shops as AuthUser['shop'],
  };
}

/**
 * Require a specific role. Redirects to /unauthorized if role doesn't match.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized');
  }

  // Check if shop is active (for non-super-admin users)
  if (user.role !== 'super_admin' && user.shop?.status !== 'active') {
    redirect('/shop-suspended');
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
 */
export async function requireShopAccess(): Promise<AuthUser> {
  return requireRole(['shop_owner', 'manager', 'cashier']);
}

/**
 * Require shop owner access.
 */
export async function requireShopOwner(): Promise<AuthUser> {
  return requireRole(['shop_owner']);
}

export { hasPermission } from './permissions';
