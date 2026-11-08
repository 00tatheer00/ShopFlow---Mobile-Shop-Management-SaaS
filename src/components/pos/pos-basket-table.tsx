'use client';

import { Plus, Minus, X } from 'lucide-react';
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
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onFocusSearch,
}: PosBasketTableProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {cart.length === 0 ? (
        <div
          onClick={onFocusSearch}
          className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-500">
            Search for a phone or accessory to begin
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Press <kbd className="px-1 py-0.2 rounded bg-slate-100 border text-[10px] font-mono">F2</kbd> or <kbd className="px-1 py-0.2 rounded bg-slate-100 border text-[10px] font-mono">/</kbd> to search
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full border-collapse text-left text-xs">
            {/* Table Header matching the mockup */}
            <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-normal">
              <tr>
                <th className="py-2.5 pl-4 pr-2 font-normal">Item</th>
                <th className="py-2.5 px-2 text-center font-normal">IMEI / Qty</th>
                <th className="py-2.5 px-2 text-right font-normal">Price</th>
                <th className="py-2.5 px-2 text-right font-normal">Total</th>
                <th className="py-2.5 pr-4 pl-2 text-center font-normal w-8"></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {cart.map((item, idx) => {
                const isHandset = Boolean(item.imei_record_id);
                const lineTotal = item.quantity * item.unit_price;

                return (
                  <tr
                    key={`${item.product.id}-${item.imei_record_id || idx}`}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Item Name */}
                    <td className="py-2.5 pl-4 pr-2 min-w-[140px]">
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                        {item.product.name}
                      </div>
                    </td>

                    {/* IMEI or Stepper */}
                    <td className="py-2.5 px-2 text-center">
                      {isHandset ? (
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          ...{item.imei_number?.slice(-4)}
                        </span>
                      ) : (
                        <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                            className="h-4 w-4 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="px-2 text-xs font-medium text-slate-800 dark:text-slate-100">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock_quantity}
                            className="h-4 w-4 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer disabled:opacity-30"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          onUpdatePrice(idx, isNaN(val) ? 0 : val);
                        }}
                        className="w-18 text-right text-xs font-normal text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none"
                      />
                    </td>

                    {/* Line Total */}
                    <td className="py-2.5 px-2 text-right">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        {lineTotal.toLocaleString('en-PK')}
                      </span>
                    </td>

                    {/* Remove Action */}
                    <td className="py-2.5 pr-4 pl-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(idx)}
                        className="h-5 w-5 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <X className="h-3 w-3 stroke-[2.5]" />
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
