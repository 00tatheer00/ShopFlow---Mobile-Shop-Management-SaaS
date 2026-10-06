'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Truck,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Building,
  FileText,
  X,
} from 'lucide-react';
import type { Supplier, UserRole } from '@/lib/types';
import { createSupplier, updateSupplier, deleteSupplier } from './actions';
import { hasPermission } from '@/lib/permissions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface SuppliersClientProps {
  suppliers: Supplier[];
  userRole: UserRole;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  search: string;
}

export function SuppliersClient({
  suppliers,
  userRole,
  totalCount,
  currentPage,
  totalPages,
  search: initialSearch,
}: SuppliersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = hasPermission(userRole, 'purchases:create');
  const canEdit = hasPermission(userRole, 'purchases:create');
  const canDelete = userRole === 'shop_owner' || userRole === 'manager';

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    params.set('page', '1');
    router.push(`/suppliers?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(newPage));
    router.push(`/suppliers?${params.toString()}`);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createSupplier(formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setIsAddModalOpen(false);
        router.refresh();
      }
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingSupplier) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateSupplier(editingSupplier.id, formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setEditingSupplier(null);
        router.refresh();
      }
    });
  }

  async function executeDelete(supplier: Supplier) {
    startTransition(async () => {
      const res = await deleteSupplier(supplier.id);
      if (res.error) {
        alert(res.error);
      } else {
        setSupplierToDelete(null);
        router.refresh();
      }
    });
  }

  function getWhatsAppUrl(phone: string) {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.slice(1);
    } else if (cleaned.length === 10 && cleaned.startsWith('3')) {
      cleaned = '92' + cleaned;
    }
    return `https://wa.me/${cleaned}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your vendors, wholesale distributors, and supplier contacts. ({totalCount} total)
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by supplier name, company, or phone..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </form>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              router.push('/suppliers');
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Clear search
          </button>
        )}
      </div>

      {/* Suppliers Table */}
      {suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Truck className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No suppliers found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? 'Try adjusting your search terms.' : 'Add your first supplier to track inventory shipments.'}
          </p>
          {canCreate && !search && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add First Supplier
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Supplier Name</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Phone / WhatsApp</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Address</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{supplier.name}</div>
                      {supplier.notes && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
                          <FileText className="h-3 w-3 shrink-0" />
                          {supplier.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {supplier.company ? (
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          {supplier.company}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {supplier.phone ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-foreground">{supplier.phone}</span>
                          <a
                            href={getWhatsAppUrl(supplier.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">No phone</span>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {supplier.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell text-xs text-muted-foreground">
                      {supplier.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                          <span className="line-clamp-1">{supplier.address}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setFormError(null);
                              setEditingSupplier(supplier);
                            }}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Edit Supplier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setSupplierToDelete(supplier)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete Supplier"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 font-medium hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 font-medium hover:bg-muted disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Add New Supplier</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Supplier / Contact Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Company / Distributor Name
                </label>
                <input
                  type="text"
                  name="company"
                  placeholder="e.g. Star Mobile Traders"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  placeholder="e.g. 03009876543"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. contact@starmobile.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Office / Warehouse Address
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="e.g. Hall Road, Lahore"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Payment terms, bank details, delivery notes..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Edit Supplier</h2>
              <button
                onClick={() => setEditingSupplier(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Supplier / Contact Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingSupplier.name}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Company / Distributor Name
                </label>
                <input
                  type="text"
                  name="company"
                  defaultValue={editingSupplier.company || ''}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  defaultValue={editingSupplier.phone || ''}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingSupplier.email || ''}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Office / Warehouse Address
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={editingSupplier.address || ''}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingSupplier.notes || ''}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Supplier Deletion */}
      <ConfirmationDialog
        open={!!supplierToDelete}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={() => {
          if (supplierToDelete) executeDelete(supplierToDelete);
        }}
        title="Delete Supplier?"
        description={`Are you sure you want to delete supplier "${supplierToDelete?.name}"? Past purchase invoices and payments received from this supplier will be preserved for financial auditing.`}
        confirmLabel="Delete Supplier"
        variant="danger"
        loading={isPending}
      />
    </div>
  );
}
