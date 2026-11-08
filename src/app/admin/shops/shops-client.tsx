'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  PlusCircle,
  Store,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Download,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Loader2,
  Clock,
  Phone,
  Lock,
  Unlock,
  X,
} from 'lucide-react';
import type { Shop } from '@/lib/types';
import { exportToCSV } from '@/lib/export-csv';
import {
  updateShopStatusAction,
  softDeleteShopAction,
  restoreShopAction,
  permanentDeleteShopAction,
} from '@/app/admin/actions';
import { toast } from 'sonner';

export interface ShopListItem extends Shop {
  plan_name?: string;
  subscription_due_date?: string | null;
  owner?: {
    full_name: string;
    email: string;
    phone?: string | null;
  } | null;
}

interface ShopsClientProps {
  shops: ShopListItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  initialSearch: string;
  currentStatus: string;
  tabCounts: {
    all: number;
    active: number;
    suspended: number;
    deactivated: number;
    trash: number;
  };
}

export function ShopsClient({
  shops,
  totalCount,
  currentPage,
  totalPages,
  initialSearch,
  currentStatus,
  tabCounts,
}: ShopsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Soft delete modal state
  const [trashModalShop, setTrashModalShop] = useState<ShopListItem | null>(null);

  // Permanent delete modal state
  const [permDeleteModalShop, setPermDeleteModalShop] = useState<ShopListItem | null>(null);
  const [permConfirmName, setPermConfirmName] = useState('');

  // Status change modal state
  const [statusModal, setStatusModal] = useState<{
    shop: ShopListItem;
    targetStatus: 'active' | 'suspended' | 'deactivated';
  } | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set('search', search.trim());
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/admin/shops?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearch('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.set('page', '1');
    router.push(`/admin/shops?${params.toString()}`);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`/admin/shops?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/admin/shops?${params.toString()}`);
  };

  const statusTabs = [
    { label: 'All Shops', value: 'all', count: tabCounts.all },
    { label: 'Active', value: 'active', count: tabCounts.active },
    { label: 'Suspended', value: 'suspended', count: tabCounts.suspended },
    { label: 'Deactivated', value: 'deactivated', count: tabCounts.deactivated },
    { label: 'Trash (30d)', value: 'trash', count: tabCounts.trash, isTrash: true },
  ];

  // Quick Status Change Action
  async function handleStatusChangeConfirm() {
    if (!statusModal) return;
    setLoadingActionId(statusModal.shop.id);
    const { shop, targetStatus } = statusModal;
    setStatusModal(null);

    const res = await updateShopStatusAction({
      shop_id: shop.id,
      status: targetStatus,
    });

    setLoadingActionId(null);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Shop "${shop.name}" status updated to ${targetStatus.toUpperCase()}`);
      router.refresh();
    }
  }

  // Soft Delete Action (Move to Trash)
  async function handleConfirmSoftDelete() {
    if (!trashModalShop) return;
    const shop = trashModalShop;
    setLoadingActionId(shop.id);
    setTrashModalShop(null);

    const res = await softDeleteShopAction({ shop_id: shop.id });
    setLoadingActionId(null);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Shop "${shop.name}" moved to Trash (30-day retention).`);
      router.refresh();
    }
  }

  // Restore Action
  async function handleRestore(shop: ShopListItem) {
    setLoadingActionId(shop.id);
    const res = await restoreShopAction({ shop_id: shop.id });
    setLoadingActionId(null);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Shop "${shop.name}" restored successfully.`);
      router.refresh();
    }
  }

  // Permanent Delete Action
  async function handleConfirmPermanentDelete() {
    if (!permDeleteModalShop) return;
    const shop = permDeleteModalShop;

    if (permConfirmName.trim().toLowerCase() !== shop.name.trim().toLowerCase()) {
      toast.error(`Confirmation name does not match "${shop.name}".`);
      return;
    }

    setLoadingActionId(shop.id);
    setPermDeleteModalShop(null);
    setPermConfirmName('');

    const res = await permanentDeleteShopAction({
      shop_id: shop.id,
      confirm_name: shop.name,
    });
    setLoadingActionId(null);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Shop "${shop.name}" permanently deleted.`);
      router.refresh();
    }
  }

  const handleExportCSV = () => {
    const headers = [
      'Display ID',
      'Shop Name',
      'City',
      'Phone',
      'Email',
      'Owner Name',
      'Owner Email',
      'Shop Status',
      'Subscription Due Date',
      'Created At',
      'Deleted At',
    ];
    const rows = shops.map((s) => [
      s.display_shop_id || s.id.substring(0, 8),
      s.name,
      s.city || '',
      s.phone || s.owner?.phone || '',
      s.email || '',
      s.owner?.full_name || '',
      s.owner?.email || '',
      s.deleted_at ? 'TRASHED' : s.status.toUpperCase(),
      s.subscription_due_date ? new Date(s.subscription_due_date).toLocaleDateString('en-PK') : 'N/A',
      new Date(s.created_at).toLocaleDateString('en-PK'),
      s.deleted_at ? new Date(s.deleted_at).toLocaleDateString('en-PK') : '',
    ]);
    exportToCSV('platform_shops', headers, rows);
  };

  const isTrashView = currentStatus === 'trash';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isTrashView ? 'Trash (30-Day Retention)' : 'Shop Management'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isTrashView
              ? 'Shops in trash are blocked from tenant login and automatically purged after 30 days.'
              : `View, search, filter, and manage all registered mobile shop tenants (${totalCount} in this view).`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted hover:border-emerald-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/admin/shops/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Shop</span>
          </Link>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3.5">
        {/* Search Box (Above) */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID, name, city, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-9 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            Search
          </button>
        </form>

        {/* Status Tabs with count badges (Below) */}
        <div className="flex items-center gap-1.5 flex-wrap w-full p-1 bg-muted/40 rounded-xl">
          {statusTabs.map((tab) => {
            const currentActive =
              (!currentStatus && tab.value === 'all') ||
              currentStatus === tab.value ||
              (currentStatus === '' && tab.value === 'all');

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleStatusFilter(tab.value)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  currentActive
                    ? tab.isTrash
                      ? 'bg-destructive/15 text-destructive border border-destructive/30 shadow-xs'
                      : 'bg-card text-foreground border border-border shadow-xs'
                    : tab.isTrash
                    ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                {tab.isTrash && <Trash2 className="h-3.5 w-3.5" />}
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-mono font-bold ${
                    currentActive
                      ? tab.isTrash
                        ? 'bg-destructive text-destructive-foreground'
                        : 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Shops Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {shops.length === 0 ? (
          <div className="py-16 text-center">
            {isTrashView ? (
              <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            ) : (
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            )}
            {initialSearch || (currentStatus && currentStatus !== 'all') ? (
              <div>
                <p className="text-base font-semibold text-foreground">
                  {isTrashView ? 'Trash is empty' : 'No shops found'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isTrashView
                    ? 'No shops currently in trash.'
                    : 'Try adjusting your search keywords or filter criteria.'}
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/admin/shops')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div>
                <p className="text-base font-semibold text-foreground">No shops provisioned yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first mobile shop tenant to get started.
                </p>
                <Link
                  href="/admin/shops/new"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Create Shop</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                  <th className="py-3.5 px-6">Shop ID & Name</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">{isTrashView ? 'Deleted Date' : 'Status'}</th>
                  <th className="py-3.5 px-4">{isTrashView ? 'Days Remaining' : 'Subscription Due'}</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Row Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shops.map((shop) => {
                  const displayPhone = shop.phone || shop.owner?.phone || 'N/A';
                  const isOperating = loadingActionId === shop.id;

                  // Trash calculations
                  let daysRemaining = 30;
                  let isNearPurge = false;
                  if (shop.deleted_at) {
                    const delTime = new Date(shop.deleted_at).getTime();
                    const daysElapsed = Math.floor((Date.now() - delTime) / (1000 * 60 * 60 * 24));
                    daysRemaining = Math.max(0, 30 - daysElapsed);
                    isNearPurge = daysRemaining <= 7;
                  }

                  return (
                    <tr
                      key={shop.id}
                      className={`hover:bg-muted/40 transition-colors ${
                        shop.deleted_at ? 'bg-destructive/5 opacity-90' : ''
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="py-4 px-6">
                        <div className="font-mono text-xs font-bold text-foreground">
                          {shop.display_shop_id || 'N/A'}
                        </div>
                        <div className="font-semibold text-foreground text-sm">{shop.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[160px]">
                          {shop.city} &bull; {shop.slug}
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-4 px-4 text-xs">
                        <div className="font-medium text-foreground">
                          {shop.owner?.full_name || 'Unassigned'}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[170px]">
                          {shop.owner?.email || 'No email'}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4 text-xs">
                        <div className="inline-flex items-center gap-1.5 font-mono text-foreground">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{displayPhone}</span>
                        </div>
                      </td>

                      {/* Status OR Deleted Date */}
                      <td className="py-4 px-4">
                        {isTrashView && shop.deleted_at ? (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-semibold text-destructive block">Trashed</span>
                            <span>{new Date(shop.deleted_at).toLocaleDateString('en-PK')}</span>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              shop.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : shop.status === 'suspended'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-destructive/10 text-destructive border border-destructive/20'
                            }`}
                          >
                            {shop.status === 'active' ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : shop.status === 'suspended' ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            <span>{shop.status.charAt(0).toUpperCase() + shop.status.slice(1)}</span>
                          </span>
                        )}
                      </td>

                      {/* Subscription Due OR Days Remaining */}
                      <td className="py-4 px-4 text-xs">
                        {isTrashView ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
                              isNearPurge
                                ? 'bg-destructive/20 text-destructive border border-destructive/30 animate-pulse'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            <span>{daysRemaining} days left</span>
                          </span>
                        ) : (
                          <div className="font-mono text-xs">
                            {shop.subscription_due_date ? (
                              <span className="text-foreground">
                                {new Date(shop.subscription_due_date).toLocaleDateString('en-PK')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{new Date(shop.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td className="py-4 px-6 text-right">
                        {isTrashView ? (
                          <div className="inline-flex items-center gap-2">
                            {/* Restore Button */}
                            <button
                              type="button"
                              disabled={isOperating}
                              onClick={() => handleRestore(shop)}
                              className="inline-flex items-center gap-1 rounded-xl bg-card border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            >
                              {isOperating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3 text-emerald-500" />
                              )}
                              <span>Restore</span>
                            </button>

                            {/* Delete Permanently Button */}
                            <button
                              type="button"
                              disabled={isOperating}
                              onClick={() => {
                                setPermDeleteModalShop(shop);
                                setPermConfirmName('');
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Purge</span>
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            {/* Manage Link */}
                            <Link
                              href={`/admin/shops/${shop.id}`}
                              className="inline-flex items-center gap-1 rounded-xl bg-card border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="View and Edit Shop Details"
                            >
                              <span>Manage</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>

                            {/* Quick Status Toggles */}
                            {shop.status === 'active' ? (
                              <button
                                type="button"
                                disabled={isOperating}
                                onClick={() =>
                                  setStatusModal({ shop, targetStatus: 'suspended' })
                                }
                                className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 border border-amber-500/20 px-2 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                title="Suspend Shop Access"
                              >
                                <Lock className="h-3 w-3" />
                                <span className="hidden sm:inline">Suspend</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isOperating}
                                onClick={() =>
                                  setStatusModal({ shop, targetStatus: 'active' })
                                }
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                title="Reactivate Shop Access"
                              >
                                <Unlock className="h-3 w-3" />
                                <span className="hidden sm:inline">Activate</span>
                              </button>
                            )}

                            {shop.status !== 'deactivated' && (
                              <button
                                type="button"
                                disabled={isOperating}
                                onClick={() =>
                                  setStatusModal({ shop, targetStatus: 'deactivated' })
                                }
                                className="inline-flex items-center gap-1 rounded-xl bg-muted border border-border px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                title="Deactivate Shop Account"
                              >
                                <XCircle className="h-3 w-3" />
                                <span className="hidden sm:inline">Deactivate</span>
                              </button>
                            )}

                            {/* Move to Trash Button */}
                            <button
                              type="button"
                              disabled={isOperating}
                              onClick={() => setTrashModalShop(shop)}
                              className="inline-flex items-center justify-center rounded-xl p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                              title="Move Shop to Trash (Soft Delete)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalCount} shops)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="rounded-lg border border-border px-3 py-1 text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="rounded-lg border border-border px-3 py-1 text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog: Move to Trash (Soft Delete) */}
      {trashModalShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Move Shop to Trash?</h3>
                <p className="text-xs text-muted-foreground">30-day retention before permanent deletion</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to move <strong>{trashModalShop.name}</strong> ({trashModalShop.display_shop_id}) to Trash?
              The shop and all its users will immediately be blocked from logging in. It can be restored anytime within 30 days.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setTrashModalShop(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSoftDelete}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Permanent Delete */}
      {permDeleteModalShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/20 text-destructive">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-destructive">Permanently Delete Shop?</h3>
                <p className="text-xs text-muted-foreground">Irreversible database hard-delete</p>
              </div>
            </div>

            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive leading-relaxed">
              This action <strong>CANNOT</strong> be undone. All handsets, IMEI records, customer udhaar ledgers, POS sales, expenses, and tenant auth credentials will be permanently destroyed.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Type <span className="font-mono font-bold text-destructive">{permDeleteModalShop.name}</span> to confirm:
              </label>
              <input
                type="text"
                value={permConfirmName}
                onChange={(e) => setPermConfirmName(e.target.value)}
                placeholder={permDeleteModalShop.name}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-destructive/30"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setPermDeleteModalShop(null);
                  setPermConfirmName('');
                }}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={permConfirmName.trim().toLowerCase() !== permDeleteModalShop.name.trim().toLowerCase()}
                onClick={handleConfirmPermanentDelete}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Status Change */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  statusModal.targetStatus === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : statusModal.targetStatus === 'suspended'
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {statusModal.targetStatus === 'active' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : statusModal.targetStatus === 'suspended' ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {statusModal.targetStatus === 'active'
                    ? 'Reactivate Shop'
                    : statusModal.targetStatus === 'suspended'
                    ? 'Suspend Shop'
                    : 'Deactivate Shop'}
                </h3>
                <p className="text-xs text-muted-foreground">{statusModal.shop.name}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {statusModal.targetStatus === 'active' &&
                `Are you sure you want to reactivate ${statusModal.shop.name}? The shopkeeper and staff will immediately regain access to their terminal and reports.`}
              {statusModal.targetStatus === 'suspended' &&
                `Are you sure you want to suspend ${statusModal.shop.name}? Tenant users will be redirected to the /shop-suspended page.`}
              {statusModal.targetStatus === 'deactivated' &&
                `Are you sure you want to deactivate ${statusModal.shop.name}? Tenant users will be blocked from logging in.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setStatusModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusChangeConfirm}
                className={`rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer ${
                  statusModal.targetStatus === 'active'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : statusModal.targetStatus === 'suspended'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-destructive hover:bg-destructive/90'
                }`}
              >
                Confirm {statusModal.targetStatus.charAt(0).toUpperCase() + statusModal.targetStatus.slice(1)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
