'use client';

import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { CurrencyDisplay } from './currency-display';

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number; // in paisas
  total_price: number; // in paisas
  imei?: string | null;
}

export interface ReceiptData {
  shopName: string;
  shopPhone?: string | null;
  shopAddress?: string | null;
  invoiceNumber: string;
  date: string;
  customerName?: string | null;
  customerPhone?: string | null;
  items: ReceiptItem[];
  subtotal: number; // in paisas
  discount: number; // in paisas
  totalAmount: number; // in paisas
  amountPaid: number; // in paisas
  amountDue: number; // in paisas
  paymentMethod: string;
}

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export function ReceiptModal({ open, onClose, data }: ReceiptModalProps) {
  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Top Modal Controls (Hidden when printing) */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/40 print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Sale Completed Successfully</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thermal Receipt Printable Area (Standard 80mm format) */}
        <div id="thermal-receipt" className="p-6 overflow-y-auto font-mono text-xs text-foreground bg-white text-black space-y-4">
          {/* Header */}
          <div className="text-center space-y-1 border-b border-dashed border-gray-300 pb-3">
            <h2 className="text-base font-bold uppercase tracking-wider font-sans">{data.shopName}</h2>
            {data.shopAddress && <p className="text-[11px] text-gray-600">{data.shopAddress}</p>}
            {data.shopPhone && <p className="text-[11px] text-gray-600">Tel: {data.shopPhone}</p>}
          </div>

          {/* Invoice Meta */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 pb-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice:</span>
              <span className="font-bold">{data.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span>{data.date}</span>
            </div>
            {data.customerName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{data.customerName}</span>
              </div>
            )}
            {data.customerPhone && (
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span>{data.customerPhone}</span>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-2 border-b border-dashed border-gray-300 pb-3">
            <div className="flex justify-between font-bold text-[11px] text-gray-700">
              <span>Item</span>
              <span>Total</span>
            </div>
            {data.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5 text-[11px]">
                <div className="flex justify-between font-medium">
                  <span className="truncate max-w-[170px]">{item.name}</span>
                  <CurrencyDisplay amount={item.total_price} isPaisas={true} size="xs" />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>
                    {item.quantity} x {Math.round(item.unit_price / 100)}
                  </span>
                  {item.imei && <span className="font-mono">IMEI: {item.imei}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Totals & Payments */}
          <div className="space-y-1.5 text-[11px] border-b border-dashed border-gray-300 pb-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <CurrencyDisplay amount={data.subtotal} isPaisas={true} size="xs" />
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>- Rs. {Math.round(data.discount / 100).toLocaleString('en-PK')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-200">
              <span>Total:</span>
              <CurrencyDisplay amount={data.totalAmount} isPaisas={true} size="sm" />
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-gray-600">Paid ({data.paymentMethod}):</span>
              <CurrencyDisplay amount={data.amountPaid} isPaisas={true} size="xs" />
            </div>
            {data.amountDue > 0 && (
              <div className="flex justify-between font-bold text-red-600 bg-red-50 p-1.5 rounded">
                <span>Balance Due (Udhaar):</span>
                <CurrencyDisplay amount={data.amountDue} isPaisas={true} size="xs" variant="danger" />
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center text-[10px] text-gray-500 space-y-1 pt-1">
            <p>Thank you for shopping with us!</p>
            <p className="text-[9px] text-gray-400">Powered by ShopFlow SaaS</p>
          </div>
        </div>

        {/* Action Buttons (Hidden when printing) */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-2.5 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors text-center"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
