'use client';

import { useState, useTransition } from 'react';
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
} from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { deleteProduct } from './actions';
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
  const [isPending, startTransition] = useTransition();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canEdit = userRole === 'shop_owner' || userRole === 'manager';
  const canDelete = userRole === 'shop_owner';

  async function executeDelete(id: string) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        setProductToDelete(null);
        router.refresh();
      }
    });
  }

  function buildPageUrl(page: number) {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.category) params.set('category', searchParams.category);
    if (searchParams.brand) params.set('brand', searchParams.brand);
    params.set('page', String(page));
    return `/products?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          {errorMessage}
        </div>
      )}
      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
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
                {(canEdit || canDelete) && (
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground w-16">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => {
                const isLowStock =
                  !product.is_imei_tracked &&
                  product.stock_quantity <= product.low_stock_threshold;
                
                return (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          product.is_imei_tracked
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}>
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
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            IMEI
                          </span>
                        ) : (
                          <>
                            {isLowStock && (
                              <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                            )}
                            <span className={`font-medium ${
                              isLowStock ? 'text-warning' : 'text-foreground'
                            }`}>
                              {product.stock_quantity}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenMenuId(openMenuId === product.id ? null : product.id)
                            }
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {openMenuId === product.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-100">
                                {canEdit && (
                                  <Link
                                    href={`/products/${product.id}/edit`}
                                    onClick={() => setOpenMenuId(null)}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                  </Link>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setProductToDelete(product);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Confirmation Dialog for Product Deletion */}
      <ConfirmationDialog
        open={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={() => {
          if (productToDelete) executeDelete(productToDelete.id);
        }}
        title="Delete Product?"
        description={`Are you sure you want to deactivate and remove "${productToDelete?.name}"? You can reactivate this item later in inventory settings.`}
        confirmLabel="Delete Product"
        variant="danger"
        loading={isPending}
      />
    </div>
  );
}
