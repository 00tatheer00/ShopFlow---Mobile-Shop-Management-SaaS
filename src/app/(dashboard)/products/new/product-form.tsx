'use client';

import { PageHeader } from '@/components/ui/kit';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Smartphone,
  AlertCircle,
  Plus,
  X,
  Loader2,
  PackagePlus,
} from 'lucide-react';
import type { Product, ProductCategory, Brand } from '@/lib/types';
import { toRupees } from '@/lib/types';
import { createProduct, updateProduct, createCategory, createBrand } from '../actions';
import { toast } from 'sonner';

interface ProductFormProps {
  categories: ProductCategory[];
  brands: Brand[];
  initialProduct?: Product;
}

export function ProductForm({
  categories: initialCategories,
  brands: initialBrands,
  initialProduct,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImeiTracked, setIsImeiTracked] = useState(initialProduct?.is_imei_tracked ?? false);

  // Dynamic lists and selected values
  const [localCategories, setLocalCategories] = useState<ProductCategory[]>(initialCategories);
  const [localBrands, setLocalBrands] = useState<Brand[]>(initialBrands);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialProduct?.category_id || '');
  const [selectedBrandId, setSelectedBrandId] = useState<string>(initialProduct?.brand_id || '');

  // Quick Add Modals
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryPending, setCategoryPending] = useState(false);

  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandPending, setBrandPending] = useState(false);

  const isEdit = Boolean(initialProduct);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);
    formData.set('is_imei_tracked', String(isImeiTracked));
    formData.set('category_id', selectedCategoryId);
    formData.set('brand_id', selectedBrandId);

    startTransition(async () => {
      const res = isEdit && initialProduct
        ? await updateProduct(initialProduct.id, formData)
        : await createProduct(formData);

      if (res?.error) {
        setErrorMessage(res.error);
      } else {
        router.push('/products');
        router.refresh();
      }
    });
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.error('Category name is required.');
      return;
    }

    setCategoryPending(true);
    const formData = new FormData();
    formData.append('name', categoryName.trim());
    if (categoryDesc.trim()) {
      formData.append('description', categoryDesc.trim());
    }

    const res = await createCategory(formData);
    setCategoryPending(false);

    if (res?.error) {
      toast.error(res.error);
    } else if (res?.category) {
      toast.success(`Category "${res.category.name}" added successfully.`);
      setLocalCategories((prev) =>
        [...prev, res.category as ProductCategory].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedCategoryId(res.category.id);
      setCategoryName('');
      setCategoryDesc('');
      setIsAddCategoryOpen(false);
    }
  }

  async function handleCreateBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim()) {
      toast.error('Brand name is required.');
      return;
    }

    setBrandPending(true);
    const formData = new FormData();
    formData.append('name', brandName.trim());

    const res = await createBrand(formData);
    setBrandPending(false);

    if (res?.error) {
      toast.error(res.error);
    } else if (res?.brand) {
      toast.success(`Brand "${res.brand.name}" added successfully.`);
      setLocalBrands((prev) =>
        [...prev, res.brand as Brand].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedBrandId(res.brand.id);
      setBrandName('');
      setIsAddBrandOpen(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Top Header */}
      <PageHeader
        title={isEdit ? 'Edit Product' : 'Add New Product'}
        ur={isEdit ? 'مال میں تبدیلی' : 'نیا مال شامل کریں'}
        icon={PackagePlus}
        tone="sky"
        backHref="/products"
        description={isEdit ? 'Update product details, pricing, and category.' : 'Create an item, set its price, and choose IMEI tracking for phones.'}
      />

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Product Information</h2>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={initialProduct?.name}
              placeholder="e.g. Samsung Galaxy A54 5G"
              className="field"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Category selection with Add Category button above */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-foreground">Category</label>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Category</span>
                </button>
              </div>
              <select
                name="category_id"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="field"
              >
                <option value="">-- Choose Category --</option>
                {localCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand selection with Add Brand button above */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-foreground">Brand</label>
                <button
                  type="button"
                  onClick={() => setIsAddBrandOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Brand</span>
                </button>
              </div>
              <select
                name="brand_id"
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="field"
              >
                <option value="">-- Choose Brand --</option>
                {localBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Model / Specification
            </label>
            <input
              type="text"
              name="model"
              defaultValue={initialProduct?.model || ''}
              placeholder="e.g. 8GB / 128GB Awesome Graphite"
              className="field"
            />
          </div>

          {/* IMEI Tracking Switch */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isImeiTracked}
                onChange={(e) => setIsImeiTracked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Track Individual Serial / IMEI Numbers
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                  Check this for mobile phones and tablets that require exact 15-digit IMEI registration
                  during purchases and sales.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Pricing & Stock Card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Pricing & Inventory</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Sale Price (PKR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="sale_price"
                min="0"
                step="any"
                required
                defaultValue={initialProduct ? toRupees(initialProduct.sale_price) : undefined}
                placeholder="e.g. 85000"
                className="field"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Purchase / Cost Price (PKR)
              </label>
              <input
                type="number"
                name="purchase_price"
                min="0"
                step="any"
                defaultValue={initialProduct ? toRupees(initialProduct.purchase_price) : undefined}
                placeholder="e.g. 78000"
                className="field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                name="stock_quantity"
                min="0"
                defaultValue={initialProduct ? initialProduct.stock_quantity : 0}
                disabled={isEdit || isImeiTracked}
                className="field"
              />
              {isImeiTracked ? (
                <p className="text-[11px] text-muted-foreground mt-1 font-normal">
                  IMEI-tracked stock is managed via IMEI serials in Purchases.
                </p>
              ) : isEdit ? (
                <p className="text-[11px] text-muted-foreground mt-1 font-normal">
                  To adjust inventory for existing items, use the &quot;Adjust Stock&quot; action on the Products page.
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Low Stock Warning Level
              </label>
              <input
                type="number"
                name="low_stock_threshold"
                min="0"
                defaultValue={initialProduct ? initialProduct.low_stock_threshold : 5}
                className="field"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/products"
            className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update Product' : 'Save Product')}
          </button>
        </div>
      </form>

      {/* Quick Add Category Modal */}
      {isAddCategoryOpen && (
        <div
          className="sheet-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !categoryPending) setIsAddCategoryOpen(false);
          }}
        >
          <div className="sheet sm:max-w-xs p-4 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-semibold text-xs text-foreground">Add New Category</h3>
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(false)}
                disabled={categoryPending}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-0.5 text-[10px]">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Smart Phones"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="field"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-0.5 text-[10px]">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Touchscreen Android and iOS devices"
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  className="field"
                />
              </div>

              <div className="pt-1.5 flex justify-end gap-1.5 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  disabled={categoryPending}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categoryPending || !categoryName.trim()}
                  className="btn btn-primary"
                >
                  {categoryPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Category</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Brand Modal */}
      {isAddBrandOpen && (
        <div
          className="sheet-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !brandPending) setIsAddBrandOpen(false);
          }}
        >
          <div className="sheet sm:max-w-xs p-4 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-semibold text-xs text-foreground">Add New Brand</h3>
              <button
                type="button"
                onClick={() => setIsAddBrandOpen(false)}
                disabled={brandPending}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBrand} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-0.5 text-[10px]">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Infinix, Samsung, Apple"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="field"
                />
              </div>

              <div className="pt-1.5 flex justify-end gap-1.5 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddBrandOpen(false)}
                  disabled={brandPending}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={brandPending || !brandName.trim()}
                  className="btn btn-primary"
                >
                  {brandPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Brand</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
