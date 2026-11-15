'use client';

import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Search, X, ChevronDown, Check, MousePointerClick, Package } from 'lucide-react';
import type { ProductWithStock } from './pos-types';
import type { ProductCategory, Brand } from '@/lib/types';
import { toRupees } from '@/lib/types';
import { toast } from 'sonner';

export interface PosProductGridRef {
  focus: () => void;
  clear: () => void;
}

interface PosProductGridProps {
  products: ProductWithStock[];
  categories: ProductCategory[];
  brands: Brand[];
  cartQuantities: Map<string, number>;
  cartImeis: Set<string>;
  onSelectProduct: (product: ProductWithStock) => void;
  onAddDirectImei: (product: ProductWithStock, imei: { id: string; imei_number: string }) => void;
}

export const PosProductGrid = forwardRef<PosProductGridRef, PosProductGridProps>(function PosProductGrid(
  {
    products,
    categories,
    brands,
    cartQuantities,
    cartImeis,
    onSelectProduct,
    onAddDirectImei,
  },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // '' = All
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    clear: () => {
      setQuery('');
      setDebouncedQuery('');
    },
  }));

  // Autofocus search on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 180ms debounce for search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products based on search query and category
  const filteredProducts = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();

    return products.filter((p) => {
      if (!p.is_active) return false;

      // Filter by category tab/dropdown
      if (selectedCategory && p.category_id !== selectedCategory) {
        return false;
      }

      if (!q) return true;

      if (p.name.toLowerCase().includes(q)) return true;
      if (p.model && p.model.toLowerCase().includes(q)) return true;

      const brand = brands.find((b) => b.id === p.brand_id);
      if (brand && brand.name.toLowerCase().includes(q)) return true;

      const cat = categories.find((c) => c.id === p.category_id);
      if (cat && cat.name.toLowerCase().includes(q)) return true;

      if (p.is_imei_tracked && p.imei_records) {
        return p.imei_records.some((imei) =>
          imei.imei_number.toLowerCase().includes(q)
        );
      }

      return false;
    });
  }, [products, selectedCategory, debouncedQuery, brands, categories]);

  // Handle direct barcode scanner or 15-digit IMEI scan/type
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = query.trim();

      // Check if 14-16 digit IMEI scan
      if (/^\d{14,16}$/.test(trimmed)) {
        for (const prod of products) {
          if (prod.is_imei_tracked && prod.imei_records) {
            const matchImei = prod.imei_records.find(
              (r) => r.status === 'in_stock' && r.imei_number === trimmed
            );
            if (matchImei) {
              if (cartImeis.has(matchImei.id)) {
                toast.error(`IMEI ...${trimmed.slice(-4)} is already in basket.`);
                return;
              }
              onAddDirectImei(prod, matchImei);
              setQuery('');
              setDebouncedQuery('');
              return;
            }
          }
        }
      }

      // If user presses Enter with 1 result, auto-select it
      if (filteredProducts.length === 1) {
        const prod = filteredProducts[0];
        onSelectProduct(prod);
        setQuery('');
        setDebouncedQuery('');
      }
    } else if (e.key === 'Escape') {
      setQuery('');
      setDebouncedQuery('');
    }
  };

  // Top category tabs (e.g. first 3 categories as quick buttons)
  const topCategories = categories.slice(0, 3);
  const remainingCategories = categories.slice(3);

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3 pt-1">
      {/* 1. Filter Row: Category Tabs + Category Dropdown + Search Input */}
      <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Category Pills & Dropdown */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
          {/* [ All ] Tab */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('');
              inputRef.current?.focus();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              !selectedCategory
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            All
          </button>

          {/* Top Category Tabs */}
          {topCategories.map((c) => {
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(isSelected ? '' : c.id);
                  inputRef.current?.focus();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {c.name}
              </button>
            );
          })}

          {/* Category Dropdown (All Categories ▾) */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
              className={`h-8 px-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                selectedCategory && !topCategories.some((tc) => tc.id === selectedCategory)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>
                {selectedCategory
                  ? categories.find((c) => c.id === selectedCategory)?.name || 'Category'
                  : 'All Categories'}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 p-1 space-y-0.5 max-h-56 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('');
                    setIsCategoryDropdownOpen(false);
                    inputRef.current?.focus();
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    !selectedCategory
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>All Categories</span>
                  {!selectedCategory && <Check className="h-3 w-3" />}
                </button>

                {categories.map((c) => {
                  const isSelected = selectedCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(c.id);
                        setIsCategoryDropdownOpen(false);
                        inputRef.current?.focus();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search items [F2]..."
            className="h-8.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8.5 pr-8 text-xs font-normal text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50 transition-all shadow-2xs"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Subheader: Section Title with Live Count & "Click card to add" hint */}
      <div className="shrink-0 flex items-center justify-between text-xs px-1 py-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
          <span className="font-bold text-[11px] sm:text-xs tracking-wider uppercase text-slate-700 dark:text-slate-300">
            {selectedCategory
              ? categories.find((c) => c.id === selectedCategory)?.name.toUpperCase()
              : 'RETAIL & STOCK PRODUCTS'}{' '}
            <span className="text-slate-400 font-normal">({filteredProducts.length})</span>
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 select-none">
          <MousePointerClick className="h-3 w-3" />
          <span>Click card to add</span>
        </div>
      </div>

      {/* 3. The Product Cards Grid with top padding to prevent clipping */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-2 pb-4 px-1 pr-1.5">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <Package className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No products found
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              {query
                ? `No products match "${query}". Try searching by a different name, model or IMEI.`
                : 'No active products available in this category.'}
            </p>
            {(query || selectedCategory) && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setDebouncedQuery('');
                  setSelectedCategory('');
                  inputRef.current?.focus();
                }}
                className="mt-3 px-3 py-1 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
            {filteredProducts.map((product) => {
              // Calculate effective available stock
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
              const matchedCategory = categories.find((c) => c.id === product.category_id);
              const matchedBrand = brands.find((b) => b.id === product.brand_id);
              const categoryLabel = matchedCategory?.name || (product.is_imei_tracked ? 'Mobile' : 'Accessory');

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (isOutOfStock) {
                      toast.error(`"${product.name}" is currently out of stock.`);
                      return;
                    }
                    onSelectProduct(product);
                  }}
                  className={`group relative z-0 hover:z-10 rounded-2xl border p-3 flex flex-col justify-between transition-all duration-150 min-h-[96px] select-none ${
                    isOutOfStock
                      ? 'bg-slate-50/70 border-slate-200/60 dark:bg-slate-900/40 dark:border-slate-800/60 opacity-60 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 hover:ring-2 hover:ring-indigo-100 dark:hover:ring-indigo-950/60 hover:shadow-md active:scale-[0.99] cursor-pointer'
                  }`}
                >
                  {/* Card Top: Title & Category/Brand Subtitle */}
                  <div>
                    <h4
                      className="font-semibold text-xs text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 transition-colors leading-tight"
                      title={product.name}
                    >
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                      {categoryLabel}
                      {product.model ? ` • ${product.model}` : matchedBrand ? ` • ${matchedBrand.name}` : ''}
                    </p>
                  </div>

                  {/* Card Bottom: Price & Stock Badge */}
                  <div className="flex items-center justify-between gap-1.5 pt-2 mt-auto border-t border-slate-100 dark:border-slate-800/80">
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        Rs. {toRupees(product.sale_price).toLocaleString('en-PK')}
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {product.is_imei_tracked && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          IMEI
                        </span>
                      )}

                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300">
                          0 left
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {availableStock} left
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
