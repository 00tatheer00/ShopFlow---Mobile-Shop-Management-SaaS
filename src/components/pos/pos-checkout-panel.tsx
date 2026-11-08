'use client';

import { useState, useMemo } from 'react';
import {
  User,
  Plus,
  Check,
  AlertTriangle,
  Loader2,
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
    <div className="flex flex-col h-full rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      {/* Scrollable controls area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2.5 space-y-2">
        {/* Customer Selection Row */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 text-primary" />
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
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
              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>New</span>
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
              className="w-full h-8.5 rounded-lg border border-border bg-background px-2.5 text-left flex items-center justify-between text-xs font-medium text-foreground hover:border-primary/50 transition cursor-pointer shadow-2xs"
            >
              <span className="truncate">
                {activeCustomer ? `${activeCustomer.name} (${activeCustomer.phone})` : 'Walk-in Customer'}
              </span>
              <span className="text-muted-foreground text-[10px]">▾</span>
            </button>

            {isCustomerDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-card shadow-xl p-1.5 space-y-1">
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  autoFocus
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none font-normal"
                />

                <div className="max-h-40 overflow-y-auto space-y-0.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCustomer('');
                      setIsCustomerDropdownOpen(false);
                      setCustomerSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium text-left transition cursor-pointer ${
                      !selectedCustomerId ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span>Walk-in Customer</span>
                    {!selectedCustomerId && <Check className="h-3 w-3" />}
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
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium text-left transition cursor-pointer ${
                        selectedCustomerId === c.id
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono font-normal">{c.phone}</div>
                      </div>
                      {selectedCustomerId === c.id && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Block Walk-in for Udhaar warning */}
          {paymentOption === 'udhaar' && !selectedCustomerId && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-2 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[11px]">Customer Required for Udhaar</p>
                <p className="text-[10px] text-amber-800 dark:text-amber-300 font-normal">
                  Select a customer so we know who owes money.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Subtotal & Discount Row */}
        <div className="pt-1.5 border-t border-border/70 space-y-1.5">
          {/* Subtotal */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-normal text-muted-foreground text-[11px]">Subtotal</span>
            <span className="font-semibold text-xs text-foreground">
              {formatPKR(subtotalRupees * 100)}
            </span>
          </div>

          {/* Discount with Rs / % toggle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <span className="font-normal text-muted-foreground text-[11px]">Discount</span>
                <CardInfoTooltip
                  title="Discount (رعایت)"
                  urduDetail="گاہک کو دی جانے والی رعایت۔ آپ روپے (Rs) یا فیصد (%) میں درج کر سکتے ہیں۔"
                />
              </div>

              {/* Rs / % Mode Toggle */}
              <div className="inline-flex items-center rounded-md border border-border bg-muted/60 p-0.5">
                <button
                  type="button"
                  onClick={() => onDiscountChange(discountValue, 'pkr')}
                  className={`px-1.5 py-0.2 rounded text-[10px] font-medium transition cursor-pointer ${
                    discountType === 'pkr'
                      ? 'bg-background text-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Rs
                </button>
                <button
                  type="button"
                  onClick={() => onDiscountChange(discountValue, 'percent')}
                  className={`px-1.5 py-0.2 rounded text-[10px] font-medium transition cursor-pointer ${
                    discountType === 'percent'
                      ? 'bg-background text-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  %
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-normal text-muted-foreground">
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
                  className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-2.5 text-right text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {discountType === 'percent' && discountValue > 0 && (
                <span className="text-[11px] font-normal text-muted-foreground shrink-0">
                  ≈ {formatPKR(discountRupees * 100)}
                </span>
              )}
            </div>

            {isHighDiscount && (
              <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Warning: Discount &gt; 10% of subtotal.
              </p>
            )}
          </div>
        </div>

        {/* COMPACT DARK NAVY TOTAL BOX */}
        <div className="rounded-xl bg-slate-900 dark:bg-[#0B1528] text-white p-2.5 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-300">
                Net Total
              </span>
              <CardInfoTooltip
                title="Net Total"
                variant="invert"
                urduDetail="کل رقم جو گاہک نے ادا کرنی ہے (رعایت کے بعد)"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-normal">Final Payable</span>
          </div>

          <div className="text-lg font-bold text-emerald-400 tracking-tight leading-tight">
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
          <div className="rounded-lg border border-border bg-muted/20 p-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Received from Customer
              </label>
              <button
                type="button"
                onClick={() => handleQuickCash('exact')}
                className="text-[10px] font-medium text-primary hover:underline cursor-pointer"
              >
                Exact (Rs {totalRupees.toLocaleString('en-PK')})
              </button>
            </div>

            {/* Received Input */}
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-normal text-muted-foreground">
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
                className="h-8.5 w-full rounded-lg border border-border bg-background pl-8 pr-2.5 text-right text-xs font-medium text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Quick Cash Chips */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickCash('exact')}
                className="px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-[10px] font-medium text-foreground transition cursor-pointer"
              >
                Exact
              </button>
              <button
                type="button"
                onClick={() => handleQuickCash(500)}
                className="px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-[10px] font-medium text-foreground transition cursor-pointer"
              >
                +500
              </button>
              <button
                type="button"
                onClick={() => handleQuickCash(1000)}
                className="px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-[10px] font-medium text-foreground transition cursor-pointer"
              >
                +1,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickCash(5000)}
                className="px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-[10px] font-medium text-foreground transition cursor-pointer"
              >
                +5,000
              </button>
            </div>

            {/* Change to Return Banner */}
            {cashChange > 0 ? (
              <div className="rounded-lg border border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/50 p-1.5 text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider block leading-tight">
                    Change to Return (واپسی)
                  </span>
                  <span className="font-urdu text-[10px] text-emerald-800 dark:text-emerald-300 font-normal" dir="rtl">
                    بقایا واپس کریں
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatPKR(cashChange * 100)}
                </span>
              </div>
            ) : numericCashReceived > 0 && numericCashReceived < totalRupees ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-1.5 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between">
                <span className="font-medium text-[10px]">Short by:</span>
                <span className="font-semibold text-xs text-amber-700 dark:text-amber-300">
                  {formatPKR((totalRupees - numericCashReceived) * 100)}
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* Udhaar Specific Section */}
        {paymentOption === 'udhaar' && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 p-2 space-y-1.5">
            {activeCustomer && (
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-amber-200 dark:border-amber-800/60 font-normal">
                <span className="text-muted-foreground">Previous Balance:</span>
                <span className="font-semibold text-foreground">
                  {formatPKR(0)}
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Paid Now (نقد وصولی)
                </label>
                <span className="text-[9px] text-muted-foreground font-normal">Optional</span>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-normal text-muted-foreground">
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
                  className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-2.5 text-right text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-md bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 p-1.5 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-[11px] text-amber-950 dark:text-amber-200 block leading-tight">
                  Remaining Udhaar (باقی ادھار)
                </span>
                <span className="text-[9px] text-amber-800 dark:text-amber-300 font-normal">
                  Recorded in ledger
                </span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                {formatPKR(remainingUdhaar * 100)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pinned Bottom Area: Complete Sale Button (Always Visible) */}
      <div className="shrink-0 p-2 sm:p-2.5 bg-muted/40 border-t border-border space-y-1">
        <button
          type="button"
          onClick={onCompleteSale}
          disabled={!canComplete || isPending}
          className={`w-full h-9 sm:h-9.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.99] cursor-pointer ${
            canComplete && !isPending
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-700'
              : 'bg-muted border border-border text-muted-foreground cursor-not-allowed opacity-75'
          }`}
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Processing Sale...</span>
            </>
          ) : canComplete ? (
            <>
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Complete Sale ({formatPKR(totalRupees * 100)})</span>
            </>
          ) : (
            <span>{disabledReason || 'Cannot complete sale'}</span>
          )}
        </button>

        <p className="text-[9px] text-center text-muted-foreground font-normal">
          Press <kbd className="px-1 py-0.2 rounded bg-muted border border-border font-mono font-medium text-foreground">Ctrl+Enter</kbd> to complete sale
        </p>
      </div>
    </div>
  );
}
