'use client';

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
      <div className="rounded-xl border border-slate-200 bg-[#f8fafc] dark:bg-slate-900/60 p-3 text-center text-xs text-slate-500 shadow-sm">
        No products found matching your search.
      </div>
    );
  }

  return (
    <div
      role="listbox"
      id="pos-search-results"
      className="rounded-xl border border-slate-200 bg-[#f8fafc] dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm"
    >
      {results.map((product, idx) => {
        const isHighlighted = idx === highlightedIndex;

        // Effective stock calculation
        let availableStock = product.stock_quantity;
        const allImeis = product.imei_records || [];
        let availableImeis = allImeis.filter((r) => r.status === 'in_stock');

        if (product.is_imei_tracked) {
          availableImeis = availableImeis.filter((r) => !cartImeis.has(r.id));
          availableStock = availableImeis.length;
        } else {
          const inCart = cartQuantities.get(product.id) || 0;
          availableStock = Math.max(0, product.stock_quantity - inCart);
        }

        const isOutOfStock = availableStock <= 0;

        return (
          <div
            key={product.id}
            role="option"
            aria-selected={isHighlighted}
            aria-disabled={isOutOfStock}
            onClick={() => {
              if (!isOutOfStock) onSelect(product);
            }}
            className={`flex items-center justify-between px-3 py-2 text-xs transition-colors ${
              isOutOfStock
                ? 'opacity-60 bg-slate-50/50 cursor-not-allowed'
                : isHighlighted
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 cursor-pointer'
                : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40 cursor-pointer'
            }`}
          >
            {/* Left: Mobile Badge & Name */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                {product.is_imei_tracked ? 'Mobile' : 'Accessory'}
              </span>

              <div className="min-w-0 flex items-center gap-1.5 truncate">
                <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                  {product.name}
                </span>
                {product.model && (
                  <span className="text-[11px] text-slate-500 font-normal truncate">
                    {product.model}
                  </span>
                )}
              </div>
            </div>

            {/* Middle: IMEI info if handset */}
            <div className="shrink-0 px-2 text-slate-500 font-mono text-[11px] hidden sm:block">
              {product.is_imei_tracked && allImeis.length > 0 ? (
                <span>
                  IMEI ...{(availableImeis[0] || allImeis[0]).imei_number.slice(-4)}
                  {availableImeis.length > 1 && ` (+${availableImeis.length - 1})`}
                </span>
              ) : null}
            </div>

            {/* Right: Price & In stock/Sold badge */}
            <div className="shrink-0 flex items-center gap-3">
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                {formatPKR(product.sale_price)}
              </span>

              {isOutOfStock ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  Sold
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  In stock
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
