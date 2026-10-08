'use client';

import { useState, useTransition, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Package,
  Sliders,
  Search,
  X,
  Archive,
  RefreshCw,
  CheckCircle2,
  Download,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { exportToCSV } from '@/lib/export-csv';
import {
  deleteProduct,
  toggleProductStatus,
  adjustStock,
  searchImei,
  type ImeiSearchResult,
} from './actions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { CurrencyDisplay } from '@/components/ui/currency-display';

interface ProductRow {
  id: string;
  name: string;
  model: string | null;
  is_imei_tracked: boolean;
  sale_price: number;
  purchase_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  category_name: string | null;
  brand_name: string | null;
}

interface ProductsTableProps {
  products: ProductRow[];
  userRole: UserRole;
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}

export function ProductsTable({
  products,
  userRole,
  currentPage,
  totalPages,
  searchParams,
}: ProductsTableProps) {
  const router = useRouter();
  const [productToDelete, setProductToDelete] = useState<ProductRow | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductRow | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, prodId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (openMenuId === prodId) {
      setOpenMenuId(null);
      setMenuCoords(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = 175;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < menuHeight + 12 && rect.top > menuHeight;

    let left = rect.right - menuWidth;
    if (left < 12) left = 12;
    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - 12 - menuWidth;
    }

    setMenuCoords({
      top: placeAbove ? rect.top - 4 : rect.bottom + 4,
      left,
      placeAbove,
    });
    setOpenMenuId(prodId);
  };

  useEffect(() => {
    if (!openMenuId) return;
    const handleClose = () => {
      setOpenMenuId(null);
      setMenuCoords(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  const activeMenuProduct = products.find((p) => p.id === openMenuId);

  // IMEI Lookup Modal State
  const [isImeiModalOpen, setIsImeiModalOpen] = useState(false);
  const [imeiSearchQuery, setImeiSearchQuery] = useState('');
  const [imeiResults, setImeiResults] = useState<ImeiSearchResult[] | null>(null);
  const [isImeiSearching, setIsImeiSearching] = useState(false);

  const canEdit = userRole === 'shop_owner' || userRole === 'manager';
  const canDelete = userRole === 'shop_owner';

  async function executeDelete(id: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        if (result.message) {
          setSuccessMessage(result.message);
        }
        setProductToDelete(null);
        router.refresh();
      }
    });
  }

  async function handleToggleStatus(id: string, newStatus: boolean) {
    setOpenMenuId(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await toggleProductStatus(id, newStatus);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        setSuccessMessage(newStatus ? 'Product reactivated.' : 'Product archived and deactivated.');
        router.refresh();
      }
    });
  }

  async function handleAdjustStockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustingProduct) return;
    if (adjustQty === 0) {
      alert('Adjustment cannot be 0.');
      return;
    }
    if (!adjustReason.trim()) {
      alert('Please provide a reason for the adjustment.');
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await adjustStock({
        product_id: adjustingProduct.id,
        adjustment: adjustQty,
        reason: adjustReason.trim(),
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage(`Stock for "${adjustingProduct.name}" updated to ${res.newStock}.`);
        setAdjustingProduct(null);
        setAdjustQty(0);
        setAdjustReason('');
        router.refresh();
      }
    });
  }

  async function handleImeiSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!imeiSearchQuery.trim()) return;

    setIsImeiSearching(true);
    setErrorMessage(null);
    try {
      const res = await searchImei(imeiSearchQuery.trim());
      if (res.error) {
        setErrorMessage(res.error);
        setImeiResults([]);
      } else {
        setImeiResults(res.results || []);
      }
    } finally {
      setIsImeiSearching(false);
    }
  }

  function buildPageUrl(page: number) {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.category) params.set('category', searchParams.category);
    if (searchParams.brand) params.set('brand', searchParams.brand);
    if (searchParams.status) params.set('status', searchParams.status);
    params.set('page', String(page));
    return `/products?${params.toString()}`;
  }

  const handleExportCSV = () => {
    const headers = [
      'Product Name',
      'Model',
      'Category',
      'Brand',
      'Sale Price (PKR)',
      'Cost Price (PKR)',
      'Stock Quantity',
      'Low Stock Threshold',
      'IMEI Tracked',
      'Status',
    ];
    const rows = products.map((p) => [
      p.name,
      p.model || '',
      p.category_name || '',
      p.brand_name || '',
      Math.round(p.sale_price / 100),
      Math.round(p.purchase_price / 100),
      p.stock_quantity,
      p.low_stock_threshold,
      p.is_imei_tracked ? 'YES' : 'NO',
      p.is_active ? 'ACTIVE' : 'INACTIVE',
    ]);
    exportToCSV('products_catalog', headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Feedback Messages */}
      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </span>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Action Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card rounded-xl border border-border p-3">
        <span className="text-xs text-muted-foreground font-medium">
          Showing {products.length} products on this page
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors hover:border-emerald-500/40"
          >
            <Download className="h-3.5 w-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setIsImeiModalOpen(true);
              setImeiResults(null);
              setImeiSearchQuery('');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            Search IMEI / Serial
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Brand</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Sale Price</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Cost</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Stock</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                {(canEdit || canDelete) && (
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground w-16">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => {
                const isOutOfStock = product.stock_quantity <= 0;
                const isLowStock =
                  product.stock_quantity > 0 &&
                  product.stock_quantity <= product.low_stock_threshold;

                return (
                  <tr
                    key={product.id}
                    className={`transition-colors hover:bg-muted/30 ${
                      !product.is_active ? 'opacity-60 bg-muted/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                            product.is_imei_tracked
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {product.is_imei_tracked ? (
                            <Smartphone className="h-4 w-4" />
                          ) : (
                            <Package className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[200px]">
                            {product.name}
                          </p>
                          {product.model && (
                            <p className="text-xs text-muted-foreground truncate">
                              {product.model}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">
                      {product.category_name || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">
                      {product.brand_name || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-foreground">
                      <CurrencyDisplay amount={product.sale_price} isPaisas={true} size="xs" />
                    </td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground hidden lg:table-cell">
                      <CurrencyDisplay amount={product.purchase_price} isPaisas={true} size="xs" variant="muted" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {product.is_imei_tracked ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                              isOutOfStock
                                ? 'bg-destructive/10 text-destructive'
                                : isLowStock
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            <Smartphone className="h-3 w-3" />
                            {product.stock_quantity} in stock
                          </span>
                        ) : (
                          <>
                            {isLowStock && (
                              <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                            )}
                            <span
                              className={`font-semibold ${
                                isOutOfStock
                                  ? 'text-destructive'
                                  : isLowStock
                                  ? 'text-warning'
                                  : 'text-foreground'
                              }`}
                            >
                              {product.stock_quantity}
                              {isOutOfStock && ' (0)'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          product.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => handleToggleMenu(e, product.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          title="Actions"
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Portal Action Menu (Completely immune to table overflow/clipping) */}
      {mounted && openMenuId && menuCoords && activeMenuProduct && createPortal(
        <div className="fixed inset-0 z-[99999] pointer-events-none">
          <div
            className="fixed inset-0 pointer-events-auto bg-transparent"
            onClick={() => {
              setOpenMenuId(null);
              setMenuCoords(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: `${menuCoords.left}px`,
              ...(menuCoords.placeAbove
                ? { bottom: `${window.innerHeight - menuCoords.top}px` }
                : { top: `${menuCoords.top}px` }),
              width: '180px',
            }}
            className="pointer-events-auto z-[99999] rounded-xl border border-border bg-popover/98 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 ring-1 ring-border/60"
          >
            {canEdit && (
              <Link
                href={`/products/${activeMenuProduct.id}/edit`}
                onClick={() => {
                  setOpenMenuId(null);
                  setMenuCoords(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                Edit Details
              </Link>
            )}

            {canEdit && !activeMenuProduct.is_imei_tracked && (
              <button
                type="button"
                onClick={() => {
                  const prod = activeMenuProduct;
                  setOpenMenuId(null);
                  setMenuCoords(null);
                  setAdjustingProduct(prod);
                  setAdjustQty(0);
                  setAdjustReason('');
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
                Adjust Stock
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  const prod = activeMenuProduct;
                  setOpenMenuId(null);
                  setMenuCoords(null);
                  handleToggleStatus(prod.id, !prod.is_active);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                {activeMenuProduct.is_active ? (
                  <>
                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                    Archive Product
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 text-primary" />
                    Reactivate Product
                  </>
                )}
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  const prod = activeMenuProduct;
                  setOpenMenuId(null);
                  setMenuCoords(null);
                  setProductToDelete(prod);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={buildPageUrl(currentPage - 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            ) : (
              <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </span>
            )}
            {currentPage < totalPages ? (
              <Link
                href={buildPageUrl(currentPage + 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                Next
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Dialog */}
      <ConfirmationDialog
        open={Boolean(productToDelete)}
        title={`Delete or Archive "${productToDelete?.name}"?`}
        description={
          productToDelete?.stock_quantity && productToDelete.stock_quantity > 0
            ? `This product currently has ${productToDelete.stock_quantity} units in stock. It will be safely deactivated and archived to preserve transaction and inventory history.`
            : `Are you sure you want to delete this product? If it has historical transactions, it will be deactivated and archived instead of permanently deleted.`
        }
        confirmLabel={productToDelete?.stock_quantity && productToDelete.stock_quantity > 0 ? "Archive Product" : "Delete Product"}
        variant="danger"
        loading={isPending}
        onConfirm={() => productToDelete && executeDelete(productToDelete.id)}
        onClose={() => setProductToDelete(null)}
      />

      {/* Stock Adjustment Dialog (Section 13) */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-base text-foreground">Adjust Stock Quantity</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audited inventory adjustment for {adjustingProduct.name}
                </p>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="mt-4 space-y-4 text-xs">
              <div className="rounded-lg bg-muted/40 p-3 flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Current Stock in DB:</span>
                <span className="font-bold text-sm text-foreground">
                  {adjustingProduct.stock_quantity} units
                </span>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">
                  Stock Change (e.g. +5 to add stock, -2 to reduce) *
                </label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  placeholder="e.g. +5 or -2"
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  New stock after adjustment will be:{' '}
                  <strong>{adjustingProduct.stock_quantity + adjustQty}</strong>
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical stock count discrepancy, damaged item, etc."
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="rounded-lg border border-border px-4 py-2 hover:bg-muted font-medium text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || adjustQty === 0}
                  className="rounded-lg bg-primary px-5 py-2 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMEI Search & Lifecycle Modal (Section 10) */}
      {isImeiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">IMEI & Serial Lifecycle Tracker</h3>
                  <p className="text-xs text-muted-foreground">
                    Search device IMEI history across purchase orders and customer sales
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImeiModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <form onSubmit={handleImeiSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={imeiSearchQuery}
                    onChange={(e) => setImeiSearchQuery(e.target.value)}
                    placeholder="Enter 15-digit IMEI or partial serial..."
                    className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isImeiSearching || !imeiSearchQuery.trim()}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isImeiSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {/* Results View */}
              {imeiResults !== null && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    {imeiResults.length} Result{imeiResults.length !== 1 ? 's' : ''} Found
                  </span>

                  {imeiResults.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                      No matching IMEI records found in this shop.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {imeiResults.map((r) => (
                        <div
                          key={r.id}
                          className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-bold text-foreground">
                              {r.imei_number}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                r.status === 'in_stock'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : r.status === 'sold'
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {r.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground pt-1">
                            <div>
                              <p className="font-medium text-foreground">{r.product.name}</p>
                              {r.product.model && <p>{r.product.model}</p>}
                            </div>
                            <div className="space-y-1 sm:text-right">
                              {r.purchase && (
                                <p>
                                  <strong>Inwarded:</strong> {r.purchase.purchase_date}
                                  {r.purchase.supplier_name && ` (${r.purchase.supplier_name})`}
                                </p>
                              )}
                              {r.sale && (
                                <p className="text-indigo-600 dark:text-indigo-400 font-medium">
                                  <strong>Sold:</strong> {r.sale.invoice_number}
                                  {r.sale.customer_name && ` to ${r.sale.customer_name}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <button
                onClick={() => setIsImeiModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
