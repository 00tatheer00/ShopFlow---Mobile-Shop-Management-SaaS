import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { attachProfiles } from '@/lib/supabase/queries';
import { UsersClient } from './users-client';

export const metadata: Metadata = { title: 'Staff & Roles' };

export default async function UsersSettingsPage() {
  const user = await requireRole(['shop_owner']);
  const supabase = await createClient();

  const { data: staffMembers } = await supabase
    .from('shop_users')
    .select(`
      id, shop_id, user_id, role, is_active, created_at, updated_at
    `)
    .eq('shop_id', user.shop_id!)
    .order('created_at', { ascending: true });

  type StaffRow = {
    id: string;
    shop_id: string;
    user_id: string;
    role: 'shop_owner' | 'manager' | 'cashier';
    is_active: boolean;
    created_at: string;
    updated_at: string;
    profiles?: { full_name?: string | null; email?: string | null; phone?: string | null } | null;
  };

  // shop_users -> profiles has no FK, so profiles are loaded separately
  const withProfiles = await attachProfiles(getAdminClient() ?? supabase, (staffMembers || []) as { user_id: string }[]);
  const mapped = (withProfiles as unknown as StaffRow[]).map((m) => ({
    id: m.id,
    shop_id: m.shop_id,
    user_id: m.user_id,
    role: m.role,
    is_active: m.is_active,
    created_at: m.created_at,
    updated_at: m.updated_at,
    profile: m.profiles
      ? {
          id: m.user_id,
          email: m.profiles.email || '',
          full_name: m.profiles.full_name || 'Staff Member',
          phone: m.profiles.phone || null,
          avatar_url: null,
          created_at: m.created_at,
          updated_at: m.updated_at,
        }
      : undefined,
  }));

  return <UsersClient staffMembers={mapped} currentUserId={user.id} />;
}
