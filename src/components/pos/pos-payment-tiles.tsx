'use client';

import { Check } from 'lucide-react';
import { CardInfoTooltip } from '@/components/ui/card-info-tooltip';

export type PosPaymentOption = 'cash' | 'easypaisa' | 'jazzcash' | 'udhaar';

interface PosPaymentTilesProps {
  selected: PosPaymentOption;
  onSelect: (option: PosPaymentOption) => void;
}

interface TileOption {
  id: PosPaymentOption;
  title: string;
  subtitle: string;
  hasInfo?: boolean;
}

const TILES: TileOption[] = [
  { id: 'cash', title: 'Cash', subtitle: 'Exact or change' },
  { id: 'easypaisa', title: 'EasyPaisa', subtitle: 'Online' },
  { id: 'jazzcash', title: 'JazzCash', subtitle: 'Online' },
  { id: 'udhaar', title: 'Udhaar', subtitle: 'Credit', hasInfo: true },
];

export function PosPaymentTiles({ selected, onSelect }: PosPaymentTilesProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Pay with
        </label>
        <CardInfoTooltip
          title="Payment Method (طریقہ ادائیگی)"
          urduDetail="رقم وصول کرنے کا طریقہ منتخب کریں۔ ادھار کی صورت میں گاہک کا نام لازمی ہے۔"
        />
      </div>

      {/* 2x2 Grid exactly like the mockup */}
      <div className="grid grid-cols-2 gap-2">
        {TILES.map((tile) => {
          const isSelected = selected === tile.id;

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect(tile.id)}
              className={`relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50'
              }`}
            >
              {/* Checkmark icon for selected tile */}
              {isSelected && (
                <span className="absolute top-2.5 right-2.5 h-3.5 w-3.5 rounded border border-indigo-500 bg-indigo-600 text-white flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
              )}

              <span
                className={`text-xs font-semibold leading-tight ${
                  isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {tile.title}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {tile.subtitle}
              </span>

              {tile.hasInfo && (
                <div
                  className="absolute bottom-2 right-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CardInfoTooltip
                    title="Udhaar Payment (ادھار)"
                    urduDetail="اگر گاہک نقد رقم ادا نہیں کر رہا یا آدھی رقم بعد میں دے گا، تو ادھار منتخب کریں۔ اس کے لیے گاہک کا نام منتخب کرنا لازمی ہے۔"
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
