import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ShopProfileForm } from './shop-profile-form';

export const metadata: Metadata = { title: 'Shop Settings' };

export default async function SettingsPage() {
  const user = await requireRole(['shop_owner', 'manager']);
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('id', user.shop_id!)
    .single();

  return <ShopProfileForm shop={shop!} />;
}
