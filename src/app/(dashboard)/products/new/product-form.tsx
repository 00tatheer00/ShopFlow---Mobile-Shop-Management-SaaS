'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Smartphone, AlertCircle } from 'lucide-react';
import type { Product, ProductCategory, Brand } from '@/lib/types';
import { toRupees } from '@/lib/types';
import { createProduct, updateProduct } from '../actions';

interface ProductFormProps {
  categories: ProductCategory[];
  brands: Brand[];
  initialProduct?: Product;
}

export function ProductForm({ categories, brands, initialProduct }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImeiTracked, setIsImeiTracked] = useState(initialProduct?.is_imei_tracked ?? false);

  const isEdit = Boolean(initialProduct);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);
    formData.set('is_imei_tracked', String(isImeiTracked));

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

  return (
    <div className="max-w-2xl space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isEdit
              ? 'Update product details, pricing, and category assignments.'
              : 'Create an inventory item, set pricing, and configure IMEI tracking.'}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Product Information</h2>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={initialProduct?.name}
              placeholder="e.g. Samsung Galaxy A54 5G"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Category</label>
              <select
                name="category_id"
                defaultValue={initialProduct?.category_id || ''}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">-- Choose Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Brand</label>
              <select
                name="brand_id"
                defaultValue={initialProduct?.brand_id || ''}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">-- Choose Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Model / Specification
            </label>
            <input
              type="text"
              name="model"
              defaultValue={initialProduct?.model || ''}
              placeholder="e.g. 8GB / 128GB Awesome Graphite"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
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
                <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Track Individual Serial / IMEI Numbers
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Check this for mobile phones and tablets that require exact 15-digit IMEI registration
                  during purchases and sales.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Pricing & Stock Card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Pricing & Inventory</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
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
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Purchase / Cost Price (PKR)
              </label>
              <input
                type="number"
                name="purchase_price"
                min="0"
                step="any"
                defaultValue={initialProduct ? toRupees(initialProduct.purchase_price) : undefined}
                placeholder="e.g. 78000"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                name="stock_quantity"
                min="0"
                defaultValue={initialProduct ? initialProduct.stock_quantity : 0}
                disabled={isImeiTracked}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
              />
              {isImeiTracked && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  IMEI-tracked stock is managed via IMEI records in Purchases.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Low Stock Warning Level
              </label>
              <input
                type="number"
                name="low_stock_threshold"
                min="0"
                defaultValue={initialProduct ? initialProduct.low_stock_threshold : 5}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/products"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update Product' : 'Save Product')}
          </button>
        </div>
      </form>
    </div>
  );
}
