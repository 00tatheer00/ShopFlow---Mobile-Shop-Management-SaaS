import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub;

  if (!user) {
    redirect('/login');
  }

  const { data: shopUser } = await supabase
    .from('shop_users')
    .select('role')
    .eq('user_id', user)
    .eq('is_active', true)
    .maybeSingle();

  if (shopUser?.role === 'super_admin') {
    redirect('/admin');
  }

  redirect('/dashboard');
}
