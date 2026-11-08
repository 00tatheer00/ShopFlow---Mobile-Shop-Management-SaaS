'use client';

import { useEffect, useState } from 'react';
import { Smartphone, X, Check, AlertCircle } from 'lucide-react';
import { formatPKR } from '@/lib/types';
import type { ProductWithStock } from './pos-types';

interface PosImeiPickerProps {
  product: ProductWithStock | null;
  cartImeis: Set<string>;
  onSelectImei: (product: ProductWithStock, imei: { id: string; imei_number: string }) => void;
  onClose: () => void;
}

export function PosImeiPicker({ product, cartImeis, onSelectImei, onClose }: PosImeiPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const availableImeis = (product.imei_records || [])
    .filter((r) => r.status === 'in_stock')
    .filter((r) => !cartImeis.has(r.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-2xl space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between pb-2.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-foreground">
                Select Box / IMEI
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {product.name} {product.model ? `(${product.model})` : ''} •{' '}
                <span className="font-bold text-foreground">{formatPKR(product.sale_price)}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Info hint */}
        <p className="text-[11px] text-muted-foreground">
          Check IMEI on box and tap matching number:
        </p>

        {/* List of IMEIs */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {availableImeis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center text-xs text-muted-foreground space-y-1.5">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <p className="font-bold text-foreground">All in-stock IMEIs are in basket or sold</p>
              <p className="text-[10px]">No available handsets for this model.</p>
            </div>
          ) : (
            availableImeis.map((imei, idx) => {
              const fullImei = imei.imei_number;
              const prefix = fullImei.slice(0, Math.max(0, fullImei.length - 6));
              const lastSix = fullImei.slice(-6);

              return (
                <button
                  key={imei.id}
                  type="button"
                  onClick={() => onSelectImei(product, imei)}
                  className="w-full flex items-center justify-between min-h-[38px] rounded-lg border border-border bg-background p-2 text-left hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="font-mono text-xs">
                      <span className="text-muted-foreground text-[11px]">{prefix}</span>
                      <span className="font-black text-primary tracking-wide bg-primary/10 px-1 py-0.2 rounded ml-0.5">
                        {lastSix}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Select</span>
                    <Check className="h-3 w-3" />
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

