'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  ShoppingCart,
  Receipt,
  Eye,
  Ban,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Download,
} from 'lucide-react';
import type { Customer, Sale, UserRole } from '@/lib/types';
import { formatPKR } from '@/lib/types';
import { cancelSale } from './actions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ReceiptModal, type ReceiptData } from '@/components/ui/receipt-modal';
import { exportToCSV } from '@/lib/export-csv';

interface SaleWithRelations extends Sale {
  customer?: Customer;
  sale_items?: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product?: { name: string; model: string | null } | null;
    imei?: string | null;
  }[];
}

interface SalesClientProps {
  sales: SaleWithRelations[];
  totalRevenue: number;
  todaySalesCount: number;
  totalUdhaarDue: number;
  userRole: UserRole;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  search: string;
  statusFilter: string;
  shopName?: string;
  shopPhone?: string | null;
  shopAddress?: string | null;
}

export function SalesClient({
  sales,
  totalRevenue,
  todaySalesCount,
  totalUdhaarDue,
  userRole,
  currentPage,
  totalPages,
  totalCount,
  search: initialSearch,
  statusFilter,
  shopName,
  shopPhone,
  shopAddress,
}: SalesClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [saleToCancel, setSaleToCancel] = useState<SaleWithRelations | null>(null);

  const canCancel = userRole === 'shop_owner' || userRole === 'manager';

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);
    params.set('page', '1');
    router.push(`/sales?${params.toString()}`);
  }

  function handleFilterStatus(status: string) {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    params.set('page', '1');
    router.push(`/sales?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);
    params.set('page', String(newPage));
    router.push(`/sales?${params.toString()}`);
  }

  async function executeCancel(sale: SaleWithRelations) {
    startTransition(async () => {
      const res = await cancelSale(sale.id);
      if (res.error) {
        alert(res.error);
      } else {
        setSaleToCancel(null);
        router.refresh();
      }
    });
  }

  function openReceipt(sale: SaleWithRelations) {
    const data: ReceiptData = {
      shopName: shopName || 'ShopFlow Mobile',
      shopPhone: shopPhone || null,
      shopAddress: shopAddress || null,
      invoiceNumber: sale.invoice_number,
      date: new Date(sale.created_at).toLocaleString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      customerName: sale.customer?.name || (sale.amount_due > 0 ? 'Valued Customer' : 'Walk-in Customer'),
      customerPhone: sale.customer?.phone || null,
      items: (sale.sale_items || []).map((item) => ({
        id: item.id,
        name: item.product?.name || 'Mobile Product',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        imei: item.imei || null,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      totalAmount: sale.total_amount,
      amountPaid: sale.amount_paid,
      amountDue: sale.amount_due,
      paymentMethod: sale.payment_method.toUpperCase(),
    };
    setReceiptData(data);
  }

  const handleExportCSV = () => {
    const headers = [
      'Invoice #',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Items Summary',
      'Subtotal (PKR)',
      'Discount (PKR)',
      'Total Amount (PKR)',
      'Amount Paid (PKR)',
      'Amount Due (PKR)',
      'Payment Method',
      'Status',
    ];
    const rows = sales.map((sale) => [
      sale.invoice_number,
      new Date(sale.created_at).toLocaleDateString('en-PK'),
      sale.customer?.name || 'Walk-in',
      sale.customer?.phone || '',
      (sale.sale_items || []).map((i) => `${i.product?.name || 'Item'} (x${i.quantity})`).join('; '),
      Math.round(sale.subtotal / 100),
      Math.round(sale.discount / 100),
      Math.round(sale.total_amount / 100),
      Math.round(sale.amount_paid / 100),
      Math.round(sale.amount_due / 100),
      sale.payment_method.toUpperCase(),
      sale.status.toUpperCase(),
    ]);
    exportToCSV('sales_history', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales History</h1>
          <p className="text-sm text-muted-foreground">
            View completed transactions, receipts, customer invoices, and POS history — {totalCount} total record{totalCount !== 1 ? 's' : ''}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground shadow-xs hover:bg-muted hover:border-emerald-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="h-4 w-4 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/sales/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>New Sale (POS)</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="premium-card border border-indigo-500/20 bg-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-primary" />
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Sales Revenue</span>
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">{formatPKR(totalRevenue)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Gross completed sales volume</p>
        </div>

        <div className="premium-card border border-emerald-500/20 bg-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Today&apos;s Invoices</span>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">{todaySalesCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">Transactions created today</p>
        </div>

        <div className="premium-card border border-amber-500/20 bg-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Sales on Credit (Udhaar)</span>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">{formatPKR(totalUdhaarDue)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Unpaid balances from credit invoices</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number or customer name..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </form>

        <div className="flex gap-2">
          {['', 'completed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => handleFilterStatus(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {st || 'All Statuses'}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Table */}
      {sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No sales found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? 'Try adjusting your search criteria.' : 'Create your first sale in the POS terminal.'}
          </p>
          {!search && (
            <Link
              href="/sales/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Open POS
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Invoice #</th>
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-right">Paid</th>
                  <th className="px-4 py-3 font-semibold text-right">Due</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sales.map((sale) => {
                  const isCancelled = sale.status === 'cancelled';
                  return (
                    <tr
                      key={sale.id}
                      className={`transition-colors hover:bg-muted/30 ${isCancelled ? 'opacity-60 bg-muted/20' : ''}`}
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-foreground">
                        {sale.invoice_number}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(sale.created_at).toLocaleString('en-PK', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3.5">
                        {sale.customer ? (
                          <div>
                            <div className="font-medium text-foreground">{sale.customer.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{sale.customer.phone}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Walk-in Customer</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium uppercase text-muted-foreground">
                          {sale.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-foreground">
                        {formatPKR(sale.total_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {formatPKR(sale.amount_paid)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium">
                        {sale.amount_due > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            {formatPKR(sale.amount_due)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                            isCancelled
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openReceipt(sale)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="View Receipt"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canCancel && !isCancelled && (
                            <button
                              onClick={() => setSaleToCancel(sale)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors"
                              title="Cancel Sale"
                            >
                              <Ban className="h-4 w-4" />
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

      {/* Standard 80mm Printable Thermal Receipt Modal */}
      <ReceiptModal
        open={!!receiptData}
        onClose={() => setReceiptData(null)}
        data={receiptData}
      />

      {/* Confirmation Dialog for Sale Cancellation */}
      <ConfirmationDialog
        open={!!saleToCancel}
        onClose={() => setSaleToCancel(null)}
        onConfirm={() => {
          if (saleToCancel) executeCancel(saleToCancel);
        }}
        title="Cancel Sale Invoice?"
        description={`Are you sure you want to cancel Invoice #${saleToCancel?.invoice_number}? This will permanently void this sale, return the purchased units to your inventory, and reverse any Udhaar balance recorded for this transaction.`}
        confirmLabel="Cancel Sale"
        variant="danger"
        loading={isPending}
      />
    </div>
  );
}
