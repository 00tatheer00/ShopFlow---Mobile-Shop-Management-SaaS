'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  MessageCircle,
  Plus,
  History,
  CheckCircle2,
  X,
  Building,
} from 'lucide-react';
import type { Customer, UdhaarLedgerEntry, UserRole } from '@/lib/types';
import { formatPKR } from '@/lib/types';
import { recordUdhaarPayment, addManualUdhaarCredit } from './actions';
import { hasPermission } from '@/lib/permissions';

interface CustomerUdhaarRow extends Customer {
  udhaar_balance: number;
  last_activity?: string;
}

interface UdhaarClientProps {
  customersWithBalance: CustomerUdhaarRow[];
  recentLedger: (UdhaarLedgerEntry & { customer?: Customer | null })[];
  totalUdhaar: number;
  debtorsCount: number;
  allCustomers: Customer[];
  userRole: UserRole;
  shopName: string;
}

export function UdhaarClient({
  customersWithBalance,
  recentLedger,
  totalUdhaar,
  debtorsCount,
  allCustomers,
  userRole,
  shopName,
}: UdhaarClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<'debtors' | 'history'>('debtors');
  const [search, setSearch] = useState('');

  // Modals
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<CustomerUdhaarRow | null>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = hasPermission(userRole, 'payments:create');

  // Filter debtors
  const filteredDebtors = customersWithBalance.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  async function handlePaymentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await recordUdhaarPayment(formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setPaymentModalCustomer(null);
        router.refresh();
      }
    });
  }

  async function handleCreditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await addManualUdhaarCredit(formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setIsCreditModalOpen(false);
        router.refresh();
      }
    });
  }

  function getWhatsAppReminderUrl(customer: CustomerUdhaarRow) {
    let cleaned = customer.phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.slice(1);
    }
    const amountStr = formatPKR(customer.udhaar_balance);
    const message = encodeURIComponent(
      `Assalam-o-Alaikum ${customer.name},\n\nAapke zimme ${shopName || 'Shop'} ka ${amountStr} baqaya (Udhaar) hai.\nBaraye meherbani jald az jald ada kijiye.\n\nShukriya!`
    );
    return `https://wa.me/${cleaned}?text=${message}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Udhaar (Khata)</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer credit, record recoveries (Vasooli), and send WhatsApp balance reminders.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFormError(null);
                setIsCreditModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Add Udhaar
            </button>
            <button
              onClick={() => {
                setFormError(null);
                setPaymentModalCustomer(customersWithBalance[0] || null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Receive Payment (Vasooli)
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Outstanding Udhaar</span>
            <div className="rounded-lg bg-rose-500/10 p-2">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {formatPKR(totalUdhaar)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Market debt to be collected</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Customers with Udhaar</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold text-foreground">{debtorsCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">Customers who currently owe balance</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Ledger Transactions</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold text-foreground">{recentLedger.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">Recent credits & debits logged</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('debtors')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition ${
              activeTab === 'debtors'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wallet className="h-4 w-4" />
            Customer Balances ({customersWithBalance.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-4 w-4" />
            Ledger History
          </button>
        </div>
      </div>

      {/* Tab 1: Customer Balances */}
      {activeTab === 'debtors' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by customer name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {filteredDebtors.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <h3 className="mt-3 text-base font-semibold text-foreground">No outstanding udhaar!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {search ? 'No debtors match your search query.' : 'All customer accounts are settled and clear.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="px-4 py-3 font-semibold text-right">Balance Due</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredDebtors.map((customer) => (
                      <tr key={customer.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-foreground">{customer.name}</div>
                          {customer.address && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {customer.address}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-foreground">
                          {customer.phone}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-sm font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                            {formatPKR(customer.udhaar_balance)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={getWhatsAppReminderUrl(customer)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                              title="Send WhatsApp Payment Reminder"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              Reminder
                            </a>
                            {canManage && (
                              <button
                                onClick={() => {
                                  setFormError(null);
                                  setPaymentModalCustomer(customer);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                              >
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                                Receive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Ledger History */}
      {activeTab === 'history' && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No ledger entries found.
                    </td>
                  </tr>
                ) : (
                  recentLedger.map((entry) => {
                    const isCredit = entry.type === 'credit';
                    return (
                      <tr key={entry.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString('en-PK', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {entry.customer?.name || 'Customer'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                              isCredit
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}
                          >
                            {isCredit ? (
                              <>
                                <ArrowUpRight className="h-3 w-3" /> Udhaar Given
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft className="h-3 w-3" /> Payment Received
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {entry.description || '—'}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            isCredit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatPKR(entry.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-foreground">
                          {formatPKR(entry.balance_after)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receive Payment Modal */}
      {paymentModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Receive Udhaar Payment</h2>
                <p className="text-xs text-muted-foreground">Customer: {paymentModalCustomer.name}</p>
              </div>
              <button
                onClick={() => setPaymentModalCustomer(null)}
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

            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs flex justify-between items-center">
              <span className="text-muted-foreground">Current Due Balance:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                {formatPKR(paymentModalCustomer.udhaar_balance)}
              </span>
            </div>

            <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-4">
              <input type="hidden" name="customer_id" value={paymentModalCustomer.id} />

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Amount Received (PKR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  min="1"
                  max={Math.max(1, paymentModalCustomer.udhaar_balance / 100)}
                  step="any"
                  required
                  placeholder={`Max ${paymentModalCustomer.udhaar_balance / 100}`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  name="payment_method"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="cash">Cash</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  name="reference"
                  placeholder="e.g. TRX12345678"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  name="notes"
                  placeholder="e.g. Received via brother at shop"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPaymentModalCustomer(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Udhaar (Credit) Modal */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Add Udhaar (Credit)</h2>
              <button
                onClick={() => setIsCreditModalOpen(false)}
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

            <form onSubmit={handleCreditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Select Customer <span className="text-rose-500">*</span>
                </label>
                <select
                  name="customer_id"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Choose Customer --</option>
                  {allCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Udhaar Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  min="1"
                  step="any"
                  required
                  placeholder="e.g. 5000"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Reason / Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="description"
                  required
                  placeholder="e.g. Mobile repair charges credit, charger purchase"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreditModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Add Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
