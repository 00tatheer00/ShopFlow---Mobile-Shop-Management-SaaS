'use client';

import { useState, useMemo } from 'react';
import {
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

  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 15);
  }, [customers, customerSearch]);

  const numericCashReceived = cashReceived === '' ? 0 : Number(cashReceived);
  const cashChange = paymentOption === 'cash' && numericCashReceived > totalRupees
    ? numericCashReceived - totalRupees
    : 0;

  const numericUdhaarPaid = udhaarPaidNow === '' ? 0 : Number(udhaarPaidNow);
  const remainingUdhaar = Math.max(0, totalRupees - numericUdhaarPaid);

  const handleQuickCash = (addition: number | 'exact') => {
    if (addition === 'exact') {
      onChangeCashReceived(totalRupees);
    } else {
      const base = typeof cashReceived === 'number' ? cashReceived : totalRupees;
      onChangeCashReceived(base + addition);
    }
  };

  return (
    <div className="flex flex-col space-y-3 pb-2">
      {/* 1. Customer (Gahak) Row */}
      <div>
        <div className="flex items-center gap-1 mb-1">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Customer (Gahak)
          </label>
          <CardInfoTooltip
            title="Customer (گاہک)"
            urduDetail="نقد فروخت کے لیے واک ان کسٹمر ٹھیک ہے۔ ادھار کے لیے گاہک منتخب کرنا لازمی ہے۔"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Select Customer */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-left flex items-center justify-between text-xs text-slate-800 dark:text-slate-100 hover:border-slate-400 transition cursor-pointer"
            >
              <span className="truncate">
                {activeCustomer ? `${activeCustomer.name} (${activeCustomer.phone})` : 'Walk-in customer'}
              </span>
              <span className="text-slate-400 text-[10px]">▾</span>
            </button>

            {isCustomerDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 shadow-xl p-1.5 space-y-1">
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  autoFocus
                  className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />

                <div className="max-h-40 overflow-y-auto space-y-0.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCustomer('');
                      setIsCustomerDropdownOpen(false);
                      setCustomerSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition cursor-pointer ${
                      !selectedCustomerId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>Walk-in customer</span>
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
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition cursor-pointer ${
                        selectedCustomerId === c.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="truncate">
                        <div>{c.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.phone}</div>
                      </div>
                      {selectedCustomerId === c.id && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* + New Button */}
          <button
            type="button"
            onClick={onOpenQuickAddCustomer}
            className="h-9 px-3 rounded-lg border border-indigo-500 text-indigo-600 dark:text-indigo-400 font-medium text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer shrink-0"
          >
            + New
          </button>
        </div>

        {paymentOption === 'udhaar' && !selectedCustomerId && (
          <div className="mt-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Customer required for Udhaar.</span>
          </div>
        )}
      </div>

      {/* 2. Subtotal Row */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Rs {subtotalRupees.toLocaleString('en-PK')}
        </span>
      </div>

      {/* 3. Discount Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <span className="text-slate-500 dark:text-slate-400">Discount</span>
          <CardInfoTooltip
            title="Discount (رعایت)"
            urduDetail="گاہک کو دی جانے والی رعایت۔ آپ روپے (Rs) یا فیصد (%) میں درج کر سکتے ہیں۔"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="0"
            placeholder="0"
            value={discountValue === 0 ? '' : discountValue}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onDiscountChange(isNaN(val) ? 0 : val, discountType);
            }}
            className="h-8 w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-right text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          />

          <div className="inline-flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => onDiscountChange(discountValue, 'pkr')}
              className={`px-2 py-1 text-xs transition cursor-pointer ${
                discountType === 'pkr'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Rs
            </button>
            <button
              type="button"
              onClick={() => onDiscountChange(discountValue, 'percent')}
              className={`px-2 py-1 text-xs border-l border-slate-300 dark:border-slate-700 transition cursor-pointer ${
                discountType === 'percent'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50'
              }`}
            >
              %
            </button>
          </div>
        </div>
      </div>

      {/* 4. Total to Pay Box (Dark Navy matching Mockup) */}
      <div className="rounded-xl bg-[#0d1527] p-3.5 text-white shadow-sm space-y-0.5">
        <div className="flex items-center gap-1 text-slate-300 text-xs font-normal">
          <span>Total to pay</span>
          <CardInfoTooltip
            title="Total to pay"
            variant="invert"
            urduDetail="کل رقم جو گاہک نے ادا کرنی ہے (رعایت کے بعد)"
          />
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight leading-tight">
          Rs {totalRupees.toLocaleString('en-PK')}
        </div>
      </div>

      {/* 5. Pay with (2x2 Grid) */}
      <PosPaymentTiles
        selected={paymentOption}
        onSelect={onSelectPaymentOption}
      />

      {/* 6. Received Section (when Cash selected) */}
      {paymentOption === 'cash' && (
        <div className="space-y-1.5 pt-0.5">
          <label className="text-xs font-normal text-slate-600 dark:text-slate-400 block">
            Received
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-normal">
              Rs
            </span>
            <input
              type="number"
              min="0"
              placeholder={String(totalRupees)}
              value={cashReceived}
              onChange={(e) => {
                const val = e.target.value;
                onChangeCashReceived(val === '' ? '' : Number(val));
              }}
              className="h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quick Cash Chips matching Mockup: [ Exact ]  [ +500 ]  [ +1000 ] */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => handleQuickCash('exact')}
              className="px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-[11px] text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              Exact
            </button>
            <button
              type="button"
              onClick={() => handleQuickCash(500)}
              className="px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-[11px] text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              +500
            </button>
            <button
              type="button"
              onClick={() => handleQuickCash(1000)}
              className="px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-[11px] text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              +1000
            </button>
          </div>

          {/* Change to return */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Change to return
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Rs {cashChange.toLocaleString('en-PK')}
            </span>
          </div>
        </div>
      )}

      {/* Udhaar Specific Section */}
      {paymentOption === 'udhaar' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>Paid now (optional):</span>
            <input
              type="number"
              min="0"
              max={totalRupees}
              placeholder="0"
              value={udhaarPaidNow}
              onChange={(e) => {
                const val = e.target.value;
                onChangeUdhaarPaidNow(val === '' ? '' : Number(val));
              }}
              className="h-7 w-20 rounded border border-slate-300 bg-white px-2 text-right text-xs"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-amber-900 pt-1 border-t border-amber-200">
            <span>Remaining Udhaar:</span>
            <span>Rs {remainingUdhaar.toLocaleString('en-PK')}</span>
          </div>
        </div>
      )}

      {/* 7. Complete Sale Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onCompleteSale}
          disabled={!canComplete || isPending}
          className={`w-full h-10 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            canComplete && !isPending
              ? 'bg-[#16a34a] hover:bg-[#15803d] text-white'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>Complete sale</span>
            </>
          )}
        </button>
      </div>

      {/* 8. Footer Shortcuts Hint */}
      <p className="text-[11px] text-center text-slate-400 font-normal">
        F2 search · Ctrl+Enter complete
      </p>
    </div>
  );
}
