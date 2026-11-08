'use client';

import { Check, Banknote, Smartphone, Landmark, BookOpen } from 'lucide-react';
import { CardInfoTooltip } from '@/components/ui/card-info-tooltip';

export type PosPaymentOption = 'cash' | 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'udhaar';

interface PosPaymentTilesProps {
  selected: PosPaymentOption;
  onSelect: (option: PosPaymentOption) => void;
}

interface TileOption {
  id: PosPaymentOption;
  label: string;
  sublabel: string;
  icon: typeof Banknote;
  hasInfo?: boolean;
}

const TILES: TileOption[] = [
  { id: 'cash', label: 'Cash', sublabel: 'نقد', icon: Banknote },
  { id: 'easypaisa', label: 'EasyPaisa', sublabel: 'ایزی پیسہ', icon: Smartphone },
  { id: 'jazzcash', label: 'JazzCash', sublabel: 'جاز کیش', icon: Smartphone },
  { id: 'bank_transfer', label: 'Bank', sublabel: 'بینک ٹرانسفر', icon: Landmark },
  { id: 'udhaar', label: 'Udhaar', sublabel: 'ادھار کھاتہ', icon: BookOpen, hasInfo: true },
];

export function PosPaymentTiles({ selected, onSelect }: PosPaymentTilesProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Payment Method
        </label>
        <span className="text-[10px] text-muted-foreground">Select one</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {TILES.map((tile) => {
          const isSelected = selected === tile.id;
          const Icon = tile.icon;

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect(tile.id)}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 text-center transition-all cursor-pointer min-h-[58px] ${
                isSelected
                  ? tile.id === 'udhaar'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 shadow-xs'
                    : 'border-primary bg-primary/10 text-primary shadow-xs'
                  : 'border-border bg-card text-foreground hover:bg-muted/60'
              }`}
            >
              {isSelected && (
                <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-primary text-white flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
              )}

              <Icon className="h-4 w-4 mb-0.5" />
              <span className="text-xs font-black truncate max-w-full leading-tight">
                {tile.label}
              </span>
              <span className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                {tile.sublabel}
              </span>

              {tile.hasInfo && (
                <div
                  className="absolute top-1 left-1"
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
