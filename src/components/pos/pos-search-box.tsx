'use client';

import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { PosSearchResults } from './pos-search-results';
import type { ProductWithStock } from './pos-types';
import type { ProductCategory, Brand } from '@/lib/types';
import { toast } from 'sonner';

export interface PosSearchBoxRef {
  focus: () => void;
  clear: () => void;
}

interface PosSearchBoxProps {
  products: ProductWithStock[];
  categories: ProductCategory[];
  brands: Brand[];
  cartQuantities: Map<string, number>;
  cartImeis: Set<string>;
  onSelectProduct: (product: ProductWithStock) => void;
  onAddDirectImei: (product: ProductWithStock, imei: { id: string; imei_number: string }) => void;
}

export const PosSearchBox = forwardRef<PosSearchBoxRef, PosSearchBoxProps>(function PosSearchBox(
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
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Browse category quick-pick
  const [browseCategory, setBrowseCategory] = useState<string>('');
  const [isBrowseMenuOpen, setIsBrowseMenuOpen] = useState(false);
  const browseMenuRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    clear: () => {
      setQuery('');
      setDebouncedQuery('');
      setIsOpen(false);
    },
  }));

  // Autofocus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 200ms debounce on search typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (browseMenuRef.current && !browseMenuRef.current.contains(event.target as Node)) {
        setIsBrowseMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered results
  const searchResults = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const isBrowseOnly = !q && browseCategory;

    if (!q && !isBrowseOnly) return [];

    return products.filter((p) => {
      if (!p.is_active) return false;

      // Filter by browse category if selected
      if (browseCategory && p.category_id !== browseCategory) {
        return false;
      }

      if (!q) return true;

      if (p.name.toLowerCase().includes(q)) return true;
      if (p.model && p.model.toLowerCase().includes(q)) return true;

      const brand = brands.find((b) => b.id === p.brand_id);
      if (brand && brand.name.toLowerCase().includes(q)) return true;

      const category = categories.find((c) => c.id === p.category_id);
      if (category && category.name.toLowerCase().includes(q)) return true;

      if (p.is_imei_tracked && p.imei_records) {
        return p.imei_records.some((imei) =>
          imei.imei_number.toLowerCase().includes(q)
        );
      }

      return false;
    }).slice(0, 15);
  }, [debouncedQuery, browseCategory, products, brands, categories]);

  // Reset highlight index when results change
  useEffect(() => {
    setHighlightedIndex(0);
    if (searchResults.length > 0 && (debouncedQuery.trim() || browseCategory)) {
      setIsOpen(true);
    }
  }, [searchResults, debouncedQuery, browseCategory]);

  // Handle direct barcode scanner or 15-digit IMEI scan/type
  const handleDirectScanOrEnter = () => {
    const trimmed = query.trim();

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
            setIsOpen(false);
            return;
          }
        }
      }
    }

    if (searchResults.length > 0 && searchResults[highlightedIndex]) {
      const selected = searchResults[highlightedIndex];
      onSelectProduct(selected);
      setQuery('');
      setDebouncedQuery('');
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen && searchResults.length > 0) {
        setIsOpen(true);
      } else if (searchResults.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % searchResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleDirectScanOrEnter();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setDebouncedQuery('');
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      {/* Search Input Box with integrated Browse button */}
      <div className="relative flex items-center h-10 w-full rounded-xl border border-indigo-400 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 bg-white dark:bg-slate-900 transition-all shadow-2xs">
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim() || browseCategory) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search by name, model, or IMEI..."
          className="h-full w-full bg-transparent pl-10 pr-24 text-xs font-normal text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
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
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-20 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* [Browse ▾] Dropdown inside the search bar on right */}
        <div className="absolute right-1.5" ref={browseMenuRef}>
          <button
            type="button"
            onClick={() => setIsBrowseMenuOpen((prev) => !prev)}
            className="h-7 px-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition cursor-pointer"
          >
            <span>
              {browseCategory
                ? categories.find((c) => c.id === browseCategory)?.name || 'Category'
                : 'Browse'}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {isBrowseMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 shadow-xl z-50 p-1 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setBrowseCategory('');
                  setIsBrowseMenuOpen(false);
                  inputRef.current?.focus();
                }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  !browseCategory
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>All Products</span>
                {!browseCategory && <Check className="h-3 w-3" />}
              </button>

              <div className="h-px bg-slate-100 dark:bg-slate-800 my-0.5" />

              {categories.map((c) => {
                const isSelected = browseCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setBrowseCategory(c.id);
                      setIsBrowseMenuOpen(false);
                      setIsOpen(true);
                      inputRef.current?.focus();
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
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

      {/* Live Results Box directly below search box */}
      {isOpen && (debouncedQuery.trim() || browseCategory) && (
        <PosSearchResults
          results={searchResults}
          highlightedIndex={highlightedIndex}
          categories={categories}
          brands={brands}
          cartQuantities={cartQuantities}
          cartImeis={cartImeis}
          onSelect={(product) => {
            onSelectProduct(product);
            setQuery('');
            setDebouncedQuery('');
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
});
