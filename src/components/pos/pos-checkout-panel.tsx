'use client';

import { useState, useMemo } from 'react';
import {
  User,
  Plus,
  Check,
  AlertTriangle,
  Loader2,
  Percent,
} from 'lucide-react';
import { formatPKR } from '@/lib/types';
import { CardInfoTooltip } from '@/components/ui/card-info-tooltip';
import { PosPaymentTiles, type PosPaymentOption } from './pos-payment-tiles';
import type { Customer } from '@/lib/types';

interface PosCheckoutPanelProps {
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  onOpenQuickAddCustomer: () => void;
  subtotalRupees: number;
  discountRupees: number;
  discountType: 'pkr' | 'percent';
  discountValue: number;
  onDiscountChange: (value: number, type: 'pkr' | 'percent') => void;
  totalRupees: number;
  paymentOption: PosPaymentOption;
  onSelectPaymentOption: (option: PosPaymentOption) => void;
  cashReceived: number | '';
  onChangeCashReceived: (val: number | '') => void;
  udhaarPaidNow: number | '';
  onChangeUdhaarPaidNow: (val: number | '') => void;
  isPending: boolean;
  canComplete: boolean;
  disabledReason?: string;
  onCompleteSale: () => void;
}

export function PosCheckoutPanel({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onOpenQuickAddCustomer,
  subtotalRupees,
  discountRupees,
  discountType,
  discountValue,
  onDiscountChange,
  totalRupees,
  paymentOption,
  onSelectPaymentOption,
  cashReceived,
  onChangeCashReceived,
  udhaarPaidNow,
  onChangeUdhaarPaidNow,
  isPending,
  canComplete,
  disabledReason,
  onCompleteSale,
}: PosCheckoutPanelProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Selected customer object
  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  // Filtered customer list for combobox
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 15);
  }, [customers, customerSearch]);

  // Cash change calculation
  const numericCashReceived = cashReceived === '' ? 0 : Number(cashReceived);
  const cashChange = paymentOption === 'cash' && numericCashReceived > totalRupees
    ? numericCashReceived - totalRupees
    : 0;

  // Udhaar calculation
  const numericUdhaarPaid = udhaarPaidNow === '' ? 0 : Number(udhaarPaidNow);
  const remainingUdhaar = Math.max(0, totalRupees - numericUdhaarPaid);

  // Discount percentage check (> 10%)
  const isHighDiscount = subtotalRupees > 0 && discountRupees > subtotalRupees * 0.1;

  // Quick cash chips click
  const handleQuickCash = (addition: number | 'exact') => {
    if (addition === 'exact') {
      onChangeCashReceived(totalRupees);
    } else {
      const base = typeof cashReceived === 'number' ? cashReceived : totalRupees;
      onChangeCashReceived(base + addition);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border-2 border-border bg-card shadow-xs overflow-hidden">
      {/* Scrollable controls area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3.5">
        {/* Customer Selection Row */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Customer (گاہک)
              </label>
              <CardInfoTooltip
                title="Customer (گاہک)"
                urduDetail="نقد فروخت کے لیے واک ان کسٹمر ٹھیک ہے۔ لیکن ادھار فروخت کے لیے گاہک کا نام منتخب کرنا ضروری ہے۔"
              />
            </div>

            <button
              type="button"
              onClick={onOpenQuickAddCustomer}
              className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
              className="w-full h-11 rounded-xl border-2 border-border bg-background px-3 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-foreground hover:border-primary/50 transition cursor-pointer shadow-2xs"
            >
              <span className="truncate">
                {activeCustomer ? `${activeCustomer.name} (${activeCustomer.phone})` : 'Walk-in Customer'}
              </span>
              <span className="text-muted-foreground text-xs">▾</span>
            </button>

            {isCustomerDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border-2 border-border bg-card shadow-xl p-2 space-y-1">
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  autoFocus
                  className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />

                <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCustomer('');
                      setIsCustomerDropdownOpen(false);
                      setCustomerSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-left transition cursor-pointer ${
                      !selectedCustomerId ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span>Walk-in Customer</span>
                    {!selectedCustomerId && <Check className="h-3.5 w-3.5" />}
                  </button>

                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectCustomer(c.id);
                        setIsCustomerDropdownOpen(false);
                        setCustomerSearch('');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-left transition cursor-pointer ${
                        selectedCustomerId === c.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{c.phone}</div>
                      </div>
                      {selectedCustomerId === c.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Block Walk-in for Udhaar warning */}
          {paymentOption === 'udhaar' && !selectedCustomerId && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Customer Required for Udhaar</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  Udhaar requires selecting a customer so we know who owes money.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Subtotal & Discount Row */}
        <div className="pt-2 border-t border-border/70 space-y-2">
          {/* Subtotal */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-muted-foreground">Subtotal</span>
            <span className="font-black text-sm text-foreground">
              {formatPKR(subtotalRupees * 100)}
            </span>
          </div>

          {/* Discount with Rs / % toggle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <span className="font-bold text-muted-foreground">Discount</span>
                <CardInfoTooltip
                  title="Discount (رعایت)"
                  urduDetail="گاہک کو دی جانے والی رعایت۔ آپ روپے (Rs) یا فیصد (%) میں درج کر سکتے ہیں۔"
                />
              </div>

              {/* Rs / % Mode Toggle */}
              <div className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-0.5">
                <button
                  type="button"
                  onClick={() => onDiscountChange(discountValue, 'pkr')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold transition cursor-pointer ${
                    discountType === 'pkr'
                      ? 'bg-background text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Rs
                </button>
                <button
                  type="button"
                  onClick={() => onDiscountChange(discountValue, 'percent')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold transition cursor-pointer ${
                    discountType === 'percent'
                      ? 'bg-background text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  %
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  {discountType === 'pkr' ? 'Rs' : '%'}
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="0"
                  value={discountValue === 0 ? '' : discountValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onDiscountChange(isNaN(val) ? 0 : val, discountType);
                  }}
                  className="h-11 w-full rounded-xl border-2 border-border bg-background pl-9 pr-3 text-right text-xs sm:text-sm font-black text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {discountType === 'percent' && discountValue > 0 && (
                <span className="text-xs font-bold text-muted-foreground shrink-0">
                  ≈ {formatPKR(discountRupees * 100)}
                </span>
              )}
            </div>

            {isHighDiscount && (
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Warning: Discount is greater than 10% of subtotal.
              </p>
            )}
          </div>
        </div>

        {/* DARK NAVY TOTAL BOX */}
        <div className="rounded-2xl bg-slate-900 dark:bg-[#0B1528] text-white p-4 border-2 border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Net Total
              </span>
              <CardInfoTooltip
                title="Net Total"
                variant="invert"
                urduDetail="کل رقم جو گاہک نے ادا کرنی ہے (رعایت کے بعد)"
              />
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Final Payable</span>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
            {formatPKR(totalRupees * 100)}
          </div>
        </div>

        {/* Payment Method Tiles */}
        <PosPaymentTiles
          selected={paymentOption}
          onSelect={onSelectPaymentOption}
        />

        {/* Cash Tendered & Change Section */}
        {paymentOption === 'cash' && (
          <div className="rounded-xl border-2 border-border bg-muted/20 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Received from Customer
              </label>
              <button
                type="button"
                onClick={() => handleQuickCash('exact')}
                className="text-xs font-black text-primary hover:underline cursor-pointer"
              >
                Exact (Rs {totalRupees.toLocaleString('en-PK')})
              </button>
            </div>

            {/* Received Input (48px tall) */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                Rs
              </span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                placeholder={String(totalRupees)}
                value={cashReceived}
                onChange={(e) => {
                  const val = e.target.value;
                  onChangeCashReceived(val === '' ? '' : Number(val));
                }}
                className="h-12 w-full rounded-xl border-2 border-border bg-background pl-10 pr-3 text-right text-base font-black text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Quick Cash Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickCash('exact')}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition cursor-pointer"
              >
                Exact
              </button>
              <button
                type="button"
                onClick={() => handleQuickCash(500)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition cursor-pointer"
              >
                +500
              </button>
              <button
                type="button"
                onClick={() => handleQuickCash(1000)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition cursor-pointer"
              >
                +1,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickCash(5000)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition cursor-pointer"
              >
                +5,000
              </button>
            </div>

            {/* Change to Return Banner */}
            {cashChange > 0 ? (
              <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/50 p-2.5 text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider block">
                    Change to Return (واپسی)
                  </span>
                  <span className="font-urdu text-[11px] text-emerald-800 dark:text-emerald-300" dir="rtl">
                    گاہک کو بقایا واپس کریں
                  </span>
                </div>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {formatPKR(cashChange * 100)}
                </span>
              </div>
            ) : numericCashReceived > 0 && numericCashReceived < totalRupees ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                <span className="font-bold">Short by:</span>
                <span className="font-black text-amber-700 dark:text-amber-300">
                  {formatPKR((totalRupees - numericCashReceived) * 100)}
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* Udhaar Specific Section */}
        {paymentOption === 'udhaar' && (
          <div className="rounded-xl border-2 border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 p-3 space-y-2.5">
            {activeCustomer && (
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-amber-200 dark:border-amber-800/60">
                <span className="text-muted-foreground font-semibold">Previous Udhaar Balance:</span>
                <span className="font-black text-foreground">
                  {formatPKR(0)}
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Paid Now (نقد وصولی)
                </label>
                <span className="text-[10px] text-muted-foreground">Optional down payment</span>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  Rs
                </span>
                <input
                  type="number"
                  min="0"
                  max={totalRupees}
                  placeholder="0 (Full Udhaar)"
                  value={udhaarPaidNow}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChangeUdhaarPaidNow(val === '' ? '' : Number(val));
                  }}
                  className="h-10 w-full rounded-xl border-2 border-border bg-background pl-9 pr-3 text-right text-xs sm:text-sm font-black text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-lg bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 p-2 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-950 dark:text-amber-200 block">
                  Remaining Udhaar (باقی ادھار)
                </span>
                <span className="text-[10px] text-amber-800 dark:text-amber-300">
                  Will be recorded in customer ledger
                </span>
              </div>
              <span className="text-base font-black text-amber-900 dark:text-amber-200">
                {formatPKR(remainingUdhaar * 100)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pinned Bottom Area: Complete Sale Button (Always Visible) */}
      <div className="shrink-0 p-3 sm:p-4 bg-muted/40 border-t-2 border-border space-y-1.5">
        <button
          type="button"
          onClick={onCompleteSale}
          disabled={!canComplete || isPending}
          className={`w-full h-14 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] cursor-pointer ${
            canComplete && !isPending
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-700'
              : 'bg-muted border-2 border-border text-muted-foreground cursor-not-allowed opacity-75'
          }`}
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing Sale...</span>
            </>
          ) : canComplete ? (
            <>
              <Check className="h-5 w-5 stroke-[3]" />
              <span>Complete Sale ({formatPKR(totalRupees * 100)})</span>
            </>
          ) : (
            <span>{disabledReason || 'Cannot complete sale'}</span>
          )}
        </button>

        <p className="text-[10px] text-center text-muted-foreground font-medium">
          Press <kbd className="px-1 py-0.2 rounded bg-muted border border-border font-mono font-bold text-foreground">Ctrl+Enter</kbd> to complete sale
        </p>
      </div>
    </div>
  );
}
