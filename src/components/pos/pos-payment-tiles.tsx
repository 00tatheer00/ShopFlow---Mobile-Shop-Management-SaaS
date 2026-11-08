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
  { id: 'bank_transfer', label: 'Bank', sublabel: 'بینک', icon: Landmark },
  { id: 'udhaar', label: 'Udhaar', sublabel: 'ادھار', icon: BookOpen, hasInfo: true },
];

export function PosPaymentTiles({ selected, onSelect }: PosPaymentTilesProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Payment Method
        </label>
        <span className="text-[9px] text-muted-foreground font-normal">Select one</span>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {TILES.map((tile) => {
          const isSelected = selected === tile.id;
          const Icon = tile.icon;

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect(tile.id)}
              className={`relative flex flex-col items-center justify-center p-1 rounded-lg border text-center transition-all cursor-pointer min-h-[40px] ${
                isSelected
                  ? tile.id === 'udhaar'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 shadow-2xs font-semibold'
                    : 'border-primary bg-primary/10 text-primary shadow-2xs font-semibold'
                  : 'border-border bg-card text-foreground hover:bg-muted/60 font-normal'
              }`}
            >
              {isSelected && (
                <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-primary text-white flex items-center justify-center">
                  <Check className="h-1.5 w-1.5 stroke-[3]" />
                </span>
              )}

              <Icon className="h-3 w-3 mb-0.5 shrink-0" />
              <span className="text-[10px] truncate max-w-full leading-none">
                {tile.label}
              </span>
              <span className="text-[9px] text-muted-foreground truncate leading-none mt-0.5 font-normal">
                {tile.sublabel}
              </span>

              {tile.hasInfo && (
                <div
                  className="absolute top-0.5 left-0.5"
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
