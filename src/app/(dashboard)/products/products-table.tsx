'use client';

import { toast } from 'sonner';
import { useState, useTransition, useEffect } from 'react';
import { useIsClient } from '@/lib/hooks';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Sliders,
  Search,
  X,
  Archive,
  RefreshCw,
  CheckCircle2,
  Download,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { formatPKR } from '@/lib/types';
import { Badge } from '@/components/ui/kit';
import { productVisual } from '@/components/ui/product-visual';
import { exportToCSV } from '@/lib/export-csv';
import {
  deleteProduct,
  toggleProductStatus,
  adjustStock,
  searchImei,
  type ImeiSearchResult,
} from './actions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

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
  initialAdjustProduct?: ProductRow | null;
}

export function ProductsTable({
  products,
  userRole,
  currentPage,
  totalPages,
  searchParams,
  initialAdjustProduct,
}: ProductsTableProps) {
  const router = useRouter();
  const [productToDelete, setProductToDelete] = useState<ProductRow | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductRow | null>(null);
  const [adjustQty, setAdjustQty] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);
  const mounted = useIsClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  // Open the adjust-stock modal when arriving from a notification link.
  // (State is adjusted during render when the URL target changes — no effect needed.)
  const adjustTargetId = initialAdjustProduct?.id || searchParams.adjustStock || '';
  const [handledAdjustId, setHandledAdjustId] = useState('');
  if (adjustTargetId !== handledAdjustId) {
    setHandledAdjustId(adjustTargetId);
    const target = initialAdjustProduct || products.find((p) => p.id === adjustTargetId) || null;
    if (target) {
      setAdjustingProduct(target);
      setAdjustQty('');
      setAdjustReason('');
    }
  }

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
    const numericQty = adjustQty === '' ? 0 : Number(adjustQty);
    if (numericQty === 0) {
      toast.error('Adjustment cannot be 0.');
      return;
    }
    if (!adjustReason.trim()) {
      toast.error('Please provide a reason for the adjustment.');
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await adjustStock({
        product_id: adjustingProduct.id,
        adjustment: numericQty,
        reason: adjustReason.trim(),
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage(`Stock for "${adjustingProduct.name}" updated to ${res.newStock}.`);
        setAdjustingProduct(null);
        setAdjustQty('');
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
      {/* Feedback */}
      {errorMessage && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="rounded p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div role="status" className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </span>
          <button onClick={() => setSuccessMessage(null)} className="rounded p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="panel overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{products.length}</strong> item{products.length === 1 ? '' : 's'} on this page
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsImeiModalOpen(true);
                setImeiResults(null);
                setImeiSearchQuery('');
              }}
              className="btn btn-sm btn-outline"
            >
              <Search className="h-4 w-4" /> Find IMEI
            </button>
            <button type="button" onClick={handleExportCSV} className="btn btn-sm btn-outline">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Phone: cards */}
        <ul className="divide-y divide-border md:hidden">
          {products.map((product) => (
            <li key={product.id} className={`flex items-start gap-3 p-4 ${!product.is_active ? 'opacity-60' : ''}`}>
              <ProductIcon imei={product.is_imei_tracked} category={product.category_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{product.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[product.model, product.category_name, product.brand_name].filter(Boolean).join(' · ') || '—'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-bold tabular-nums text-foreground">{formatPKR(product.sale_price)}</span>
                  <StockPill product={product} />
                  {!product.is_active && <Badge tone="slate">Archived</Badge>}
                </div>
              </div>
              {(canEdit || canDelete) && (
                <button type="button" onClick={(e) => handleToggleMenu(e, product.id)} className="icon-btn -mr-2" aria-label={`Actions for ${product.name}`}>
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="sf-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="hidden lg:table-cell">Category · Brand</th>
                <th className="text-right">Sale price</th>
                {canEdit && <th className="hidden text-right xl:table-cell">Cost</th>}
                <th>Stock</th>
                <th className="hidden lg:table-cell">Status</th>
                {(canEdit || canDelete) && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className={!product.is_active ? 'opacity-60' : ''}>
                  <td>
                    <div className="flex items-center gap-3">
                      <ProductIcon imei={product.is_imei_tracked} category={product.category_name} />
                      <div className="min-w-0">
                        <p className="max-w-[260px] truncate font-semibold text-foreground">{product.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {product.model || (product.is_imei_tracked ? 'Mobile phone (IMEI)' : 'Item')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden text-muted-foreground lg:table-cell">
                    {[product.category_name, product.brand_name].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="text-right font-mono font-bold tabular-nums text-foreground">{formatPKR(product.sale_price)}</td>
                  {canEdit && (
                    <td className="hidden text-right font-mono tabular-nums text-muted-foreground xl:table-cell">{formatPKR(product.purchase_price)}</td>
                  )}
                  <td>
                    <StockPill product={product} />
                  </td>
                  <td className="hidden lg:table-cell">
                    <Badge tone={product.is_active ? 'emerald' : 'slate'} dot>
                      {product.is_active ? 'Active' : 'Archived'}
                    </Badge>
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && !product.is_imei_tracked && product.is_active && (
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingProduct(product);
                              setAdjustQty('');
                              setAdjustReason('');
                            }}
                            className="btn btn-sm btn-ghost"
                            title="Add or remove stock"
                          >
                            <Sliders className="h-4 w-4" /> Adjust
                          </button>
                        )}
                        {canEdit && (
                          <Link href={`/products/${product.id}/edit`} className="icon-btn" aria-label={`Edit ${product.name}`} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                        <button type="button" onClick={(e) => handleToggleMenu(e, product.id)} className="icon-btn" aria-label="More actions" title="More">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Page <strong className="text-foreground">{currentPage}</strong> of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link href={buildPageUrl(currentPage - 1)} className="btn btn-sm btn-outline">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Link>
              ) : (
                <span className="btn btn-sm btn-outline pointer-events-none opacity-50">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </span>
              )}
              {currentPage < totalPages ? (
                <Link href={buildPageUrl(currentPage + 1)} className="btn btn-sm btn-outline">
                  Next <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="btn btn-sm btn-outline pointer-events-none opacity-50">
                  Next <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        )}
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
              width: '200px',
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
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
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
                  setAdjustQty('');
                  setAdjustReason('');
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
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
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
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
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>,
        document.body
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
        <div className="sheet-backdrop">
          <div className="sheet sm:max-w-md p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setAdjustQty(val === '' ? '' : Number(val));
                  }}
                  placeholder="0"
                  className="field"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  New stock after adjustment will be:{' '}
                  <strong>{adjustingProduct.stock_quantity + (adjustQty === '' ? 0 : Number(adjustQty))}</strong>
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
                  className="field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="rounded-lg border border-border px-4 py-2 hover:bg-muted font-medium text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || adjustQty === '' || Number(adjustQty) === 0}
                  className="rounded-lg bg-primary px-5 py-2 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-xs"
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
        <div className="sheet-backdrop">
          <div className="sheet sm:max-w-2xl flex flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
                    className="field pr-4 pl-10 font-mono"
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
                                  ? 'bg-primary text-primary dark:bg-primary/60 dark:text-primary'
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
                                <p className="text-primary dark:text-primary font-medium">
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

// ---------------- helpers ----------------

function ProductIcon({ imei, category }: { imei: boolean; category?: string | null }) {
  const visual = productVisual(imei, category || undefined);
  const Icon = visual.icon;
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${visual.chip}`} aria-hidden="true">
      <Icon className="h-5 w-5" />
    </span>
  );
}

/** Stock shown as words + colour: Out of stock / Low / In stock. */
function StockPill({ product }: { product: { stock_quantity: number; low_stock_threshold: number; is_imei_tracked: boolean } }) {
  const qty = product.stock_quantity;
  const unit = product.is_imei_tracked ? (qty === 1 ? 'phone' : 'phones') : 'in stock';
  if (qty <= 0) return <Badge tone="rose" dot>Out of stock</Badge>;
  if (qty <= product.low_stock_threshold) return <Badge tone="amber" dot>Low · {qty} {unit === 'in stock' ? 'left' : unit}</Badge>;
  return <Badge tone="emerald" dot>{qty} {unit}</Badge>;
}
