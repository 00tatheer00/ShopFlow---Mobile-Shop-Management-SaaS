'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, Printer, MessageSquare, Plus, Check } from 'lucide-react';
import { formatPKR } from '@/lib/types';
import type { CompletedSaleInfo } from './pos-types';

interface PosSuccessDialogProps {
  open: boolean;
  sale: CompletedSaleInfo | null;
  shopName: string;
  onPrintReceipt: () => void;
  onNewSale: () => void;
}

export function PosSuccessDialog({
  open,
  sale,
  shopName,
  onPrintReceipt,
  onNewSale,
}: PosSuccessDialogProps) {
  const printButtonRef = useRef<HTMLButtonElement>(null);

  // Autofocus primary print button on open
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        printButtonRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // Handle keyboard: Esc closes/new sale, Enter triggers focused button
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onNewSale();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onNewSale]);

  if (!open || !sale) return null;

  // Build WhatsApp text
  const handleWhatsApp = () => {
    const due = Math.max(0, sale.total - sale.amountPaid);
    const lines = [
      `*${shopName || 'ShopFlow Mobile'}*`,
      `Invoice: ${sale.invoiceNumber}`,
      `Date: ${sale.date}`,
      ``,
      `*Items:*`,
      ...sale.items.map(
        (it) =>
          `• ${it.name}${it.imei ? ` (IMEI: ...${it.imei.slice(-6)})` : ''} x${it.quantity} - Rs ${it.unit_price.toLocaleString('en-PK')}`
      ),
      ``,
      `*Total: Rs ${sale.total.toLocaleString('en-PK')}*`,
      `*Paid: Rs ${sale.amountPaid.toLocaleString('en-PK')} (${sale.paymentMethod.toUpperCase()})*`,
    ];

    if (due > 0) {
      lines.push(`*Remaining Udhaar: Rs ${due.toLocaleString('en-PK')}*`);
    }

    lines.push(``);
    lines.push(`شکریہ! دوبارہ تشریف لائیں۔ (Thank you!)`);

    const encodedText = encodeURIComponent(lines.join('\n'));
    let url = `https://wa.me/?text=${encodedText}`;

    if (sale.customerPhone) {
      const cleanPhone = sale.customerPhone.replace(/\D/g, '');
      const internationalPhone = cleanPhone.startsWith('0')
        ? `92${cleanPhone.slice(1)}`
        : cleanPhone.startsWith('92')
        ? cleanPhone
        : `92${cleanPhone}`;
      url = `https://wa.me/${internationalPhone}?text=${encodedText}`;
    }

    window.open(url, '_blank');
  };

  const amountDue = Math.max(0, sale.total - sale.amountPaid);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onNewSale();
      }}
    >
      <div className="w-full max-w-md rounded-3xl border-2 border-border bg-card p-6 shadow-2xl space-y-5 text-center">
        {/* Success Icon */}
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mb-3 border-2 border-emerald-400/40 animate-in zoom-in-75 duration-200">
            <Check className="h-9 w-9 stroke-[3]" />
          </div>
          <h2 className="text-xl font-black text-foreground">
            Sale Completed Successfully!
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-urdu" dir="rtl">
            فروخت کامیابی کے ساتھ درج ہو چکی ہے۔
          </p>
        </div>

        {/* Invoice Summary Card */}
        <div className="rounded-2xl border-2 border-border bg-muted/40 p-4 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/80">
            <span className="text-muted-foreground font-semibold">Invoice Number</span>
            <span className="font-mono font-black text-foreground text-sm">
              {sale.invoiceNumber}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-semibold">Customer</span>
            <span className="font-bold text-foreground">
              {sale.customerName || 'Walk-in Customer'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-semibold">Payment Mode</span>
            <span className="font-extrabold uppercase text-foreground">
              {sale.paymentMethod}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/80">
            <span className="text-xs font-bold text-foreground">Total Amount</span>
            <span className="font-black text-base text-emerald-600 dark:text-emerald-400">
              {formatPKR(sale.total * 100)}
            </span>
          </div>

          {amountDue > 0 && (
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 font-bold">
              <span>Remaining Udhaar:</span>
              <span className="font-black">{formatPKR(amountDue * 100)}</span>
            </div>
          )}
        </div>

        {/* 3 Primary Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* 1. Print Thermal Receipt (Primary & Auto-focused) */}
          <button
            ref={printButtonRef}
            type="button"
            onClick={onPrintReceipt}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition shadow-md cursor-pointer active:scale-[0.99]"
          >
            <Printer className="h-4 w-4" />
            <span>Print Thermal Receipt</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-primary-foreground/20 text-[10px] font-mono">
              Enter
            </kbd>
          </button>

          {/* 2. Send on WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full h-11 rounded-xl border-2 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition cursor-pointer"
          >
            <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Send Receipt on WhatsApp</span>
          </button>

          {/* 3. New Sale CTA */}
          <button
            type="button"
            onClick={onNewSale}
            className="w-full h-11 rounded-xl border-2 border-border bg-card hover:bg-muted text-foreground font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Start New Sale</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground">
              Esc
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
