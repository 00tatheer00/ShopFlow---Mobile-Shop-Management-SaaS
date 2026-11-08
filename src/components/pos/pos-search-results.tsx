'use client';

import { Smartphone, Package, AlertCircle } from 'lucide-react';
import { formatPKR } from '@/lib/types';
import type { ProductWithStock } from './pos-types';
import type { ProductCategory, Brand } from '@/lib/types';

interface PosSearchResultsProps {
  results: ProductWithStock[];
  highlightedIndex: number;
  onSelect: (product: ProductWithStock) => void;
  categories: ProductCategory[];
  brands: Brand[];
  cartQuantities: Map<string, number>;
  cartImeis: Set<string>;
}

export function PosSearchResults({
  results,
  highlightedIndex,
  onSelect,
  categories,
  brands,
  cartQuantities,
  cartImeis,
}: PosSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>No products found matching your search.</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="listbox"
      id="pos-search-results"
      className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border-2 border-border bg-card shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-border/60"
    >
      {results.map((product, idx) => {
        const isHighlighted = idx === highlightedIndex;
        const brand = brands.find((b) => b.id === product.brand_id);
        const category = categories.find((c) => c.id === product.category_id);

        // Effective stock taking into account items already in cart
        let availableStock = product.stock_quantity;
        let availableImeis = (product.imei_records || []).filter((r) => r.status === 'in_stock');

        if (product.is_imei_tracked) {
          availableImeis = availableImeis.filter((r) => !cartImeis.has(r.id));
          availableStock = availableImeis.length;
        } else {
          const inCart = cartQuantities.get(product.id) || 0;
          availableStock = Math.max(0, product.stock_quantity - inCart);
        }

        const isOutOfStock = availableStock <= 0;
        const isLowStock = !isOutOfStock && availableStock <= 3;

        return (
          <div
            key={product.id}
            role="option"
            aria-selected={isHighlighted}
            aria-disabled={isOutOfStock}
            onClick={() => {
              if (!isOutOfStock) onSelect(product);
            }}
            className={`flex items-center justify-between p-3 transition-colors ${
              isOutOfStock
                ? 'opacity-50 bg-muted/40 cursor-not-allowed'
                : isHighlighted
                ? 'bg-primary/10 border-l-4 border-primary cursor-pointer'
                : 'hover:bg-muted/60 cursor-pointer'
            }`}
          >
            {/* Left: Product Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  product.is_imei_tracked
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                }`}
              >
                {product.is_imei_tracked ? (
                  <Smartphone className="h-4 w-4" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                    {product.name}
                  </span>
                  {product.is_imei_tracked ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      Mobile
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold text-muted-foreground bg-muted border border-border">
                      Accessory
                    </span>
                  )}
                  {brand && (
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      • {brand.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground truncate">
                  {product.model && <span>{product.model}</span>}
                  {product.is_imei_tracked && availableImeis.length > 0 && (
                    <span className="font-mono text-[11px] text-primary font-bold">
                      {availableImeis.length === 1
                        ? `IMEI ...${availableImeis[0].imei_number.slice(-4)}`
                        : `${availableImeis.length} IMEIs ready`}
                    </span>
                  )}
                  {category && !product.model && <span>{category.name}</span>}
                </div>
              </div>
            </div>

            {/* Right: Price & Stock Status */}
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
              <span className="font-black text-xs sm:text-sm text-foreground">
                {formatPKR(product.sale_price)}
              </span>

              {isOutOfStock ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                  Out of stock
                </span>
              ) : isLowStock ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  Low stock ({availableStock})
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  In stock ({availableStock})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
