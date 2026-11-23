import { Smartphone, PlugZap, Headphones, ShieldCheck, RefreshCcw, Package } from 'lucide-react';
import type { ElementType } from 'react';

/** Icon + soft colour for a product card, guessed from IMEI tracking and category name. */
export function productVisual(isImei: boolean, category?: string): { icon: ElementType; chip: string } {
  const c = (category || '').toLowerCase();
  if (isImei || /phone|mobile|smart|tablet/.test(c)) {
    return { icon: Smartphone, chip: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300' };
  }
  if (/charg|cable|power|adapter|bank/.test(c)) {
    return { icon: PlugZap, chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300' };
  }
  if (/hand|ear|audio|speaker|airpod|headphone|buds/.test(c)) {
    return { icon: Headphones, chip: 'bg-pink-100 text-pink-700 dark:bg-pink-950/70 dark:text-pink-300' };
  }
  if (/cover|case|glass|protect|sheet|screen/.test(c)) {
    return { icon: ShieldCheck, chip: 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300' };
  }
  if (/used|second|old/.test(c)) {
    return { icon: RefreshCcw, chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300' };
  }
  return { icon: Package, chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
}
