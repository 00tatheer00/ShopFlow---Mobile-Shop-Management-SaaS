'use server';

import { createClient } from '@/lib/supabase/server';
import { requireShopAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export interface AppNotification {
  id: string;
  shop_id: string;
  type: 'low_stock' | 'system';
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

const READ_COOKIE_NAME = 'shopflow_read_notifications';

async function getFallbackReadIds(): Promise<Set<string>> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(READ_COOKIE_NAME)?.value;
    if (!raw) return new Set();
    return new Set(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return new Set();
  }
}

async function markFallbackReadId(id: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    const set = await getFallbackReadIds();
    set.add(id);
    cookieStore.set(READ_COOKIE_NAME, encodeURIComponent(JSON.stringify(Array.from(set))), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: 'lax',
    });
  } catch {
    // Non-critical cookie failure
  }
}

async function markAllFallbackRead(ids: string[]): Promise<void> {
  try {
    const cookieStore = await cookies();
    const set = await getFallbackReadIds();
    ids.forEach((id) => set.add(id));
    cookieStore.set(READ_COOKIE_NAME, encodeURIComponent(JSON.stringify(Array.from(set))), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: 'lax',
    });
  } catch {
    // Non-critical cookie failure
  }
}

export async function getNotifications(): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> {
  const user = await requireShopAccess();
  if (!user.shop_id) {
    return { notifications: [], unreadCount: 0 };
  }

  const supabase = await createClient();

  // 1. Fetch products that are at or below their low stock threshold
  const { data: products } = await supabase
    .from('products')
    .select('id, name, model, stock_quantity, low_stock_threshold, is_active')
    .eq('shop_id', user.shop_id)
    .eq('is_active', true)
    .order('stock_quantity', { ascending: true });

  const lowStockProducts = (products || []).filter(
    (p) => p.stock_quantity <= (p.low_stock_threshold ?? 5)
  );

  // 2. Try to sync with database notifications table
  let dbNotifications: AppNotification[] = [];
  let tableAvailable = true;

  try {
    const { data: existingRows, error: fetchErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('shop_id', user.shop_id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (fetchErr) {
      tableAvailable = false;
    } else {
      dbNotifications = (existingRows || []) as AppNotification[];

      // Create new low-stock notification entries in the database if not already existing
      for (const prod of lowStockProducts) {
        const alreadyNotified = dbNotifications.some(
          (n) => n.entity_type === 'product' && n.entity_id === prod.id && !n.is_read
        );

        if (!alreadyNotified) {
          const isOut = prod.stock_quantity === 0;
          const newNotif = {
            shop_id: user.shop_id,
            user_id: user.id,
            type: 'low_stock',
            title: `${prod.name}${prod.model ? ` (${prod.model})` : ''}`,
            message: isOut
              ? `Out of stock! 0 units remaining (Threshold: ${prod.low_stock_threshold})`
              : `Low stock alert: only ${prod.stock_quantity} unit(s) remaining (Threshold: ${prod.low_stock_threshold})`,
            entity_type: 'product',
            entity_id: prod.id,
            is_read: false,
            metadata: {
              stock_quantity: prod.stock_quantity,
              low_stock_threshold: prod.low_stock_threshold,
            },
          };

          const { data: inserted } = await supabase
            .from('notifications')
            .insert(newNotif)
            .select('*')
            .single();

          if (inserted) {
            dbNotifications.unshift(inserted as AppNotification);
          }
        }
      }
    }
  } catch {
    tableAvailable = false;
  }

  // 3. If table is available, return sorted DB notifications
  if (tableAvailable && dbNotifications.length > 0) {
    const unreadCount = dbNotifications.filter((n) => !n.is_read).length;
    return { notifications: dbNotifications, unreadCount };
  }

  // 4. Fallback: Synthesize live low stock notifications directly from products table
  const fallbackReadIds = await getFallbackReadIds();
  const synthesized: AppNotification[] = lowStockProducts.map((prod) => {
    const notifId = `notif_low_${prod.id}`;
    const isOut = prod.stock_quantity === 0;
    const isRead = fallbackReadIds.has(notifId);

    return {
      id: notifId,
      shop_id: user.shop_id!,
      type: 'low_stock',
      title: `${prod.name}${prod.model ? ` (${prod.model})` : ''}`,
      message: isOut
        ? `Out of stock! 0 units remaining (Threshold: ${prod.low_stock_threshold})`
        : `Low stock alert: only ${prod.stock_quantity} unit(s) remaining (Threshold: ${prod.low_stock_threshold})`,
      entity_type: 'product',
      entity_id: prod.id,
      is_read: isRead,
      metadata: {
        stock_quantity: prod.stock_quantity,
        low_stock_threshold: prod.low_stock_threshold,
      },
      created_at: new Date().toISOString(),
    };
  });

  const unreadCount = synthesized.filter((n) => !n.is_read).length;
  return { notifications: synthesized, unreadCount };
}

export async function markNotificationAsRead(id: string) {
  const user = await requireShopAccess();
  if (!user.shop_id) return { success: false };

  // Always mark fallback
  await markFallbackReadId(id);

  // If DB table available, update it
  try {
    const supabase = await createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('shop_id', user.shop_id);
  } catch {
    // Fallback handled
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function markAllNotificationsAsRead(ids?: string[]) {
  const user = await requireShopAccess();
  if (!user.shop_id) return { success: false };

  if (ids && ids.length > 0) {
    await markAllFallbackRead(ids);
  }

  try {
    const supabase = await createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('shop_id', user.shop_id)
      .eq('is_read', false);
  } catch {
    // Fallback handled
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

