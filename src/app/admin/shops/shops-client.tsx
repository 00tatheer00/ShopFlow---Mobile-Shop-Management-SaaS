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
} from 'lucide-react';
import type { Shop } from '@/lib/types';
import { exportToCSV } from '@/lib/export-csv';

export interface ShopListItem extends Shop {
  plan_name?: string;
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
  initialStatus: string;
}

export function ShopsClient({
  shops,
  totalCount,
  currentPage,
  totalPages,
  initialSearch,
  initialStatus,
}: ShopsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

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
    { label: 'All Shops', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Deactivated', value: 'deactivated' },
  ];

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
      'Subscription Status',
      'Created At',
    ];
    const rows = shops.map((s) => [
      s.display_shop_id || s.id.substring(0, 8),
      s.name,
      s.city || '',
      s.phone || '',
      s.email || '',
      s.owner?.full_name || '',
      s.owner?.email || '',
      s.status.toUpperCase(),
      (s.subscription_status || 'active').toUpperCase(),
      new Date(s.created_at).toLocaleDateString('en-PK'),
    ]);
    exportToCSV('platform_shops', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Shop Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View, search, filter, and manage all registered mobile shop tenants ({totalCount} total).
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted hover:border-emerald-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="h-4 w-4 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/admin/shops/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Shop</span>
          </Link>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto p-1 bg-muted/40 rounded-xl">
            {statusTabs.map((tab) => {
              const currentActive =
                (!initialStatus && tab.value === 'all') || initialStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => handleStatusFilter(tab.value)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                    currentActive
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by ID, name, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Shops Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {shops.length === 0 ? (
          <div className="py-16 text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            {initialSearch || initialStatus ? (
              <div>
                <p className="text-base font-semibold text-foreground">No shops found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search keywords or filter criteria.
                </p>
                <button
                  onClick={() => router.push('/admin/shops')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
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
                  <th className="py-3.5 px-6">Shop ID</th>
                  <th className="py-3.5 px-4">Shop Name</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Plan</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-foreground">
                      {shop.display_shop_id || 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-foreground">{shop.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[160px]">
                        {shop.slug}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      <div className="font-medium text-foreground">{shop.owner?.full_name || 'Unassigned'}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                        {shop.owner?.email || ''}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-muted-foreground">
                      {shop.city}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground border border-border/80">
                        {shop.plan_name || 'Standard'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
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
                    </td>
                    <td className="py-4 px-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{new Date(shop.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/admin/shops/${shop.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-card border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        <span>Manage</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
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
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="rounded-lg border border-border px-3 py-1 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="rounded-lg border border-border px-3 py-1 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
