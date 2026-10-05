import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PreferencesForm } from './preferences-form';

export const metadata: Metadata = { title: 'Preferences' };

export default async function PreferencesPage() {
  const user = await requireRole(['shop_owner', 'manager']);
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from('shop_settings')
    .select('*')
    .eq('shop_id', user.shop_id!)
    .maybeSingle();

  return <PreferencesForm settings={settings} />;
}
