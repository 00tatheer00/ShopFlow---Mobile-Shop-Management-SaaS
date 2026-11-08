'use client';

import { Smartphone, Package, Plus, Minus, Trash2, ShoppingBag, Edit3 } from 'lucide-react';
import { formatPKR } from '@/lib/types';
import type { CartItem } from './pos-types';
import type { Brand } from '@/lib/types';

interface PosBasketTableProps {
  cart: CartItem[];
  brands: Brand[];
  onUpdateQuantity: (index: number, newQty: number) => void;
  onUpdatePrice: (index: number, newPrice: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onFocusSearch: () => void;
}

export function PosBasketTable({
  cart,
  brands,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onClearCart,
  onFocusSearch,
}: PosBasketTableProps) {
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      {/* Basket Header */}
      <div className="shrink-0 px-3 py-1.5 bg-muted/40 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-primary/10 text-primary flex items-center justify-center font-medium">
            <ShoppingBag className="h-3 w-3" />
          </div>
          <h2 className="font-semibold text-xs text-foreground tracking-tight">
            Sale Basket
          </h2>
          <span className="rounded-full bg-primary/15 text-primary font-medium text-[10px] px-2 py-0.2 border border-primary/20">
            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-[10px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-0.5 rounded transition-colors cursor-pointer"
          >
            Clear Basket
          </button>
        )}
      </div>

      {/* Basket Content / Table */}
      {cart.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 text-center">
          <div
            onClick={onFocusSearch}
            className="group cursor-pointer flex flex-col items-center max-w-xs"
          >
            <div className="h-10 w-10 rounded-xl bg-muted/70 text-muted-foreground/60 flex items-center justify-center mb-2 border border-border group-hover:border-primary/40 group-hover:text-primary transition-all">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-xs text-foreground">
              Basket is empty
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed font-normal">
              Search above, or press <kbd className="px-1 py-0.2 rounded bg-muted border border-border text-[10px] font-mono font-medium text-foreground">F2</kbd> or <kbd className="px-1 py-0.2 rounded bg-muted border border-border text-[10px] font-mono font-medium text-foreground">/</kbd> to begin.
            </p>
            <p className="font-urdu text-[11px] text-muted-foreground/80 mt-1 font-normal" dir="rtl">
              سامان شامل کرنے کے لیے سرچ کریں۔
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full border-collapse text-left text-xs">
            {/* Sticky Table Header */}
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-1.5 pl-3 pr-2 font-medium">Item</th>
                <th className="py-1.5 px-2 text-center font-medium">IMEI / Qty</th>
                <th className="py-1.5 px-2 text-right font-medium">Price (Rs)</th>
                <th className="py-1.5 px-2 text-right font-medium">Total</th>
                <th className="py-1.5 pr-3 pl-2 text-center font-medium w-8">✕</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-border/60">
              {cart.map((item, idx) => {
                const brand = brands.find((b) => b.id === item.product.brand_id);
                const isHandset = Boolean(item.imei_record_id);
                const lineTotalPaisas = Math.round(item.quantity * item.unit_price * 100);

                return (
                  <tr
                    key={`${item.product.id}-${item.imei_record_id || idx}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Item Description */}
                    <td className="py-1.5 pl-3 pr-2 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
                            isHandset
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                          }`}
                        >
                          {isHandset ? (
                            <Smartphone className="h-3 w-3" />
                          ) : (
                            <Package className="h-3 w-3" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-medium text-foreground text-xs truncate">
                            {item.product.name}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate font-normal">
                            {item.product.model && <span>{item.product.model}</span>}
                            {brand && (
                              <span>• {brand.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* IMEI / Quantity */}
                    <td className="py-1.5 px-2 text-center">
                      {isHandset ? (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 font-mono text-[10px]">
                          <span className="text-muted-foreground font-normal">IMEI</span>
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                            ...{item.imei_number?.slice(-6)}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center border border-border rounded-lg bg-background overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                            className="h-6 w-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.product.stock_quantity}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1) {
                                onUpdateQuantity(idx, val);
                              }
                            }}
                            className="w-7 text-center font-medium text-xs text-foreground bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock_quantity}
                            className="h-6 w-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                            title="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Unit Price (Editable Inline) */}
                    <td className="py-1.5 px-2 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <div className="relative group">
                          <input
                            type="number"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              onUpdatePrice(idx, isNaN(val) ? 0 : val);
                            }}
                            className="h-6 w-20 rounded border border-border group-hover:border-primary bg-background px-1.5 text-right text-xs font-medium text-foreground focus:border-primary focus:outline-none transition-colors"
                            title="Click to edit negotiated price"
                          />
                          <Edit3 className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground opacity-40 group-hover:opacity-100" />
                        </div>
                      </div>
                    </td>

                    {/* Line Total */}
                    <td className="py-1.5 px-2 text-right">
                      <span className="font-semibold text-xs text-foreground">
                        {formatPKR(lineTotalPaisas)}
                      </span>
                    </td>

                    {/* Remove Action */}
                    <td className="py-1.5 pr-3 pl-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(idx)}
                        className="h-6 w-6 rounded text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center justify-center transition-colors cursor-pointer"
                        title="Remove from basket"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
