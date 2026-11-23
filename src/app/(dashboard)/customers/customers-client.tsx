'use client';

import { Badge, PageHeader } from '@/components/ui/kit';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Users,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  FileText,
  History,
  X,
  Download,
  ArrowDownLeft,
} from 'lucide-react';
import type { Customer, UserRole } from '@/lib/types';
import { formatPKR } from '@/lib/types';
import { createCustomer, updateCustomer, deleteCustomer } from './actions';
import { recordUdhaarPayment } from '@/app/(dashboard)/udhaar/actions';
import { toast } from 'sonner';
import { hasPermission } from '@/lib/permissions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { exportToCSV } from '@/lib/export-csv';

interface CustomerWithUdhaar extends Customer {
  udhaar_balance?: number;
}

interface CustomersClientProps {
  customers: CustomerWithUdhaar[];
  userRole: UserRole;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  search: string;
}

export function CustomersClient({
  customers,
  userRole,
  totalCount,
  currentPage,
  totalPages,
  search: initialSearch,
}: CustomersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithUdhaar | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerWithUdhaar | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Udhaar Recovery Modal State
  const [settlingCustomer, setSettlingCustomer] = useState<CustomerWithUdhaar | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleError, setSettleError] = useState<string | null>(null);

  const canCreate = hasPermission(userRole, 'customers:create');
  const canEdit = hasPermission(userRole, 'customers:edit');
  const canDelete = hasPermission(userRole, 'customers:delete');

  async function handleSettleUdhaarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSettleError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await recordUdhaarPayment(formData);
      if (res.error) {
        setSettleError(res.error);
        toast.error(res.error);
      } else {
        const amt = Number(formData.get('amount')) || 0;
        toast.success(`Received Rs ${amt.toLocaleString('en-PK')} from ${settlingCustomer?.name || 'customer'}!`);
        setSettlingCustomer(null);
        setSettleAmount('');
        router.refresh();
      }
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    params.set('page', '1');
    router.push(`/customers?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(newPage));
    router.push(`/customers?${params.toString()}`);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createCustomer(formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setIsAddModalOpen(false);
        toast.success('Customer added', { description: 'گاہک شامل ہو گیا' });
        router.refresh();
      }
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingCustomer) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateCustomer(editingCustomer.id, formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setEditingCustomer(null);
        toast.success('Customer updated', { description: 'معلومات محفوظ ہو گئیں' });
        router.refresh();
      }
    });
  }

  async function executeDelete(customer: CustomerWithUdhaar) {
    startTransition(async () => {
      const res = await deleteCustomer(customer.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        setCustomerToDelete(null);
        toast.success('Customer removed', { description: 'گاہک ہٹا دیا گیا' });
        router.refresh();
      }
    });
  }

  function getWhatsAppUrl(phone: string, customerName?: string, udhaarBalance?: number) {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.slice(1);
    } else if (cleaned.length === 10 && cleaned.startsWith('3')) {
      cleaned = '92' + cleaned;
    }
    let url = `https://wa.me/${cleaned}`;
    if (udhaarBalance && udhaarBalance > 0 && customerName) {
      const amountStr = `Rs. ${Math.round(udhaarBalance / 100).toLocaleString()}`;
      const msg = encodeURIComponent(
        `Assalam-o-Alaikum ${customerName},\n\nAapke zimme hamari dukaan ka ${amountStr} baqaya (Udhaar) hai.\nBaraye meherbani jald az jald ada kijiye.\n\nShukriya!`
      );
      url += `?text=${msg}`;
    }
    return url;
  }

  const handleExportCSV = () => {
    const headers = [
      'Customer Name',
      'Phone',
      'Address',
      'Udhaar Balance (PKR)',
      'Status',
    ];
    const rows = customers.map((c) => [
      c.name,
      c.phone || '',
      c.address || '',
      c.udhaar_balance ? Math.round(c.udhaar_balance / 100) : 0,
      c.is_active ? 'ACTIVE' : 'INACTIVE',
    ]);
    exportToCSV('customers_directory', headers, rows);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <PageHeader
        title="Customers"
        ur="گاہک"
        icon={Users}
        tone="pink"
        description={<>Manage your customer database, contact details, and credit records ({totalCount} total).</>}
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
              <span>Add Customer</span>
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
            placeholder="Search by customer name or phone number..."
            className="field pr-4 pl-10"
          />
        </form>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              router.push('/customers');
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" /> Clear search
          </button>
        )}
      </div>

      {/* Customers Table / Cards */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No customers found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? 'Try adjusting your search terms.' : 'Add your first customer to get started.'}
          </p>
          {canCreate && !search && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary mt-4"
            >
              <Plus className="h-4 w-4" />
              Add First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {/* Phone: card list */}
          <ul className="divide-y divide-border sm:hidden">
            {customers.map((customer) => {
              const udhaar = customer.udhaar_balance || 0;
              return (
                <li key={customer.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{customer.name}</p>
                      <p className="font-mono text-sm text-muted-foreground">{customer.phone}</p>
                    </div>
                    {udhaar > 0 ? (
                      <Badge tone="amber">Udhaar {formatPKR(udhaar)}</Badge>
                    ) : (
                      <Badge tone="emerald" dot>Clear</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {udhaar > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSettleError(null);
                          setSettlingCustomer(customer);
                          setSettleAmount(String(Math.round(udhaar / 100)));
                        }}
                        className="btn btn-sm btn-success"
                      >
                        <ArrowDownLeft className="h-4 w-4" /> Receive
                      </button>
                    )}
                    <a
                      href={getWhatsAppUrl(customer.phone, customer.name, udhaar)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline"
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
                    </a>
                    <Link href={`/udhaar?search=${encodeURIComponent(customer.name)}`} className="icon-btn" aria-label="Khata history">
                      <History className="h-4 w-4" />
                    </Link>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setFormError(null);
                          setEditingCustomer(customer);
                        }}
                        className="icon-btn"
                        aria-label="Edit customer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setCustomerToDelete(customer)} className="icon-btn hover:!text-rose-600" aria-label="Delete customer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto sm:block">
            <table className="sf-table">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Address</th>
                  <th className="px-4 py-3 font-semibold text-right">Udhaar (Due)</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((customer) => {
                  const udhaar = customer.udhaar_balance || 0;
                  return (
                    <tr key={customer.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground">{customer.name}</div>
                        {customer.notes && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
                            <FileText className="h-3 w-3 shrink-0" />
                            {customer.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-foreground">{customer.phone}</span>
                          <a
                            href={getWhatsAppUrl(customer.phone, customer.name, udhaar)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            title={udhaar > 0 ? "Send Udhaar reminder on WhatsApp" : "Chat on WhatsApp"}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell text-xs text-muted-foreground">
                        {customer.address ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                            <span className="line-clamp-1">{customer.address}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium">
                        {udhaar > 0 ? (
                          <Link
                            href={`/udhaar?search=${encodeURIComponent(customer.name)}`}
                            className="inline-flex justify-end hover:opacity-80 transition-opacity"
                            title="View customer Udhaar transactions"
                          >
                            <CurrencyDisplay amount={udhaar} isPaisas={true} variant="danger" size="xs" />
                          </Link>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Nil (Clear)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {udhaar > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSettleError(null);
                                setSettlingCustomer(customer);
                                setSettleAmount(String(Math.round(udhaar / 100)));
                              }}
                              className="btn btn-success"
                              title="Receive payment or clear Udhaar"
                            >
                              <ArrowDownLeft className="h-3 w-3" />
                              <span className="hidden sm:inline">Receive</span>
                            </button>
                          )}
                          <Link
                            href={`/udhaar?search=${encodeURIComponent(customer.name)}`}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="View Khata / Ledger History"
                          >
                            <History className="h-4 w-4" />
                          </Link>
                          {canEdit && (
                            <button
                              onClick={() => {
                                setFormError(null);
                                setEditingCustomer(customer);
                              }}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Edit Customer"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setCustomerToDelete(customer)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors"
                              title="Delete Customer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="sheet-backdrop">
          <div className="sheet sm:max-w-md p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Add New Customer</h2>
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
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Muhammad Ali"
                  className="field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  required
                  placeholder="e.g. 03001234567"
                  className="field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. ali@example.com"
                  className="field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="e.g. Shop 4, Hafeez Centre, Lahore"
                  className="field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Special instructions or credit notes..."
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
                  {isPending ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="sheet-backdrop">
          <div className="sheet sm:max-w-md p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Edit Customer</h2>
              <button
                onClick={() => setEditingCustomer(null)}
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
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingCustomer.name}
                  className="field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  required
                  defaultValue={editingCustomer.phone}
                  className="field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingCustomer.email || ''}
                  className="field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={editingCustomer.address || ''}
                  className="field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingCustomer.notes || ''}
                  className="field"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
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

      {/* Settle / Receive Udhaar Payment Modal */}
      {settlingCustomer && (
        <div className="sheet-backdrop">
          <div className="sheet sm:max-w-md p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Receive Udhaar Payment (وصولی)</h2>
                  <p className="text-xs text-muted-foreground">Clear or reduce balance for {settlingCustomer.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSettlingCustomer(null);
                  setSettleError(null);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {settleError && (
              <div className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                {settleError}
              </div>
            )}

            <form onSubmit={handleSettleUdhaarSubmit} className="mt-4 space-y-4">
              <input type="hidden" name="customer_id" value={settlingCustomer.id} />

              {/* Customer Balance Banner */}
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3 text-xs flex justify-between items-center">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Current Outstanding Due</span>
                  <span className="font-semibold text-foreground">{settlingCustomer.name} ({settlingCustomer.phone})</span>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-base">
                  {formatPKR(settlingCustomer.udhaar_balance || 0)}
                </span>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    Amount Received (PKR) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSettleAmount(String(Math.round((settlingCustomer.udhaar_balance || 0) / 100)))}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                  >
                    Pay Full Amount (Clear Udhaar)
                  </button>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    Rs
                  </span>
                  <input
                    type="number"
                    name="amount"
                    min="1"
                    max={Math.round((settlingCustomer.udhaar_balance || 0) / 100)}
                    step="any"
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder={`Max ${Math.round((settlingCustomer.udhaar_balance || 0) / 100).toLocaleString()}`}
                    className="field pr-3 pl-10"
                  />
                </div>

                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSettleAmount(String(Math.round((settlingCustomer.udhaar_balance || 0) / 100)))}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    Clear Full (Rs {Math.round((settlingCustomer.udhaar_balance || 0) / 100).toLocaleString()})
                  </button>
                  {[500, 1000, 2000, 5000].map((preset) => {
                    if (preset >= Math.round((settlingCustomer.udhaar_balance || 0) / 100)) return null;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSettleAmount(String(preset))}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium border border-border hover:bg-muted text-muted-foreground transition cursor-pointer"
                      >
                        Rs {preset.toLocaleString()}
                      </button>
                    );
                  })}
                </div>

                {/* Live Remaining Balance Preview */}
                {Number(settleAmount) > 0 && (
                  <div className="mt-2 flex items-center justify-between text-xs px-2 text-muted-foreground bg-muted/40 p-1.5 rounded-lg">
                    <span>Remaining Balance:</span>
                    <span className="font-semibold text-foreground">
                      Rs {Math.max(0, Math.round((settlingCustomer.udhaar_balance || 0) / 100) - Number(settleAmount)).toLocaleString('en-PK')}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  name="payment_method"
                  defaultValue="cash"
                  className="field cursor-pointer"
                >
                  <option value="cash">Cash (نقد)</option>
                  <option value="easypaisa">EasyPaisa (ایزی پیسہ)</option>
                  <option value="jazzcash">JazzCash (جاز کیش)</option>
                  <option value="bank_transfer">Bank Transfer (بینک ٹرانسفر)</option>
                  <option value="other">Other (دیگر)</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  name="reference"
                  placeholder="e.g. TRX12345678 or Receipt #"
                  className="field"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  name="notes"
                  placeholder="e.g. Received money later from customer"
                  className="field"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSettlingCustomer(null);
                    setSettleError(null);
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !settleAmount || Number(settleAmount) <= 0}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isPending ? 'Recording...' : 'Confirm Receipt (وصولی)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Customer Deletion */}
      <ConfirmationDialog
        open={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={() => {
          if (customerToDelete) executeDelete(customerToDelete);
        }}
        title="Delete Customer?"
        description={`Are you sure you want to delete customer "${customerToDelete?.name}"? If this customer has existing Udhaar or sales history, their past transaction entries will be preserved for financial audit.`}
        confirmLabel="Delete Customer"
        variant="danger"
        loading={isPending}
      />
    </div>
  );
}
