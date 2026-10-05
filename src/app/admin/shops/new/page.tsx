import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NewShopForm } from './new-shop-form';
import type { Plan } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Provision New Shop',
};

export default async function NewShopPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  // 1. Fetch available plans
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, description, max_users, max_products, price, status, created_at')
    .eq('status', 'active')
    .order('price', { ascending: true });

  // 2. Fetch max sequence for suggested display_shop_id
  const { data: shops } = await supabase
    .from('shops')
    .select('display_shop_id')
    .not('display_shop_id', 'is', null);

  let maxNum = 0;
  if (shops && shops.length > 0) {
    for (const s of shops) {
      if (s.display_shop_id && s.display_shop_id.startsWith('SHOP-')) {
        const numPart = parseInt(s.display_shop_id.replace('SHOP-', ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  }

  const suggestedDisplayId = `SHOP-${String(maxNum + 1).padStart(3, '0')}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Provision New Shop</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create a new tenant mobile shop, set subscription plan, and configure the owner account.
        </p>
      </div>

      <NewShopForm
        plans={(plans as Plan[]) || []}
        suggestedDisplayId={suggestedDisplayId}
      />
    </div>
  );
}
