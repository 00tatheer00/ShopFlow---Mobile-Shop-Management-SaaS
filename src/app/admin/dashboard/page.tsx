import type { Metadata } from 'next';
import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  Store,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import type { Shop } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Platform Overview',
};

export default async function AdminDashboardPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  // 1. Fetch platform metadata metrics
  const [
    { count: totalShops },
    { count: activeShops },
    { count: suspendedShops },
    { count: deactivatedShops },
  ] = await Promise.all([
    supabase.from('shops').select('id', { count: 'exact', head: true }),
    supabase.from('shops').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('shops').select('id', { count: 'exact', head: true }).eq('status', 'suspended'),
    supabase.from('shops').select('id', { count: 'exact', head: true }).eq('status', 'deactivated'),
  ]);

  // 2. Fetch recent shops (limit 5)
  const { data: rawRecentShops } = await supabase
    .from('shops')
    .select(`
      id, name, slug, display_shop_id, city, status, created_at,
      plans(name),
      shop_users(
        role,
        profiles(full_name, email)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  // 3. Fetch recent platform audit logs
  const { data: recentLogs } = await supabase
    .from('audit_logs')
    .select(`
      id, action, entity_type, entity_id, metadata, created_at,
      shops(name, display_shop_id)
    `)
    .order('created_at', { ascending: false })
    .limit(6);

  type OwnerInfo = { full_name: string; email: string } | null;

  interface RawRecentShop {
    id: string;
    name: string;
    slug: string;
    display_shop_id: string | null;
    city: string;
    status: 'active' | 'suspended' | 'deactivated';
    created_at: string;
    plans?: { name: string } | null;
    shop_users?: {
      role: string;
      profiles?: OwnerInfo;
    }[];
  }

  interface RecentShopItem extends Shop {
    plan_name?: string;
    owner?: OwnerInfo;
  }

  const recentShops: RecentShopItem[] = ((rawRecentShops || []) as unknown as RawRecentShop[]).map((s) => {
    const ownerMember = s.shop_users?.find((u) => u.role === 'shop_owner');
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      display_shop_id: s.display_shop_id || 'N/A',
      city: s.city,
      address: null,
      phone: null,
      email: null,
      logo_url: null,
      status: s.status,
      plan_id: null,
      plan_name: s.plans?.name || 'Standard',
      owner: ownerMember?.profiles || null,
      created_at: s.created_at,
      updated_at: s.created_at,
    };
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time multi-tenant operations, shop health, and provisioning status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/shops/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Shop</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shops */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Shops</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-foreground">{totalShops || 0}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">All provisioned tenant shops</p>
        </div>

        {/* Active Shops */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Active Shops</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-foreground text-emerald-600 dark:text-emerald-400">
              {activeShops || 0}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Operational with full access</p>
        </div>

        {/* Suspended Shops */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Suspended</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {suspendedShops || 0}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Temporarily blocked from access</p>
        </div>

        {/* Deactivated Shops */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Deactivated</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-foreground">{deactivatedShops || 0}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Archived accounts (data preserved)</p>
        </div>
      </div>

      {/* Two Column Layout: Recent Shops & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Shops (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-xs flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recent Shops</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Recently provisioned mobile shops</p>
            </div>
            <Link
              href="/admin/shops"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            {recentShops.length === 0 ? (
              <div className="p-8 text-center">
                <Store className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">No shops provisioned yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first shop tenant to get started.
                </p>
                <Link
                  href="/admin/shops/new"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Create Shop</span>
                </Link>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                    <th className="py-3 px-5">Shop ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentShops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-xs font-semibold text-foreground">
                        {shop.display_shop_id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {shop.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">{shop.owner?.full_name || 'Unassigned'}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                          {shop.owner?.email || ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {shop.city}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            shop.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : shop.status === 'suspended'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              shop.status === 'active'
                                ? 'bg-emerald-500'
                                : shop.status === 'suspended'
                                ? 'bg-amber-500'
                                : 'bg-muted-foreground'
                            }`}
                          />
                          {shop.status.charAt(0).toUpperCase() + shop.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          href={`/admin/shops/${shop.id}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                        >
                          <span>Manage</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Audit Activity Card (1 col) */}
        <div className="rounded-2xl border border-border bg-card shadow-xs flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
            </div>
            <Link
              href="/admin/settings"
              className="text-xs font-semibold text-primary hover:underline"
            >
              All logs
            </Link>
          </div>

          <div className="p-4 flex-1">
            {!recentLogs || recentLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No administrative activity logged yet.
              </div>
            ) : (
              <div className="space-y-3">
                {((recentLogs || []) as unknown as {
                  id: string;
                  action: string;
                  created_at: string;
                  metadata?: { reason?: string } | null;
                  shops?: { name: string; display_shop_id: string | null } | null;
                }[]).map((log) => {
                  const actionLabel = log.action.replace(/_/g, ' ').toUpperCase();
                  const targetShop = log.shops?.display_shop_id || log.shops?.name || 'Platform';
                  return (
                    <div
                      key={log.id}
                      className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs space-y-1 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{actionLabel}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <span className="font-mono text-[11px] text-foreground">{targetShop}</span>
                        {log.metadata?.reason && (
                          <span className="italic truncate max-w-[140px] text-[11px]">
                            — &ldquo;{log.metadata.reason}&rdquo;
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
