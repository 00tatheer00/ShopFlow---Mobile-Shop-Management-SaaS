'use client';

import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/kit';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  X,
  Award,
} from 'lucide-react';
import type { Brand, UserRole } from '@/lib/types';
import { createBrand, updateBrand, deleteBrand } from '../actions';
import { hasPermission } from '@/lib/permissions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface BrandsClientProps {
  brands: (Brand & { product_count?: number })[];
  userRole: UserRole;
}

export function BrandsClient({ brands, userRole }: BrandsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = hasPermission(userRole, 'brands:manage');

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createBrand(formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setIsAddOpen(false);
        toast.success('Brand added');
        router.refresh();
      }
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingBrand) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateBrand(editingBrand.id, formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setEditingBrand(null);
        toast.success('Brand updated');
        router.refresh();
      }
    });
  }

  async function executeDelete(brand: Brand) {
    startTransition(async () => {
      const res = await deleteBrand(brand.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        setBrandToDelete(null);
        toast.success('Brand deleted');
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <PageHeader
        title="Brands"
        ur="کمپنیاں"
        icon={Award}
        tone="sky"
        backHref="/products"
        description={<>Manage mobile manufacturers and brands (Apple, Samsung, Xiaomi, Infinix, Realme, Oppo)</>}
        actions={
        <>
          {canManage && (
            <button
              onClick={() => {
                setFormError(null);
                setIsAddOpen(true);
              }}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4" />
              Add Brand
            </button>
          )}
        </>
      }
      />

      {/* Brands Grid */}
      {brands.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          <Tag className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
          No brands found. Click Add Brand to register brand names.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground text-sm">{brand.name}</h3>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setFormError(null);
                          setEditingBrand(brand);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setBrandToDelete(brand)}
                        className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors"
                        title="Delete Brand"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                <span>{brand.product_count ?? 0} Products</span>
                <Link
                  href={`/products?brand=${brand.id}`}
                  className="font-semibold text-primary hover:underline"
                >
                  Filter &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="sheet-backdrop">
          <div className="sheet sm:max-w-sm p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Add Brand</h3>
              <button onClick={() => setIsAddOpen(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Brand Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Apple, Samsung, Xiaomi"
                  className="field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded border border-border px-3 py-1.5 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {isPending ? 'Saving...' : 'Add Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBrand && (
        <div className="sheet-backdrop">
          <div className="sheet sm:max-w-sm p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Edit Brand</h3>
              <button onClick={() => setEditingBrand(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Brand Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingBrand.name}
                  className="field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBrand(null)}
                  className="rounded border border-border px-3 py-1.5 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {isPending ? 'Updating...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Brand Deletion */}
      <ConfirmationDialog
        open={!!brandToDelete}
        onClose={() => setBrandToDelete(null)}
        onConfirm={() => {
          if (brandToDelete) executeDelete(brandToDelete);
        }}
        title="Delete Brand?"
        description={`Are you sure you want to delete brand "${brandToDelete?.name}"? Products assigned to this brand will remain intact without a brand reference.`}
        confirmLabel="Delete Brand"
        variant="danger"
        loading={isPending}
      />
    </div>
  );
}
