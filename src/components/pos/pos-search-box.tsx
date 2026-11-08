'use client';

import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Search, X, ChevronDown, Layers, Smartphone, Package, Check } from 'lucide-react';
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

      if (!q) return true; // Showing browse category items

      // Check product name & model
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.model && p.model.toLowerCase().includes(q)) return true;

      // Check brand name
      const brand = brands.find((b) => b.id === p.brand_id);
      if (brand && brand.name.toLowerCase().includes(q)) return true;

      // Check category name
      const category = categories.find((c) => c.id === p.category_id);
      if (category && category.name.toLowerCase().includes(q)) return true;

      // Check IMEI (full or partial 4+ digits)
      if (p.is_imei_tracked && p.imei_records) {
        return p.imei_records.some((imei) =>
          imei.status === 'in_stock' && imei.imei_number.toLowerCase().includes(q)
        );
      }

      return false;
    }).slice(0, 20); // Top 20 results for performance
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

    // 1. Check for 15-digit IMEI or exact barcode match
    if (/^\d{14,16}$/.test(trimmed)) {
      for (const prod of products) {
        if (prod.is_imei_tracked && prod.imei_records) {
          const matchImei = prod.imei_records.find(
            (r) => r.status === 'in_stock' && r.imei_number === trimmed
          );
          if (matchImei) {
            if (cartImeis.has(matchImei.id)) {
              toast.error(`IMEI ...${trimmed.slice(-4)} is already in the basket.`);
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

    // 2. If dropdown has a highlighted result, select it
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
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-1.5">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
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
            placeholder="Search by product name, model, or IMEI (press / or F2)..."
            className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground font-normal shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* [Browse ▾] Category Quick-Pick Dropdown */}
        <div className="relative shrink-0" ref={browseMenuRef}>
          <button
            type="button"
            onClick={() => setIsBrowseMenuOpen((prev) => !prev)}
            className={`h-9 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
              browseCategory
                ? 'border-primary bg-primary text-primary-foreground font-semibold'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="text-[11px]">
              {browseCategory
                ? categories.find((c) => c.id === browseCategory)?.name || 'Category'
                : 'Browse'}
            </span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>

          {isBrowseMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border bg-card shadow-xl z-50 p-1 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setBrowseCategory('');
                  setIsBrowseMenuOpen(false);
                  inputRef.current?.focus();
                }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  !browseCategory
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span>All Products</span>
                </div>
                {!browseCategory && <Check className="h-3 w-3" />}
              </button>

              <div className="h-px bg-border my-0.5" />

              {categories.map((c) => {
                const isSelected = browseCategory === c.id;
                const isPhone = c.name.toLowerCase().includes('phone') || c.name.toLowerCase().includes('mobile');
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
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isPhone ? (
                        <Smartphone className="h-3 w-3 shrink-0" />
                      ) : (
                        <Package className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{c.name}</span>
                    </div>
                    {isSelected && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Live Results Dropdown */}
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

