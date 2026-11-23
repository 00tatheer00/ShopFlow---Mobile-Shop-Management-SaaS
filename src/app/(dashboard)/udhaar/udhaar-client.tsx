'use client';

import { PageHeader } from '@/components/ui/kit';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Download,
} from 'lucide-react';
import type { Customer, UdhaarLedgerEntry, UserRole } from '@/lib/types';
import { formatPKR } from '@/lib/types';
import { recordUdhaarPayment, addManualUdhaarCredit } from './actions';
import { hasPermission } from '@/lib/permissions';
import { exportToCSV } from '@/lib/export-csv';
import { StatCard } from '@/components/ui/stat-card';
import { toast } from 'sonner';

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
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<'debtors' | 'history'>('debtors');
  const [search, setSearch] = useState('');

  // Modals
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);
  const [selectedDebtorId, setSelectedDebtorId] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Apply ?search= / ?receive= from the URL (adjusted during render when the URL changes)
  const paramsKey = searchParams.toString();
  const [handledParams, setHandledParams] = useState<string | null>(null);
  if (paramsKey !== handledParams) {
    setHandledParams(paramsKey);
    const q = searchParams.get('search');
    if (q) setSearch(q);
    const receiveId = searchParams.get('receive') || searchParams.get('customer');
    if (receiveId) {
      setSelectedDebtorId(receiveId);
      const match = customersWithBalance.find((c) => c.id === receiveId);
      if (match) setAmountInput(String(Math.round(match.udhaar_balance / 100)));
      setIsReceivePaymentOpen(true);
    }
  }

  const canManage = hasPermission(userRole, 'udhaar:payment');
  const canAddCredit = hasPermission(userRole, 'udhaar:credit');

  const currentSelectedCustomer = customersWithBalance.find((c) => c.id === selectedDebtorId);

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
        toast.error(res.error);
      } else {
        const amt = Number(formData.get('amount')) || 0;
        toast.success(`Payment of Rs ${amt.toLocaleString('en-PK')} recorded successfully!`);
        setIsReceivePaymentOpen(false);
        setSelectedDebtorId('');
        setAmountInput('');
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
        toast.error(res.error);
      } else {
        const amt = Number(formData.get('amount')) || 0;
        toast.success(`Udhaar credit of Rs ${amt.toLocaleString('en-PK')} added successfully!`);
        setIsCreditModalOpen(false);
        router.refresh();
      }
    });
  }

  function getWhatsAppReminderUrl(customer: CustomerUdhaarRow) {
    let cleaned = customer.phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.slice(1);
    } else if (cleaned.length === 10 && cleaned.startsWith('3')) {
      cleaned = '92' + cleaned;
    }
    const amountStr = formatPKR(customer.udhaar_balance);
    const message = encodeURIComponent(
      `Assalam-o-Alaikum ${customer.name},\n\nAapke zimme ${shopName || 'Shop'} ka ${amountStr} baqaya (Udhaar) hai.\nBaraye meherbani jald az jald ada kijiye.\n\nShukriya!`
    );
    return `https://wa.me/${cleaned}?text=${message}`;
  }

  const handleExportCSV = () => {
    const headers = [
      'Customer Name',
      'Phone',
      'Address',
      'Current Udhaar Balance (PKR)',
      'Last Activity',
    ];
    const rows = customersWithBalance.map((c) => [
      c.name,
      c.phone || '',
      c.address || '',
      Math.round(c.udhaar_balance / 100),
      c.last_activity ? new Date(c.last_activity).toLocaleDateString('en-PK') : 'N/A',
    ]);
    exportToCSV('udhaar_ledger', headers, rows);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <PageHeader
        title="Udhaar Khata"
        ur="ادھار کھاتہ"
        icon={Wallet}
        tone="amber"
        description={<>Manage customer credit, record recoveries (Vasooli), and send WhatsApp balance reminders.</>}
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

          {canManage && (
            <>
              {canAddCredit && (
              <button
                onClick={() => {
                  setFormError(null);
                  setIsCreditModalOpen(true);
                }}
                className="btn btn-outline"
              >
                <Plus className="h-4 w-4" />
                Add Udhaar
              </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setSelectedDebtorId(customersWithBalance[0]?.id || '');
                  setAmountInput('');
                  setIsReceivePaymentOpen(true);
                }}
                className="btn btn-success"
              >
                <ArrowDownLeft className="h-4 w-4" />
                Receive Payment (Vasooli)
              </button>
            </>
          )}
        </>
      }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          title="Udhaar to Collect"
          ur="وصول کرنا باقی"
          value={formatPKR(totalUdhaar)}
          subtitle="Market credit pending collection"
          icon={Wallet}
          color="rose"
          urduDetail="مارکیٹ اور گاہکوں سے دکان کا کل کتنا ادھار وصول ہونا باقی ہے۔"
        />

        <StatCard
          title="Customers with Udhaar"
          ur="ادھار والے گاہک"
          value={debtorsCount}
          subtitle="Customers who owe balance"
          icon={Building}
          color="blue"
          urduDetail="اس وقت کتنے گاہکوں کے کھاتے میں ادھار کی رقم واجب الادا ہے۔"
        />

        <StatCard
          title="Khata Entries"
          ur="کھاتے کی تعداد"
          value={recentLedger.length}
          subtitle="Recent credits & wasooli entries"
          icon={History}
          color="emerald"
          urduDetail="ادھار دینے اور وصولی کرنے کی اب تک کل کتنی انٹریز درج ہو چکی ہیں۔"
        />
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
              className="field pr-4 pl-10"
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
            <div className="panel overflow-hidden">
              {/* Phone: card list */}
              <ul className="divide-y divide-border sm:hidden">
                {filteredDebtors.map((customer) => (
                  <li key={customer.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{customer.name}</p>
                        <p className="font-mono text-sm text-muted-foreground">{customer.phone}</p>
                      </div>
                      <span className="shrink-0 font-mono text-lg font-bold text-amber-700 dark:text-amber-400">
                        {formatPKR(customer.udhaar_balance)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormError(null);
                            setSelectedDebtorId(customer.id);
                            setAmountInput('');
                            setIsReceivePaymentOpen(true);
                          }}
                          className="btn btn-success"
                        >
                          <ArrowDownLeft className="h-4 w-4" /> Receive
                        </button>
                      )}
                      <a href={getWhatsAppReminderUrl(customer)} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                        <MessageCircle className="h-4 w-4 text-emerald-600" /> Reminder
                      </a>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto sm:block">
                <table className="sf-table">
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
                          <span className="font-mono text-base font-bold text-amber-700 dark:text-amber-400">
                            {formatPKR(customer.udhaar_balance)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={getWhatsAppReminderUrl(customer)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline"
                              title="Send WhatsApp Payment Reminder"
                            >
                              <MessageCircle className="h-4 w-4 text-emerald-600" />
                              Reminder
                            </a>
                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormError(null);
                                    setSelectedDebtorId(customer.id);
                                    setAmountInput(String(Math.round(customer.udhaar_balance / 100)));
                                    setIsReceivePaymentOpen(true);
                                  }}
                                  className="btn btn-success"
                                  title="Clear entire outstanding balance"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormError(null);
                                    setSelectedDebtorId(customer.id);
                                    setAmountInput('');
                                    setIsReceivePaymentOpen(true);
                                  }}
                                  className="btn btn-outline"
                                  title="Record partial or custom payment"
                                >
                                  <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                                  Receive
                                </button>
                              </>
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
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="sf-table">
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
      {isReceivePaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Receive Udhaar Payment (وصولی)</h2>
                <p className="text-xs text-muted-foreground">Record recovery against customer credit balance</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReceivePaymentOpen(false);
                  setFormError(null);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                {formError}
              </div>
            )}

            {customersWithBalance.length === 0 ? (
              <div className="mt-6 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No Outstanding Udhaar</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  All customer accounts are settled and clear! There is currently no pending Udhaar to collect.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReceivePaymentOpen(false)}
                    className="px-4 py-2 rounded-lg bg-muted text-xs font-medium text-foreground hover:bg-muted/80 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-4">
                {/* 1. Customer Selector */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Select Customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="customer_id"
                    value={selectedDebtorId}
                    onChange={(e) => {
                      setSelectedDebtorId(e.target.value);
                      setAmountInput('');
                      setFormError(null);
                    }}
                    required
                    className="field cursor-pointer"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customersWithBalance.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) — Due: {formatPKR(c.udhaar_balance)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Customer Due Banner */}
                {currentSelectedCustomer && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Outstanding Due</span>
                      <span className="font-semibold text-foreground">{currentSelectedCustomer.name}</span>
                    </div>
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-base">
                      {formatPKR(currentSelectedCustomer.udhaar_balance)}
                    </span>
                  </div>
                )}

                {/* 3. Amount Received Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-foreground">
                      Amount Received (PKR) <span className="text-rose-500">*</span>
                    </label>
                    {currentSelectedCustomer && (
                      <button
                        type="button"
                        onClick={() => setAmountInput(String(Math.round(currentSelectedCustomer.udhaar_balance / 100)))}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                      >
                        Pay Full Amount
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      Rs
                    </span>
                    <input
                      type="number"
                      name="amount"
                      min="1"
                      max={currentSelectedCustomer ? Math.round(currentSelectedCustomer.udhaar_balance / 100) : undefined}
                      step="any"
                      required
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder={
                        currentSelectedCustomer
                          ? `Max ${Math.round(currentSelectedCustomer.udhaar_balance / 100).toLocaleString()}`
                          : 'Enter amount'
                      }
                      className="field pr-3 pl-10"
                    />
                  </div>

                  {/* Quick Preset Chips */}
                  {currentSelectedCustomer && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setAmountInput(String(Math.round(currentSelectedCustomer.udhaar_balance / 100)))}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        Full (Rs {Math.round(currentSelectedCustomer.udhaar_balance / 100).toLocaleString()})
                      </button>
                      {[500, 1000, 2000, 5000].map((preset) => {
                        if (preset >= Math.round(currentSelectedCustomer.udhaar_balance / 100)) return null;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAmountInput(String(preset))}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium border border-border hover:bg-muted text-muted-foreground transition cursor-pointer"
                          >
                            Rs {preset.toLocaleString()}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Remaining Balance Preview */}
                  {currentSelectedCustomer && Number(amountInput) > 0 && (
                    <div className="mt-2 flex items-center justify-between text-xs px-1 text-muted-foreground bg-muted/40 p-1.5 rounded-lg">
                      <span>Remaining Balance:</span>
                      <span className="font-semibold text-foreground">
                        Rs {Math.max(0, Math.round(currentSelectedCustomer.udhaar_balance / 100) - Number(amountInput)).toLocaleString('en-PK')}
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. Payment Method */}
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

                {/* 5. Reference / Transaction ID */}
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

                {/* 6. Notes */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    name="notes"
                    placeholder="e.g. Received via brother at shop"
                    className="field"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReceivePaymentOpen(false);
                      setFormError(null);
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !selectedDebtorId}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isPending ? 'Recording...' : 'Confirm Receipt (وصولی)'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Udhaar (Credit) Modal */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
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
                  className="field"
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
                  className="field"
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
                  className="field"
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
