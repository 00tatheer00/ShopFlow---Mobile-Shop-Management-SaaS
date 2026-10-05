'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Package,
  Truck,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  X,
} from 'lucide-react';
import type { Purchase, Supplier, UserRole } from '@/lib/types';
import { formatPKR } from '@/lib/types';
import { deletePurchase } from './actions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface PurchaseWithRelations extends Omit<Purchase, 'items'> {
  supplier?: Supplier;
  items?: {
    id: string;
    product_id?: string;
    purchase_id?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product?: { name: string; model: string | null } | null;
    imei_records?: { id: string; imei_number: string }[];
  }[];
}

interface PurchasesClientProps {
  purchases: PurchaseWithRelations[];
  suppliers: Supplier[];
  totalSpend: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  userRole: UserRole;
  search: string;
  selectedSupplier: string;
}

export function PurchasesClient({
  purchases,
  suppliers,
  totalSpend,
  totalCount,
  currentPage,
  totalPages,
  userRole,
  search: initialSearch,
  selectedSupplier,
}: PurchasesClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithRelations | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseWithRelations | null>(null);

  const canCreate = userRole === 'shop_owner' || userRole === 'manager';
  const canDelete = userRole === 'shop_owner';

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (selectedSupplier) params.set('supplier', selectedSupplier);
    params.set('page', '1');
    router.push(`/purchases?${params.toString()}`);
  }

  function handleFilterSupplier(suppId: string) {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (suppId) params.set('supplier', suppId);
    params.set('page', '1');
    router.push(`/purchases?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (selectedSupplier) params.set('supplier', selectedSupplier);
    params.set('page', String(newPage));
    router.push(`/purchases?${params.toString()}`);
  }

  async function executeDelete(purchase: PurchaseWithRelations) {
    startTransition(async () => {
      const res = await deletePurchase(purchase.id);
      if (res.error) {
        alert(res.error);
      } else {
        setPurchaseToDelete(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Purchase History</h1>
          <p className="text-sm text-muted-foreground">
            Track inventory shipments, wholesale procurement, and vendor cost history.
          </p>
        </div>

        {canCreate && (
          <Link
            href="/purchases/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
          >
            <Plus className="h-4 w-4" />
            New Purchase (Add Stock)
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Inventory Spend</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{formatPKR(totalSpend)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Total purchase procurement costs</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Purchase Orders</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{totalCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">Shipments logged from suppliers</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Suppliers</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{suppliers.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">Registered vendor distributors</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by notes or purchase date..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </form>

        <div className="flex gap-2">
          <select
            value={selectedSupplier}
            onChange={(e) => handleFilterSupplier(e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.company ? `(${s.company})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Purchases Table */}
      {purchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No purchases recorded</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || selectedSupplier
              ? 'Try clearing your search or supplier filter.'
              : 'Add your first supplier shipment to restock inventory.'}
          </p>
          {canCreate && !search && !selectedSupplier && (
            <Link
              href="/purchases/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Purchase
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Purchase Date</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Items Count</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Cost</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchases.map((purchase) => {
                  const itemCount = purchase.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;
                  return (
                    <tr key={purchase.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3.5 font-mono text-xs text-foreground whitespace-nowrap">
                        {purchase.purchase_date}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground">
                          {purchase.supplier?.name || 'Unknown Supplier'}
                        </div>
                        {purchase.supplier?.company && (
                          <div className="text-xs text-muted-foreground">
                            {purchase.supplier.company}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-foreground font-medium">
                        {itemCount} units
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground line-clamp-1">
                        {purchase.notes || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-foreground">
                        {formatPKR(purchase.total_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedPurchase(purchase)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="View Purchase Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setPurchaseToDelete(purchase)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors"
                              title="Delete Purchase"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 font-medium hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 font-medium hover:bg-muted disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Purchase Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Purchase Details</h2>
                <p className="text-xs text-muted-foreground">Date: {selectedPurchase.purchase_date}</p>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="font-bold text-foreground">
                  Supplier: {selectedPurchase.supplier?.name}
                </div>
                {selectedPurchase.supplier?.company && (
                  <div className="text-muted-foreground">{selectedPurchase.supplier.company}</div>
                )}
                {selectedPurchase.supplier?.phone && (
                  <div className="text-muted-foreground font-mono">{selectedPurchase.supplier.phone}</div>
                )}
              </div>

              {/* Items List */}
              <div className="border rounded-lg border-border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-2 font-semibold">Product</th>
                      <th className="p-2 text-center font-semibold">Qty</th>
                      <th className="p-2 text-right font-semibold">Unit Cost</th>
                      <th className="p-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedPurchase.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2 font-medium text-foreground">
                          {item.product?.name || 'Product'}
                          {item.product?.model && (
                            <span className="text-muted-foreground block text-[10px]">
                              Model: {item.product.model}
                            </span>
                          )}
                          {item.imei_records && item.imei_records.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.imei_records.map((im) => (
                                <span
                                  key={im.id}
                                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                                >
                                  {im.imei_number}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-right">{formatPKR(item.unit_price)}</td>
                        <td className="p-2 text-right font-semibold">{formatPKR(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between font-bold text-sm text-foreground pt-2 border-t border-border">
                <span>Total Purchase Amount:</span>
                <span className="text-primary">{formatPKR(selectedPurchase.total_amount)}</span>
              </div>

              {selectedPurchase.notes && (
                <div className="rounded-lg bg-muted/30 p-2 text-muted-foreground italic">
                  Notes: {selectedPurchase.notes}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Purchase Deletion */}
      <ConfirmationDialog
        open={!!purchaseToDelete}
        onClose={() => setPurchaseToDelete(null)}
        onConfirm={() => {
          if (purchaseToDelete) executeDelete(purchaseToDelete);
        }}
        title="Delete Purchase Invoice?"
        description={`Are you sure you want to delete this purchase from "${purchaseToDelete?.supplier?.name || 'vendor'}" dated ${purchaseToDelete?.purchase_date}? This will reverse and deduct all received inventory units and their IMEI serials from stock.`}
        confirmLabel="Delete Purchase"
        variant="danger"
        loading={isPending}
      />
    </div>
  );
}
