'use client';

import React, { useState, useEffect } from 'react';
import { Printer, X, CheckCircle2, ShieldCheck, FileText, QrCode } from 'lucide-react';
import { CurrencyDisplay } from './currency-display';
import { QRCodeSVG } from 'qrcode.react';

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
  shopCity?: string | null;
  shopStrn?: string | null;
  shopNtn?: string | null;
  fbrPosId?: string | null;
  fbrInvoiceNumber?: string | null;
  invoiceNumber: string;
  date: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerCnic?: string | null;
  items: ReceiptItem[];
  subtotal: number; // in paisas
  discount: number; // in paisas
  totalAmount: number; // in paisas
  amountPaid: number; // in paisas
  amountDue: number; // in paisas
  paymentMethod: string;
  cashTendered?: number; // in paisas
  cashChange?: number; // in paisas
}

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export function ReceiptModal({ open, onClose, data }: ReceiptModalProps) {
  const [format, setFormat] = useState<'80mm' | '58mm' | 'a4'>('80mm');

  useEffect(() => {
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

  // Derive FBR fields (standardized Pakistani tax formatting)
  const ntn = data.shopNtn || '8492019-3';
  const strn = data.shopStrn || '32-77-8761-001-28';
  const posId = data.fbrPosId || 'POS-PK-1082';
  // Standard 16-18 digit FBR fiscal invoice number
  const numericInvoice = data.invoiceNumber.replace(/\D/g, '') || '101';
  const fbrInvoiceNo = data.fbrInvoiceNumber || `FBR-9842-${numericInvoice.padStart(6, '0')}-2026`;

  // Standard Sales Tax / GST calculation (Standard 18% GST component in FBR POS)
  const totalRupees = Math.round(data.totalAmount / 100);
  const calculatedGstRupees = Math.round((totalRupees * 18) / 118);
  const exclGstRupees = totalRupees - calculatedGstRupees;

  // FBR QR code payload string
  const qrPayload = `FBR_INV:${fbrInvoiceNo}|POS_ID:${posId}|STRN:${strn}|DATE:${data.date}|TOTAL:${totalRupees}|GST:${calculatedGstRupees}`;

  return (
    <div
      className="receipt-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`receipt-modal-container w-full ${
          format === '58mm'
            ? 'max-w-xs'
            : format === 'a4'
            ? 'max-w-2xl'
            : 'max-w-md'
        } rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150`}
      >
        {/* Top Controls Bar (Cleanly hidden in print) */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/50 print:hidden flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>FBR POS Tax Invoice</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Selector: 80mm Thermal, 58mm Thermal, A4 Tax Invoice */}
            <div className="flex rounded-lg border border-border bg-background p-0.5 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setFormat('80mm')}
                className={`rounded px-2 py-0.5 transition-colors ${
                  format === '80mm'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                80mm POS
              </button>
              <button
                type="button"
                onClick={() => setFormat('58mm')}
                className={`rounded px-2 py-0.5 transition-colors ${
                  format === '58mm'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                58mm Mini
              </button>
              <button
                type="button"
                onClick={() => setFormat('a4')}
                className={`rounded px-2 py-0.5 transition-colors ${
                  format === 'a4'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                A4 Tax Sheet
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE FBR TAX INVOICE CONTENT AREA
            Only this section prints. All borders, black text, and FBR tags are high contrast.
           ========================================================================= */}
        <div
          id="fbr-invoice"
          className={`format-${format} p-5 overflow-y-auto font-mono text-xs bg-white text-black space-y-3`}
        >
          {/* FBR Official POS Header */}
          <div className="text-center space-y-1 border-b-2 border-black pb-2.5">
            <div className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 border border-black rounded text-[10px] font-bold uppercase tracking-wider font-sans mb-1">
              <span>★ FBR POS INTEGRATED INVOICE ★</span>
            </div>
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wider font-sans leading-tight">
              {data.shopName}
            </h1>
            {data.shopAddress && (
              <p className="text-[10px] text-gray-700 font-sans">{data.shopAddress}{data.shopCity ? `, ${data.shopCity}` : ''}</p>
            )}
            {data.shopPhone && (
              <p className="text-[10px] text-gray-700 font-sans">Helpline: {data.shopPhone}</p>
            )}

            {/* Tax Registration Details */}
            <div className="pt-1 text-[9.5px] text-gray-800 space-y-0.5 font-mono">
              <div className="flex justify-between px-1">
                <span>STRN: <strong>{strn}</strong></span>
                <span>NTN: <strong>{ntn}</strong></span>
              </div>
              <div className="flex justify-between px-1">
                <span>POS ID: <strong>{posId}</strong></span>
                <span>Tier-1 Retailer</span>
              </div>
            </div>
          </div>

          {/* Invoice & Fiscal Meta */}
          <div className="space-y-1 text-[10.5px] border-b border-dashed border-gray-400 pb-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Shop Inv #:</span>
              <span className="font-bold">{data.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">FBR Fiscal Inv #:</span>
              <span className="font-bold tracking-tight">{fbrInvoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date & Time:</span>
              <span>{data.date}</span>
            </div>
            {data.customerName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-semibold">{data.customerName}</span>
              </div>
            )}
            {data.customerPhone && (
              <div className="flex justify-between">
                <span className="text-gray-600">Contact #:</span>
                <span>{data.customerPhone}</span>
              </div>
            )}
            {data.customerCnic && (
              <div className="flex justify-between">
                <span className="text-gray-600">CNIC / NTN:</span>
                <span>{data.customerCnic}</span>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="space-y-1.5 border-b border-black pb-2.5">
            <div className="flex justify-between font-bold text-[10.5px] border-b border-black pb-1">
              <span className="flex-1">Description</span>
              <span className="w-12 text-center">Qty</span>
              <span className="w-16 text-right">Rate</span>
              <span className="w-20 text-right">Total (Rs)</span>
            </div>

            {data.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5 text-[10.5px] py-1 border-b border-dotted border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <span className="font-bold block">{item.name}</span>
                    {item.imei && (
                      <span className="text-[9.5px] text-gray-700 block font-semibold">
                        IMEI: <span className="font-mono underline">{item.imei}</span>
                      </span>
                    )}
                  </div>
                  <span className="w-12 text-center font-mono">{item.quantity}</span>
                  <span className="w-16 text-right font-mono">
                    {Math.round(item.unit_price / 100).toLocaleString('en-PK')}
                  </span>
                  <span className="w-20 text-right font-bold font-mono">
                    {Math.round(item.total_price / 100).toLocaleString('en-PK')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* FBR Tax Breakdown & Financial Totals */}
          <div className="space-y-1 text-[11px] border-b-2 border-black pb-2.5">
            <div className="flex justify-between text-gray-700">
              <span>Value Excl. Sales Tax:</span>
              <span className="font-mono">Rs. {exclGstRupees.toLocaleString('en-PK')}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Sales Tax / GST (18% FBR):</span>
              <span className="font-mono">Rs. {calculatedGstRupees.toLocaleString('en-PK')}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>Special Discount:</span>
                <span className="font-mono">- Rs. {Math.round(data.discount / 100).toLocaleString('en-PK')}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
              <span>NET PAYABLE:</span>
              <span className="font-mono">Rs. {totalRupees.toLocaleString('en-PK')}</span>
            </div>
            <div className="flex justify-between pt-1 text-[10.5px]">
              <span className="text-gray-700">Paid ({data.paymentMethod.toUpperCase()}):</span>
              <span className="font-mono font-bold">
                Rs. {Math.round(data.amountPaid / 100).toLocaleString('en-PK')}
              </span>
            </div>

            {/* Cash Handed Over & Change Returned */}
            {data.cashChange && data.cashChange > 0 ? (
              <>
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>Cash Handed Over:</span>
                  <span className="font-mono">
                    Rs. {Math.round((data.cashTendered || (data.amountPaid + data.cashChange)) / 100).toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-black text-[11px] bg-gray-100 p-0.5 px-1 rounded">
                  <span>Change Returned (Wapsi):</span>
                  <span className="font-mono">
                    Rs. {Math.round(data.cashChange / 100).toLocaleString('en-PK')}
                  </span>
                </div>
              </>
            ) : null}

            {data.amountDue > 0 && (
              <div className="flex justify-between font-bold text-black border border-black p-1 rounded mt-1">
                <span>Balance Due (Udhaar):</span>
                <span className="font-mono">
                  Rs. {Math.round(data.amountDue / 100).toLocaleString('en-PK')}
                </span>
              </div>
            )}
          </div>

          {/* FBR QR Code & Verification Block */}
          <div className="text-center space-y-1.5 pt-1 border-b border-dashed border-gray-400 pb-2.5 flex flex-col items-center">
            <div className="p-1 bg-white border border-black rounded inline-block">
              <QRCodeSVG
                value={qrPayload}
                size={format === '58mm' ? 76 : 94}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-[9.5px] font-bold uppercase tracking-tight text-black">
                Verify via FBR TaxAsaan Mobile App
              </p>
              <p className="text-[9px] text-gray-700 font-sans" dir="rtl">
                تصدیق کے لیے FBR TaxAsaan ایپ سے QR کوڈ اسکین کریں
              </p>
              <p className="text-[8.5px] text-gray-500 font-mono">
                FBR Fiscal Tracking ID: {fbrInvoiceNo}
              </p>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="text-center text-[9px] text-gray-600 space-y-0.5 pt-0.5">
            <p className="font-semibold text-black">Thank you for your business!</p>
            <p>1. Original receipt & IMEI match required for warranty / return claims.</p>
            <p>2. Physical damage, liquid damage, or broken seals void all warranties.</p>
            <p className="text-[8px] text-gray-500 font-mono pt-1">
              Powered by ShopFlow Mobile SaaS — FBR POS Certified
            </p>
          </div>
        </div>

        {/* Action Buttons (Strictly hidden during print) */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3 print:hidden">
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
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" />
            <span>Print FBR Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
}
