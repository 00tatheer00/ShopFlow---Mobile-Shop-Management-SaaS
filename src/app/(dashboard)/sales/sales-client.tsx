'use client';

import { toast } from 'sonner';
import { Badge, PageHeader, Segmented } from '@/components/ui/kit';
import { useState, useTransition, useMemo } from 'react';
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
import { StatCard } from '@/components/ui/stat-card';

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
  const [currentStatus, setCurrentStatus] = useState<string>(statusFilter);
  const [isPending, startTransition] = useTransition();

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [saleToCancel, setSaleToCancel] = useState<SaleWithRelations | null>(null);

  const canCancel = userRole === 'shop_owner' || userRole === 'manager';

  const displayedSales = useMemo(() => {
    if (!currentStatus) return sales;
    return sales.filter((s) => s.status === currentStatus);
  }, [sales, currentStatus]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (currentStatus) params.set('status', currentStatus);
    params.set('page', '1');
    router.push(`/sales?${params.toString()}`);
  }

  function handleFilterStatus(status: string) {
    setCurrentStatus(status);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (status) {
        url.searchParams.set('status', status);
      } else {
        url.searchParams.delete('status');
      }
      url.searchParams.set('page', '1');
      window.history.replaceState(null, '', url.toString());
    }
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (currentStatus) params.set('status', currentStatus);
    params.set('page', String(newPage));
    router.push(`/sales?${params.toString()}`);
  }

  async function executeCancel(sale: SaleWithRelations) {
    startTransition(async () => {
      const res = await cancelSale(sale.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        setSaleToCancel(null);
        toast.success('Sale cancelled — stock returned', { description: 'سیل منسوخ، مال واپس اسٹاک میں' });
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
    const rows = displayedSales.map((sale) => [
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
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <PageHeader
        title="Sales Record"
        ur="سیل کا ریکارڈ"
        icon={Receipt}
        tone="emerald"
        description={<>Completed transactions, receipts, customer invoices, and POS history — {totalCount} total record{totalCount !== 1 ? 's' : ''}.</>}
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

          <Link
            href="/sales/new"
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            <span>New Sale (POS)</span>
          </Link>
        </>
      }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
        <StatCard
          title="Total Sale"
          ur="کل سیل"
          value={formatPKR(totalRevenue)}
          subtitle="Gross completed sales volume"
          icon={DollarSign}
          color="blue"
          urduDetail="کل مکمل شدہ سیلز کی مجموعی رقم (نقد اور ادھار ملا کر)۔"
        />

        <StatCard
          title="Today's Bills"
          ur="آج کے بل"
          value={todaySalesCount}
          subtitle="Transactions created today"
          icon={TrendingUp}
          color="emerald"
          urduDetail="آج کے دن دکان پر مکمل کیے جانے والے تمام سیل بلز کی تعداد۔"
        />

        <StatCard
          title="Udhaar to Collect"
          ur="وصول کرنا باقی"
          value={formatPKR(totalUdhaarDue)}
          subtitle="Unpaid balances from credit invoices"
          icon={Receipt}
          color="amber"
          urduDetail="سیلز بلز میں سے وہ ادھار رقم جو گاہکوں سے ابھی وصول ہونا باقی ہے۔"
        />
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
            className="field pr-4 pl-10"
          />
        </form>

        <Segmented
          value={currentStatus}
          onChange={handleFilterStatus}
          options={[
            { value: '', label: 'All' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </div>

      {/* Sales Table */}
      {displayedSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No sales found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || currentStatus ? 'Try adjusting your search criteria or status filter.' : 'Create your first sale in the POS terminal.'}
          </p>
          {!search && !currentStatus && (
            <Link
              href="/sales/new"
              className="btn btn-primary mt-4"
            >
              <Plus className="h-4 w-4" />
              Open POS
            </Link>
          )}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {/* Phone: card list */}
          <ul className="divide-y divide-border sm:hidden">
            {displayedSales.map((sale) => {
              const isCancelled = sale.status === 'cancelled';
              return (
                <li key={sale.id} className={`flex items-start justify-between gap-3 p-4 ${isCancelled ? 'opacity-60' : ''}`}>
                  <button type="button" onClick={() => openReceipt(sale)} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-semibold text-foreground">{sale.customer?.name || 'Walk-in customer'}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {sale.invoice_number} ·{' '}
                      {new Date(sale.created_at).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Karachi' })}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={isCancelled ? 'rose' : 'emerald'} dot>{isCancelled ? 'Cancelled' : 'Completed'}</Badge>
                      <Badge tone="slate">{sale.payment_method.replace('_', ' ')}</Badge>
                      {sale.amount_due > 0 && !isCancelled && <Badge tone="amber">Udhaar {formatPKR(sale.amount_due)}</Badge>}
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-base font-bold text-foreground">{formatPKR(sale.total_amount)}</span>
                    <div className="flex">
                      <button onClick={() => openReceipt(sale)} className="icon-btn" aria-label="View receipt">
                        <Eye className="h-4 w-4" />
                      </button>
                      {canCancel && !isCancelled && (
                        <button onClick={() => setSaleToCancel(sale)} className="icon-btn hover:!text-rose-600" aria-label="Cancel sale">
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto sm:block">
            <table className="sf-table">
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
                {displayedSales.map((sale) => {
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
                        <Badge tone={isCancelled ? 'rose' : 'emerald'} dot>
                          {isCancelled ? 'Cancelled' : 'Completed'}
                        </Badge>
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
