'use client';

import { useEffect } from 'react';
import { X, Check, Loader2, Store, User, ShoppingBag } from 'lucide-react';
import type { ReceiptData } from '@/components/ui/receipt-modal';

interface PosReceiptConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  data: ReceiptData | null;
}

export function PosReceiptConfirmModal({
  open,
  onClose,
  onConfirm,
  isPending,
  data,
}: PosReceiptConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, isPending]);

  if (!open || !data) return null;

  const totalRupees = Math.round(data.totalAmount / 100);
  const subtotalRupees = Math.round(data.subtotal / 100);
  const discountRupees = Math.round(data.discount / 100);
  const paidRupees = Math.round(data.amountPaid / 100);
  const dueRupees = Math.round(data.amountDue / 100);
  const tenderedRupees = data.cashTendered ? Math.round(data.cashTendered / 100) : null;
  const changeRupees = data.cashChange ? Math.round(data.cashChange / 100) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in-0 duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-emerald-600" />
              Receipt Preview & Confirm Sale
            </h2>
            <p className="text-[11px] text-slate-500">
              Please review receipt breakdown before recording transaction
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Receipt Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs font-mono">
          {/* Shop Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1">
            <div className="font-bold text-base text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Store className="h-4 w-4 text-indigo-600 inline" />
              {data.shopName}
            </div>
            {data.shopAddress && (
              <p className="text-[11px] text-slate-500 font-sans">{data.shopAddress}</p>
            )}
            {data.shopPhone && (
              <p className="text-[11px] text-slate-500">Phone: {data.shopPhone}</p>
            )}
            <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              PRE-SALE RECEIPT VERIFICATION
            </div>
          </div>

          {/* Invoice & Customer Meta */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
            <div>
              <span className="text-slate-400 block text-[10px]">Invoice Preview</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{data.invoiceNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Date & Time</span>
              <span className="text-slate-700 dark:text-slate-300">{data.date}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Customer</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <User className="h-3 w-3 text-slate-400 inline" />
                {data.customerName || 'Walk-in customer'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Payment Method</span>
              <span className="font-bold uppercase text-indigo-600 dark:text-indigo-400">
                {data.paymentMethod}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1">
              <span className="col-span-6">Item / Description</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 py-1.5 text-xs">
                  <div className="col-span-6 pr-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                      {item.name}
                    </span>
                    {item.imei && (
                      <span className="text-[10px] text-slate-400 font-mono block">
                        IMEI: {item.imei}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-center text-slate-700 dark:text-slate-300">
                    {item.quantity}
                  </div>
                  <div className="col-span-2 text-right text-slate-600 dark:text-slate-400">
                    {Math.round(item.unit_price / 100).toLocaleString('en-PK')}
                  </div>
                  <div className="col-span-2 text-right font-bold text-slate-800 dark:text-slate-100">
                    {Math.round(item.total_price / 100).toLocaleString('en-PK')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="pt-3 border-t-2 border-dashed border-slate-300 dark:border-slate-700 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Rs {subtotalRupees.toLocaleString('en-PK')}
              </span>
            </div>

            {discountRupees > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount Granted:</span>
                <span>- Rs {discountRupees.toLocaleString('en-PK')}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>Total Payable:</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                Rs {totalRupees.toLocaleString('en-PK')}
              </span>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-1">
              <span>Amount Paid:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Rs {paidRupees.toLocaleString('en-PK')}
              </span>
            </div>

            {tenderedRupees !== null && tenderedRupees > totalRupees && (
              <>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Cash Tendered:</span>
                  <span>Rs {tenderedRupees.toLocaleString('en-PK')}</span>
                </div>
                {changeRupees !== null && changeRupees > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold text-xs">
                    <span>Change to Return:</span>
                    <span>Rs {changeRupees.toLocaleString('en-PK')}</span>
                  </div>
                )}
              </>
            )}

            {dueRupees > 0 && (
              <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-rose-200 dark:border-rose-900/50">
                <span>Udhaar (Balance Due):</span>
                <span>Rs {dueRupees.toLocaleString('en-PK')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Confirm & Cancel Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
          >
            Cancel (Esc)
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-xs font-bold text-white shadow-md hover:shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Recording Sale...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Confirm Sale (Rs {totalRupees.toLocaleString('en-PK')})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

