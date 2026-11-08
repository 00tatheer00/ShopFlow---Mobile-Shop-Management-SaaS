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
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl border-2 border-border bg-card shadow-xs overflow-hidden">
      {/* Basket Header */}
      <div className="shrink-0 px-4 py-3 bg-muted/40 border-b-2 border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <h2 className="font-extrabold text-sm sm:text-base text-foreground tracking-tight">
            Sale Basket
          </h2>
          <span className="rounded-full bg-primary/15 text-primary font-black text-xs px-2.5 py-0.5 border border-primary/20">
            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Clear Basket
          </button>
        )}
      </div>

      {/* Basket Content / Table */}
      {cart.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center">
          <div
            onClick={onFocusSearch}
            className="group cursor-pointer flex flex-col items-center max-w-sm"
          >
            <div className="h-16 w-16 rounded-2xl bg-muted/70 text-muted-foreground/60 flex items-center justify-center mb-3 border border-border group-hover:border-primary/40 group-hover:text-primary transition-all">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-foreground">
              Basket is empty
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Search for a phone or accessory above, or press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[11px] font-mono font-bold text-foreground">F2</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[11px] font-mono font-bold text-foreground">/</kbd> to begin.
            </p>
            <p className="font-urdu text-xs text-muted-foreground/80 mt-1.5" dir="rtl">
              سامان تلاش کرنے کے لیے اوپر سرچ بار استعمال کریں۔
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full border-collapse text-left text-xs">
            {/* Sticky Table Header */}
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2.5 pl-4 pr-2 font-black">Item</th>
                <th className="py-2.5 px-2 text-center font-black">IMEI / Qty</th>
                <th className="py-2.5 px-2 text-right font-black">Price (Rs)</th>
                <th className="py-2.5 px-2 text-right font-black">Total</th>
                <th className="py-2.5 pr-4 pl-2 text-center font-black w-12">✕</th>
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
                    <td className="py-3 pl-4 pr-2 min-w-[160px]">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isHandset
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                          }`}
                        >
                          {isHandset ? (
                            <Smartphone className="h-3.5 w-3.5" />
                          ) : (
                            <Package className="h-3.5 w-3.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-extrabold text-foreground text-xs sm:text-sm truncate">
                            {item.product.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 truncate">
                            {item.product.model && <span>{item.product.model}</span>}
                            {brand && (
                              <span className="font-semibold text-muted-foreground/80">
                                • {brand.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* IMEI / Quantity */}
                    <td className="py-3 px-2 text-center">
                      {isHandset ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 font-mono text-xs">
                          <span className="text-[10px] text-muted-foreground font-bold">IMEI</span>
                          <span className="font-black text-emerald-800 dark:text-emerald-300">
                            ...{item.imei_number?.slice(-6)}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center border-2 border-border rounded-xl bg-background overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
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
                            className="w-10 text-center font-black text-xs text-foreground bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock_quantity}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                            title="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Unit Price (Editable Inline) */}
                    <td className="py-3 px-2 text-right">
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
                            className="w-24 rounded-lg border-2 border-border group-hover:border-primary bg-background px-2 py-1 text-right text-xs font-black text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                            title="Click to edit negotiated price"
                          />
                          <Edit3 className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100" />
                        </div>
                      </div>
                    </td>

                    {/* Line Total */}
                    <td className="py-3 px-2 text-right">
                      <span className="font-black text-xs sm:text-sm text-foreground">
                        {formatPKR(lineTotalPaisas)}
                      </span>
                    </td>

                    {/* Remove Action */}
                    <td className="py-3 pr-4 pl-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(idx)}
                        className="min-h-[36px] min-w-[36px] rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center justify-center transition-colors cursor-pointer"
                        title="Remove from basket"
                      >
                        <Trash2 className="h-4 w-4" />
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
