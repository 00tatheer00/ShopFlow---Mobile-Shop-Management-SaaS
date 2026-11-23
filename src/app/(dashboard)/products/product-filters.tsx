'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Segmented } from '@/components/ui/kit';

interface CategoryOption {
  id: string;
  name: string;
}

interface BrandOption {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  categories: CategoryOption[];
  brands: BrandOption[];
  currentSearch: string;
  currentCategory: string;
  currentBrand: string;
  currentStatus?: string;
}

export function ProductFilters({
  categories,
  brands,
  currentSearch,
  currentCategory,
  currentBrand,
  currentStatus = 'active',
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch);
  const [, startTransition] = useTransition();

  function updateQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });
    params.set('page', '1');
    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateQuery({ search: search.trim() || null });
  }

  const hasFilters = Boolean(currentSearch || currentCategory || currentBrand);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search item by name… (press Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field h-12 pl-11 pr-10"
            aria-label="Search products"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                updateQuery({ search: null });
              }}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        <Segmented
          value={currentStatus}
          onChange={(v) => updateQuery({ status: v === 'active' ? null : v })}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Archived' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={currentCategory}
          onChange={(e) => updateQuery({ category: e.target.value || null })}
          className="field w-auto min-w-[170px] cursor-pointer"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          value={currentBrand}
          onChange={(e) => updateQuery({ brand: e.target.value || null })}
          className="field w-auto min-w-[150px] cursor-pointer"
          aria-label="Filter by brand"
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              router.push('/products');
            }}
            className="btn btn-sm btn-ghost"
          >
            <X className="h-4 w-4" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
