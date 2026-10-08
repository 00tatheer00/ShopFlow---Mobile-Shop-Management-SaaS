'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, ArrowLeft, Layers, X } from 'lucide-react';
import type { ProductCategory, UserRole } from '@/lib/types';
import { createCategory, updateCategory, deleteCategory } from '../actions';
import { hasPermission } from '@/lib/permissions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface CategoriesClientProps {
  categories: (ProductCategory & { product_count?: number })[];
  userRole: UserRole;
}

export function CategoriesClient({ categories, userRole }: CategoriesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ProductCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = hasPermission(userRole, 'categories:manage');

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createCategory(formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setIsAddOpen(false);
        router.refresh();
      }
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingCat) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateCategory(editingCat.id, formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setEditingCat(null);
        router.refresh();
      }
    });
  }

  async function executeDelete(cat: ProductCategory) {
    startTransition(async () => {
      const res = await deleteCategory(cat.id);
      if (res.error) {
        alert(res.error);
      } else {
        setCategoryToDelete(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Product Categories</h1>
            <p className="text-xs text-muted-foreground">
              Classify inventory (Smartphones, Accessories, Tablets, Spare Parts)
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setFormError(null);
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Category
          </button>
        )}
      </div>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          <Layers className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
          No categories found. Click Add Category to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground text-sm">{cat.name}</h3>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setFormError(null);
                          setEditingCat(cat);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setCategoryToDelete(cat)}
                        className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {cat.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {cat.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                <span>{cat.product_count ?? 0} Products</span>
                <Link
                  href={`/products?category=${cat.id}`}
                  className="font-semibold text-primary hover:underline"
                >
                  View items &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Add Category</h3>
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
                <label className="block font-semibold mb-1">Category Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Smart Watches"
                  className="w-full rounded border border-border bg-background p-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Description (Optional)</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Details about this group of products..."
                  className="w-full rounded border border-border bg-background p-2 focus:border-primary focus:outline-none"
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
                  {isPending ? 'Saving...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Edit Category</h3>
              <button onClick={() => setEditingCat(null)}>
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
                <label className="block font-semibold mb-1">Category Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingCat.name}
                  className="w-full rounded border border-border bg-background p-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingCat.description || ''}
                  className="w-full rounded border border-border bg-background p-2 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
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

      {/* Confirmation Dialog for Category Deletion */}
      <ConfirmationDialog
        open={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => {
          if (categoryToDelete) executeDelete(categoryToDelete);
        }}
        title="Delete Category?"
        description={`Are you sure you want to delete category "${categoryToDelete?.name}"? Products assigned to this category will become uncategorized.`}
        confirmLabel="Delete Category"
        variant="danger"
        loading={isPending}
      />
    </div>
  );
}
