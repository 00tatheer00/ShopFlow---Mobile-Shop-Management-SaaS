'use client';

import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/kit';
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
  Download,
} from 'lucide-react';
import type { Supplier, UserRole } from '@/lib/types';
import { createSupplier, updateSupplier, deleteSupplier } from './actions';
import { hasPermission } from '@/lib/permissions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { exportToCSV } from '@/lib/export-csv';

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
        toast.success('Supplier added', { description: 'سپلائر شامل ہو گیا' });
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
        toast.success('Supplier updated');
        router.refresh();
      }
    });
  }

  async function executeDelete(supplier: Supplier) {
    startTransition(async () => {
      const res = await deleteSupplier(supplier.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        setSupplierToDelete(null);
        toast.success('Supplier removed');
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

  const handleExportCSV = () => {
    const headers = [
      'Supplier Name',
      'Company',
      'Phone',
      'Email',
      'Address',
      'Status',
    ];
    const rows = suppliers.map((s) => [
      s.name,
      s.company || '',
      s.phone || '',
      s.email || '',
      s.address || '',
      s.is_active ? 'ACTIVE' : 'INACTIVE',
    ]);
    exportToCSV('suppliers_directory', headers, rows);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <PageHeader
        title="Suppliers"
        ur="سپلائر / ڈیلر"
        icon={Truck}
        tone="teal"
        description={<>Manage your vendors, wholesale distributors, and supplier contacts ({totalCount} total).</>}
        actions={
        <>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn btn-outline"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {canCreate && (
            <button
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4" />
              <span>Add Supplier</span>
            </button>
          )}
        </>
      }
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by supplier name, company, or phone..."
            className="field pr-4 pl-10"
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
            <X className="h-4 w-4" /> Clear search
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
              className="btn btn-primary mt-4"
            >
              <Plus className="h-4 w-4" />
              Add First Supplier
            </button>
          )}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {/* Phone: card list */}
          <ul className="divide-y divide-border sm:hidden">
            {suppliers.map((supplier) => (
              <li key={supplier.id} className="flex items-start gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-base font-bold text-teal-700 dark:bg-teal-950/70 dark:text-teal-300">
                  {supplier.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{supplier.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{supplier.company || supplier.address || 'Supplier'}</p>
                  {supplier.phone && <p className="font-mono text-sm text-muted-foreground">{supplier.phone}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {supplier.phone && (
                      <a href={getWhatsAppUrl(supplier.phone)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                        <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
                      </a>
                    )}
                    {supplier.phone && (
                      <a href={`tel:${supplier.phone}`} className="btn btn-sm btn-outline">
                        Call
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setFormError(null);
                        setEditingSupplier(supplier);
                      }}
                      className="icon-btn"
                      aria-label="Edit supplier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => setSupplierToDelete(supplier)} className="icon-btn hover:!text-rose-600" aria-label="Delete supplier">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto sm:block">
            <table className="sf-table">
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
                          <Building className="h-4 w-4 text-muted-foreground" />
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
                            <MessageCircle className="h-4 w-4" />
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
                          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground/70" />
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
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 font-medium hover:bg-muted disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="sheet-backdrop">
          <div className="sheet sm:max-w-md p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
                  className="field"
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
                  className="field"
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
                  className="field"
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
                  className="field"
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
                  className="field"
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
                  className="field"
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
        <div className="sheet-backdrop">
          <div className="sheet sm:max-w-md p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
                  className="field"
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
                  className="field"
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
                  className="field"
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
                  className="field"
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
                  className="field"
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
                  className="field"
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
